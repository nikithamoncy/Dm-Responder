const fs = require('fs');
const path = require('path');

async function verify() {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');

    const env = {};
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            if (key && !key.startsWith('#')) {
                env[key] = value;
            }
        }
    });

    const accessToken = env['INSTAGRAM_ACCESS_TOKEN'];
    const pageId = env['INSTAGRAM_PAGE_ID'];
    const userId = env['INSTAGRAM_USER_ID'];

    console.log('--- Verifying Access Token ---');
    if (!accessToken) {
        console.error('Error: INSTAGRAM_ACCESS_TOKEN is missing in .env.local');
        return;
    }

    // 1. Check who "me" is
    try {
        const meRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name,username&access_token=${accessToken}`);
        const meData = await meRes.json();
        console.log('Token belongs to:', meData);

        if (meData.error) {
            console.error('Error validating token:', meData.error.message);
            return;
        }
    } catch (error) {
        console.error('Network error checking token:', error.message);
    }

    // 2. Check Page ID
    if (pageId) {
        console.log('\n--- Verifying Page ID (' + pageId + ') ---');
        try {
            const pageRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=id,name,username&access_token=${accessToken}`);
            const pageData = await pageRes.json();
            console.log('Page details:', pageData);
        } catch (error) {
            console.error('Error verifying Page ID:', error.message);
        }
    }

    // 3. Check User ID (Instagram Business Account)
    if (userId) {
        console.log('\n--- Verifying Instagram User ID (' + userId + ') ---');
        try {
            const userRes = await fetch(`https://graph.facebook.com/v21.0/${userId}?fields=id,name,username&access_token=${accessToken}`);
            const userData = await userRes.json();
            console.log('Instagram User details:', userData);
        } catch (error) {
            console.error('Error verifying User ID:', error.message);
        }
    }
}

verify();
