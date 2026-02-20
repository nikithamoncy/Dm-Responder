import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch the current system prompt
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('bot_settings')
            .select('system_prompt')
            .limit(1)
            .single();

        if (error) throw error;

        return NextResponse.json({ system_prompt: data?.system_prompt || '' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Update the system prompt
export async function POST(req: Request) {
    try {
        const { system_prompt } = await req.json();

        if (!system_prompt) {
            return NextResponse.json({ error: 'System prompt is required' }, { status: 400 });
        }

        // We assume there's only one row, so we update the first one or valid ID
        // Simplest way for single-tenant config: Just update all or ID=1 if you enforced it.
        // However, our schema allows multiple, but we only use one.
        // Let's first check if a row exists.

        // Upsert logic:
        // We hardcoded the ID check or just generic update. 
        // Ideally we track the ID. But for simplicity, we'll fetch the first ID or insert.

        const { data: existing } = await supabase.from('bot_settings').select('id').limit(1).single();

        let error;
        if (existing) {
            const res = await supabase.from('bot_settings').update({ system_prompt, updated_at: new Date().toISOString() }).eq('id', existing.id);
            error = res.error;
        } else {
            const res = await supabase.from('bot_settings').insert({ system_prompt });
            error = res.error;
        }

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
