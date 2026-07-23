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
  photo_urls text[] not null default '{}',
  amenities text[] not null default '{}',
  parking_spaces integer,
  utilities_included text[] not null default '{}',
  lease_term text not null default 'flexible' check (lease_term in ('3mo', '6mo', '12mo', 'flexible')),
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

-- Public bucket for listing photos, uploaded directly by submitters
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

create policy "anyone can upload listing photos"
on storage.objects for insert
to anon
with check (bucket_id = 'listing-photos');

-- Lets a submitter delete their own listing later without an account.
-- Tokens live in their own table with NO anon read policy at all, so
-- they can never leak through a stray select("*") on listings. The
-- only way in or out is through these two locked-down functions.
create table if not exists listing_edit_tokens (
  listing_id uuid primary key references listings(id) on delete cascade,
  token uuid not null default gen_random_uuid()
);

alter table listing_edit_tokens enable row level security;

create or replace function create_listing_edit_token(p_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
begin
  insert into listing_edit_tokens (listing_id)
  values (p_listing_id)
  returning token into v_token;
  return v_token;
end;
$$;

grant execute on function create_listing_edit_token(uuid) to anon;

create or replace function delete_own_listing(p_listing_id uuid, p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from listing_edit_tokens
    where listing_id = p_listing_id and token = p_token
  ) then
    delete from listings where id = p_listing_id;
    return true;
  end if;
  return false;
end;
$$;

grant execute on function delete_own_listing(uuid, uuid) to anon;

-- Same token also lets the submitter edit their own listing later.
create or replace function update_own_listing(
  p_listing_id uuid,
  p_token uuid,
  p_title text,
  p_price numeric,
  p_area text,
  p_bedrooms text,
  p_furnished boolean,
  p_pets_ok boolean,
  p_description text,
  p_contact text,
  p_amenities text[],
  p_parking_spaces integer,
  p_utilities_included text[],
  p_lease_term text,
  p_photo_urls text[]
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from listing_edit_tokens
    where listing_id = p_listing_id and token = p_token
  ) then
    update listings set
      title = p_title,
      price = p_price,
      area = p_area,
      bedrooms = p_bedrooms,
      furnished = p_furnished,
      pets_ok = p_pets_ok,
      description = p_description,
      contact = p_contact,
      amenities = p_amenities,
      parking_spaces = p_parking_spaces,
      utilities_included = p_utilities_included,
      lease_term = p_lease_term,
      photo_urls = p_photo_urls
    where id = p_listing_id;
    return true;
  end if;
  return false;
end;
$$;

grant execute on function update_own_listing(
  uuid, uuid, text, numeric, text, text, boolean, boolean, text, text,
  text[], integer, text[], text, text[]
) to anon;
