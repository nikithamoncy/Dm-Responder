import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/gemini';
import PDFParser from 'pdf2json';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// GET: List all files in the knowledge base
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('knowledge_base_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ files: data });
    } catch (error: any) {
        console.error('[KB GET Error]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    console.log('[Upload API] Starting file upload process...');

    // 1. Validate Environment Variables
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
        console.error('[Upload Error] Missing GOOGLE_GEMINI_API_KEY');
        return NextResponse.json({ error: 'Server configuration error: Missing Gemini API Key' }, { status: 500 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('[Upload Error] Missing SUPABASE_SERVICE_ROLE_KEY');
        return NextResponse.json({ error: 'Server configuration error: Missing Supabase Service Key' }, { status: 500 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        console.log(`[Upload API] Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);

        // 2. Read file content
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        let textContent = '';

        try {
            if (file.type === 'application/pdf') {
                const pdfParser = new PDFParser(null, true); // true = text only

                textContent = await new Promise((resolve, reject) => {
                    pdfParser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
                    pdfParser.on("pdfParser_dataReady", () => {
                        resolve(pdfParser.getRawTextContent());
                    });
                    pdfParser.parseBuffer(buffer);
                });

            } else {
                // Assume text/plain or similar
                textContent = buffer.toString('utf-8');
            }
        } catch (parseError: any) {
            console.error('[Upload Error] File parsing failed:', parseError);
            return NextResponse.json({ error: `Failed to parse file content: ${parseError.message}` }, { status: 400 });
        }


        if (!textContent.trim()) {
            return NextResponse.json({ error: 'Empty file content extracted' }, { status: 400 });
        }

        // 3. Store Key Metadata in Supabase
        const { data: itemData, error: itemError } = await supabase
            .from('knowledge_base_items')
            .insert({
                filename: file.name,
                content_type: file.type
            })
            .select()
            .single();

        if (itemError) {
            console.error('[Upload Error] Supabase insert failed:', itemError);
            throw itemError;
        }

        // 4. Chunking (Simple approach: split by paragraphs or max chars)
        const chunkSize = 1000;
        const overlap = 100;
        const chunks: string[] = [];

        for (let i = 0; i < textContent.length; i += (chunkSize - overlap)) {
            chunks.push(textContent.slice(i, i + chunkSize));
        }

        console.log(`[Upload API] Generated ${chunks.length} chunks. Starting embedding generation...`);

        // 5. Generate Embeddings & Store Vectors
        let processedCount = 0;

        for (const chunk of chunks) {
            try {
                const embedding = await generateEmbedding(chunk);

                const { error: vectorError } = await supabase
                    .from('knowledge_base_vectors')
                    .insert({
                        item_id: itemData.id,
                        content: chunk,
                        embedding
                    });

                if (vectorError) {
                    console.error('[Upload Error] Vector insert error:', vectorError);
                    // Continue best effort
                } else {
                    processedCount++;
                }
            } catch (embError) {
                console.error('[Upload Error] Embedding generation failed for chunk:', embError);
                // Log but continue
            }
        }

        console.log(`[Upload API] Finished. Processed ${processedCount}/${chunks.length} chunks.`);

        if (processedCount === 0) {
            return NextResponse.json({ error: 'Failed to generate embeddings for any chunk. Check logs.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, chunksProcessed: processedCount, totalChunks: chunks.length });

    } catch (error: any) {
        console.error('[Upload Error] Unhandled exception:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
