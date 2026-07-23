-- Run this once in the Supabase SQL editor for your project.

create table scans (
  id uuid primary key default gen_random_uuid(),
  image_url text,
  raw_response jsonb,
  created_at timestamptz not null default now()
);

create table medicines (
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

-- No end-user auth in v1 (link-only access), so policies are fully open.
create policy "public all" on scans for all using (true) with check (true);
create policy "public all" on medicines for all using (true) with check (true);

-- Needed because "Automatically expose new tables" is turned off in project
-- settings (recommended) -- these two tables are the only ones we intend to
-- expose via the Data API, so we grant them explicitly instead of relying on
-- every future table being exposed automatically.
grant select, insert, update, delete on table public.scans to anon, authenticated;
grant select, insert, update, delete on table public.medicines to anon, authenticated;

-- Buckets are just rows in storage.buckets, so this can be done in SQL too --
-- no need to also click "New bucket" in the dashboard.
insert into storage.buckets (id, name, public)
values ('drug-photos', 'drug-photos', true)
on conflict (id) do nothing;

-- The "public" flag on a bucket only allows reading files -- storage.objects
-- has its own RLS, separate from the tables above, and still blocks uploads
-- without an explicit policy. No end-user auth in v1, so this is fully open
-- too, scoped to just this one bucket.
create policy "public all drug-photos" on storage.objects for all
  using (bucket_id = 'drug-photos')
  with check (bucket_id = 'drug-photos');

-- Reference data: a snapshot of Egypt's registered drug market (local +
-- imported), used to fuzzy-match/correct whatever the AI reads off a photo
-- against real drug names instead of trusting the OCR guess as-is.
-- Source: https://github.com/karem505/egyptian-drug-database (CC0), ~25k rows.
-- Seed this table by importing data/egyptian-drugs.csv from that repo via
-- Supabase Dashboard -> Table Editor -> drug_reference -> Import data.
create extension if not exists pg_trgm;

create table drug_reference (
  id bigint generated always as identity primary key,
  name_en text not null,
  name_ar text,
  scientific_name text,
  manufacturer text,
  drug_class text,
  route text,
  price_egp numeric
);

create index drug_reference_name_en_trgm on drug_reference using gin (name_en gin_trgm_ops);
create index drug_reference_scientific_name_trgm on drug_reference using gin (scientific_name gin_trgm_ops);

-- Read-only from the app's side -- this table is seeded once by us, never
-- written to by end users, so anon only ever needs select.
alter table drug_reference enable row level security;
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
