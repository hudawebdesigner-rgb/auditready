# Phase 0 — Your setup checklist

Total time: about 30–40 minutes. You only need a web browser — nothing to install.

> **Golden rule for keys:** never paste an API key or password into a chat,
> email, or a file in GitHub. Each step below tells you exactly where a key goes.

---

## Accounts you need (and when)

| Account | Cost | Needed for | Status |
|---|---|---|---|
| GitHub | Free | Stores the code | ✅ You already have it — the code lives at `github.com/hudawebdesigner-rgb/auditready` |
| Supabase | Free to start (Pro is $25/mo later if needed) | Database, logins, background jobs | **Now — Step 1** |
| Netlify | Free (commercial use allowed) | Puts the website online | **Now — Step 6** |
| Traject Data (Rainforest + BlueCart) | ~$15–18/mo per API to start | Amazon + Walmart seller data | Phase 1 |
| Cobalt Intelligence | Quote-based — ask for a trial | Legal entity + registered agent | Phase 1 |
| Apollo.io | Free plan to test; paid (~$49–59/user/mo) for full API | Business + owner contacts | Phase 1 |

You can sign up for the Phase 1 accounts now (see the bottom of this page), but
**don't buy paid plans yet** — we'll pick the smallest plan once the POC shows real usage.

---

## Step 1 — Create the Supabase project

1. Go to **https://supabase.com** and click **Start your project**.
2. Choose **Continue with GitHub** (easiest — no new password to remember).
3. Click **New project**. Fill in:
   - **Name:** `seller-intelligence`
   - **Database Password:** click **Generate a password**, then save it in your
     password manager. (You will rarely need it, but don't lose it.)
   - **Region:** an **East US** option (closest to the APIs we'll use).
   - **Plan:** Free.
4. Click **Create new project** and wait ~2 minutes until the dashboard loads.

## Step 2 — Copy your two public settings

1. In the left sidebar click the **gear icon (Project Settings)**.
2. Open **Data API** (or **API**) and copy the **Project URL** — it looks like
   `https://abcdxyz.supabase.co`.
3. Open **API Keys** and copy the **anon / public** key (newer projects call it the
   **Publishable key**, starting `sb_publishable_…`). Either works.
4. Paste both into a private note for Step 6.

> ⚠️ On the same page there is a **service_role / secret** key. **Do not copy it
> anywhere.** It bypasses all security. Our background jobs get it automatically.

## Step 3 — Create the database tables

1. Open this file in your browser:
   `https://github.com/hudawebdesigner-rgb/auditready/blob/claude/fervent-bardeen-zrik7i/supabase/migrations/20261117000000_initial_schema.sql`
2. Click the **Copy raw file** button (two overlapping squares, top-right of the file).
3. In Supabase, click **SQL Editor** in the left sidebar → **New query** (or the **+**).
4. Paste (Ctrl+V / Cmd+V) and click **Run** (bottom-right).
5. You should see **"Success. No rows returned"**.
   - If you get an error, copy the red error text and send it to me.
   - Run it **only once**. Running it twice gives "already exists" errors (harmless,
     but tell me if it happens).

## Step 4 — Lock down sign-ups and create your logins

Only you and your boss should be able to log in.

1. Left sidebar → **Authentication** → **Sign In / Providers** (on some versions:
   **Authentication → Settings**).
2. Turn **OFF** "Allow new users to sign up" and click **Save**.
3. Go to **Authentication → Users** → **Add user** → **Create new user**.
4. Enter **your email** and a strong password, tick **Auto Confirm User**, click **Create user**.
5. Repeat for **your boss's email**.

## Step 5 — Put both emails on the team allowlist

Even with a login, the database shows **no data** unless the email is on the allowlist.

1. **SQL Editor** → **New query**.
2. Paste this, replacing the two emails (keep the quotes, use **lowercase**):

   ```sql
   insert into public.team_allowed_emails (email, role) values
     ('you@yourcompany.com',  'admin'),
     ('boss@yourcompany.com', 'admin');
   ```
3. Click **Run** → "Success. No rows returned".

(`admin` can change settings and delete records. If you'd like your boss to be
view-and-edit only, use `'member'` for them instead.)

## Step 6 — Put the website online with Netlify

1. Go to **https://app.netlify.com/signup** → **Sign up with GitHub** → approve.
2. Click **Add new project** (or **Add new site**) → **Import an existing project** → **GitHub**.
3. If asked, click **Configure the Netlify app on GitHub** and give it access to
   the **auditready** repository, then come back.
4. Pick **auditready**.
5. **Branch to deploy:** choose **`claude/fervent-bardeen-zrik7i`** (that's where my
   work is; we'll switch to `main` later).
6. Build settings fill in automatically (`npm run build`, publish `dist`) — leave them.
7. Click **Add environment variables** (or after creating: **Site configuration →
   Environment variables → Add a variable**) and add these two:

   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | the Project URL from Step 2 |
   | `VITE_SUPABASE_ANON_KEY` | the anon / publishable key from Step 2 |

8. Click **Deploy**. After 1–2 minutes you'll get a link like
   `https://something-123.netlify.app`.
   - If you added the variables *after* the first deploy: **Deploys → Trigger deploy →
     Deploy site** so it picks them up.

## Step 7 — Test it ✅

1. Open your Netlify link.
2. Sign in with your email and password from Step 4.
3. The **Setup check** page should show **all green ticks**:
   - App settings · Supabase reachable · Signed in · Database tables installed ·
     You are on the team allowlist · Security rules let you read data
4. You'll also see the default pipeline settings (US only = Yes, Apollo daily limit = 50, …).
5. Send me a screenshot, or tell me which line is red and what it says.

---

## Phase 1 accounts (start these now — approval can take a few days)

**Traject Data (Rainforest API + BlueCart API)**
1. Go to **https://trajectdata.com** → sign up.
2. Look for a free trial or the smallest plan for **Rainforest API** (Amazon) and
   **BlueCart API** (Walmart). Don't buy yet — tell me what the trial includes.

**Cobalt Intelligence**
1. Go to **https://cobaltintelligence.com** → **Get API key / Free trial / Book a demo**.
2. Say you need: US Secretary of State business search across all 50 states, including
   **registered agent**, for about 100 lookups (pilot), then a few hundred to a few
   thousand per month.

**Apollo.io**
1. Go to **https://www.apollo.io** → **Sign up for free**.
2. Don't buy a plan yet. In Phase 1 I'll tell you exactly which API calls we use, so
   we can check whether the free plan is enough for the pilot.

**When you get each API key:** don't send it to me. In Phase 1 I'll show you how to
save it in **Supabase → Edge Functions → Secrets** (two clicks, no code).
