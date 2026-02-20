import { NextResponse } from 'next/server';
import { processBotResponse } from '@/lib/bot-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { message } = body;

        console.log('[Playground] Received message:', message);

        if (!message) {
            return new NextResponse('Message is required', { status: 400 });
        }

        // Use a fixed ID for playground testing
        // We can make this dynamic per session if we want isolated contexts later
        const PLAYGROUND_USER_ID = 'playground_user';

        const result = await processBotResponse(PLAYGROUND_USER_ID, message, true); // true = simulated

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[Playground] Error:', error);
        return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
    }
}
