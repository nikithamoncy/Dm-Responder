import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getInstagramUserProfile } from '@/lib/instagram';
import { processBotResponse } from '@/lib/bot-engine';

// Environment variables
const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN;

// Set max execution time to 60 seconds (Vercel Pro)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * GET - Hub Verification Challenge
 * Instagram sends a GET request to verify the webhook URL.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            return new NextResponse(challenge, { status: 200 });
        } else {
            return new NextResponse('Forbidden', { status: 403 });
        }
    }

    return new NextResponse('Bad Request', { status: 400 });
}

/**
 * POST - Handle Incoming Events (Messages)
 */
export async function POST(req: Request) {
    console.log('--------------------------------------------------');
    console.log('[WEBHOOK-START] Received POST request');
    console.log('[WEBHOOK-START] Time:', new Date().toISOString());

    try {
        const body = await req.json();
        console.log('[WEBHOOK-BODY] Raw Payload:', JSON.stringify(body, null, 2));

        // Check if this is a page event
        if (body.object === 'instagram' || body.object === 'page') {
            console.log(`[WEBHOOK-OBJECT] Object Type: ${body.object}`);

            for (const entry of body.entry) {
                console.log(`[WEBHOOK-ENTRY] Processing Entry ID: ${entry.id}`);
                console.log(`[WEBHOOK-ENTRY] Entry Data:`, JSON.stringify(entry));

                // Handle "Test" payloads or generic updates safely
                if (!entry.messaging) {
                    console.log('[WEBHOOK-SKIP] Entry has no "messaging" array. Likely a test/standby event.');
                    continue;
                }

                for (const messagingEvent of entry.messaging) {
                    console.log('[WEBHOOK-EVENT] Processing Message Event:', JSON.stringify(messagingEvent));

                    // Ignore messages sent by the page itself (echoes)
                    if (messagingEvent.message?.is_echo) {
                        console.log('[WEBHOOK-SKIP] Ignoring ECHO message (is_echo: true).');
                        continue;
                    }

                    if (messagingEvent.message && messagingEvent.message.text) {
                        const senderId = messagingEvent.sender.id;
                        const messageText = messagingEvent.message.text;
                        const messageId = messagingEvent.message.mid;

                        console.log(`[WEBHOOK-MSG] Sender: ${senderId}, ID: ${messageId}, Text: "${messageText}"`);

                        // 0. SELF-MESSAGE CHECK
                        const myUserId = process.env.INSTAGRAM_USER_ID;
                        console.log(`[WEBHOOK-CHECK] Configured My ID: ${myUserId}`);

                        if (senderId === myUserId) {
                            console.log(`[WEBHOOK-SKIP] Ignoring self-message from ${senderId}`);
                            continue;
                        }

                        // Idempotency: Attempt to insert message_id directly.
                        if (messageId) {
                            const { error: insertError } = await supabase
                                .from('processed_messages')
                                .insert({ message_id: messageId });

                            if (insertError) {
                                // PostgreSQL code 23505 is unique_violation
                                if (insertError.code === '23505') {
                                    console.log(`[WEBHOOK-SKIP] DUPLICATE message (DB constraint): ${messageId}`);
                                    continue;
                                } else {
                                    console.error('[WEBHOOK-DB-ERROR] Critical DB error during idempotency check:', insertError);
                                    // STOP PROCESSING. If we can't verify uniqueness, we risk duplicates.
                                    continue;
                                }
                            }
                            console.log('[WEBHOOK-DB] Idempotency check passed.');
                        }

                        // 1. Fetch User Profile
                        console.log('[WEBHOOK-PROFILE] Fetching user profile...');
                        const userProfile = await getInstagramUserProfile(senderId);
                        console.log('[WEBHOOK-PROFILE] Result:', userProfile ? 'Found' : 'Not Found');

                        // Upsert Conversation State
                        const upsertData: any = {
                            user_id: senderId,
                            last_message_at: new Date().toISOString()
                        };

                        if (userProfile) {
                            upsertData.user_name = userProfile.name;
                            upsertData.username = userProfile.username;
                            upsertData.profile_pic = userProfile.profile_pic;
                        }

                        const { error: upsertError } = await supabase
                            .from('conversation_states')
                            .upsert(upsertData, { onConflict: 'user_id' });

                        if (upsertError) {
                            console.error('[WEBHOOK-DB-ERROR] Failed to upsert state:', upsertError);
                        }

                        // Process the message synchronously
                        try {
                            console.log('[WEBHOOK-BOT] Triggering Bot Engine...');
                            await processBotResponse(senderId, messageText);
                            console.log('[WEBHOOK-BOT] Bot Engine Completed Successfully.');
                        } catch (botError) {
                            console.error('[WEBHOOK-BOT-ERROR] Bot Engine Failed:', botError);
                        }
                    } else {
                        console.log('[WEBHOOK-SKIP] Event is not a text message (no message.text).');
                    }
                }
            }
            return new NextResponse('EVENT_RECEIVED', { status: 200 });
        }

        console.log('[WEBHOOK-404] Body object was not instagram/page.');
        return new NextResponse('Not Found', { status: 404 });
    } catch (error: any) {
        console.error('[WEBHOOK-CRITICAL-ERROR] Unhandled Exception:', error);
        return new NextResponse(error.message, { status: 500 });
    }
}

