-- Structural functions/triggers: updated_at maintenance, auth.users -> profiles
-- provisioning, admin check helper, role-change guard, order status state
-- machine enforcement, and denormalized product rating maintenance.
--
-- NOTE: this file adds a trigger ON auth.users (a Supabase-managed table).
-- No column of auth.users is altered; only a trigger is attached, which is
-- the standard supported way to provision a profile row on signup.

-- 1) updated_at maintenance -----------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at on public.profiles;
create trigger trg_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at on public.addresses;
create trigger trg_set_updated_at
before update on public.addresses
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at on public.categories;
create trigger trg_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at on public.products;
create trigger trg_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at on public.product_variants;
create trigger trg_set_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at on public.inventory;
create trigger trg_set_updated_at
before update on public.inventory
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at on public.coupons;
create trigger trg_set_updated_at
before update on public.coupons
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at on public.carts;
create trigger trg_set_updated_at
before update on public.carts
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at on public.cart_items;
create trigger trg_set_updated_at
before update on public.cart_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at on public.orders;
create trigger trg_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at on public.reviews;
create trigger trg_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

-- 2) auth.users -> profiles provisioning ----------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
after insert on auth.users
for each row execute function public.handle_new_user();

-- 3) is_admin() helper used throughout RLS policies -----------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 4) prevent a user from self-promoting via UPDATE profiles ---------------

create or replace function public.prevent_role_self_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an admin can change profile role';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_change on public.profiles;
create trigger trg_prevent_role_change
before update of role on public.profiles
for each row execute function public.prevent_role_self_change();

-- 5) order status state machine enforcement -------------------------------

create or replace function public.enforce_order_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'pending'   and new.status in ('confirmed', 'cancelled')) or
    (old.status = 'confirmed' and new.status in ('shipped', 'cancelled')) or
    (old.status = 'shipped'   and new.status = 'delivered')
  ) then
    raise exception 'Invalid order status transition: % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_order_status_transition on public.orders;
create trigger trg_enforce_order_status_transition
before update of status on public.orders
for each row execute function public.enforce_order_status_transition();

-- 6) denormalized product rating maintenance ------------------------------

create or replace function public.update_product_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_product_id uuid;
begin
  target_product_id := coalesce(new.product_id, old.product_id);

  update public.products
  set
    avg_rating = coalesce((
      select round(avg(rating)::numeric, 1)
      from public.reviews
      where product_id = target_product_id and is_hidden = false
    ), 0),
    review_count = (
      select count(*)
      from public.reviews
      where product_id = target_product_id and is_hidden = false
    )
  where id = target_product_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_update_product_rating on public.reviews;
create trigger trg_update_product_rating
after insert or update or delete on public.reviews
for each row execute function public.update_product_rating();
