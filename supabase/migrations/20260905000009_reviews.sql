-- Reviews are tied to a specific order_item (a specific purchase), not just
-- product+user, so "must have purchased and received" can be enforced
-- precisely. Depends on products, profiles, order_items.
create table if not exists public.reviews (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  order_item_id  uuid not null references public.order_items(id) on delete cascade,
  rating         int  not null check (rating between 1 and 5),
  comment        text,
  is_hidden      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint reviews_unique_order_item unique (order_item_id)
);

comment on table public.reviews is 'One review per order_item. Eligibility (order must be delivered) is enforced by application/RPC logic, not by a constraint here, since it requires joining to orders.status.';

create index if not exists idx_reviews_product_id on public.reviews(product_id);
