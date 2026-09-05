# TASKS.md — Phân chia Phase

Nguyên tắc chia phase: mỗi phase **implement được và test/verify được độc lập** (có thể chạy app, thao tác tay hoặc viết test, thấy kết quả cụ thể), không phase nào yêu cầu phase sau mới verify được. Thứ tự phase tôn trọng dependency (DB trước UI, auth trước mọi thứ cần user, catalog trước cart...).

Mỗi phase liệt kê: **Mục tiêu**, **Việc cần làm**, **Điều kiện hoàn thành (Definition of Done)**, **Cách test/verify**.

---

## Phase 0 — Project Setup & Tooling

**Mục tiêu**: có bộ khung monorepo chạy được, kết nối Supabase, chưa có tính năng nghiệp vụ.

**Việc cần làm**:
- Khởi tạo monorepo pnpm workspaces: `apps/customer`, `apps/admin`, `packages/shared`, `packages/supabase-client`.
- Setup Vite + React + TypeScript cho 2 app, Tailwind, Ant Design.
- Tạo Supabase project (cloud hoặc local qua Supabase CLI), config `.env` cho 2 app.
- Setup `packages/supabase-client` với `createClient` cơ bản.
- Setup ESLint/Prettier dùng chung.
- Migration đầu tiên: chỉ tạo `profiles` + trigger `handle_new_user` (để test kết nối auth cơ bản).

**DoD**:
- `pnpm dev` chạy được cả 2 app, mỗi app hiển thị 1 trang trắng "Hello Customer/Admin" không lỗi console.
- Supabase client kết nối thành công (test bằng 1 query đơn giản `select 1` hoặc `auth.getSession()`).

**Test/verify**: chạy `pnpm dev`, mở 2 URL, kiểm tra console không có lỗi kết nối Supabase.

---

## Phase 1 — Authentication & Authorization nền tảng

**Mục tiêu**: đăng ký/đăng nhập/đăng xuất hoạt động ở cả 2 app, phân quyền role, RLS cơ bản có hiệu lực.

**Việc cần làm**:
- Migration: hoàn thiện `profiles` (role, full_name, phone), RLS policy cho `profiles`, function `is_admin()`.
- Module `auth` ở cả 2 app: form đăng ký/đăng nhập (React Hook Form + zod), `useProfile` (React Query) đọc session hiện tại.
- Route guard: customer app cho phép mọi route công khai + route riêng tư yêu cầu login; admin app **chặn toàn bộ** nếu không phải role `admin` (redirect về trang thông báo không có quyền).
- Trang Account cơ bản (xem thông tin, logout).

**DoD**:
- Đăng ký tạo được user mới + `profiles` row tự động với `role='customer'`.
- Đăng nhập user thường vào admin app bị chặn (kể cả gõ thẳng URL).
- Tạo tay 1 user có `role='admin'` (qua SQL/dashboard) đăng nhập admin app thành công.

**Test/verify**:
- Test tay: đăng ký, đăng xuất, đăng nhập lại giữ session.
- Test RLS: dùng Supabase client với JWT của user A, thử `select * from profiles where id = <user B>` → phải trả rỗng hoặc lỗi (không phải admin).

---

## Phase 2 — Catalog (Read-only, Public)

**Mục tiêu**: khách (kể cả chưa login) xem được danh sách/chi tiết sản phẩm, search/filter/sort hoạt động, không cần admin CRUD UI (data seed bằng SQL).

**Việc cần làm**:
- Migration: `categories`, `products`, `product_variants`, `product_images`, `inventory`, RLS đọc public cho các bảng này, index cần thiết (slug, category_id, full-text search vector).
- Seed data script (SQL) tạo sẵn vài category, product, variant, ảnh mẫu để có data test.
- Customer app module `catalog`: `useCategories`, `useProducts` (params: search/category/price/size/color/sort/page), `useProductDetail`.
- Trang danh sách sản phẩm với `FilterSidebar`, sort, pagination, đồng bộ URL query params.
- Trang chi tiết sản phẩm với `VariantSelector` (đổi giá/tồn kho theo variant chọn).

**DoD**:
- Có thể search theo từ khoá, filter theo category/giá/size/màu/còn hàng, sort theo giá/mới nhất/rating, tất cả phản ánh đúng lên URL và load lại trang giữ nguyên filter.
- Trang chi tiết chọn variant → giá và trạng thái tồn kho cập nhật đúng.

**Test/verify**: thao tác tay trên UI với data đã seed; kiểm tra URL thay đổi đúng khi đổi filter; F5 lại trang giữ nguyên bộ lọc.

---

## Phase 3 — Admin Catalog CRUD + Inventory

**Mục tiêu**: admin tự tạo/sửa được category, product, variant, upload ảnh, cập nhật tồn kho — thay thế nhu cầu seed SQL tay từ giờ về sau.

**Việc cần làm**:
- RLS ghi cho `categories`/`products`/`product_variants`/`product_images`/`inventory`: admin only.
- Admin module `categories`: bảng + form CRUD.
- Admin module `products`: bảng (server-side pagination), form tạo/sửa với section variant (thêm/sửa/xoá variant trong form), upload ảnh lên Supabase Storage.
- Admin module `inventory`: bảng tồn kho theo variant, modal điều chỉnh kho (+/-) ghi `inventory_movements`, filter "sắp hết hàng".
- Soft delete cho product/category (`is_active`), ẩn khỏi customer app khi `is_active=false`.

**DoD**:
- Admin tạo mới 1 category → 1 product với 2+ variant → thấy ngay ở customer app (Phase 2 UI) không cần seed SQL nữa.
- Điều chỉnh tồn kho ghi lại lịch sử đúng, xem lại được lịch sử.
- Ẩn 1 sản phẩm → biến mất khỏi danh sách customer nhưng vẫn còn trong admin (đánh dấu inactive).

**Test/verify**: full flow tay từ admin tạo data → customer thấy data → không cần đụng SQL trực tiếp nữa cho các phase sau.

---

## Phase 4 — Cart & Wishlist

**Mục tiêu**: cart hoạt động cho cả guest và logged-in, merge đúng khi login; wishlist cho logged-in.

**Việc cần làm**:
- Migration: `carts`, `cart_items`, `wishlist_items`, RLS own-row.
- RPC `merge_guest_cart`.
- Customer module `cart`: Zustand store (guest cart + persist localStorage) khi chưa login; khi đã login, `useCart` (React Query) đọc/ghi thẳng `cart_items` qua Supabase, không qua Zustand.
- Xử lý sự kiện login thành công: gọi merge RPC, invalidate cart query, clear zustand guest cart.
- Trang giỏ hàng: sửa số lượng, xoá, cảnh báo hết hàng/đổi giá (so tồn kho/giá hiện tại của variant với lúc thêm).
- Module `wishlist`: toggle thêm/xoá, trang wishlist.

**DoD**:
- Thêm sản phẩm vào giỏ khi chưa login → đăng nhập → giỏ hàng server có đúng sản phẩm đã thêm (merge thành công, không mất, không trùng lặp nếu variant đã có sẵn trong giỏ server).
- Sửa/xoá item trong giỏ phản ánh đúng cả 2 trường hợp guest/logged-in.
- Thêm/xoá wishlist hoạt động, chỉ cho phép khi đã login.

**Test/verify**: test tay kịch bản "thêm 2 sản phẩm lúc chưa login → login → kiểm tra giỏ hàng đúng 2 sản phẩm, đúng số lượng".

---

## Phase 5 — Checkout & Orders (core business logic)

**Mục tiêu**: luồng đặt hàng atomic, đúng, chống oversell, chống double-submit; xem lịch sử/trạng thái đơn.

**Việc cần làm**:
- Migration: `addresses`, `orders`, `order_items`, `order_status_history`, RLS own-row + admin đọc tất cả.
- RPC `create_order`: transaction đầy đủ (check tồn kho conditional update, snapshot giá/tên, tính subtotal/total, ghi order_status_history, clear cart_items, idempotency qua `client_request_id`).
- RPC `update_order_status` với state machine enforce.
- Customer module `checkout`: Steps UI (địa chỉ → review → xác nhận), gọi `create_order`, xử lý lỗi tồn kho rõ ràng.
- Customer module `orders`: danh sách + chi tiết đơn (timeline trạng thái từ `order_status_history`).

**DoD**:
- Đặt hàng thành công trừ đúng tồn kho, tạo order + order_items snapshot đúng giá tại thời điểm đó.
- Đổi giá sản phẩm sau khi đã có đơn cũ → đơn cũ vẫn hiển thị giá lúc mua (không đổi theo).
- Bấm nút đặt hàng 2 lần liên tiếp (double click / mất mạng retry cùng `client_request_id`) → chỉ tạo 1 đơn.
- Test race condition: 2 request đặt hàng đồng thời cho variant chỉ còn 1 tồn kho → chỉ 1 request thành công, request kia nhận lỗi hết hàng rõ ràng (không tồn kho âm).

**Test/verify**: viết script/test gọi RPC song song (hoặc test tay bằng 2 tab) để verify race condition; kiểm tra `inventory.quantity >= 0` luôn đúng.

---

## Phase 6 — Coupons

**Mục tiêu**: áp mã giảm giá đúng luật, validate server-side, tích hợp vào `create_order`.

**Việc cần làm**:
- Migration: `coupons`, `coupon_usages`, RLS (đọc public giới hạn qua RPC, ghi admin only).
- RPC `validate_coupon(code, order_amount)`.
- Cập nhật `create_order` để gọi lại `validate_coupon` server-side (không tin discount tính sẵn từ client).
- Admin module `coupons`: CRUD.
- Customer checkout: ô nhập mã, hiển thị kết quả validate ngay khi nhập (preview), áp dụng khi submit.

**DoD**:
- Coupon hết hạn/hết lượt dùng/chưa đạt đơn tối thiểu → bị từ chối cả ở preview lẫn lúc submit thật.
- Sửa discount ở request (giả lập client bị can thiệp) không ảnh hưởng — server luôn tính lại từ `validate_coupon`.
- `usage_limit_per_user` được enforce đúng (dùng quá số lần cho phép bị từ chối).

**Test/verify**: test tay các case invalid (hết hạn, hết lượt, chưa đủ đơn tối thiểu, đã dùng quá giới hạn/user); thử gửi request `create_order` với `discount_amount` tự chế ở body (nếu kiến trúc client gửi field này) → xác nhận server bỏ qua, tự tính lại.

---

## Phase 7 — Reviews & Ratings

**Mục tiêu**: review chỉ tạo được khi đủ điều kiện, rating trung bình tự cập nhật.

**Việc cần làm**:
- Migration: `reviews`, RLS, trigger `update_product_rating`.
- RPC `create_review` kiểm tra `order_items`/`orders.status='delivered'`/`order.user_id = auth.uid()`.
- Customer: form review trên trang chi tiết đơn (chỉ hiện nếu đủ điều kiện) + hiển thị review/rating trên trang sản phẩm.
- Admin: xem review, toggle `is_hidden` (moderation nhẹ).

**DoD**:
- User chưa mua hoặc đơn chưa `delivered` không thể tạo review (thử gọi thẳng RPC cũng bị từ chối, không chỉ ẩn UI).
- Sau khi review, `products.avg_rating`/`review_count` cập nhật đúng ngay lập tức.
- Admin ẩn 1 review → biến mất khỏi trang sản phẩm customer nhưng vẫn còn trong DB.

**Test/verify**: thử tạo review cho đơn `pending` (phải bị chặn), rồi chuyển đơn sang `delivered` (qua Phase 8) và thử lại (phải thành công).

---

## Phase 8 — Admin Order Management & Customer Management

**Mục tiêu**: admin xử lý được toàn bộ vòng đời đơn hàng và xem thông tin khách hàng.

**Việc cần làm**:
- Admin module `orders`: bảng filter (trạng thái, ngày, khách hàng), chi tiết đơn, cập nhật trạng thái (chỉ trạng thái kế tiếp hợp lệ), payment status (mock, đánh dấu paid thủ công).
- Admin module `customers`: bảng khách hàng (tổng đơn, tổng chi tiêu — có thể dùng view/RPC tổng hợp), chi tiết khách hàng + lịch sử đơn.

**DoD**:
- Admin chuyển trạng thái đơn đúng thứ tự state machine; thử chuyển trạng thái không hợp lệ (vd pending → delivered) bị từ chối ở cả UI lẫn RPC.
- Danh sách khách hàng hiển thị đúng tổng chi tiêu/số đơn khớp với dữ liệu `orders`.

**Test/verify**: test tay luồng đầy đủ 1 đơn từ `pending` → `delivered`, xác nhận review (Phase 7) mở khoá đúng lúc đơn chuyển `delivered`.

---

## Phase 9 — Analytics Dashboard

**Mục tiêu**: dashboard admin phản ánh đúng số liệu thật từ dữ liệu đã có.

**Việc cần làm**:
- Tạo Postgres views hoặc RPC tổng hợp: doanh thu theo ngày/tuần/tháng, top sản phẩm bán chạy, phân bổ đơn theo trạng thái, sản phẩm sắp hết hàng.
- Admin trang Dashboard + trang Analytics: `Statistic`, biểu đồ, bảng top sản phẩm.

**DoD**:
- Số liệu dashboard khớp khi đối chiếu tay với vài đơn hàng test đã tạo ở các phase trước (vd tổng doanh thu = tổng `total` các đơn không `cancelled`).

**Test/verify**: tạo vài đơn hàng có ngày/trạng thái khác nhau (chỉnh `created_at` bằng SQL nếu cần test theo thời gian), đối chiếu số liệu dashboard bằng tay.

---

## Phase 10 — Polish & Hardening

**Mục tiêu**: rà lại toàn bộ rủi ro đã liệt kê ở ARCHITECTURE.md, hoàn thiện trải nghiệm.

**Việc cần làm**:
- Rà soát lại toàn bộ RLS policies bằng checklist (thử mọi bảng với JWT của user thường, xác nhận không đọc/ghi được dữ liệu người khác).
- Thêm loading/error/empty state còn thiếu (Skeleton, Result, EmptyState) trên mọi trang.
- Kiểm tra pagination đã áp dụng cho mọi danh sách lớn (products, orders, customers, reviews).
- Review lại index DB theo query pattern thực tế đã dùng (EXPLAIN ANALYZE các query chậm nếu có).
- (Tuỳ chọn) deploy thử customer app + admin app lên Vercel/Netlify với Supabase project thật, kiểm tra env tách biệt.

**DoD**: chạy qua toàn bộ checklist rủi ro trong ARCHITECTURE.md mục 9, xác nhận từng dòng đã được xử lý hoặc ghi chú lý do chưa cần (nếu ngoài phạm vi v1).

---

## Ghi chú thực thi

- Không bắt buộc làm phase sau khi phase trước chưa đạt DoD — đây là điểm mấu chốt để giữ kỷ luật "vibe coding": mỗi phase phải chứng minh được là đúng trước khi build tiếp lên trên nó.
- Nếu muốn rút gọn dự án (thời gian hạn chế), có thể bỏ Phase 6 (Coupon) và Phase 9 (Analytics) mà không ảnh hưởng luồng core (Phase 0-5, 7-8) — 2 phase này độc lập tương đối với phần còn lại.
- Phase 5 (Checkout) là phase quan trọng nhất về mặt kỹ thuật (transaction, race condition, idempotency) — nên dành nhiều thời gian nhất ở đây, đừng vibe-code nhanh qua phase này.
