-- profiles: 1-1 extension of auth.users (Supabase managed table).
-- We only ADD a table + a trigger on auth.users later; we never ALTER auth.users itself.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null default 'customer'
               check (role in ('customer', 'admin')),
  full_name    text not null,
  phone        text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'Extends auth.users with app-specific profile data and role.';

-- addresses: saved shipping addresses for a user (address book).
create table if not exists public.addresses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  recipient_name  text not null,
  phone           text not null,
  line1           text not null,
  line2           text,
  ward            text,
  district        text,
  city            text not null,
  is_default      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.addresses is 'User address book. Orders snapshot the address used at checkout instead of referencing this table.';

create index if not exists idx_addresses_user_id on public.addresses(user_id);
