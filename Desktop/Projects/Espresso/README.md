# EspressoMap

A community-driven map for rating espresso shots around the world. Find the best cup near you, or log the one you just drank.

Built with **Vite + React + Tailwind CSS + Leaflet + Supabase**.

---

## 1. Supabase Setup

### Create a project
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **anon public key** (Settings → API).

### Run the schema
1. Open the **SQL Editor** in your Supabase dashboard.
2. Paste the entire contents of `supabase/schema.sql` and click **Run**.
3. The script creates the `venues` and `reviews` tables, indexes, the venue-stats trigger, and all RLS policies.

### Create the storage bucket
1. In the Supabase dashboard go to **Storage**.
2. Click **New bucket**, name it exactly `review-photos`, and enable **Public bucket**.
3. The RLS policies for the bucket were already applied by the schema script.

### Disable email confirmation (for easier onboarding)
1. Go to **Authentication → Providers → Email**.
2. Toggle **Confirm email** off (or leave on for production).

### Create your admin / first user
1. Go to **Authentication → Users → Invite user**.
2. Enter your email and send the invite, or use **Add user** to create one directly.

---

## 2. Local Development

```bash
# 1. Copy the example env file
cp .env.example .env.local

# 2. Fill in your Supabase credentials in .env.local
#    VITE_SUPABASE_URL=https://xxxx.supabase.co
#    VITE_SUPABASE_ANON_KEY=eyJ...

# 3. Install dependencies
npm install

# 4. Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## 3. Vercel Deployment

1. Push the repository to GitHub.
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo.
3. In the project settings add two **Environment Variables**:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon key
4. Click **Deploy**. The `vercel.json` rewrite rule ensures client-side routing works.

---

## 4. Opening Phase 2 (Public Sign-Ups)

The app currently requires an authenticated user to submit reviews. The RLS policies are already configured to allow **any** authenticated user to write — so enabling public sign-ups is a one-line config change:

1. Go to **Authentication → Providers → Email** in your Supabase dashboard.
2. Make sure **Enable Email provider** is on.
3. Optionally add a sign-up form to the `LoginPage` component (or create a separate `SignUpPage`).

That's it — the database, storage, and RLS rules need no changes.

---

## Architecture Notes

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS 3 |
| Map | Leaflet 1.9, OpenStreetMap tiles |
| Backend / DB | Supabase (Postgres + Auth + Storage) |
| Geocoding | Nominatim (OSM, free, no API key) |
| Hosting | Vercel |

### Key files

- `src/pages/HomePage.jsx` — map + list with real-time venue data
- `src/pages/VenuePage.jsx` — venue detail + review list
- `src/pages/ReviewPage.jsx` — mobile-first review submission flow
- `src/components/MapComponent.jsx` — Leaflet integration with custom markers
- `supabase/schema.sql` — full DB schema, trigger, RLS, and storage policies
