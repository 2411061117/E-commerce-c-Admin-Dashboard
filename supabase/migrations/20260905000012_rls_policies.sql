-- Row Level Security for every business table.
-- Default posture: RLS enabled, nothing allowed until a policy opens it.
-- Policies are dropped-if-exists then recreated so this file can be re-run safely.

-- ===========================================================================
-- profiles
-- ===========================================================================
alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());
-- Role immutability by non-admins is enforced by trigger trg_prevent_role_change,
-- not by this policy (RLS cannot compare OLD vs NEW cleanly for a single column).

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ===========================================================================
-- addresses (own rows only; admin has no special access — not required by PRD)
-- ===========================================================================
alter table public.addresses enable row level security;

drop policy if exists addresses_owner on public.addresses;
create policy addresses_owner on public.addresses
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ===========================================================================
-- categories / products / product_variants / product_images
-- Public can read active rows; only admin can write.
-- ===========================================================================
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;

drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories
  for select
  using (is_active = true or public.is_admin());

drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories
  for insert with check (public.is_admin());
drop policy if exists categories_admin_update on public.categories;
create policy categories_admin_update on public.categories
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists categories_admin_delete on public.categories;
create policy categories_admin_delete on public.categories
  for delete using (public.is_admin());

drop policy if exists products_read on public.products;
create policy products_read on public.products
  for select
  using (is_active = true or public.is_admin());

drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
  for insert with check (public.is_admin());
drop policy if exists products_admin_update on public.products;
create policy products_admin_update on public.products
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists products_admin_delete on public.products;
create policy products_admin_delete on public.products
  for delete using (public.is_admin());

drop policy if exists variants_read on public.product_variants;
create policy variants_read on public.product_variants
  for select
  using (is_active = true or public.is_admin());

drop policy if exists variants_admin_write on public.product_variants;
create policy variants_admin_write on public.product_variants
  for insert with check (public.is_admin());
drop policy if exists variants_admin_update on public.product_variants;
create policy variants_admin_update on public.product_variants
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists variants_admin_delete on public.product_variants;
create policy variants_admin_delete on public.product_variants
  for delete using (public.is_admin());

drop policy if exists product_images_read on public.product_images;
create policy product_images_read on public.product_images
  for select using (true);

drop policy if exists product_images_admin_write on public.product_images;
create policy product_images_admin_write on public.product_images
  for insert with check (public.is_admin());
drop policy if exists product_images_admin_update on public.product_images;
create policy product_images_admin_update on public.product_images
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists product_images_admin_delete on public.product_images;
create policy product_images_admin_delete on public.product_images
  for delete using (public.is_admin());

-- ===========================================================================
-- inventory
-- Public can read quantity (to show stock/out-of-stock). Only admin writes
-- directly; the order-creation RPC (added in a later migration) will run as
-- security definer and bypass RLS to perform the atomic stock decrement.
-- ===========================================================================
alter table public.inventory enable row level security;

drop policy if exists inventory_read on public.inventory;
create policy inventory_read on public.inventory
  for select using (true);

drop policy if exists inventory_admin_write on public.inventory;
create policy inventory_admin_write on public.inventory
  for insert with check (public.is_admin());
drop policy if exists inventory_admin_update on public.inventory;
create policy inventory_admin_update on public.inventory
  for update using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- inventory_movements (admin-only audit log)
-- ===========================================================================
alter table public.inventory_movements enable row level security;

drop policy if exists inventory_movements_admin_read on public.inventory_movements;
create policy inventory_movements_admin_read on public.inventory_movements
  for select using (public.is_admin());

drop policy if exists inventory_movements_admin_write on public.inventory_movements;
create policy inventory_movements_admin_write on public.inventory_movements
  for insert with check (public.is_admin());

-- ===========================================================================
-- carts / cart_items (own rows only)
-- ===========================================================================
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;

drop policy if exists carts_owner on public.carts;
create policy carts_owner on public.carts
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists cart_items_owner on public.cart_items;
create policy cart_items_owner on public.cart_items
  for all
  using (
    exists (
      select 1 from public.carts
      where carts.id = cart_items.cart_id and carts.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.carts
      where carts.id = cart_items.cart_id and carts.user_id = auth.uid()
    )
  );

-- ===========================================================================
-- wishlists (own rows only)
-- ===========================================================================
alter table public.wishlists enable row level security;

drop policy if exists wishlists_owner on public.wishlists;
create policy wishlists_owner on public.wishlists
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ===========================================================================
-- orders / order_items / order_status_history
-- Read: owner or admin. Write: NO direct insert/update policy — all writes
-- must go through security-definer RPCs (create_order, update_order_status)
-- added in a later migration, so stock decrement + snapshot + coupon logic
-- stay atomic. Until those RPCs exist, these tables have no write path.
-- ===========================================================================
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists order_status_history_select on public.order_status_history;
create policy order_status_history_select on public.order_status_history
  for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_status_history.order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );

-- ===========================================================================
-- reviews
-- Public reads non-hidden reviews; owner can also see their own hidden ones.
-- No direct insert policy: creation must go through a security-definer RPC
-- that verifies the underlying order is 'delivered'. Owner may edit their own
-- text/rating; only admin may toggle is_hidden (moderation).
-- ===========================================================================
alter table public.reviews enable row level security;

drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews
  for select
  using (is_hidden = false or user_id = auth.uid() or public.is_admin());

drop policy if exists reviews_owner_update on public.reviews;
create policy reviews_owner_update on public.reviews
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists reviews_admin_moderate on public.reviews;
create policy reviews_admin_moderate on public.reviews
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- ===========================================================================
-- coupons
-- Not publicly listable (no select policy for non-admin). Validating a
-- specific code at checkout goes through a dedicated RPC (added later) that
-- returns only whether it's valid + the discount amount.
-- ===========================================================================
alter table public.coupons enable row level security;

drop policy if exists coupons_admin_all on public.coupons;
create policy coupons_admin_all on public.coupons
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ===========================================================================
-- coupon_usages
-- Read: owner or admin. Write: only through the order-creation RPC.
-- ===========================================================================
alter table public.coupon_usages enable row level security;

drop policy if exists coupon_usages_select on public.coupon_usages;
create policy coupon_usages_select on public.coupon_usages
  for select
  using (user_id = auth.uid() or public.is_admin());
