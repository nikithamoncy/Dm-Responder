# Instagram AI Bot - Simple Setup Guide

Welcome! This guide will help you set up your own AI Instagram Auto-Responder.
**You do NOT need to be a coder to do this.** Just follow these steps exactly, one by one.

---

## **Part 1: Accounts You Need**
Before we start, make sure you have free accounts on these 5 websites. Log in to all of them.

1.  **GitHub** (To store your code).
2.  **Vercel** (To put your bot on the internet).
3.  **Supabase** (To store your data).
4.  **Google AI Studio** (To give your bot a brain).
5.  **Facebook Developers** (To connect to Instagram).

---

## **Part 2: Get the Code**

1.  **Download** this code to your computer (or "Clone" it if you know how).
2.  Open the folder on your computer.

---

## **Part 3: The "Keys" File (.env.local)**

Your bot needs passwords to work. We store them in a special file.

1.  Inside the code folder, create a new file named `.env.local`
    *(Make sure it starts with a dot!)*
2.  Copy and Paste the text below into that file. We will fill in the blanks later.

```ini
# --- SUPABASE (Database) ---
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# --- GOOGLE (The Brain) ---
GOOGLE_GEMINI_API_KEY=

# --- INSTAGRAM (The Connection) ---
INSTAGRAM_VERIFY_TOKEN=my_secret_password_123
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_PAGE_ID=
INSTAGRAM_USER_ID=

# --- SETTINGS ---
APP_TIMEZONE=Asia/Kolkata
```

---

## **Part 4: Setup the Database (Supabase)**

1.  Go to **Supabase.com** and click **"New Project"**.
2.  Give it a name (e.g., "My Insta Bot") and a password. Wait for it to set up (takes ~1 minute).
3.  **Get your Keys**:
    - Go to **Project Settings** (Gear icon) -> **API**.
    - Copy the `Project URL` -> Paste it into your `.env.local` file after `NEXT_PUBLIC_SUPABASE_URL=`.
    - Copy the `service_role` key (click "Reveal") -> Paste it after `SUPABASE_SERVICE_ROLE_KEY=`.
4.  **Setup Tables**:
    - Click **SQL Editor** in the left sidebar (looks like a terminal icon `>_`).
    - Open the file `final_setup.sql` from your code folder.
    - Copy EVERYTHING inside that file.
    - Paste it into the SQL Editor on Supabase.
    - Click **RUN** (Green button).
    - You should see "Success".

---

## **Part 5: Give it a Brain (Google)**

1.  Go to **Google AI Studio**.
2.  Click **"Get API Key"**.
3.  Click **"Create API Key"**.
4.  Copy the key (it looks like a long code).
5.  Paste it into your `.env.local` file after `GOOGLE_GEMINI_API_KEY=`.

---

## **Part 6: Connect to Instagram (The Tricky Part)**

*Take this slow. This is the hardest step.*

### Step A: Create the App
1.  Go to **developers.facebook.com** -> **My Apps**.
2.  Click **Create App**.
3.  Select **"Other"** -> **Next**.
4.  Select **"Business"** -> **Next**.
5.  Give it a name (e.g., "My Insta Bot") -> **Create App**.

### Step B: Add Instagram
1.  On the "Add Products" screen, find **Instagram Graph API**.
2.  Click **"Set up"**.
3.  On the left, go to **App Settings** -> **Basic**.
4.  Scroll down to "Add Platform" -> Select **Website**.
5.  Enter `https://google.com` for now (we will change this later). Save Changes.

### Step C: Generate the Magic Token
1.  In the top menu, verify you are in your new App.
2.  Go to **Tools** -> **Graph API Explorer**.
3.  **Permissions** (Right side):
    - Click "Add a Permission". Search and select these 5:
    - `instagram_basic`
    - `instagram_manage_messages`
    - `pages_show_list`
    - `pages_messaging`
    - `business_management`
4.  **Generate**:
    - Click **"Generate Access Token"**.
    - A popup will appear asking you to log in. **Select your Facebook Business Page** and your **Instagram Account**.
    - **IMPORTANT**: Give it ALL permissions.
5.  **Copy Token**:
    - You will see a long code in the "Access Token" box.
    - Copy it and paste it into `.env.local` after `INSTAGRAM_ACCESS_TOKEN=`.
    - *Note: This token MUST start with `IGA...` or `EAA...`. Ideally use the one calling "User Token".*

### Step D: Get IDs
1.  In the Graph Explorer, change the address bar to `GET /me/accounts` and click **Submit**.
    - Find the `id` (numbers). Paste it into `.env.local` after `INSTAGRAM_PAGE_ID=`.
2.  Change address bar to `GET /me?fields=instagram_business_account` and click **Submit**.
    - Copy the `id` number inside `instagram_business_account`.
    - Paste it into `.env.local` after `INSTAGRAM_USER_ID=`.

**Check:** Your `.env.local` file should now be full!

---

## **Part 7: Put it Online (Vercel)**

1.  Go to **Vercel.com** -> **Add New** -> **Project**.
2.  Import from GitHub.
3.  **Environment Variables**:
    - Open your `.env.local` file.
    - Copy everything.
    - Paste it into the "Environment Variables" section on Vercel.
4.  Click **Deploy**.
5.  Wait for the confetti! 🎉
6.  **Copy your Domain**: It receives a link like `https://my-bot.vercel.app`. Copy this.

---

## **Part 8: The Final Handshake**

1.  Go back to **Facebook Developers** -> Your App.
2.  On the left, click **Instagram Graph API** -> **Webhooks**.
3.  Click **"Subscribe to this object"**.
4.  **Callback URL**: Paste your Vercel link + `/api/instagram-webhook`
    - Example: `https://my-bot.vercel.app/api/instagram-webhook`
5.  **Verify Token**: Type `my_secret_password_123` (or whatever you put in `.env.local`).
6.  Click **Verify and Save**.
7.  Scroll down to `messages`. Click **Subscribe**.

---

## **Part 9: Test It!**

1.  Open Instagram on your phone.
2.  Send a message "Hello" to your Page.
3.  Wait 5 seconds.
4.  If it replies... **YOU ARE DONE!** 🚀
