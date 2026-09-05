# ARCHITECTURE.md

## 1. Kiểu kiến trúc tổng thể

**Backend-as-a-Service (BaaS) architecture**: React SPA (x2) nói chuyện trực tiếp với Supabase (Postgres + Auth + Storage + Realtime + Edge Functions/RPC). Không có Node/Express server riêng.

```
┌─────────────────┐     ┌─────────────────┐
│  Customer App    │     │   Admin App      │
│  (Vite + React)  │     │  (Vite + React)  │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         │      Supabase JS Client (typed)
         │                        │
         └───────────┬────────────┘
                      │
              ┌───────▼────────┐
              │    Supabase     │
              │  - Postgres     │
              │  - Auth (JWT)   │
              │  - RLS Policies │
              │  - Storage      │
              │  - RPC/Postgres │
              │    Functions    │
              └─────────────────┘
```

### Vì sao 2 app riêng thay vì 1 app + role guard?

Quyết định: **2 ứng dụng Vite riêng trong 1 monorepo**, không phải 1 app chia route theo role.

Lý do:
- Customer app và Admin app có UI library khác nhau về mục đích (Admin dùng Ant Design nhiều component bảng/form phức tạp; Customer có thể tối giản hoá Ant Design hoặc dùng ít component hơn để tối ưu bundle size cho SEO/performance).
- Tách bundle: admin không cần ship kèm code customer và ngược lại → bundle nhỏ hơn, tải nhanh hơn cho khách hàng.
- Ranh giới bảo mật rõ ràng hơn: 2 domain/subdomain khác nhau khi deploy (`shop.example.com` vs `admin.example.com`), giảm rủi ro lộ route admin qua code splitting lỗi.
- Đây cũng là pattern phổ biến trong các hệ thống e-commerce thật (storefront tách khỏi back-office).

Đánh đổi: phải chia sẻ code (types, api client, validation schema) qua package dùng chung trong monorepo — chấp nhận được, và là kỹ năng đáng luyện.

## 2. Monorepo Layout (mức cao — chi tiết ở mục Folder Structure)

- `apps/customer` — Vite React app cho khách hàng
- `apps/admin` — Vite React app cho quản trị
- `packages/shared` — types, zod schemas, constants, format/util functions dùng chung
- `packages/supabase-client` — khởi tạo Supabase client + generated DB types + các hàm gọi RPC dùng chung

Dùng **pnpm workspaces** để quản lý monorepo (nhẹ, không cần Nx/Turborepo cho quy mô này).

## 3. Modules chính

Chia theo bounded context nghiệp vụ (áp dụng cho cả 2 app, một số module chỉ xuất hiện ở 1 phía):

| Module | Customer | Admin |
|---|---|---|
| Auth | ✅ đăng ký/đăng nhập/hồ sơ | ✅ đăng nhập (chỉ role admin) |
| Catalog (category/product/variant) | ✅ đọc | ✅ CRUD |
| Inventory | ✅ đọc (tồn kho hiển thị) | ✅ CRUD + lịch sử |
| Cart | ✅ | ❌ |
| Wishlist | ✅ | ❌ |
| Checkout | ✅ | ❌ |
| Order | ✅ đọc đơn của mình | ✅ CRUD trạng thái, xem tất cả |
| Review | ✅ tạo, đọc | ✅ đọc/ẩn (moderation nhẹ) |
| Coupon | ✅ áp dụng lúc checkout | ✅ CRUD |
| Customer Management | ❌ | ✅ |
| Analytics/Dashboard | ❌ | ✅ |

Mỗi module nên có ranh giới rõ trong code: hooks (React Query), service (gọi Supabase), types, components — xem Folder Structure.

## 4. Database Entities & Relationships

> Chi tiết schema đầy đủ nằm ở `DATABASE.md`. Ở đây chỉ tóm tắt quan hệ.

```
profiles (1) ── (n) addresses
profiles (1) ── (n) orders
profiles (1) ── (1) carts
profiles (1) ── (n) wishlist_items
profiles (1) ── (n) reviews

categories (1) ── (n) categories (self-ref, parent_id)  [tree 1 cấp cha/con là đủ cho v1]
categories (1) ── (n) products

products (1) ── (n) product_variants
products (1) ── (n) product_images
products (1) ── (n) reviews

product_variants (1) ── (1) inventory
product_variants (1) ── (n) cart_items
product_variants (1) ── (n) wishlist_items
product_variants (1) ── (n) order_items

carts (1) ── (n) cart_items

orders (1) ── (n) order_items
orders (1) ── (n) order_status_history
orders (n) ── (1) addresses (shipping address snapshot)
orders (n) ── (0..1) coupons (coupon áp dụng)

coupons (1) ── (n) coupon_usages
```

Nguyên tắc quan trọng: **order_items lưu snapshot** (tên sản phẩm, SKU, giá, thuộc tính variant tại thời điểm mua) — không join ngược về `products`/`product_variants` để hiển thị lịch sử đơn, vì giá/tên có thể đổi sau này.

## 5. Authentication & Authorization

### Authentication
- Dùng **Supabase Auth** (email + password cho v1; có thể thêm magic link sau).
- Session quản lý bởi Supabase JS SDK (JWT trong localStorage, tự refresh).
- Bảng `profiles` (1-1 với `auth.users`) lưu thêm: `full_name`, `role` (`customer` | `admin`), `phone`. Tạo tự động qua Postgres trigger `on_auth_user_created`.

### Authorization — 2 lớp bắt buộc, không được chỉ dùng 1 lớp

1. **Lớp UI (route guard)**: React Router loader/guard đọc `role` từ profile đã fetch, redirect nếu không đúng role. Đây chỉ là UX, **không phải bảo mật**.
2. **Lớp DB (Row Level Security)** — lớp bảo mật thật sự:
   - `orders`, `cart_items`, `carts`, `wishlist_items`, `addresses`, `reviews`: RLS `USING (auth.uid() = user_id)` cho customer; admin có policy riêng `USING (is_admin())` cho phép đọc tất cả.
   - `products`, `categories`, `product_variants`, `product_images`: đọc public (`USING (true)`), ghi chỉ admin.
   - `coupons`: đọc public chỉ các field cần để validate (hoặc qua RPC để không lộ toàn bộ danh sách coupon active); ghi chỉ admin.
   - Hàm `is_admin()` là SQL function `SECURITY DEFINER` kiểm tra `profiles.role = 'admin'` cho `auth.uid()` hiện tại — tránh lặp lại subquery trong từng policy.

3. **Thao tác nhạy cảm/nhiều bước phải qua Postgres RPC function (`SECURITY DEFINER`), không qua nhiều lệnh insert/update rời rạc từ client.** Ví dụ tạo đơn hàng: kiểm tra tồn kho, trừ kho, tạo order + order_items, ghi lịch sử trạng thái, áp coupon — tất cả trong 1 transaction ở DB, không phải nhiều round-trip từ React.

### Vì sao không tách "middleware server" riêng để check role?
Vì không có backend server tuỳ chỉnh (kiến trúc BaaS). RLS + RPC là "backend logic" của hệ thống này. Đây là điểm dễ bị vibe-code sai nhất — xem mục Risks.

## 6. Folder Structure đề xuất

```
ecommerce-practice/
├── apps/
│   ├── customer/
│   │   ├── src/
│   │   │   ├── app/                # router setup, providers, layout gốc
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── hooks/       # useSignIn, useSignUp, useProfile (React Query)
│   │   │   │   │   └── api.ts       # gọi supabase auth
│   │   │   │   ├── catalog/
│   │   │   │   │   ├── components/  # ProductCard, VariantSelector, FilterSidebar
│   │   │   │   │   ├── hooks/       # useProducts, useProductDetail, useCategories
│   │   │   │   │   └── api.ts
│   │   │   │   ├── cart/
│   │   │   │   │   ├── store.ts     # zustand store (guest cart, ui state)
│   │   │   │   │   ├── hooks/       # useCart (react query, sync cho user đã login)
│   │   │   │   │   └── api.ts
│   │   │   │   ├── wishlist/
│   │   │   │   ├── checkout/
│   │   │   │   ├── orders/
│   │   │   │   └── reviews/
│   │   │   ├── pages/                # map 1-1 với route, compose từ modules
│   │   │   ├── routes/                # react-router route definitions + guards
│   │   │   └── main.tsx
│   │   └── vite.config.ts
│   │
│   └── admin/
│       ├── src/
│       │   ├── app/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── dashboard/
│       │   │   ├── products/
│       │   │   ├── categories/
│       │   │   ├── variants/
│       │   │   ├── inventory/
│       │   │   ├── orders/
│       │   │   ├── customers/
│       │   │   ├── coupons/
│       │   │   └── analytics/
│       │   ├── pages/
│       │   ├── routes/
│       │   └── main.tsx
│       └── vite.config.ts
│
├── packages/
│   ├── shared/
│   │   ├── src/
│   │   │   ├── schemas/            # zod schemas dùng chung (Product, Order, Coupon...)
│   │   │   ├── types/              # types domain suy ra từ zod
│   │   │   ├── constants/          # order status enum, role enum...
│   │   │   └── utils/              # format money, format date...
│   │   └── package.json
│   │
│   └── supabase-client/
│       ├── src/
│       │   ├── client.ts           # createClient(...)
│       │   ├── database.types.ts   # generated bởi `supabase gen types typescript`
│       │   └── rpc/                # wrapper gọi các postgres function (createOrder, applyCoupon...)
│       └── package.json
│
├── supabase/
│   ├── migrations/                 # SQL migration files (schema, RLS, functions, triggers)
│   └── seed.sql
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── UI.md
│   └── TASKS.md
│
├── pnpm-workspace.yaml
└── package.json
```

Quy ước module: mỗi module trong `modules/<name>/` tự chứa `components/`, `hooks/`, `api.ts` (hoặc `store.ts` nếu có zustand). `pages/` chỉ lắp ráp component từ modules + gọi hook, không chứa business logic.

## 7. State Management — phân chia rõ 3 tầng

Đây là phần hay bị lẫn lộn nhất khi "vibe coding" — quy tắc cứng:

### React Query (server state — dữ liệu có nguồn gốc từ DB/Supabase)
- Danh sách/chi tiết sản phẩm, category, variant, inventory hiển thị
- Cart của user đã đăng nhập (đồng bộ server) — cart_items, carts
- Wishlist
- Orders (list + detail + status)
- Reviews
- Admin: mọi CRUD list/detail (products, categories, orders, customers, coupons)
- Analytics data (revenue, top products...)
- Profile hiện tại (`useProfile`)

Quy tắc: **bất kỳ dữ liệu nào fetch từ Supabase đều đi qua React Query**, kể cả khi chỉ fetch 1 lần. Không tự quản lý bằng `useState` + `useEffect`.

### Zustand (client-only global state, không có nguồn gốc server trực tiếp, hoặc cần đọc/ghi từ nhiều component không liên quan cây cha-con)
- **Guest cart** (chưa đăng nhập): giữ trong Zustand + persist middleware (localStorage). Khi login, merge vào server cart qua RPC rồi bỏ zustand cart, chuyển hẳn sang React Query.
- UI state toàn cục: trạng thái mở/đóng sidebar filter (mobile), theme (nếu có), toast/notification queue nội bộ (nếu không dùng lib riêng).
- Selected variant đang xem trên PDP **nếu** nhiều component không liên quan trực tiếp cần đọc nó (thường không cần — ưu tiên local state trước, xem dưới).

Quy tắc: Zustand **không bao giờ lưu dữ liệu đã có React Query quản lý** (tránh 2 nguồn sự thật). Không dùng Zustand để cache API response.

### Local state (`useState`, `useReducer`, React Hook Form)
- Form inputs (login, checkout address, product form ở admin) — quản lý bởi React Hook Form + zod resolver, không phải Zustand.
- Variant lựa chọn tạm thời trên PDP trước khi "thêm vào giỏ" (nếu chỉ dùng trong PDP component đó).
- Modal/drawer open state cục bộ trong 1 component.
- Trang hiện tại của bảng (pagination) nếu không cần đồng bộ qua URL — nhưng khuyến nghị đẩy filter/sort/page lên **URL query params** (qua React Router `useSearchParams`) thay vì state cục bộ, để có thể share link, back/forward hoạt động đúng, và refresh không mất filter.

### Bảng tóm tắt quyết định nhanh

| Dữ liệu | Nơi lưu |
|---|---|
| Product list/detail | React Query |
| Filter/sort/search params | URL (useSearchParams) |
| Guest cart | Zustand + localStorage |
| Logged-in cart | React Query (server) |
| Wishlist | React Query |
| Auth session/profile | React Query (`useProfile`) — session token do Supabase SDK tự quản |
| Checkout form | React Hook Form (local) |
| Order list/detail/status | React Query |
| Admin CRUD forms | React Hook Form (local) + React Query mutation |
| Dashboard filter mở/đóng | local state hoặc Zustand nếu dùng nhiều nơi |
| Analytics data | React Query |

## 8. Business Logic quan trọng (không được vibe-code sơ sài)

1. **Tạo đơn hàng phải atomic**: kiểm tra tồn kho + trừ kho + tạo order/order_items + ghi lịch sử coupon usage, tất cả trong 1 Postgres function (transaction). Nếu bất kỳ bước nào fail (hết hàng), toàn bộ rollback và trả lỗi rõ ràng cho client.

2. **Price/product snapshot**: `order_items` lưu `product_name`, `variant_label`, `sku`, `unit_price` tại thời điểm đặt hàng — không bao giờ tính lại giá đơn cũ từ bảng `products`/`product_variants` hiện tại.

3. **Order status là state machine, không phải free-text field tuỳ ý update**:
   `pending → confirmed → shipped → delivered`, hoặc `pending/confirmed → cancelled`. Không cho phép nhảy ngược hoặc nhảy tắt (vd `pending → delivered`). Enforce bằng CHECK constraint/RPC function, không chỉ ở UI.

4. **Review chỉ được tạo khi**: tồn tại `order_items` thuộc `orders` của user đó, chứa đúng `product_id`, và `orders.status = 'delivered'`. Kiểm tra này nằm trong RLS/RPC, không chỉ ẩn nút ở UI.

5. **Coupon validation** phải chạy lại ở server lúc tạo đơn (không tin giá trị discount tính sẵn từ client): kiểm tra còn hiệu lực (ngày), chưa vượt `usage_limit`, đơn hàng đạt `min_order_amount`, (nếu có) coupon chưa được user này dùng nếu giới hạn 1 lần/user.

6. **Rating trung bình sản phẩm** nên denormalize (`products.avg_rating`, `products.review_count`) cập nhật qua trigger khi insert/update/delete review — tránh phải `AVG()` toàn bộ reviews mỗi lần render danh sách sản phẩm.

7. **Cart merge khi login**: cart guest (Zustand) → gọi RPC merge vào cart server theo `variant_id` (cộng dồn số lượng, hoặc giữ số lượng lớn hơn — cần quyết định rõ 1 rule, khuyến nghị cộng dồn nhưng cap theo tồn kho).

8. **Idempotency khi checkout**: tránh double-submit tạo 2 đơn từ 1 lần bấm (double click, mất mạng rồi retry). Dùng 1 `client_request_id` (uuid tạo phía client, lưu tạm) truyền vào RPC, RPC kiểm tra đã tồn tại order với id đó chưa trước khi tạo.

9. **Soft delete cho product/category**: không hard-delete vì `order_items` có thể còn tham chiếu (dù đã snapshot, vẫn nên giữ `product_id` để link ngược cho admin). Dùng cột `is_active`/`deleted_at`, ẩn khỏi danh sách công khai thay vì xoá.

## 9. Rủi ro & lỗi thiết kế thường gặp

| Rủi ro | Hậu quả | Cách phòng tránh |
|---|---|---|
| Chỉ chặn ở UI (ẩn nút admin), không có RLS | User thường gọi thẳng Supabase API là chiếm quyền admin | Enforce mọi thứ bằng RLS + `is_admin()`, coi UI guard chỉ là UX |
| Trừ tồn kho bằng "đọc số lượng → cộng/trừ ở client → update" | Race condition khi 2 người mua cùng lúc → oversell | Dùng RPC với `UPDATE ... SET qty = qty - x WHERE qty >= x RETURNING` (atomic conditional update) trong transaction |
| Tính giá đơn hàng lại từ bảng product hiện tại | Lịch sử đơn sai khi admin đổi giá sau này | Snapshot giá vào `order_items` lúc tạo đơn |
| Lưu server state (product list, cart server) vào Zustand | 2 nguồn sự thật, cache stale, khó invalidate | Server state chỉ ở React Query |
| Không phân trang danh sách sản phẩm/đơn hàng | Chậm dần khi data lớn, tải hết về client | Phân trang + `range()` của Supabase, hoặc cursor pagination cho infinite scroll |
| Hard delete category đang có product | Lỗi FK constraint hoặc mất dữ liệu lịch sử | Soft delete (`is_active`) |
| Coupon chỉ validate ở client (JS tính % giảm) | User sửa request, tự áp discount tuỳ ý | Validate + tính discount lại ở RPC server-side |
| Order status update tự do (dropdown chọn bất kỳ trạng thái) | Đơn nhảy trạng thái vô lý (delivered → pending) | State machine enforce ở DB/RPC |
| Không xử lý guest cart merge khi login | Mất giỏ hàng khách vừa thêm trước khi đăng nhập | Merge logic rõ ràng khi login thành công |
| N+1 query: fetch product rồi loop fetch variant/ảnh riêng từng cái | Chậm, nhiều round-trip | Dùng nested select của Supabase (`select('*, product_variants(*), product_images(*)')`) |
| Không giới hạn quyền viết trên bảng `reviews`/`orders` theo `user_id` | User A sửa review/order của user B | RLS `USING (auth.uid() = user_id)` cho update/delete |
| Dùng `useEffect` để đồng bộ state cart giữa nhiều component | Bug đồng bộ, re-render thừa, khó debug | Zustand (guest) / React Query (server), không tự chế state đồng bộ |
| Không đặt index cho cột dùng filter/sort (category_id, price, created_at) | Query chậm khi data tăng | Thêm index tương ứng ngay từ migration đầu (xem DATABASE.md) |
| Trộn business logic vào component UI (tính discount, tính trạng thái đơn ngay trong JSX) | Khó test, khó tái sử dụng, dễ sai khi UI đổi | Business logic đặt trong `api.ts`/RPC/hooks, component chỉ render |

## 10. Deployment (tham khảo, không bắt buộc làm ngay)

- Customer app & Admin app deploy riêng (Vercel/Netlify), env riêng để trỏ đúng Supabase project.
- Supabase project dùng chung 1 database, phân biệt qua RLS/role chứ không phải 2 database riêng.
- Migration quản lý qua Supabase CLI (`supabase migration new`, `supabase db push`), không sửa schema trực tiếp qua dashboard khi đã có migration flow.
