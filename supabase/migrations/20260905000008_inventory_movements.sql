-- Inventory movement history (audit trail for stock changes). Depends on
-- product_variants, orders and profiles, so it must run after all three.
create table if not exists public.inventory_movements (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references public.product_variants(id) on delete cascade,
  change      int  not null,
  reason      text not null check (reason in ('order', 'manual_adjustment', 'restock')),
  order_id    uuid references public.orders(id) on delete set null,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_inventory_movements_variant_id on public.inventory_movements(variant_id);
