import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_GEMINI_API_KEY || '';

const genAI = new GoogleGenerativeAI(apiKey);

// Update to Gemini 1.5 Flash as requested
export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
export const embeddingModel = genAI.getGenerativeModel({ model: 'models/gemini-embedding-001' });

export async function generateEmbedding(text: string) {
    if (!apiKey || apiKey === 'MISSING_KEY') {
        throw new Error('Missing Google Gemini API Key');
    }
    const result = await embeddingModel.embedContent(text);
    const embedding = result.embedding;
    return embedding.values;
}
