-- Run this in the Supabase SQL editor (Supabase dashboard -> SQL Editor -> New query)

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  price numeric not null,
  area text not null,
  bedrooms text not null,
  furnished boolean not null default false,
  pets_ok boolean not null default false,
  description text,
  contact text not null,
  photo_url text,
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  source text not null default 'submission',
  flagged boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

alter table listings enable row level security;

-- Anyone can submit a listing, and it goes live immediately (auto-approved)
create policy "anyone can submit a listing"
on listings for insert
to anon
with check (status = 'approved');

-- Anyone can view listings that have been approved and haven't expired
create policy "public can view approved unexpired listings"
on listings for select
to anon
using (status = 'approved' and expires_at > now());

-- Deleting/moderating listings happens via the /admin page, which uses the
-- service role key (bypasses RLS) rather than a dedicated anon policy.

-- Anyone can flag a listing as suspicious. This runs as a fixed-purpose
-- function (rather than a general anon UPDATE policy) so the public can
-- only ever set flagged = true, never touch price/contact/status/etc.
create or replace function flag_listing(listing_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update listings set flagged = true where id = listing_id;
$$;

grant execute on function flag_listing(uuid) to anon;
