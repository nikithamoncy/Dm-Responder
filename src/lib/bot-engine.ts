import { supabase } from '@/lib/supabase';
import { geminiModel, generateEmbedding } from '@/lib/gemini';
import { sendInstagramMessage } from '@/lib/instagram';
import { sendMessengerMessage } from '@/lib/messenger';

interface BotResponseResult {
    replyText: string;
    relevantContext: string;
    duration: number;
}

/**
 * Core Logic: RAG + Gemini Generation.
 * @param userId - The user ID (Instagram IGSID or internal Playground ID)
 * @param userMessage - The message text
 * @param simulated - If true, does not send to Instagram or save to official history
 * @param platform - The messaging platform ('instagram' or 'messenger')
 */
export async function processBotResponse(userId: string, userMessage: string, simulated: boolean = false, platform: 'instagram' | 'messenger' = 'instagram'): Promise<BotResponseResult | null> {

    // 0. CHECK PAUSED STATE (Human Takeover) - skip for simulated
    if (!simulated) {
        const { data: stateData } = await supabase
            .from('conversation_states')
            .select('is_paused')
            .eq('user_id', userId)
            .single();

        if (stateData?.is_paused) {
            console.log(`[Bot Engine] Conversation with ${userId} is PAUSED. Human takeover active. Ignoring message.`);
            // Ensure we save the user message to history so human can see it in dashboard
            await supabase.from('conversation_history').insert({
                user_id: userId,
                role: 'user',
                content: userMessage
            });
            return null;
        }
    }

    // A. Fetch System Prompt
    const { data: settings } = await supabase
        .from('bot_settings')
        .select('system_prompt')
        .limit(1)
        .single();

    const systemInstructions = settings?.system_prompt || 'You are a helpful assistant talking to a customer on Instagram. Keep it friendly and concise.';

    // B. Fetch Conversation History (Last 10 messages)
    let conversationHistory = '';
    // For playground, we might want to pass history in, but for now lets keep it stateless or use a separate table?
    // simplest for v1 playground is just "no history" or we can try to fetch history if we use a consistent ID.
    // Let's assume for now Playground uses a fixed ID "playground_user" and we can actually save/retrieve history for it too!
    // But maybe we don't want to pollute real history.
    // Let's just NOT fetch DB history for simulated runs for now to keep it clean, OR pass it in.
    // Actually, for a good test, we should probably fetch history if it exists.
    // Let's respect the `simulated` flag: if simulated, we don't fetch/save to DB history?
    // Wait, the user wants to test the BOT. The bot uses history.
    // Let's skip DB history for now for simulated to avoid pollution, or maybe we create a "playground_session" later.
    // FOR NOW: Simulated runs start with empty history or client-provided history? 
    // Let's stick to the current logic: fetch from DB. If I use "playground_user", it will fetch "playground_user" history.
    // That seems fine. "simulate" just means "don't send to Instagram".

    if (!simulated || userId === 'playground_user') {
        const { data: historyData } = await supabase
            .from('conversation_history')
            .select('role, content')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (historyData && historyData.length > 0) {
            // Reverse to chronological order
            const history = historyData.reverse();
            conversationHistory = history.map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n');
        }
    }

    // C. RAG: Search Knowledge Base
    let relevantContext = '';
    try {
        const queryEmbedding = await generateEmbedding(userMessage);

        const { data: chunks, error } = await supabase.rpc('match_knowledge_base', {
            query_embedding: queryEmbedding,
            match_threshold: 0.5, // Similarity threshold
            match_count: 3        // Top 3 chunks
        });

        if (error) {
            console.error('RAG Search Error:', error);
        } else if (chunks && chunks.length > 0) {
            relevantContext = chunks.map((c: any) => c.content).join('\n\n---\n\n');
            console.log(`Found ${chunks.length} relevant context chunks.`);
        } else {
            console.log('No relevant context found.');
        }

    } catch (e) {
        console.error('Embedding/Search Failed:', e);
    }

    // D. Construct Final Prompt
    // Use Asia/Kolkata as default, or allow env override
    const timeZone = process.env.APP_TIMEZONE || 'Asia/Kolkata';
    const now = new Date().toLocaleString('en-US', {
        timeZone,
        dateStyle: 'full',
        timeStyle: 'short'
    });

    const finalPrompt = `
SYSTEM INSTRUCTIONS:
${systemInstructions}

CRITICAL RULES:
1. If the user message is a simple greeting (e.g., "Hi", "Hello", "Good morning"), reply with a polite greeting ONLY. Do NOT include business hours, location, or other details unless specifically asked.
2. Use the provided CONTEXT only if it directly answers the user's question. If the context is irrelevant to the user's message, ignore it.
3. Keep the response concise (under 2 sentences) unless the user asks for detailed information.
4. Do NOT start responses with "Yes, we are open!" unless the user specifically asks if you are open. Answer the question naturally and directly.

CURRENT TIME:
${now}

PREVIOUS CONVERSATION HISTORY:
${conversationHistory ? conversationHistory : 'No previous conversation.'}

CONTEXT FROM KNOWLEDGE BASE:
${relevantContext ? relevantContext : 'No specific knowledge base info found.'}

USER MESSAGE:
${userMessage}

YOUR REPLY:
    `;

    // E. Save User Message to History (Background) - IF NOT SIMULATED (or if we want to persist playground chat)
    // For now, let's SAVE it even for playground so we can see the flow in the dashboard?
    // Actually, user probably wants to see it in the Playground UI, not necessarily DB.
    // Let's SAVE for consistency if it's 'playground_user' so we can test the history fetching too.
    if (!simulated || userId === 'playground_user') {
        await supabase.from('conversation_history').insert({
            user_id: userId,
            role: 'user',
            content: userMessage
        });

        // E2. Extract Leads (Async, non-blocking)
        extractLeadInfo(userId, userMessage).catch(console.error);
    }

    // F. Call Gemini & Send Reply
    try {
        console.log(`[Gemini] Starting generation for ${userId} (Simulated: ${simulated})...`);
        const start = Date.now();

        const result = await geminiModel.generateContent(finalPrompt);
        const response = result.response;
        const replyText = response.text();

        const duration = Date.now() - start;
        console.log(`[Gemini] Generated Reply for ${userId} in ${duration}ms: `, replyText);

        // G. Send to Instagram/Messenger (ONLY IF NOT SIMULATED)
        if (!simulated) {
            console.log(`[${platform === 'messenger' ? 'Messenger' : 'Instagram'}] Sending reply to ${userId}...`);
            let sendResult;
            if (platform === 'messenger') {
                sendResult = await sendMessengerMessage(userId, replyText);
            } else {
                sendResult = await sendInstagramMessage(userId, replyText);
            }
            console.log(`[${platform === 'messenger' ? 'Messenger' : 'Instagram'}] Reply sent successfully: `, sendResult);
        }

        // H. Save Assistant Reply to History (Background)
        if (!simulated || userId === 'playground_user') {
            await supabase.from('conversation_history').insert({
                user_id: userId,
                role: 'assistant',
                content: replyText
            });
        }

        return {
            replyText,
            relevantContext,
            duration
        };

    } catch (e) {
        console.error('[Gemini/Instagram Error]:', e);
        throw e;
    }
}

/**
 * Extract email and phone from text using Regex
 */
async function extractLeadInfo(userId: string, text: string) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g;

    const emails = text.match(emailRegex);
    const phones = text.match(phoneRegex);

    if (emails || phones) {
        console.log(`[Lead Extraction] Found potential lead info for ${userId}:`, { emails, phones });

        // Check if lead exists to avoid duplicates (restricitive check)
        // or just insert new row. Let's insert new row for every detection for now, 
        // managing state in frontend is better.

        const { error } = await supabase.from('leads').insert({
            user_id: userId,
            email: emails ? emails[0] : null,
            phone: phones ? phones[0] : null,
            source_message: text,
            status: 'new'
        });

        if (error) console.error('[Lead Extraction] DB Error:', error);
    }
}
