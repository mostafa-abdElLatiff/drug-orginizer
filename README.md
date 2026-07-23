# أدويتي — Drug Organizer

Arabic mobile web app to photograph a prescription, auto-extract the drug list, review/edit
name & quantity per drug, attach a photo per drug, and send a ready-made Arabic summary
to a pharmacy over WhatsApp (via a pre-filled `wa.me` link).

Built entirely on free tiers: Next.js on Vercel, Supabase (Postgres + Storage), Google
Gemini API for image extraction, WhatsApp `wa.me` links (no paid Business API).

## One-time setup (outside of code)

1. **Gemini API key** — go to [Google AI Studio](https://aistudio.google.com), sign in,
   create a free API key (no credit card required).
2. **Supabase project** — create a free project at [supabase.com](https://supabase.com):
   - Settings → API: copy the Project URL and the `anon public` key.
   - SQL Editor: paste and run `supabase/schema.sql`.
   - Storage: create a **public** bucket named `drug-photos`.
3. **Pharmacy WhatsApp number** — full international format, no `+` and no leading zero
   (e.g. `20xxxxxxxxxx` for an Egyptian number).
4. Copy `.env.local.example` to `.env.local` and fill in the four values:
   ```
   GEMINI_API_KEY=
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   NEXT_PUBLIC_PHARMACY_WHATSAPP_NUMBER=
   ```

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (free)

Push to a GitHub repo, import it into [Vercel](https://vercel.com) (free Hobby plan),
and add the same four environment variables in Project Settings → Environment Variables.

Note: a Supabase free-tier project auto-pauses after ~7 days with no activity — if the
app stops loading after a quiet week, just open the Supabase dashboard and restore it
(one click).
