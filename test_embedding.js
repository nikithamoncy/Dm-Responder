const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');

// Simple dotenv shim
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'models/gemini-embedding-001' });

async function run() {
    try {
        console.log("Testing text-embedding-004...");
        const result = await model.embedContent("Hello world");
        console.log("Success! Dimensions:", result.embedding.values.length);
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
