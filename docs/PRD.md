# PRD — E-commerce Full-stack Practice Project

## 1. Mục tiêu dự án

Xây dựng một hệ thống e-commerce full-stack tối giản nhưng **đúng chuẩn kiến trúc production** để luyện kỹ năng "vibe coding" có kỷ luật: mỗi phase có scope rõ ràng, implement được, test được độc lập, không viết code tràn lan không kiểm soát.

Đây là dự án học tập, nhưng được thiết kế **như một dự án thật**: có RLS, có transaction, có state machine, có snapshot dữ liệu — không phải bản demo tối giản bỏ qua các vấn đề khó.

## 2. Phạm vi (Scope)

### Trong phạm vi
- 2 ứng dụng: **Customer Storefront** và **Admin Panel**
- Auth (đăng ký/đăng nhập) qua Supabase Auth
- Catalog: category, product, variant (size/màu), inventory
- Tìm kiếm, filter, sort sản phẩm
- Cart, wishlist (cả guest và logged-in)
- Checkout, tạo đơn hàng, theo dõi trạng thái đơn
- Review/rating sau khi nhận hàng
- Admin: CRUD product/category/variant, quản lý inventory, orders, customers, coupon, revenue analytics

### Ngoài phạm vi (out of scope cho bản v1)
- Thanh toán thật (Stripe/VNPay) — dùng **mock payment** (đánh dấu đơn là "paid" thủ công hoặc giả lập)
- Multi-vendor / marketplace
- Đa ngôn ngữ, đa tiền tệ
- Shipping fee động theo địa lý
- Notification real-time (email/SMS) — có thể để placeholder
- Mobile app

## 3. Actors / Roles

| Role | Mô tả |
|---|---|
| Guest | Chưa đăng nhập, xem sản phẩm, có cart tạm (localStorage) |
| Customer | Đã đăng ký, có cart/wishlist đồng bộ server, đặt hàng, review |
| Admin | Quản trị toàn bộ catalog, order, customer, coupon, xem analytics |

Không có role "staff/moderator" ở v1 — chỉ 2 role: `customer`, `admin`. Có thể mở rộng sau (xem TASKS.md — risks).

## 4. Customer — User Stories

### Auth
- Là guest, tôi có thể đăng ký tài khoản bằng email/password.
- Là guest, tôi có thể đăng nhập.
- Là customer, tôi có thể đăng xuất, cập nhật hồ sơ cá nhân.

### Catalog & Discovery
- Tôi có thể xem danh sách sản phẩm theo category.
- Tôi có thể tìm kiếm sản phẩm theo tên/mô tả.
- Tôi có thể filter theo category, khoảng giá, size, màu, tình trạng còn hàng.
- Tôi có thể sort theo giá, mới nhất, bán chạy, đánh giá.
- Tôi có thể xem chi tiết sản phẩm: ảnh, mô tả, các variant, giá theo variant, tồn kho, review.
- Tôi có thể chọn variant (size + màu) và thấy giá/tồn kho cập nhật theo variant đã chọn.

### Cart & Wishlist
- Tôi có thể thêm sản phẩm (kèm variant) vào giỏ hàng dù chưa đăng nhập.
- Giỏ hàng guest được giữ lại và merge vào tài khoản khi tôi đăng nhập.
- Tôi có thể sửa số lượng, xoá sản phẩm khỏi giỏ.
- Tôi có thể thêm/xoá sản phẩm khỏi wishlist (yêu cầu đăng nhập).
- Hệ thống cảnh báo nếu sản phẩm trong giỏ hết hàng hoặc giá đã thay đổi.

### Checkout & Orders
- Tôi có thể checkout: chọn/nhập địa chỉ giao hàng, áp mã giảm giá, xem tổng tiền, xác nhận đặt hàng.
- Hệ thống phải kiểm tra tồn kho tại thời điểm đặt hàng (tránh oversell).
- Sau khi đặt hàng, tôi nhận được mã đơn và không thể bấm đặt lại 2 lần cho cùng 1 giỏ hàng (idempotent).
- Tôi có thể xem lịch sử đơn hàng của mình.
- Tôi có thể xem chi tiết + trạng thái hiện tại của từng đơn (pending → confirmed → shipped → delivered, hoặc cancelled).

### Review
- Tôi chỉ có thể review sản phẩm đã mua và đơn đã ở trạng thái `delivered`.
- Tôi có thể cho điểm (1-5 sao) + viết nhận xét.
- Rating trung bình của sản phẩm được cập nhật tự động.

## 5. Admin — User Stories

### Dashboard
- Tôi muốn xem tổng quan: doanh thu theo ngày/tuần/tháng, số đơn mới, top sản phẩm bán chạy, sản phẩm sắp hết hàng.

### Catalog Management
- Tôi có thể CRUD category (có thể phân cấp cha/con — xem quyết định ở ARCHITECTURE.md).
- Tôi có thể CRUD product (thông tin chung, ảnh, mô tả).
- Tôi có thể CRUD variant cho từng product (size, màu, giá riêng, SKU riêng).
- Tôi có thể cập nhật tồn kho (inventory) theo variant, xem lịch sử thay đổi tồn kho.

### Order Management
- Tôi có thể xem danh sách đơn hàng, filter theo trạng thái/khách hàng/ngày.
- Tôi có thể cập nhật trạng thái đơn hàng theo đúng luồng cho phép (state machine).
- Tôi có thể xem chi tiết đơn: sản phẩm, giá tại thời điểm mua, địa chỉ, khách hàng.

### Customer Management
- Tôi có thể xem danh sách khách hàng, lịch sử mua hàng, tổng chi tiêu.

### Coupon Management
- Tôi có thể CRUD coupon: mã, % hoặc số tiền giảm, điều kiện áp dụng (đơn tối thiểu), thời hạn, giới hạn số lần dùng.

### Analytics
- Tôi có thể xem biểu đồ doanh thu theo thời gian, phân bổ đơn theo trạng thái, sản phẩm bán chạy nhất.

## 6. Non-functional Requirements

- **Bảo mật**: mọi rule truy cập dữ liệu nhạy cảm (order, cart, address) phải được enforce bằng Postgres RLS, không chỉ ở tầng UI.
- **Tính nhất quán**: thao tác tạo đơn hàng phải atomic (transaction), không được để tồn kho âm.
- **Khả năng test độc lập**: mỗi phase trong TASKS.md phải chạy và verify được mà không phụ thuộc phase chưa làm.
- **Performance cơ bản**: danh sách sản phẩm/đơn hàng phải phân trang, không load toàn bộ.
- **Khả năng mở rộng vừa đủ**: schema và code không over-engineer cho nhu cầu chưa có, nhưng không chặn việc mở rộng hợp lý (thêm attribute mới, thêm role mới).

## 7. Success Criteria (định nghĩa "xong" cho v1)

- Customer có thể hoàn thành full flow: đăng ký → duyệt sản phẩm → filter/sort → chọn variant → thêm giỏ → checkout → theo dõi đơn → review.
- Admin có thể hoàn thành full flow: tạo category → tạo product + variant → cập nhật kho → xử lý đơn khách đặt → tạo coupon → xem doanh thu.
- Không có lỗ hổng RLS cho phép user A đọc/ghi dữ liệu (cart, order, address) của user B.
- Không xảy ra oversell khi 2 khách đặt cùng lúc sản phẩm sắp hết hàng (kiểm thử race condition).
