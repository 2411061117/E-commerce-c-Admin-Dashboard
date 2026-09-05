# UI.md

Đặc tả UI ở mức wireframe/mô tả — không viết code ở bước này. Dùng **Ant Design** cho component có sẵn tính năng phức tạp (Table, Form, Select, Steps, Upload...), **Tailwind CSS** cho layout/spacing/tuỳ biến nhanh không cần tạo component riêng. Nguyên tắc: không dùng Tailwind để build lại thứ Ant Design đã có sẵn (vd tự build lại Table/Modal).

## 1. Customer App

### 1.1 Layout chung
- Header: logo, search bar (Ant `Input.Search`), menu category, icon cart (badge số lượng), icon wishlist, avatar/account menu.
- Footer: thông tin cơ bản (tối giản, không phải trọng tâm).
- Layout responsive: menu category thu gọn thành Drawer trên mobile.

### 1.2 Trang & Component chính

**Trang chủ (`/`)**
- Banner (tĩnh, không cần CMS).
- Danh sách category nổi bật → link tới trang danh sách sản phẩm theo category.
- Sản phẩm nổi bật/bán chạy.

**Danh sách sản phẩm (`/products`, `/categories/:slug`)**
- `FilterSidebar` (Ant `Collapse` hoặc `Checkbox.Group`): category, khoảng giá (`Slider`), size, màu, còn hàng (`Switch`).
- Thanh sort phía trên grid (Ant `Select`): mới nhất / giá tăng / giá giảm / bán chạy / đánh giá.
- `ProductGrid` + `ProductCard` (ảnh, tên, giá từ-đến nếu nhiều variant, rating sao, badge hết hàng).
- Pagination (Ant `Pagination`) hoặc infinite scroll — khuyến nghị **Pagination cổ điển** cho v1 (đơn giản hơn, dễ đồng bộ URL params).
- Tất cả filter/sort/page phản ánh vào URL query string (`?category=...&minPrice=...&sort=...&page=...`) để share link/back-forward hoạt động đúng.
- Empty state khi không có kết quả tìm kiếm.

**Chi tiết sản phẩm (`/products/:slug`)**
- Gallery ảnh (Ant `Image.PreviewGroup`).
- Tên, giá (thay đổi theo variant chọn), rating trung bình + số lượng review.
- `VariantSelector`: 2 nhóm button chọn Size / Màu — khi chọn đủ, hiển thị giá + tồn kho của variant đó; disable tổ hợp không tồn tại; hiển thị "Hết hàng" nếu quantity = 0.
- Số lượng (`InputNumber`, max = tồn kho variant) + nút "Thêm vào giỏ" / "Mua ngay".
- Nút wishlist (toggle icon trái tim).
- Mô tả sản phẩm (tab hoặc section riêng).
- `ReviewList` (phân trang) + `ReviewSummary` (phân bố sao 1-5, dạng bar chart đơn giản).
- Form viết review chỉ hiện nếu user đủ điều kiện (đã mua & đơn delivered) — kiểm tra qua query riêng, ẩn hoàn toàn nếu không đủ điều kiện (không chỉ disable).

**Giỏ hàng (`/cart`)**
- Bảng/list các dòng: ảnh, tên + variant label, đơn giá, `InputNumber` số lượng, thành tiền dòng, nút xoá.
- Cảnh báo inline nếu sản phẩm hết hàng hoặc giá thay đổi so với lúc thêm vào giỏ.
- Tổng tiền + nút "Tiến hành thanh toán".
- Empty state với CTA quay lại mua sắm.

**Wishlist (`/wishlist`)**
- Grid tương tự `ProductGrid`, thêm nút "Thêm vào giỏ" trực tiếp (mở `VariantSelector` dạng modal nếu sản phẩm có nhiều variant) và nút xoá khỏi wishlist.

**Checkout (`/checkout`)** — dùng Ant `Steps`: 1) Địa chỉ giao hàng 2) Xem lại đơn 3) Xác nhận.
- Bước 1: chọn địa chỉ có sẵn (`Radio.Group` các address card) hoặc form thêm địa chỉ mới (React Hook Form + zod).
- Bước 2: danh sách sản phẩm trong đơn (read-only), ô nhập mã coupon + nút áp dụng (hiển thị kết quả validate ngay, không chờ tới lúc submit), tổng kết subtotal/discount/shipping/total.
- Bước 3: nút "Đặt hàng" — disable ngay sau khi bấm (tránh double submit), loading state rõ ràng, điều hướng tới trang xác nhận đơn khi thành công.
- Xử lý lỗi tồn kho lúc submit (server trả lỗi "sản phẩm X hết hàng") → hiển thị rõ, quay lại giỏ hàng để sửa.

**Lịch sử đơn hàng (`/orders`)**
- Bảng/list các đơn: mã đơn, ngày đặt, tổng tiền, trạng thái (Ant `Tag` màu theo status), link chi tiết.
- Filter theo trạng thái (tuỳ chọn, không bắt buộc v1).

**Chi tiết đơn hàng (`/orders/:id`)**
- `Steps` hoặc `Timeline` hiển thị tiến trình trạng thái (pending → confirmed → shipped → delivered), lấy từ `order_status_history`.
- Danh sách sản phẩm trong đơn (dùng đúng data snapshot, không link ngược sản phẩm hiện tại).
- Địa chỉ giao hàng (snapshot), tổng tiền, mã coupon đã dùng nếu có.
- Nếu `delivered`: nút "Viết đánh giá" cho từng sản phẩm chưa review.

**Auth (`/login`, `/register`)**
- Form đơn giản (Ant `Form` + zod resolver), validate client trước, lỗi server (email tồn tại...) hiển thị inline.

**Account (`/account`)**
- Thông tin cá nhân (sửa `full_name`, `phone`), quản lý địa chỉ (CRUD đơn giản), đổi mật khẩu (qua Supabase Auth).

### 1.3 Component dùng chung đáng chú ý
- `ProductCard`, `ProductGrid`, `VariantSelector`, `PriceTag` (format tiền tệ nhất quán), `RatingStars`, `StatusTag` (map order status → màu/label), `EmptyState`, `ConfirmModal` (dùng Ant `Modal.confirm` khi xoá).

## 2. Admin App

### 2.1 Layout chung
- Ant `Layout` chuẩn: Sider (menu điều hướng theo module) + Header (thông tin admin đang đăng nhập, logout) + Content.
- Menu Sider: Dashboard, Sản phẩm, Danh mục, Đơn hàng, Khách hàng, Coupon, (Inventory có thể nằm trong trang Sản phẩm thay vì menu riêng — xem 2.3).

### 2.2 Dashboard (`/`)
- Hàng thẻ số liệu tổng quan (`Statistic`): doanh thu hôm nay/tháng, số đơn mới, đơn đang xử lý, sản phẩm sắp hết hàng.
- Biểu đồ doanh thu theo thời gian (line/bar chart — chọn 1 lib nhẹ khi implement, không quyết định ở bước docs).
- Bảng top sản phẩm bán chạy (top 5-10).
- Bảng đơn hàng mới nhất (link nhanh sang chi tiết).

### 2.3 Quản lý sản phẩm (`/products`)
- Bảng (Ant `Table`) có server-side pagination/filter/sort thật (gọi lại API khi đổi trang/filter, không load hết rồi filter client).
- Cột: ảnh đại diện, tên, category, giá (khoảng min-max theo variant), tổng tồn kho, trạng thái active, actions (sửa/ẩn).
- Nút "Thêm sản phẩm" → form tạo/sửa sản phẩm, gồm các section:
  - Thông tin chung (tên, category `TreeSelect`/`Select`, mô tả `TextArea` hoặc rich text đơn giản, giá cơ bản).
  - Upload ảnh (Ant `Upload` → Supabase Storage), sắp xếp thứ tự ảnh (kéo thả — có thể để v2 nếu phức tạp, v1 chỉ cần thêm/xoá).
  - **Quản lý variant** (bảng con trong form hoặc tab riêng): thêm dòng variant (size, màu, giá, SKU tự sinh hoặc nhập tay), sửa/xoá variant.
  - Ẩn/xoá sản phẩm (soft delete, có `Popconfirm` xác nhận, cảnh báo nếu sản phẩm đang có đơn hàng liên quan — không chặn, chỉ cảnh báo).

### 2.4 Quản lý danh mục (`/categories`)
- Bảng đơn giản (tên, slug, danh mục cha, thứ tự, trạng thái).
- Form thêm/sửa, `Select` chọn category cha (chỉ hiện category cấp 1 làm lựa chọn cha — enforce giới hạn 2 cấp ở UI).

### 2.5 Quản lý tồn kho (tích hợp trong trang sản phẩm hoặc `/inventory`)
- Bảng riêng liệt kê tất cả variant + tồn kho hiện tại, filter theo "sắp hết hàng" (`quantity < threshold`).
- Action "Điều chỉnh tồn kho": modal nhập số lượng thay đổi (+/-) + lý do → ghi vào `inventory_movements`.
- Tab/link xem lịch sử thay đổi kho của 1 variant.

### 2.6 Quản lý đơn hàng (`/orders`)
- Bảng: mã đơn, khách hàng, ngày đặt, tổng tiền, trạng thái (`Tag`), payment status, actions.
- Filter: trạng thái (`Select` multi), khoảng ngày (`RangePicker`), tìm theo mã đơn/khách hàng (`Input.Search`).
- Chi tiết đơn (`/orders/:id`): thông tin khách hàng, địa chỉ (snapshot), danh sách sản phẩm, timeline trạng thái.
- Cập nhật trạng thái: `Select`/`Steps` chỉ hiển thị các trạng thái **kế tiếp hợp lệ** theo state machine (không cho chọn tự do), xác nhận bằng `Popconfirm`.

### 2.7 Quản lý khách hàng (`/customers`)
- Bảng: tên, email, số đơn đã đặt, tổng chi tiêu, ngày tham gia.
- Chi tiết khách hàng: thông tin cá nhân, địa chỉ, lịch sử đơn hàng (link sang `/orders/:id`).
- Không có action sửa/xoá khách hàng ở v1 (chỉ xem — tránh admin tự ý sửa dữ liệu cá nhân nhạy cảm).

### 2.8 Quản lý coupon (`/coupons`)
- Bảng: mã, loại giảm giá, giá trị, hiệu lực từ-đến, đã dùng/giới hạn, trạng thái active.
- Form tạo/sửa: các field tương ứng schema `coupons`, validate `expires_at > starts_at` ở client (zod) lẫn server.

### 2.9 Analytics (`/analytics`)
- Có thể gộp phần lớn vào Dashboard; trang riêng này mở rộng: filter khoảng thời gian tuỳ chỉnh, biểu đồ doanh thu chi tiết hơn, phân bổ đơn theo trạng thái (pie/donut), top sản phẩm/category theo doanh thu.

## 3. Nguyên tắc UI xuyên suốt

- Mọi bảng dữ liệu lớn (products, orders, customers) đều **phân trang phía server**, không load hết rồi filter ở client.
- Mọi action phá huỷ (xoá, huỷ đơn, ẩn sản phẩm) đều có xác nhận (`Popconfirm`/`Modal.confirm`).
- Trạng thái loading/error phải hiển thị nhất quán: dùng Ant `Skeleton` cho loading danh sách, `Result`/`Alert` cho lỗi — không để trắng trang khi query đang chạy hoặc lỗi.
- Toast thông báo (Ant `message`/`notification`) cho mọi mutation thành công/thất bại (thêm giỏ hàng, đặt hàng, cập nhật trạng thái...).
- Responsive: Customer app bắt buộc responsive tốt (khách hàng dùng mobile nhiều); Admin app ưu tiên desktop, responsive ở mức chấp nhận được (không bắt buộc tối ưu mobile).
