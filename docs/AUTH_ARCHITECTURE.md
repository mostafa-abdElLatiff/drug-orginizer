# Accounts, Friends & Sharing — How It Works

## Files — what each one does

**Database (`supabase/schema.sql`)**
- `profiles` — one row per family member (`display_name`, `invite_code`). No public read at all — the only ways in are two narrow functions below.
- `friendships` — `(user_id, friend_id)` pairs. No direct insert/update policy — the *only* way a row gets created is through `add_friend()`.
- `resolve_login_email(name)` — takes a typed first name, returns just that person's synthetic login email (or nothing). This is the only thing the login screen is allowed to read before you're signed in.
- `add_friend(code)` — looks up whoever owns that invite code and inserts **both** `(you, them)` and `(them, you)` friendship rows in one shot, so they never have to add you back separately.
- `medicines` / `scans` — gained an `owner_id` column, defaulting automatically to whoever's signed in. The old "anyone can see everything" policy is gone, replaced by `owner_id = auth.uid()` — enforced by Postgres itself, not by the app's UI.
- `shared_items` — the pending-review queue. A row only gets in via `sender insert`, which forces `status = 'pending'` (a sender can't self-approve their own share) and requires the recipient to already be a friend.
- `accept_shares(share_ids?)` — one atomic function for both "accept this one" and "accept all": inserts the matching pending rows into `medicines` and flips their status in a single transaction, so a network blip can't leave things half-accepted or double-inserted.
- Storage policy for `drug-photos` — was fully open (read *and write*) to any anonymous visitor; now read stays public, but upload/overwrite/delete requires being signed in.

**Provisioning (`scripts/provision-family.mjs`)** — a script you run locally, not part of the deployed app. Edit the name/PIN list at the top, run it once with a temporary `service_role` key, and it creates each person's real Supabase Auth account + profile row + invite code. Re-run any time to add someone new.

**App code**
- `lib/auth.ts` — `resolveLoginEmail`, `signInWithPin`, `signOut`, session helpers.
- `lib/friends.ts` — fetch your own profile, list your friends, add one by code.
- `lib/sharing.ts` — send your list to a friend, list what's pending for you, accept (one or all), reject.
- `components/AuthGuard.tsx` — wraps the whole app (via `app/layout.tsx`); if there's no session, it redirects to `/login`. This is a UX nicety only — real protection is the database policies above, which hold no matter what the screen shows.
- `app/login/page.tsx` — name + PIN form.
- `app/friends/page.tsx` — your invite code, an "add friend" box, your friend list, and the pending queue with per-item accept/reject plus "قبول الكل".
- `app/page.tsx` — added a friends/pending-count link, an "إرسال إلى صديق" button, and logout.

## How it all connects — event by event

- **You open the app** → `AuthGuard` checks for a session → none yet → redirected to `/login`.
- **You type a name + PIN, tap دخول** → browser calls `resolve_login_email` (DB function) to get your email → browser calls Supabase's own `signInWithPassword` directly with that email + PIN → session created → redirected home. No custom server-side login code at all; Supabase Auth does the real work.
- **Home page loads** → your now-authenticated browser queries `medicines` directly → Postgres RLS silently filters to only your rows → you see your own list, automatically, with zero extra code needed for the scoping.
- **You add a medicine** → same insert code as before → `owner_id` fills itself in from your session, no code change needed there either.
- **You add a friend by code** → calls `add_friend()` → both directions connected in one DB round-trip.
- **You tap "إرسال إلى صديق"** → picks a friend → inserts one `shared_items` row per medicine, `status='pending'`.
- **They open `/friends`** → sees your items under "عناصر مقترحة" → taps one to accept (or "قبول الكل") → `accept_shares()` runs → the item(s) land in *their* `medicines` table with `source: 'shared'`, and the queue entries flip to accepted. Reject just flips status, nothing gets copied.
