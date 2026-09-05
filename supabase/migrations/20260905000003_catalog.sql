-- Catalog: categories, products, product_variants, product_images.

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.categories(id) on delete restrict,
  name        text not null,
  slug        text not null,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint categories_slug_key unique (slug)
);

create index if not exists idx_categories_parent_id on public.categories(parent_id);
create index if not exists idx_categories_is_active on public.categories(is_active);

create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references public.categories(id) on delete restrict,
  name          text not null,
  slug          text not null,
  description   text,
  base_price    numeric(12,2) not null check (base_price >= 0),
  avg_rating    numeric(2,1) not null default 0 check (avg_rating between 0 and 5),
  review_count  int  not null default 0 check (review_count >= 0),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  search_vector tsvector generated always as
      (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, ''))) stored,
  constraint products_slug_key unique (slug)
);

create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_products_is_active on public.products(is_active);
create index if not exists idx_products_search on public.products using gin(search_vector);

create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  sku         text not null,
  size        text,
  color       text,
  price       numeric(12,2) not null check (price >= 0),
  image_url   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint product_variants_sku_key unique (sku),
  constraint product_variants_unique_combo unique (product_id, size, color)
);

create index if not exists idx_variants_product_id on public.product_variants(product_id);

create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  url         text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_product_images_product_id on public.product_images(product_id);
