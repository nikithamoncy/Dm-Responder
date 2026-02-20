
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendInstagramMessage } from '@/lib/instagram';

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Params are now Promises in Next.js 15+ (and likely 16)
) {
    try {
        const userId = (await params).id;

        // Fetch messages
        const { data: messages, error } = await supabase
            .from('conversation_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ messages });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const userId = (await params).id;
        const body = await request.json();
        const { action } = body;

        if (action === 'toggle_pause') {
            const { is_paused } = body;
            const { error } = await supabase
                .from('conversation_states')
                .update({ is_paused })
                .eq('user_id', userId);

            if (error) throw error;
            return NextResponse.json({ success: true, is_paused });
        }

        if (action === 'send_message') {
            const { message } = body;

            // 1. Send to Instagram
            await sendInstagramMessage(userId, message);

            // 2. Save to History
            const { error } = await supabase.from('conversation_history').insert({
                user_id: userId,
                role: 'assistant',
                content: message
            });

            if (error) throw error;

            // 3. Update Last Message At
            await supabase
                .from('conversation_states')
                .update({ last_message_at: new Date().toISOString() })
                .eq('user_id', userId);

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Conversation API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
