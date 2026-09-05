-- Orders, order_items (immutable snapshot), order_status_history (audit trail).

create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text not null,
  user_id             uuid not null references public.profiles(id) on delete restrict,
  status              text not null default 'pending'
                      check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_status      text not null default 'unpaid'
                      check (payment_status in ('unpaid', 'paid', 'refunded')),
  shipping_address    jsonb not null,
  subtotal            numeric(12,2) not null check (subtotal >= 0),
  discount_amount     numeric(12,2) not null default 0 check (discount_amount >= 0),
  shipping_fee        numeric(12,2) not null default 0 check (shipping_fee >= 0),
  total               numeric(12,2) not null check (total >= 0),
  coupon_id           uuid references public.coupons(id) on delete set null,
  client_request_id   uuid not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint orders_order_number_key unique (order_number),
  constraint orders_client_request_id_key unique (client_request_id),
  constraint orders_total_consistent check (total = subtotal - discount_amount + shipping_fee)
);

comment on table public.orders is 'shipping_address is a snapshot (jsonb), intentionally not a live FK to addresses, so editing/deleting an address never changes past orders.';
comment on column public.orders.client_request_id is 'Client-generated idempotency key; unique constraint prevents duplicate order creation on retry/double-submit.';

create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);

create table if not exists public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  variant_id     uuid references public.product_variants(id) on delete set null,
  product_name   text not null,
  variant_label  text,
  sku            text not null,
  unit_price     numeric(12,2) not null check (unit_price >= 0),
  quantity       int not null check (quantity > 0),
  line_total     numeric(12,2) not null check (line_total >= 0),
  constraint order_items_line_total_consistent check (line_total = unit_price * quantity)
);

comment on table public.order_items is 'Immutable snapshot of product/variant data at purchase time. variant_id uses ON DELETE SET NULL so deleting a variant/product never destroys order history.';

create index if not exists idx_order_items_order_id on public.order_items(order_id);

create table if not exists public.order_status_history (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  from_status  text,
  to_status    text not null,
  changed_by   uuid references public.profiles(id) on delete set null,
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_order_status_history_order_id on public.order_status_history(order_id);
