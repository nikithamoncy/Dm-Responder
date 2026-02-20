import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEmbedding, embeddingModel } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function GET() {
    const results: any = {
        checks: [],
        timestamp: new Date().toISOString(),
    };

    const addCheck = (name: string, success: boolean, message: string, details?: any) => {
        results.checks.push({ name, success, message, details });
    };

    // 1. Check Environment Variables
    const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    addCheck('Environment: Gemini Key', !!geminiKey, geminiKey ? 'Present' : 'Missing');
    addCheck('Environment: Supabase URL', !!supabaseUrl, supabaseUrl ? 'Present' : 'Missing');
    addCheck('Environment: Supabase Key', !!supabaseKey, supabaseKey ? 'Present' : 'Missing');

    // 2. Check Embedding Generation
    try {
        const text = "Diagnostic test";
        const embedding = await generateEmbedding(text);
        addCheck('Gemini API: Valid Response', true, 'Embedding generated successfully');
        addCheck('Gemini API: Model Name', true, embeddingModel.model);

        const dim = embedding.length;
        const expectedDim = 3072;
        addCheck('Gemini API: Dimensions', dim === expectedDim, `Got ${dim}, expected ${expectedDim}`, { length: dim });

        // 3. Check Supabase Connection & Vector Dimension
        try {
            // Try to insert a dummy record with the generated embedding to verify table schema
            // We'll rollback or delete immediately, but actually just an RPC call or checking table info is safer/cleaner if possible.
            // But 'pg_catalog' access might be restricted.
            // Let's try to insert into 'knowledge_base_vectors' with a dummy item.

            // First create a temp item
            const { data: itemData, error: itemError } = await supabase
                .from('knowledge_base_items')
                .insert({
                    filename: 'diagnostic_test.txt',
                    content_type: 'text/plain'
                })
                .select()
                .single();

            if (itemError) throw itemError;

            // Now try to insert vector
            const { error: vectorError } = await supabase
                .from('knowledge_base_vectors')
                .insert({
                    item_id: itemData.id,
                    content: 'diagnostic test content',
                    embedding: embedding
                });

            if (vectorError) {
                // Check if error is about dimensions
                addCheck('Database: Vector Insert', false, `Failed: ${vectorError.message}`, vectorError);
            } else {
                addCheck('Database: Vector Insert', true, 'Successfully inserted vector with 3072 dimensions');
            }

            // Cleanup
            await supabase.from('knowledge_base_items').delete().eq('id', itemData.id);

        } catch (dbError: any) {
            addCheck('Database: Connection/Insert', false, `Failed: ${dbError.message}`, dbError);
        }

    } catch (apiError: any) {
        addCheck('Gemini API: Generation', false, `Failed: ${apiError.message}`, apiError);
    }

    return NextResponse.json(results);
}
