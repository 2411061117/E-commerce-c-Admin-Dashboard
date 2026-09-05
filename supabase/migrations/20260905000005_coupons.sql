-- Coupons. coupon_usages is created later (depends on orders).
create table if not exists public.coupons (
  id                     uuid primary key default gen_random_uuid(),
  code                   text not null,
  type                   text not null check (type in ('percentage', 'fixed_amount')),
  value                  numeric(12,2) not null check (value > 0),
  min_order_amount       numeric(12,2) not null default 0 check (min_order_amount >= 0),
  usage_limit            int check (usage_limit > 0),
  usage_limit_per_user   int not null default 1 check (usage_limit_per_user > 0),
  starts_at              timestamptz not null,
  expires_at             timestamptz not null,
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint coupons_code_key unique (code),
  constraint coupons_valid_period check (expires_at > starts_at),
  constraint coupons_percentage_max check (type <> 'percentage' or value <= 100)
);
