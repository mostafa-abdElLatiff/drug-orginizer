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

-- After running this, also create a PUBLIC storage bucket named `drug-photos`
-- via Supabase Dashboard -> Storage -> New bucket.
