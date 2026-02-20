
/**
 * Fetches the Instagram Business Account ID associated with the Page Access Token.
 */
interface InstagramContext {
    pageAccessToken: string;
    igUserId: string;
}

/**
 * Debugs the permissions associated with the current Access Token.
 */
async function debugPermissions(token: string) {
    try {
        const response = await fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${token}`);
        const data = await response.json();
        const permissions = data.data?.map((p: any) => `${p.permission} (${p.status})`);
        console.log('[Instagram API Debug] Token Permissions:', permissions ? permissions.join(', ') : 'None found');
    } catch (e) {
        console.error('[Instagram API Debug] Failed to fetch permissions:', e);
    }
}

/**
 * Resolves the correct Page Access Token and Instagram Business Account ID.
 * Handles both Page Tokens (direct) and User Tokens (by discovering linked pages).
 */
async function resolveInstagramContext(initialToken: string): Promise<InstagramContext> {
    // 0. SPECIAL CASE: If token starts with "IGA", it's an Instagram Graph/Logic token.
    if (initialToken.startsWith('IGA')) {
        console.log('[Instagram API] Detected IGAAQ token. Bypassing Facebook Page discovery.');
        const configuredUserId = process.env.INSTAGRAM_USER_ID;
        if (!configuredUserId) {
            throw new Error('IGAAQ token detected but INSTAGRAM_USER_ID is missing in .env.local');
        }
        return {
            pageAccessToken: initialToken,
            igUserId: configuredUserId
        };
    }

    await debugPermissions(initialToken);

    // 1. Try to treat it as a Page Token first
    const url = `https://graph.facebook.com/v19.0/me?fields=instagram_business_account&access_token=${initialToken}`;
    const response = await fetch(url);
    const data = await response.json();

    // Case A: It's a Page Token with a linked IG Account
    if (data.instagram_business_account?.id) {
        return {
            pageAccessToken: initialToken,
            igUserId: data.instagram_business_account.id
        };
    }

    // Case B: Error (#100) on User node OR Page with no IG account
    // We check if we can list accounts (pages) this user manages
    console.log('[Instagram API] Token might be a User Token or Page with no IG. Attempting to list pages...');

    // FALLBACK: If a specific Page ID is provided in ENV, try that first/also
    const envPageId = process.env.INSTAGRAM_PAGE_ID;
    if (envPageId) {
        console.log(`[Instagram API] Checking configured INSTAGRAM_PAGE_ID: ${envPageId}`);
        try {
            const pageUrl = `https://graph.facebook.com/v19.0/${envPageId}?fields=access_token,instagram_business_account,name&access_token=${initialToken}`;
            const pageRes = await fetch(pageUrl);
            const pageData = await pageRes.json();

            if (pageData.instagram_business_account?.id) {
                console.log(`[Instagram API] Found configured Page: "${pageData.name}"`);
                if (!pageData.access_token) {
                    console.error('[Instagram API] CRITICAL: Page found but access_token is MISSING in response.', pageData);
                } else {
                    console.log(`[Instagram API] Page Access Token retrieved. Length: ${pageData.access_token.length}`);
                }
                return {
                    pageAccessToken: pageData.access_token,
                    igUserId: pageData.instagram_business_account.id
                };
            } else {
                console.warn(`[Instagram API] Configured Page ${envPageId} found but has no IG Business Account linked.`);
            }
        } catch (e) {
            console.error(`[Instagram API] Failed to fetch configured Page ID ${envPageId}:`, e);
        }
    }

    const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=access_token,instagram_business_account,name&access_token=${initialToken}`;
    const pagesResponse = await fetch(pagesUrl);
    const pagesData = await pagesResponse.json();

    if (pagesData.error) {
        // If we can't list pages, we can't proceed
        console.error('[Instagram API] Failed to list pages:', pagesData.error);
        throw new Error(`Instagram Context Error: ${data.error?.message || 'Could not resolve Instagram Account'}`);
    }

    if (pagesData.data && Array.isArray(pagesData.data)) {
        console.log(`[Instagram API] Found ${pagesData.data.length} linked Pages.`);
        pagesData.data.forEach((p: any) => {
            console.log(`- Page: "${p.name}" (ID: ${p.id}) | Has IG: ${p.instagram_business_account ? 'YES (' + p.instagram_business_account.id + ')' : 'NO'}`);
        });

        // Find the first page that has an Instagram Business Account linked
        const validPage = pagesData.data.find((page: any) => page.instagram_business_account?.id);

        if (validPage) {
            console.log(`[Instagram API] Selected Page: "${validPage.name}"`);
            return {
                pageAccessToken: validPage.access_token,
                igUserId: validPage.instagram_business_account.id
            };
        }
    } else {
        console.log('[Instagram API] No pages found in list.');
    }

    throw new Error('No Instagram Business Account found. Ensure your User Token has "pages_show_list" and "instagram_basic" permissions, and you have a Page linked to an Instagram Business account.');
}

/**
 * Fetches the public profile of an Instagram user.
 */
export async function getInstagramUserProfile(userId: string) {
    if (!process.env.INSTAGRAM_ACCESS_TOKEN) return null;

    try {
        const { pageAccessToken } = await resolveInstagramContext(process.env.INSTAGRAM_ACCESS_TOKEN);

        // Fields: name, profile_pic
        // Note: 'username' field IS available for IGSIDs on v12.0+ if the user granted permission to the *page*.
        // We request name, username, and profile_pic.
        // If the user hasn't granted granular permissions, some fields might be missing or the call might fail.
        // Note: 'username' field IS available for IGSIDs on v12.0+ if the user granted permission to the *page*.
        // We request name, username, and profile_pic.
        // If the user hasn't granted granular permissions, some fields might be missing or the call might fail.
        const url = `https://graph.instagram.com/v21.0/${userId}?fields=name,username,profile_pic&access_token=${pageAccessToken}`;

        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`[Instagram API] Failed to fetch profile for ${userId}: ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        return {
            name: data.name,
            username: data.username,
            profile_pic: data.profile_pic
        };

    } catch (error) {
        console.error('[Instagram API] Error fetching user profile:', error);
        return null;
    }
}

/**
 * Sends a text message to an Instagram user via the Graph API.
 * @param recipientId The Instagram-scoped User ID (IGSId) of the recipient.
 * @param text The message text to send.
 */
export async function sendInstagramMessage(recipientId: string, text: string) {
    if (!process.env.INSTAGRAM_ACCESS_TOKEN) {
        console.error('[Instagram API] Missing INSTAGRAM_ACCESS_TOKEN env var');
        throw new Error('Missing Instagram Access Token');
    }
    const initialToken = process.env.INSTAGRAM_ACCESS_TOKEN;

    try {
        // 1. Resolve Context (Page Token + IG User ID)
        // This handles automatic exchange if the user provided a User Token
        const { pageAccessToken, igUserId } = await resolveInstagramContext(initialToken);

        console.log(`[Instagram API] Sending as IG Business User: ${igUserId}`);

        // 2. Send Message to the correct endpoint
        // User reported success with graph.instagram.com and IGAAQ token
        const host = 'graph.instagram.com';
        const version = 'v21.0';
        const url = `https://${host}/${version}/${igUserId}/messages?access_token=${pageAccessToken}`;

        const body = {
            recipient: {
                id: recipientId
            },
            message: {
                text: text
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('[Instagram API Error]', data);
            throw new Error(data.error?.message || 'Failed to send message');
        }

        console.log(`[Instagram API] Message sent successfully to ${recipientId}`);
        return data;

    } catch (error) {
        console.error('[Instagram API] Exception:', error);
        throw error; // Re-throw to be handled by caller
    }
}
