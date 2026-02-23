/**
 * Fetches the public profile of a Facebook Messenger user.
 */
export async function getFacebookUserProfile(userId: string) {
    if (!process.env.FACEBOOK_PAGE_ACCESS_TOKEN) return null;

    try {
        const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
        const url = `https://graph.facebook.com/v19.0/${userId}?fields=name,profile_pic&access_token=${pageAccessToken}`;

        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`[Messenger API] Failed to fetch profile for ${userId}: ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        return {
            name: data.name,
            username: data.id, // Messenger doesn't typically expose username the same way, using ID as fallback
            profile_pic: data.profile_pic
        };

    } catch (error) {
        console.error('[Messenger API] Error fetching user profile:', error);
        return null;
    }
}

/**
 * Sends a text message to a Facebook Messenger user via the Graph API.
 * @param recipientId The Page-Scoped User ID (PSID) of the recipient.
 * @param text The message text to send.
 */
export async function sendMessengerMessage(recipientId: string, text: string) {
    if (!process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
        console.error('[Messenger API] Missing FACEBOOK_PAGE_ACCESS_TOKEN env var');
        throw new Error('Missing Facebook Page Access Token');
    }
    const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

    try {
        console.log(`[Messenger API] Sending to PSID: ${recipientId}`);

        const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`;

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
            console.error('[Messenger API Error]', data);
            throw new Error(data.error?.message || 'Failed to send message');
        }

        console.log(`[Messenger API] Message sent successfully to ${recipientId}`);
        return data;

    } catch (error) {
        console.error('[Messenger API] Exception:', error);
        throw error; // Re-throw to be handled by caller
    }
}
