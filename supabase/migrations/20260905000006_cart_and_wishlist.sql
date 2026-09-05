-- Cart and wishlist. Both are disposable/convenience data: cascades freely.

create table if not exists public.carts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint carts_user_id_key unique (user_id)
);

create table if not exists public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  cart_id     uuid not null references public.carts(id) on delete cascade,
  variant_id  uuid not null references public.product_variants(id) on delete cascade,
  quantity    int  not null check (quantity > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint cart_items_unique_variant unique (cart_id, variant_id)
);

create index if not exists idx_cart_items_cart_id on public.cart_items(cart_id);

create table if not exists public.wishlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint wishlists_unique_product unique (user_id, product_id)
);

create index if not exists idx_wishlists_user_id on public.wishlists(user_id);
