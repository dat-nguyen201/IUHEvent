# Kế Hoạch Chi Tiết: MongoDB, Admin Và Chế Độ Demo/Remote

## Tóm Tắt

Nhóm chia thành một khối backend lớn do **bạn và Thành viên 2 cùng phụ trách**, cùng ba nhánh giao diện/tích hợp riêng. Chế độ `demo` giữ nguyên và là mặc định; chế độ `remote` dùng MongoDB Atlas qua Express API. Không để app kết nối trực tiếp tới MongoDB vì connection string và credentials phải nằm ở backend. [MongoDB Node.js Driver](https://www.mongodb.com/docs/drivers/node/current/connect/)

Mục tiêu là mỗi thành viên có quyền sở hữu file/chức năng rõ, có thể làm song song theo API contract và merge qua PR nhỏ. Trước khi bắt đầu, giữ nguyên thay đổi local hiện có trong `package-lock.json`; không hoàn tác thay đổi đó như một phần công việc này.

## Phân Công

### Thành viên 1 – Bạn và Thành viên 2: Backend MongoDB và remote auth

Đây là khối công việc lớn nhất. Hai người cùng sở hữu tính năng, nhưng chia file rõ để tránh conflict.

**adapter phía app và kiểm thử API, nhánh `feat/remote-auth-client`:**

- Tạo cấu hình `EXPO_PUBLIC_APP_MODE=demo|remote`; mặc định `demo`.
- Tạo API client dùng chung, nhận `EXPO_PUBLIC_API_URL`, gửi token và ánh xạ lỗi mạng/lỗi xác thực.
- Tạo remote auth service cho đăng ký, đăng nhập, lấy hồ sơ/phiên; tích hợp qua `AuthContext`.
- Lưu token bằng lớp lưu trữ an toàn đang có; đăng xuất remote xóa phiên cục bộ.
- Giữ nguyên demo service và luồng `admin / 123456789`. Tài khoản demo không được xem là admin của remote.
- Tạo Postman collection cho auth, phân quyền và các luồng kiểm thử cơ bản.

**backend, nhánh `feat/mongodb-api`:**

- Tạo `server/` bằng TypeScript + Express và kết nối MongoDB Atlas bằng MongoDB Node.js Driver.
- Tạo collections `users`, `events`, `registrations`, `savedEvents`; thêm unique indexes cho email, mã sinh viên và cặp user/event ở đăng ký/lưu sự kiện.
- Làm hash mật khẩu, JWT, middleware `requireAuth`/`requireAdmin`, kiểm tra trạng thái tài khoản và validation request.
- Tạo API auth, hồ sơ, sự kiện, đăng ký, lịch đã lưu/check-in và API quản trị sự kiện/người dùng.
- Tạo seed script cho dữ liệu sự kiện mẫu và tài khoản admin; không ghi credentials vào source.
- Thêm `.env.example`, health endpoint, xử lý lỗi nhất quán, README riêng cho backend. Kết nối Atlas dùng biến môi trường phía server. [MongoDB data modeling](https://www.mongodb.com/docs/manual/data-modeling/)

**Bàn giao chung:** app đăng nhập được vào API remote; backend phân biệt sinh viên/admin; demo vẫn dùng được độc lập.

### Thành viên 3 – Giao diện quản trị sự kiện, nhánh `feat/admin-event-ui`

- Tạo route Admin cho danh sách sự kiện, chỉ truy cập được khi `mode=remote` và role là admin.
- Làm danh sách có tìm kiếm/trạng thái, loading/error/empty/retry.
- Làm form thêm/sửa sự kiện, validation trường bắt buộc và phản hồi lưu thành công/thất bại.
- Thêm thao tác đăng/hủy đăng và lưu trữ có xác nhận.
- Dùng `adminEventService` gọi API đã chốt; không truy vấn MongoDB hoặc tự kiểm tra quyền ở client.
- Dùng mock fixtures theo API contract nếu backend chưa merge xong.

**Bàn giao:** admin tạo/sửa/đăng/lưu trữ sự kiện; dữ liệu cập nhật ở Trang chủ, Khám phá và Chi tiết.

### Thành viên 4 – Giao diện quản trị sinh viên, nhánh `feat/admin-user-ui`

- Tạo màn danh sách sinh viên có tìm kiếm và phân trang.
- Làm trang/khung chi tiết hồ sơ với các thông tin được phép xem.
- Cho phép sửa họ tên, mã sinh viên hoặc ngành theo chính sách nhóm thống nhất.
- Thêm khóa/mở tài khoản với xác nhận và hiển thị trạng thái.
- Không hiển thị hash/mật khẩu, không có nút đổi role admin.
- Dùng `adminUserService`; backend vẫn phải từ chối request nếu người gọi không phải admin.

**Bàn giao:** admin quản lý hồ sơ và trạng thái tài khoản; tài khoản bị khóa bị API từ chối.

### Thành viên 5 – Tích hợp dữ liệu cho luồng sinh viên, nhánh `feat/remote-student-data`

- Tạo provider/service chọn nguồn demo hoặc remote mà không đổi hợp đồng UI hiện tại.
- Nối Trang chủ, Khám phá và Chi tiết vào API remote; giữ phân trang, tìm kiếm/lọc, loading/error/empty/retry.
- Nối đăng ký sự kiện, danh sách Lịch của tôi, saved events và check-in với backend.
- Giữ dữ liệu demo và hành vi hiện tại trong demo mode.
- Khi remote API lỗi, hiển thị lỗi và cho retry; không tự lấy dữ liệu demo thay thế.
- Kiểm tra dữ liệu và deep link vẫn dùng đúng event ID.

**Bàn giao:** các luồng sinh viên dùng remote database trên nhiều thiết bị, trong khi demo mode không bị ảnh hưởng.

## API Contract Và Quy Ước Tích Hợp

Thành viên 1 và 2 chốt contract sớm trong một tài liệu/issue trước khi ba nhánh còn lại phát triển. Tối thiểu có:

- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.
- Hồ sơ: `GET/PATCH /api/me/profile`.
- Sự kiện công khai: `GET /api/events` có page/pageSize/query/category; `GET /api/events/:id`.
- Sự kiện admin: `POST/PATCH /api/admin/events`, lưu trữ qua trạng thái thay vì xóa cứng.
- User admin: `GET /api/admin/users`, `GET/PATCH /api/admin/users/:id`, `PATCH /api/admin/users/:id/status`.
- Dữ liệu cá nhân: endpoint đăng ký/hủy đăng ký, lấy saved events, thêm/bỏ saved event và check-in.
- Lỗi trả mã ổn định để app hiển thị đúng: sai thông tin, không có quyền, không tìm thấy, dữ liệu không hợp lệ, lỗi server.

Không cho sinh viên sửa role; admin role chỉ được gán qua seed/quy trình quản trị backend. Admin có thể sửa hồ sơ và khóa/mở tài khoản nhưng không đọc/sửa mật khẩu. Xóa sự kiện/user là lưu trữ/khóa để giữ lịch sử.

## Thứ Tự Làm Và Merge

1. Thành viên 1 + 2 chốt API contract, schema, role và lỗi chuẩn.
2. Merge backend nền/auth và API client/auth remote; xác nhận demo mode không đổi.
3. Thành viên 3, 4 làm song song giao diện admin bằng fixtures, dựa trên contract đã chốt.
4. Thành viên 5 tích hợp luồng sinh viên với endpoint sự kiện và trạng thái cá nhân.
5. Merge lần lượt theo phụ thuộc: backend contract/auth → API sự kiện/user → remote student services → admin event UI → admin user UI → kiểm thử tích hợp.
6. Mỗi PR chỉ chứa một chức năng, ghi cách test và không chứa `.env` thật, Mongo URI, JWT secret hay mật khẩu.

Tên nhánh đề xuất:

- Bạn: `feat/remote-auth-client`
- Thành viên 2: `feat/mongodb-api`
- Thành viên 3: `feat/admin-event-ui`
- Thành viên 4: `feat/admin-user-ui`
- Thành viên 5: `feat/remote-student-data`

## Kiểm Thử Và Nghiệm Thu

- Demo mode mặc định hoạt động như hiện tại, kể cả khi backend không chạy.
- Remote mode đăng ký/đăng nhập/đăng xuất và khôi phục phiên được; lỗi API không làm app tự chuyển sang demo.
- Admin remote CRUD/lưu trữ sự kiện; sinh viên thường bị từ chối với endpoint admin.
- Admin xem/sửa/khóa/mở sinh viên; sinh viên không xem hồ sơ người khác; user bị khóa không thể tiếp tục thao tác.
- Đăng ký, hủy đăng ký, lưu sự kiện và check-in lưu trên MongoDB và khôi phục khi đăng nhập từ thiết bị khác.
- Kiểm thử Postman cả request hợp lệ và bị từ chối: thiếu token, token sai, sai role, dữ liệu thiếu, ID không tồn tại, email/mã sinh viên trùng.
- Mỗi nhánh chạy `npx tsc --noEmit` và `npx expo lint`; trước demo kiểm tra API remote, demo mode và route/deep link trên thiết bị.

## Giả Định

- MongoDB Atlas là database; backend Express là lớp duy nhất được phép kết nối Atlas.
- Chọn chế độ bằng cấu hình môi trường, không thêm nút đổi mode cho người dùng cuối.
- Demo mode giữ nguyên; remote mode không tự fallback sang demo.
- Nhánh công việc được chia theo sở hữu file ở trên; các thành viên dùng contract chung để tránh sửa trùng Context, API client hoặc service.
