
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('conversation_states')
            .select('*')
            .order('last_message_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ conversations: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
