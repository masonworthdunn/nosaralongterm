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
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  source text not null default 'submission',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

alter table listings enable row level security;

-- Anyone can submit a listing (it starts as pending, invisible to the public)
create policy "anyone can submit a listing"
on listings for insert
to anon
with check (status = 'pending');

-- Anyone can view listings that have been approved and haven't expired
create policy "public can view approved unexpired listings"
on listings for select
to anon
using (status = 'approved' and expires_at > now());

-- To approve a listing: open Table Editor -> listings -> edit the row -> set status to 'approved'
-- To renew a listing: edit expires_at to a later date
