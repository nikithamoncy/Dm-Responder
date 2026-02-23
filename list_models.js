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

async function list() {
    try {
        // Access the model manager directly if possible, or use a known endpoint check
        // The SDK doesn't expose listModels directly on genAI instance in all versions?
        // Let's try to infer from error or just try a different model.

        // Attempt to access listModels via the raw API if needed, 
        // but let's try to just hit the API endpoint manually using fetch since SDK might hide it.

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.name.includes("embedding")) {
                    console.log(`- ${m.name} (${m.supportedGenerationMethods})`);
                }
            });
        } else {
            console.log("No models found or error:", data);
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
}
list();
