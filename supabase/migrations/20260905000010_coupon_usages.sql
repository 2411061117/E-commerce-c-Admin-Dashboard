-- Coupon usage ledger. Depends on coupons, profiles and orders.
create table if not exists public.coupon_usages (
  id          uuid primary key default gen_random_uuid(),
  coupon_id   uuid not null references public.coupons(id) on delete restrict,
  user_id     uuid not null references public.profiles(id) on delete restrict,
  order_id    uuid not null references public.orders(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint coupon_usages_unique_order unique (order_id)
);

create index if not exists idx_coupon_usages_coupon_user on public.coupon_usages(coupon_id, user_id);
