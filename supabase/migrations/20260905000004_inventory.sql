-- Inventory: 1-1 with product_variants. quantity >= 0 is enforced at the DB
-- level so no application bug can push stock negative (prevents oversell).
create table if not exists public.inventory (
  variant_id         uuid primary key references public.product_variants(id) on delete cascade,
  quantity           int not null default 0 check (quantity >= 0),
  reserved_quantity  int not null default 0 check (reserved_quantity >= 0),
  updated_at         timestamptz not null default now(),
  constraint inventory_reserved_within_quantity check (reserved_quantity <= quantity)
);

comment on table public.inventory is 'One row per variant. Stock decrements must use an atomic conditional UPDATE (quantity >= :qty) to avoid race conditions.';
