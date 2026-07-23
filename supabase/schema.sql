-- Safe to re-run top to bottom any time -- every statement is idempotent
-- (if-not-exists / create-or-replace / drop-then-create for policies), so
-- pasting the whole file again after a change never errors on "already exists".

-- One-time manual step, independent of this file (dashboard, not SQL), needed
-- before running scripts/provision-family.mjs:
-- Authentication -> Sign In / Providers -> Email -> set "Minimum password
-- length" to 6 or lower and no letter/symbol requirement, so plain 6-digit
-- numeric PINs are accepted as passwords. ("Leaked Password Protection" is a
-- Pro-plan-only feature -- it won't appear on the free tier, nothing to do there.)

create table if not exists scans (
  id uuid primary key default gen_random_uuid(),
  image_url text,
  raw_response jsonb,
  created_at timestamptz not null default now()
);

create table if not exists medicines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  dosage text,
  timing text,
  quantity text,
  photo_url text,
  source text not null default 'manual',
  scan_id uuid references scans(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table scans enable row level security;
alter table medicines enable row level security;

-- Buckets are just rows in storage.buckets, so this can be done in SQL too --
-- no need to also click "New bucket" in the dashboard.
insert into storage.buckets (id, name, public)
values ('drug-photos', 'drug-photos', true)
on conflict (id) do nothing;

-- Reference data: a snapshot of Egypt's registered drug market (local +
-- imported), used to fuzzy-match/correct whatever the AI reads off a photo
-- against real drug names instead of trusting the OCR guess as-is.
-- Source: https://github.com/karem505/egyptian-drug-database (CC0), ~25k rows.
-- Seed this table by importing data/egyptian-drugs.csv from that repo via
-- Supabase Dashboard -> Table Editor -> drug_reference -> Import data.
create extension if not exists pg_trgm;

create table if not exists drug_reference (
  id bigint generated always as identity primary key,
  name_en text not null,
  name_ar text,
  scientific_name text,
  manufacturer text,
  drug_class text,
  route text,
  price_egp numeric
);

create index if not exists drug_reference_name_en_trgm on drug_reference using gin (name_en gin_trgm_ops);
create index if not exists drug_reference_scientific_name_trgm on drug_reference using gin (scientific_name gin_trgm_ops);

-- Read-only from the app's side -- this table is seeded once by us, never
-- written to by end users, so anon only ever needs select.
alter table drug_reference enable row level security;
drop policy if exists "public read drug_reference" on drug_reference;
create policy "public read drug_reference" on drug_reference for select using (true);
grant select on table public.drug_reference to anon, authenticated;

-- Exposes trigram similarity search through a single RPC call, since that's
-- not expressible via PostgREST's plain filter syntax.
create or replace function match_drug_name(query text, match_count int default 5)
returns table (name_en text, name_ar text, scientific_name text, score real)
language sql stable
as $$
  select name_en, name_ar, scientific_name, similarity(name_en, query) as score
  from drug_reference
  where name_en % query
  order by score desc
  limit match_count;
$$;

grant execute on function match_drug_name(text, int) to anon, authenticated;

-- ===========================================================================
-- Per-user accounts + friend sharing
-- ===========================================================================
-- Each family member is a real Supabase Auth user (auth.users row), created
-- by scripts/provision-family.mjs with a synthetic email and a 6-digit PIN
-- as their password. Login is "first name + PIN" (resolved to that synthetic
-- email via resolve_login_email() below), not email/password directly.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

alter table profiles enable row level security;
alter table friendships enable row level security;

-- No anon/public select at all -- login never reads this table directly (it
-- goes through resolve_login_email(), which returns only an email string),
-- and invite codes are only ever consumed through add_friend(), never read
-- directly. Authenticated users can see their own profile and their friends'
-- (needed to display friend names in the UI).
drop policy if exists "self and friends select" on profiles;
create policy "self and friends select" on profiles for select to authenticated
  using (
    auth.uid() = id
    or exists (select 1 from friendships f where f.user_id = auth.uid() and f.friend_id = profiles.id)
  );
-- No insert/update policy for authenticated: profiles are only ever created
-- by scripts/provision-family.mjs (service_role, bypasses RLS).

drop policy if exists "own friendships select" on friendships;
create policy "own friendships select" on friendships for select to authenticated
  using (auth.uid() = user_id);
-- No direct insert/update/delete policy -- all writes go through add_friend()
-- below, so a friendship can never be created one-directionally by accident
-- or by a client bypassing the invite-code exchange.

grant select on table public.profiles, public.friendships to authenticated;

-- The only pre-login-readable surface: given a typed first name, returns just
-- the matching synthetic email (or null), never the whole profiles table.
create or replace function resolve_login_email(name_input text)
returns text
language sql stable
security definer
set search_path = public, pg_temp
as $$
  select u.email from profiles p
  join auth.users u on u.id = p.id
  where lower(trim(p.display_name)) = lower(trim(name_input))
  limit 1;
$$;
grant execute on function resolve_login_email(text) to anon, authenticated;

-- Adding a friend by their invite code connects both directions in one shot,
-- so the other person never has to separately add you back.
create or replace function add_friend(invite_code_input text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_id uuid;
begin
  select id into target_id from profiles where invite_code = invite_code_input;
  if target_id is null then
    raise exception 'invite code not found';
  end if;
  if target_id = auth.uid() then
    raise exception 'cannot add yourself';
  end if;
  insert into friendships (user_id, friend_id) values (auth.uid(), target_id) on conflict do nothing;
  insert into friendships (user_id, friend_id) values (target_id, auth.uid()) on conflict do nothing;
end;
$$;
grant execute on function add_friend(text) to authenticated;

-- Ownership on the existing tables. Run only once medicines/scans are
-- confirmed empty -- this adds owner_id as not null with no backfill step.
alter table medicines add column if not exists owner_id uuid references auth.users(id);
alter table scans add column if not exists owner_id uuid references auth.users(id);
alter table medicines alter column owner_id set default auth.uid();
alter table scans alter column owner_id set default auth.uid();
alter table medicines alter column owner_id set not null;
alter table scans alter column owner_id set not null;

-- No end-user auth was in place before this; that's no longer true, so anon
-- loses all access to these tables.
revoke all on medicines, scans from anon;
grant select, insert, update, delete on table public.scans, public.medicines to authenticated;

drop policy if exists "public all" on scans;
drop policy if exists "public all" on medicines;
drop policy if exists "owner all" on scans;
drop policy if exists "owner all" on medicines;
create policy "owner all" on scans for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner all" on medicines for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Pending review queue for family members sending each other their list.
-- Nothing here ever touches the recipient's real medicines row until they
-- explicitly accept it via accept_shares() below.
create table if not exists shared_items (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id),
  to_user_id uuid not null references auth.users(id),
  name text not null,
  dosage text,
  timing text,
  quantity text,
  photo_url text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  check (from_user_id <> to_user_id)
);

alter table shared_items enable row level security;

-- Insert must be pre-pinned to 'pending' (stops a sender self-approving
-- their own share) and the recipient must already be a friend.
drop policy if exists "sender insert" on shared_items;
create policy "sender insert" on shared_items for insert to authenticated
  with check (
    auth.uid() = from_user_id and status = 'pending'
    and exists (select 1 from friendships f where f.user_id = auth.uid() and f.friend_id = shared_items.to_user_id)
  );

drop policy if exists "participants select" on shared_items;
create policy "participants select" on shared_items for select to authenticated
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- Recipient can only flip a still-pending row to accepted/rejected; the
-- column-level grant below stops them from rewriting anything else (e.g.
-- reassigning from_user_id) during that update.
drop policy if exists "recipient update status" on shared_items;
create policy "recipient update status" on shared_items for update to authenticated
  using (auth.uid() = to_user_id and status = 'pending')
  with check (auth.uid() = to_user_id and status in ('accepted', 'rejected'));

grant select, insert on table public.shared_items to authenticated;
grant update (status) on table public.shared_items to authenticated;

-- Single/bulk accept in one atomic statement pair -- share_ids = null means
-- "accept everything currently pending", so tapping one item and tapping
-- "accept all" both go through this exact same tested path.
create or replace function accept_shares(share_ids uuid[] default null)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  insert into medicines (name, dosage, timing, quantity, photo_url, source, owner_id)
  select name, dosage, timing, quantity, photo_url, 'shared', auth.uid()
  from shared_items
  where to_user_id = auth.uid() and status = 'pending'
    and (share_ids is null or id = any(share_ids));

  update shared_items set status = 'accepted'
  where to_user_id = auth.uid() and status = 'pending'
    and (share_ids is null or id = any(share_ids));
end;
$$;
grant execute on function accept_shares(uuid[]) to authenticated;

-- Storage: public read stays (an accepted share's photo must stay viewable
-- across both accounts without a copy/re-upload step), writes restricted to
-- signed-in users only -- previously this bucket allowed anonymous writes.
drop policy if exists "public all drug-photos" on storage.objects;
drop policy if exists "public read drug-photos" on storage.objects;
create policy "public read drug-photos" on storage.objects for select
  using (bucket_id = 'drug-photos');
drop policy if exists "authenticated write drug-photos" on storage.objects;
create policy "authenticated write drug-photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'drug-photos');
drop policy if exists "authenticated update drug-photos" on storage.objects;
create policy "authenticated update drug-photos" on storage.objects for update to authenticated
  using (bucket_id = 'drug-photos') with check (bucket_id = 'drug-photos');
drop policy if exists "authenticated delete drug-photos" on storage.objects;
create policy "authenticated delete drug-photos" on storage.objects for delete to authenticated
  using (bucket_id = 'drug-photos');
