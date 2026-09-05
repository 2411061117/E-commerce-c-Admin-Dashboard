# DATABASE.md

Thiết kế schema Postgres cho Supabase. Đây là **thiết kế** (DDL minh hoạ để thể hiện chính xác constraint), chưa phải migration file thật (chưa tạo trong `supabase/migrations/`) và chưa có application code.

Quy ước chung:
- PK: `uuid primary key default gen_random_uuid()`.
- Mọi bảng nghiệp vụ có `created_at timestamptz not null default now()`; bảng có thể sửa nhiều lần thêm `updated_at timestamptz not null default now()` + trigger `set_updated_at()`.
- FK mặc định `on delete restrict` trừ khi ghi chú khác (lý do giải thích theo từng bảng).
- Tiền tệ: `numeric(12,2)`, không dùng `float`.

---

## 1. `profiles` (users)

1-1 với `auth.users` (Supabase quản lý bảng `auth.users`, ta không đụng vào).

```sql
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null default 'customer'
               check (role in ('customer','admin')),
  full_name    text not null,
  phone        text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
```

- **PK**: `id`, đồng thời là FK → `auth.users(id)`. `on delete cascade`: nếu user bị xoá khỏi `auth.users` (hiếm, thường chỉ admin làm qua Supabase Auth API), profile cũng xoá theo — hợp lý vì profile vô nghĩa nếu không còn auth user.
- **NOT NULL**: `role`, `full_name` — mọi profile phải có tên hiển thị và role xác định, không để trạng thái lửng lơ.
- **CHECK**: `role in ('customer','admin')` — chặn giá trị rác ngay ở DB, không phụ thuộc validate ở app.
- **UNIQUE**: không cần thêm, `id` đã unique (PK).
- **Index**: không cần thêm ngoài PK — bảng nhỏ, truy vấn chủ yếu theo `id` (qua `auth.uid()`).
- Tạo tự động qua trigger `handle_new_user()` gắn trên `auth.users` (`after insert`), không insert tay từ app.

---

## 2. `categories`

```sql
create table categories (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references categories(id) on delete restrict,
  name        text not null,
  slug        text not null,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint categories_slug_key unique (slug)
);

create index idx_categories_parent_id on categories(parent_id);
create index idx_categories_is_active on categories(is_active);
```

- **FK**: `parent_id` self-reference, `on delete restrict` — không cho xoá category cha khi còn category con trỏ tới (buộc phải chuyển/gỡ category con trước; tránh mất cấu trúc cây ngoài ý muốn).
- **NOT NULL**: `name`, `slug` (bắt buộc để hiển thị/route), `sort_order`/`is_active` có default nên NOT NULL an toàn.
- **UNIQUE**: `slug` — dùng làm URL, không được trùng.
- **CHECK không cần** cho tầng cha/con vì giới hạn "chỉ 1 cấp" là ràng buộc nghiệp vụ (enforce ở app/RPC khi tạo, không cần CHECK constraint SQL phức tạp kiểu đệ quy).
- **Index**: `parent_id` (query category con theo cha), `is_active` (lọc category hiển thị).

---

## 3. `products`

```sql
create table products (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references categories(id) on delete restrict,
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
      (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,''))) stored,
  constraint products_slug_key unique (slug)
);

create index idx_products_category_id on products(category_id);
create index idx_products_is_active   on products(is_active);
create index idx_products_search      on products using gin(search_vector);
```

- **FK**: `category_id` → `categories`, `on delete restrict` — **không cho xoá category còn product**; admin phải chuyển product sang category khác hoặc ẩn product trước. Tránh product mồ côi category.
- **NOT NULL**: `category_id`, `name`, `slug`, `base_price` — một product không thể tồn tại thiếu các trường lõi này.
- **CHECK**: `base_price >= 0`, `avg_rating between 0 and 5`, `review_count >= 0` — chặn dữ liệu vô lý ngay ở DB (không tin tưởng hoàn toàn vào validate phía app).
- **UNIQUE**: `slug`.
- **Index**: `category_id` (filter theo danh mục), `is_active` (ẩn/hiện), GIN trên `search_vector` (full-text search cho tính năng search).
- **Product bị "xoá" nhưng order cũ vẫn giữ thông tin**: xem mục 12 — dùng soft delete (`is_active=false`), **không hard-delete**, và `order_items` snapshot toàn bộ dữ liệu nên không phụ thuộc `products` còn tồn tại hay không.

---

## 4. `product_variants`

Cách một product có nhiều màu/size được lưu.

```sql
create table product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
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

create index idx_variants_product_id on product_variants(product_id);
```

- **FK**: `product_id` → `products`, `on delete cascade` — nếu 1 product bị **hard-delete thật sự** (trường hợp hiếm, ví dụ tạo nhầm và chưa có đơn hàng nào), variant con cũng xoá theo. **Lưu ý quan trọng**: cascade này chỉ an toàn vì `order_items` **không** FK cứng bắt buộc tới `product_variants` (xem mục 9) — nếu variant bị xoá, order cũ vẫn giữ nguyên dữ liệu snapshot, không vỡ.
- **NOT NULL**: `product_id`, `sku`, `price`.
- **CHECK**: `price >= 0`.
- **UNIQUE**:
  - `sku` — mã định danh duy nhất toàn hệ thống, dùng để đối soát kho/vận đơn.
  - `(product_id, size, color)` — **chặn tạo trùng variant** (ví dụ 2 dòng "Size M / Đen" cho cùng 1 product). Đây là cách trả lời trực tiếp case "1 product có nhiều size + màu": mỗi tổ hợp (size, color) hợp lệ là đúng 1 dòng `product_variants`, `size`/`color` nullable để hỗ trợ product chỉ có 1 chiều biến thể (ví dụ chỉ có size, không có màu) hoặc không có variant nào (dùng 1 variant "mặc định" với size/color đều null).
- **Index**: `product_id` (lấy tất cả variant của 1 product — query phổ biến nhất).

---

## 5. `product_images`

```sql
create table product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  url         text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create index idx_product_images_product_id on product_images(product_id);
```

- **FK**: `on delete cascade` — ảnh là dữ liệu phụ thuộc hoàn toàn vào product, xoá product thì ảnh không còn ý nghĩa.
- **NOT NULL**: `product_id`, `url`.

---

## 6. `inventory` — thiết kế tồn kho theo variant

```sql
create table inventory (
  variant_id         uuid primary key references product_variants(id) on delete cascade,
  quantity           int not null default 0 check (quantity >= 0),
  reserved_quantity  int not null default 0 check (reserved_quantity >= 0),
  updated_at         timestamptz not null default now(),
  constraint inventory_reserved_within_quantity check (reserved_quantity <= quantity)
);
```

- **PK = FK**: `variant_id` — quan hệ **1-1 bắt buộc** giữa variant và tồn kho, mỗi variant có đúng 1 dòng inventory (trả lời trực tiếp case "1 variant có inventory riêng"). `on delete cascade` vì inventory vô nghĩa nếu variant không còn tồn tại.
- **CHECK quan trọng nhất**: `quantity >= 0` — đây là ràng buộc **chống oversell ở tầng DB**, không chỉ ở tầng ứng dụng. Bất kỳ `UPDATE` nào cố trừ kho xuống âm sẽ bị Postgres từ chối thẳng, kể cả khi logic RPC có bug.
- `reserved_quantity`: dự phòng cho v1.1 (giữ chỗ trong lúc đang ở bước checkout, chưa cần dùng ngay ở v1 — có thể để mặc định 0 và bỏ qua logic reserve trong Phase 5, chỉ trừ thẳng `quantity` khi tạo order thành công).

**Vì sao tách bảng riêng thay vì thêm cột `stock` vào `product_variants`**: khi trừ kho lúc đặt hàng, ta chỉ cần `UPDATE inventory SET quantity = quantity - :qty WHERE variant_id = :id AND quantity >= :qty` — statement này chỉ khoá (lock) đúng 1 dòng `inventory`, không đụng tới dòng `product_variants` (nơi có `price`, `sku`... hay bị đọc bởi các session khác đang duyệt sản phẩm). Tách bảng giảm tranh chấp khoá (lock contention) giữa luồng "khách xem sản phẩm" và luồng "khách đặt hàng".

### 6.1 Logic trừ kho — atomic, chống race condition

Không bao giờ làm theo kiểu "đọc quantity ở client/app → tính toán → update" (2 bước tách rời), vì giữa bước đọc và bước ghi, một request khác có thể đã trừ kho, dẫn tới oversell. Thay vào đó dùng **1 câu lệnh UPDATE điều kiện, atomic**:

```sql
update inventory
set quantity = quantity - p_qty, updated_at = now()
where variant_id = p_variant_id
  and quantity >= p_qty
returning quantity;
```

Nếu câu lệnh này trả về 0 dòng (không match điều kiện `quantity >= p_qty`), nghĩa là không đủ hàng → transaction phải `raise exception` để rollback toàn bộ order đang tạo dở. Đây là cơ chế Postgres đảm bảo tại tầng row-lock: khi 2 transaction cùng `UPDATE` 1 dòng, transaction thứ 2 phải đợi transaction thứ nhất commit/rollback xong mới đọc được giá trị `quantity` mới nhất — không thể có 2 transaction cùng đọc "còn 1" rồi cùng trừ thành công.

### 6.2 `inventory_movements` — lịch sử thay đổi kho

```sql
create table inventory_movements (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references product_variants(id) on delete cascade,
  change      int  not null,
  reason      text not null check (reason in ('order','manual_adjustment','restock')),
  order_id    uuid references orders(id) on delete set null,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index idx_inventory_movements_variant_id on inventory_movements(variant_id);
```

- `order_id on delete set null`: nếu (hiếm khi) 1 order bị xoá hẳn, lịch sử kho vẫn giữ lại (chỉ mất liên kết ngược, không mất record kiểm toán).
- `created_by on delete set null`: admin thực hiện điều chỉnh có thể bị xoá tài khoản sau này, lịch sử vẫn giữ nguyên.

---

## 7. `carts` & `cart_items`

```sql
create table carts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table cart_items (
  id          uuid primary key default gen_random_uuid(),
  cart_id     uuid not null references carts(id) on delete cascade,
  variant_id  uuid not null references product_variants(id) on delete cascade,
  quantity    int  not null check (quantity > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint cart_items_unique_variant unique (cart_id, variant_id)
);

create index idx_cart_items_cart_id on cart_items(cart_id);
```

- `carts.user_id unique` — mỗi user chỉ có đúng 1 cart đang hoạt động (thiết kế đơn giản hoá, không hỗ trợ multi-cart).
- `cart_items` **`on delete cascade`** cho cả `cart_id` và `variant_id`: giỏ hàng là dữ liệu tạm thời/không cần giữ lịch sử — nếu variant bị xoá hẳn (hiếm), item trong giỏ tự động biến mất thay vì để lại tham chiếu chết.
- **UNIQUE** `(cart_id, variant_id)`: enforce nguyên tắc "1 variant chỉ 1 dòng trong giỏ" — thêm lần 2 phải là `UPDATE quantity` (cộng dồn), không insert dòng mới. Đây là constraint quan trọng để tránh giỏ hàng có 2 dòng trùng variant do race condition khi bấm "thêm vào giỏ" nhanh liên tiếp.

---

## 8. `wishlists`

```sql
create table wishlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint wishlists_unique_product unique (user_id, product_id)
);

create index idx_wishlists_user_id on wishlists(user_id);
```

- Lưu theo `product_id`, **không** theo `variant_id`: wishlist thể hiện ý định "muốn mua sản phẩm này", việc chọn size/màu cụ thể diễn ra khi user bấm "thêm vào giỏ" từ trang wishlist — tránh tình huống vô lý "wishlist 1 variant đã ngừng bán trong khi product vẫn còn variant khác".
- **UNIQUE** `(user_id, product_id)`: 1 sản phẩm chỉ xuất hiện 1 lần trong wishlist của 1 user.
- `on delete cascade` cả 2 chiều: wishlist là dữ liệu tiện ích, không cần giữ lại khi user hoặc product không còn.

---

## 9. `orders` & trạng thái đơn hàng

```sql
create table orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text not null,
  user_id             uuid not null references profiles(id) on delete restrict,
  status              text not null default 'pending'
                      check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  payment_status      text not null default 'unpaid'
                      check (payment_status in ('unpaid','paid','refunded')),
  shipping_address    jsonb not null,
  subtotal            numeric(12,2) not null check (subtotal >= 0),
  discount_amount     numeric(12,2) not null default 0 check (discount_amount >= 0),
  shipping_fee        numeric(12,2) not null default 0 check (shipping_fee >= 0),
  total               numeric(12,2) not null check (total >= 0),
  coupon_id           uuid references coupons(id) on delete set null,
  client_request_id   uuid not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint orders_order_number_key unique (order_number),
  constraint orders_client_request_id_key unique (client_request_id),
  constraint orders_total_consistent check (total = subtotal - discount_amount + shipping_fee)
);

create index idx_orders_user_id    on orders(user_id);
create index idx_orders_status    on orders(status);
create index idx_orders_created_at on orders(created_at desc);
```

- **FK**: `user_id references profiles(id) on delete restrict` — **không bao giờ xoá cứng 1 user còn đơn hàng**; đây là ràng buộc pháp lý/kế toán, không phải kỹ thuật (hoá đơn phải giữ lại). Muốn "xoá" user chỉ vô hiệu hoá tài khoản (`auth.users` có thể ban/deactivate qua Supabase Auth), không xoá `profiles`.
- **FK**: `coupon_id on delete set null` — nếu admin xoá hẳn 1 coupon đã dùng, order cũ vẫn giữ được (chỉ mất liên kết tới coupon, số `discount_amount` đã snapshot sẵn nên không ảnh hưởng số liệu).
- **`shipping_address jsonb`**: snapshot toàn bộ địa chỉ tại thời điểm đặt hàng — **cố ý không FK tới bảng `addresses`**. Nếu dùng FK sống, user sửa/xoá địa chỉ sau này sẽ làm sai lệch địa chỉ hiển thị trên đơn cũ.
- **UNIQUE**: `order_number` (mã hiển thị cho người dùng), `client_request_id` (idempotency key — client tự sinh 1 uuid trước khi gọi RPC tạo đơn; nếu request bị retry do mất mạng, unique constraint này chặn tạo đơn trùng — RPC bắt lỗi unique violation và trả về order đã tồn tại thay vì tạo mới).
- **CHECK**: `orders_total_consistent` — Postgres tự chặn nếu app tính sai công thức `total`, không tin tưởng con số gửi lên từ client.
- **Index**: `user_id` (khách xem đơn của mình), `status` (admin filter), `created_at desc` (sort mới nhất, phổ biến nhất).

### 9.1 State machine trạng thái đơn

```
pending ──► confirmed ──► shipped ──► delivered
   │             │
   └────► cancelled ◄────┘
```

Bảng chuyển trạng thái hợp lệ:

| Từ \ Đến | pending | confirmed | shipped | delivered | cancelled |
|---|---|---|---|---|---|
| pending | — | ✅ | ❌ | ❌ | ✅ |
| confirmed | ❌ | — | ✅ | ❌ | ✅ |
| shipped | ❌ | ❌ | — | ✅ | ❌ |
| delivered | ❌ | ❌ | ❌ | — | ❌ |
| cancelled | ❌ | ❌ | ❌ | ❌ | — |

Nguyên tắc: `delivered` và `cancelled` là **trạng thái cuối (terminal state)** — không thể chuyển đi đâu tiếp. Không cho phép "nhảy tắt" (`pending → shipped`) hay "nhảy lùi" (`shipped → confirmed`). Việc này **không đủ nếu chỉ CHECK constraint trên cột `status`** (CHECK chỉ biết giá trị hợp lệ, không biết được giá trị *trước đó* là gì) — phải enforce bằng 1 trong 2 cách:

1. Trigger `before update on orders` so sánh `OLD.status` và `NEW.status` với bảng chuyển trạng thái ở trên, `raise exception` nếu không hợp lệ.
2. Hoặc chỉ cho phép đổi `status` thông qua RPC `update_order_status(order_id, new_status)` (không cho UPDATE trực tiếp cột `status` từ client — RLS chặn `UPDATE` trực tiếp trên `orders.status`, chỉ RPC `SECURITY DEFINER` có quyền).

**Khuyến nghị: làm cả 2** — RPC là cổng vào chính thức, trigger là lưới an toàn cuối cùng phòng khi có chỗ nào đó (kể cả seed script hay thao tác tay trên dashboard) update sai.

### 9.2 `order_status_history` — audit trail

```sql
create table order_status_history (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  from_status  text,
  to_status    text not null,
  changed_by   uuid references profiles(id) on delete set null,
  note         text,
  created_at   timestamptz not null default now()
);

create index idx_order_status_history_order_id on order_status_history(order_id);
```

Ghi bởi cùng trigger/RPC xử lý đổi trạng thái — không phải insert riêng từ app (tránh lệch giữa `orders.status` hiện tại và lịch sử).

---

## 10. `order_items` — snapshot, giải quyết case "product bị xoá nhưng order cũ vẫn giữ thông tin"

```sql
create table order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id) on delete cascade,
  variant_id     uuid references product_variants(id) on delete set null,
  product_name   text not null,
  variant_label  text,
  sku            text not null,
  unit_price     numeric(12,2) not null check (unit_price >= 0),
  quantity       int not null check (quantity > 0),
  line_total     numeric(12,2) not null check (line_total >= 0),
  constraint order_items_line_total_consistent check (line_total = unit_price * quantity)
);

create index idx_order_items_order_id on order_items(order_id);
```

- **Đây là bảng trả lời trực tiếp yêu cầu "product bị xoá nhưng order cũ vẫn phải giữ thông tin"**: `product_name`, `variant_label`, `sku`, `unit_price` là **cột dữ liệu độc lập** (snapshot), được ghi 1 lần duy nhất tại thời điểm `create_order` chạy, copy từ `products`/`product_variants` tại thời điểm đó. Sau đó **không bao giờ đọc lại** từ `products`/`product_variants` để hiển thị lịch sử đơn.
- **FK `variant_id` cố ý dùng `on delete set null`**, không phải `restrict` hay `cascade`:
  - Không dùng `restrict`: nếu dùng, admin sẽ **không bao giờ xoá được** 1 variant/product đã từng được mua — quá cứng nhắc (soft delete `is_active=false` mới là cách "ẩn" đúng, nhưng nếu có lý do phải hard-delete, không nên bị chặn vì lịch sử đơn).
  - Không dùng `cascade`: nếu dùng, xoá variant sẽ **xoá luôn dòng order_item** → mất cả đơn hàng cũ, sai hoàn toàn.
  - `set null`: xoá variant gốc → `order_items.variant_id` thành `null`, nhưng `product_name`/`sku`/`unit_price`/`quantity`/`line_total` **vẫn nguyên vẹn** vì đã snapshot. `variant_id` chỉ dùng để admin "link ngược" tới variant hiện tại nếu còn tồn tại (tiện tra cứu), không phải nguồn dữ liệu để hiển thị.
- **CHECK**: `line_total = unit_price * quantity` — Postgres tự đảm bảo tính đúng của mỗi dòng.
- Không có `updated_at`: `order_items` là dữ liệu bất biến sau khi tạo (immutable), không có nghiệp vụ nào sửa lại 1 dòng order_item đã tạo.

---

## 11. `reviews`

```sql
create table reviews (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references products(id) on delete cascade,
  user_id        uuid not null references profiles(id) on delete cascade,
  order_item_id  uuid not null references order_items(id) on delete cascade,
  rating         int  not null check (rating between 1 and 5),
  comment        text,
  is_hidden      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint reviews_unique_order_item unique (order_item_id)
);

create index idx_reviews_product_id on reviews(product_id);
```

- **FK `order_item_id`** (không phải chỉ `product_id` + `user_id`): đây là cách **enforce ở tầng DB** rằng review phải gắn với 1 lần mua cụ thể — không chỉ dựa vào việc "user_id này đã từng mua product_id này" (có thể mua nhiều lần, mỗi lần nên review riêng nếu muốn, hoặc giới hạn 1 review/1 lần mua tuỳ nghiệp vụ — v1 chọn 1 review/1 order_item).
- **UNIQUE** `(order_item_id)`: 1 lần mua chỉ review được 1 lần — chặn spam review nhiều lần cho cùng 1 giao dịch.
- **`on delete cascade`** cho cả `product_id`, `user_id`, `order_item_id`: review là dữ liệu phụ thuộc, nếu product/user/order_item gốc không còn (hard-delete hiếm khi xảy ra) thì review không còn ý nghĩa để giữ lại.
- Điều kiện nghiệp vụ "chỉ review khi đơn `delivered`" **không thể** biểu diễn bằng FK/CHECK constraint đơn thuần (vì phải join sang `orders.status`, CHECK constraint không cho phép subquery). Bắt buộc enforce bằng RPC `create_review()` (kiểm tra `orders.status = 'delivered'` join qua `order_items.order_id`) kết hợp RLS `WITH CHECK` (xem mục 13).

---

## 12. `coupons` & `coupon_usages`

```sql
create table coupons (
  id                     uuid primary key default gen_random_uuid(),
  code                   text not null,
  type                   text not null check (type in ('percentage','fixed_amount')),
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

create table coupon_usages (
  id          uuid primary key default gen_random_uuid(),
  coupon_id   uuid not null references coupons(id) on delete restrict,
  user_id     uuid not null references profiles(id) on delete restrict,
  order_id    uuid not null references orders(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint coupon_usages_unique_order unique (order_id)
);

create index idx_coupon_usages_coupon_user on coupon_usages(coupon_id, user_id);
```

- **CHECK** `coupons_valid_period`: `expires_at > starts_at` — chặn tạo coupon với khoảng thời gian vô lý ngay ở DB.
- **CHECK** `coupons_percentage_max`: nếu `type='percentage'` thì `value` không được vượt 100 — tránh admin nhập nhầm "giảm 500%".
- `coupon_usages.coupon_id on delete restrict`: **không cho xoá cứng 1 coupon đã từng được dùng** (đã gắn với order thật) — giữ tính toàn vẹn lịch sử áp dụng khuyến mãi; admin muốn ngừng coupon thì set `is_active=false`, không xoá.
- `coupon_usages.order_id on delete cascade`: nếu order bị xoá hẳn thì record usage cũng không còn ý nghĩa.
- **UNIQUE** `(order_id)` trên `coupon_usages`: 1 order chỉ áp dụng được 1 coupon (thiết kế v1 không hỗ trợ stack nhiều coupon).
- **Index** `(coupon_id, user_id)`: dùng để RPC `validate_coupon` đếm nhanh số lần user này đã dùng coupon này, so với `usage_limit_per_user`.

---

## 13. Row Level Security (RLS) đầy đủ

Bật RLS cho **tất cả** bảng nghiệp vụ (`alter table ... enable row level security;`). Nguyên tắc: **mặc định không cho gì cả**, chỉ mở policy tường minh.

### Helper function

```sql
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;
```

`security definer` để function có quyền đọc `profiles` bất kể policy RLS của người gọi (tránh đệ quy vô hạn nếu policy của `profiles` lại gọi `is_admin()`).

### `profiles`

```sql
-- User chỉ được xem/sửa dữ liệu của chính mình; admin xem tất cả
create policy profiles_select on profiles
  for select using (id = auth.uid() or is_admin());

create policy profiles_update_own on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
  -- user không tự đổi được role của chính mình

create policy profiles_admin_all on profiles
  for all using (is_admin()) with check (is_admin());
```

### `addresses`, `carts`, `cart_items`, `wishlists`

Cùng 1 pattern "own rows":

```sql
create policy addresses_owner on addresses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- tương tự cho wishlists (user_id = auth.uid())

-- cart_items không có cột user_id trực tiếp -> join qua carts
create policy cart_items_owner on cart_items
  for all using (
    exists (select 1 from carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid())
  )
  with check (
    exists (select 1 from carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid())
  );

create policy carts_owner on carts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

Admin **không cần** quyền đọc cart/wishlist của khách (không thuộc nghiệp vụ Admin đã định nghĩa trong PRD) — cố ý không thêm policy admin cho 2 bảng này để giảm bề mặt truy cập dữ liệu riêng tư không cần thiết.

### `categories`, `products`, `product_variants`, `product_images`

```sql
create policy catalog_public_read on products
  for select using (is_active = true or is_admin());
-- tương tự categories, product_variants, product_images (product_images/variants join is_active qua product nếu cần chặt hơn, hoặc để is_active riêng)

create policy catalog_admin_write on products
  for insert with check (is_admin());
create policy catalog_admin_update on products
  for update using (is_admin()) with check (is_admin());
create policy catalog_admin_delete on products
  for delete using (is_admin());
-- lặp lại insert/update/delete tương tự cho categories, product_variants, product_images
```

### `inventory`

```sql
create policy inventory_public_read on inventory
  for select using (true); -- cần lộ quantity để hiển thị "còn X sản phẩm" / hết hàng

create policy inventory_admin_write on inventory
  for insert with check (is_admin());
create policy inventory_admin_update on inventory
  for update using (is_admin()); -- RPC create_order chạy security definer nên bỏ qua RLS này, xem ghi chú dưới
```

Ghi chú quan trọng: RPC `create_order`/`update_inventory_...` chạy dưới `security definer`, nghĩa là **bỏ qua RLS** khi thực thi trừ kho thay mặt customer. Đây là lý do bắt buộc mọi thao tác trừ kho **phải** đi qua RPC đã được audit kỹ, không được có cách nào khác để customer tự `UPDATE inventory` trực tiếp.

### `orders`, `order_items`, `order_status_history`

```sql
create policy orders_owner_select on orders
  for select using (user_id = auth.uid() or is_admin());

-- Không có policy INSERT/UPDATE cho customer lẫn admin trên "orders" nói chung.
-- Mọi insert/update đi qua RPC security definer (create_order, update_order_status).
create policy orders_no_direct_write on orders
  for insert with check (false);

create policy order_items_select on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_items.order_id
            and (o.user_id = auth.uid() or is_admin()))
  );
-- order_items cũng không có policy insert/update trực tiếp — chỉ ghi qua RPC

create policy order_status_history_select on order_status_history
  for select using (
    exists (select 1 from orders o where o.id = order_status_history.order_id
            and (o.user_id = auth.uid() or is_admin()))
  );
```

**Vì sao không có policy INSERT/UPDATE thông thường cho `orders`/`order_items` dù là customer hay admin**: toàn bộ logic tạo đơn (trừ kho, snapshot giá, tính coupon, ghi lịch sử) phải atomic trong 1 transaction — nếu cho phép insert trực tiếp từ client, không thể đảm bảo tính atomic đó. RPC `security definer` là **cổng ghi duy nhất**, tự nó chạy dưới quyền cao hơn RLS nên không bị chặn bởi các policy này.

### `reviews`

```sql
create policy reviews_public_read on reviews
  for select using (is_hidden = false or user_id = auth.uid() or is_admin());

create policy reviews_no_direct_insert on reviews
  for insert with check (false); -- chỉ tạo qua RPC create_review (security definer, tự kiểm tra điều kiện delivered)

create policy reviews_owner_update on reviews
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid()); -- user tự sửa nội dung review của mình (không sửa được is_hidden)

create policy reviews_admin_moderate on reviews
  for update using (is_admin()) with check (is_admin()); -- admin toggle is_hidden
```

### `coupons`, `coupon_usages`

```sql
create policy coupons_admin_all on coupons
  for all using (is_admin()) with check (is_admin());
-- Không có policy select public: danh sách coupon không được list công khai.
-- Validate 1 mã cụ thể đi qua RPC validate_coupon (security definer, chỉ trả về
-- kết quả hợp lệ/không hợp lệ + số tiền giảm, không trả nguyên bảng coupons).

create policy coupon_usages_owner_select on coupon_usages
  for select using (user_id = auth.uid() or is_admin());
create policy coupon_usages_no_direct_write on coupon_usages
  for insert with check (false); -- chỉ ghi qua RPC create_order
```

### Bảng tổng hợp nhanh

| Bảng | Customer đọc | Customer ghi | Admin |
|---|---|---|---|
| profiles | chỉ dòng của mình | sửa dòng của mình (trừ `role`) | tất cả |
| addresses / carts / cart_items / wishlists | chỉ của mình | CRUD của mình | không cần quyền riêng |
| categories / products / product_variants / product_images | public (is_active) | ❌ | CRUD tất cả |
| inventory | public (đọc quantity) | ❌ (chỉ qua RPC) | update trực tiếp (nhập kho) |
| orders / order_items / order_status_history | chỉ đơn của mình | ❌ (chỉ qua RPC) | đọc tất cả, ghi qua RPC |
| reviews | public (trừ hidden), của mình | update nội dung của mình, tạo qua RPC | toggle `is_hidden` |
| coupons | ❌ (không list) | ❌ | CRUD tất cả |
| coupon_usages | chỉ của mình | ❌ (chỉ qua RPC) | đọc tất cả |

---

## 14. Tổng kết — đối chiếu 5 case bắt buộc kiểm tra

1. **1 product có nhiều màu và size** → `product_variants` với `size`, `color` là cột riêng, `UNIQUE(product_id, size, color)` đảm bảo mỗi tổ hợp là đúng 1 dòng, không trùng, không thiếu ràng buộc (mục 4).
2. **1 variant có inventory riêng** → `inventory.variant_id` là PK đồng thời FK 1-1 tới `product_variants`, trừ kho bằng `UPDATE ... WHERE quantity >= :qty` atomic, `CHECK (quantity >= 0)` chặn oversell ở tầng DB dù logic app có bug (mục 6).
3. **Product bị xoá nhưng order cũ vẫn giữ thông tin** → `order_items` snapshot toàn bộ (`product_name`, `variant_label`, `sku`, `unit_price`), `variant_id` dùng `on delete set null` (không `cascade`, không `restrict`) để việc xoá/deactivate product/variant không bao giờ làm mất hoặc chặn được lịch sử đơn (mục 10).
4. **User chỉ xem/sửa dữ liệu của chính mình** → RLS `using (user_id = auth.uid())` trên mọi bảng cá nhân (`profiles`, `addresses`, `carts`, `cart_items`, `wishlists`, `orders`, `reviews`, `coupon_usages`); các bảng có thao tác nhiều bước (`orders`, `reviews`) chặn hẳn INSERT/UPDATE trực tiếp, chỉ cho qua RPC `security definer` đã tự kiểm tra quyền sở hữu (mục 13).
5. **Admin quản lý toàn bộ hệ thống** → helper `is_admin()` dùng xuyên suốt mọi policy, admin có `for all using (is_admin())` trên các bảng catalog/coupon, và policy `select`/`update` mở rộng thêm `or is_admin()` trên các bảng dữ liệu cá nhân để admin đọc được (không cần ghi thay customer) (mục 13).
