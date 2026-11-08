# IUH Event API Contract

**Tài liệu contract chính thức** giữa ứng dụng IUH Event và backend. Các nhánh app phải dùng đúng endpoint, tên trường, kiểu dữ liệu và mã lỗi trong tài liệu này. Nếu cần thay đổi contract, cập nhật tài liệu và backend/client liên quan trong cùng PR trước khi các nhánh khác tích hợp.

## Quy ước chung

- Base URL là `EXPO_PUBLIC_API_URL`; ví dụ local `http://localhost:3000` hoặc IP LAN của máy chạy server khi thử trên điện thoại.
- Request và response dùng JSON, UTF-8. Thời gian là ISO 8601 UTC.
- Endpoint riêng tư yêu cầu `Authorization: Bearer <accessToken>`.
- Các endpoint `/api/admin/**` yêu cầu user đang hoạt động. Riêng quản lý đơn vị và sự kiện cho phép role `admin` hoặc `organizer`; quyền của tài khoản organizer bị giới hạn theo đơn vị trên server.
- Phân trang dùng `page` bắt đầu từ 1 và `pageSize`. Response danh sách có `{ data, total, page, pageSize, hasMore }`; `GET /api/events` có thể thêm `source: "remote"`.
- Lỗi dùng thống nhất `{ "code": "STABLE_CODE", "message": "Mô tả dễ hiểu.", "details"?: [...] }`. Không bọc lỗi trong `error`.
- Không bao giờ trả `password` hoặc `passwordHash`. Sinh viên không được tự đặt hoặc sửa `role`. Chỉ seed/quy trình quản trị phía backend được cấp quyền admin.
- Xóa sự kiện là chuyển `status` sang `archived`; tài khoản bị vô hiệu hóa bằng `status: "suspended"`. Giữ bản ghi đăng ký/check-in để bảo toàn lịch sử.

## Kiểu dữ liệu dùng chung

### User

```json
{
  "id": "MongoDB ObjectId dạng chuỗi",
  "name": "Nguyễn An",
  "studentId": "SV-001",
  "email": "an@example.com",
  "major": "Công nghệ phần mềm",
  "role": "student",
  "status": "active"
}
```

- `role`: `student | admin | organizer`.
- Tài khoản organizer có thêm `organizerId` và `organizerName`; các trường này được cấp từ server và không thể tự sửa.
- `status`: `active | suspended`.
- User công khai không bao giờ chứa thông tin mật khẩu.

### Event

```json
{
  "id": "event-...",
  "title": "Workshop",
  "description": "Mô tả",
  "startsAt": "2027-01-15T09:00:00.000Z",
  "location": "IUH",
  "category": "Học thuật",
  "organizer": "CLB",
  "capacity": 100,
  "checkedInCount": 0,
  "summarySource": "Thông tin dùng để tóm tắt",
  "imageKey": "optional.png",
  "imageUrl": "https://example.com/image.png",
  "status": "published"
}
```

- `status`: `draft | published | archived`.
- Danh mục hiện backend chấp nhận: `Học thuật | CLB | Tình nguyện | Giải trí`.
- `imageKey` và `imageUrl` là tùy chọn. `status` có thể vắng mặt trong response sự kiện công khai.

## Auth

| Method và path | Quyền | Request | Response thành công |
|---|---|---|---|
| `POST /api/auth/register` | Công khai | `{ name, studentId, email, password }` | `201 { accessToken, user }`; tài khoản mới luôn có role `student`, status `active` |
| `POST /api/auth/login` | Công khai | `{ email, password }` | `200 { accessToken, user }` |
| `GET /api/auth/me` | Bearer | Không có | `200 { user }` |

Giới hạn đăng ký: `name` 2–120 ký tự, `studentId` 2–32, email hợp lệ tối đa 254, password 8–128 ký tự. Email được chuẩn hóa chữ thường; mã sinh viên được chuẩn hóa chữ hoa. Email và mã sinh viên phải duy nhất.

## Hồ sơ cá nhân

| Method và path | Quyền | Request | Response thành công |
|---|---|---|---|
| `GET /api/me/profile` | Bearer | Không có | `200 { user }` |
| `PATCH /api/me/profile` | Bearer | Một hoặc nhiều trường `name`, `studentId`, `major` | `200 { user }` |

Chỉ cho phép sửa các trường hồ sơ nêu trên; không nhận `role`, `status`, email hoặc mật khẩu. Các chuỗi hồ sơ phải dài 2–120 ký tự (mã sinh viên tối đa 32).

## Sự kiện công khai

| Method và path | Quyền | Request | Response thành công |
|---|---|---|---|
| `GET /api/events` | Công khai | Query: `page`, `pageSize`, `query`, `category`, `upcomingOnly` | `200 { data: Event[], total, page, pageSize, hasMore, source? }` |
| `GET /api/events/:eventId` | Công khai | Không có | `200 { data: Event }` |

`query` tìm theo tiêu đề, địa điểm hoặc đơn vị tổ chức. Danh sách công khai chỉ trả sự kiện `published`; `upcomingOnly=true` lọc sự kiện chưa bắt đầu. Mặc định `page=1`, `pageSize=10`, tối đa 50.

## Đơn vị tổ chức

| Method và path | Quyền | Request | Response thành công |
|---|---|---|---|
| `GET /api/organizers` | Công khai | Không có | `200 { data: Organizer[] }` |
| `GET /api/admin/organizers` | Admin: toàn bộ; organizer: chỉ đơn vị gắn với tài khoản | Không có | `200 { data: Organizer[] }` |
| `POST /api/admin/organizers` | Admin đang hoạt động | `{ name, shortName, type, description, email, location, color }` | `201 { organizer, account: { user, email, initialPassword } }` |

`type` nhận `faculty | union | club | center`. Tạo đơn vị đồng thời tạo tài khoản organizer và liên kết hai bản ghi; email đã được dùng bị từ chối (`EMAIL_EXISTS`). Mật khẩu ban đầu ngẫu nhiên chỉ trả về trong kết quả tạo. Organizer không thể tạo đơn vị hoặc xem các đơn vị khác qua endpoint quản lý.

## Quản trị sự kiện

Các endpoint dưới đây yêu cầu admin hoặc organizer đang hoạt động. Organizer chỉ được tạo sự kiện với đơn vị được gắn trong tài khoản; server tự áp dụng `organizerName` và bỏ qua tên đơn vị gửi kèm. Admin phải gửi `organizer`.

| Method và path | Request | Response thành công |
|---|---|---|
| `GET /api/admin/events` | Query tùy chọn: `page`, `pageSize`, `query`, `status` | `200 { data: Event[], total, page, pageSize, hasMore }` |
| `POST /api/admin/events` | Các trường tạo event: `title`, `description`, `startsAt`, `location`, `category`, `capacity`; `organizer` bắt buộc với admin, tùy chọn với organizer; tùy chọn `summarySource`, `imageKey`, `imageUrl`, `status` | `201 { data: Event }`; mặc định status `draft` |
| `GET /api/admin/events/:eventId` | Không có | `200 { data: Event }` |
| `PATCH /api/admin/events/:eventId` | Một hoặc nhiều trường event có thể sửa, không gồm `id`, số lượt đăng ký/check-in | `200 { data: Event }` |
| `PATCH /api/admin/events/:eventId/status` | `{ "status": "draft" | "published" | "archived" }` | `200 { data: Event }` |

Không có thao tác xóa cứng. Không thể giảm sức chứa thấp hơn số lượt đã đăng ký (`CAPACITY_BELOW_REGISTRATIONS`). Các trường bắt buộc: tiêu đề 3–160, mô tả tối đa 8000, địa điểm 2–240, đơn vị tổ chức 2–160, sức chứa số nguyên 1–100000, thời gian parse được thành ngày.

## Quản trị người dùng

Tất cả endpoint dưới đây yêu cầu admin đang hoạt động.

| Method và path | Request | Response thành công |
|---|---|---|
| `GET /api/admin/users` | Query tùy chọn: `page`, `pageSize`, `query`, `status` | `200 { data: User[], total, page, pageSize, hasMore }` |
| `GET /api/admin/users/:userId` | Không có | `200 { user }` |
| `PATCH /api/admin/users/:userId/profile` | Một hoặc nhiều trường `name`, `studentId`, `major` | `200 { user }` |
| `PATCH /api/admin/users/:userId/status` | `{ "status": "active" | "suspended" }` | `200 { user }` |

Không có API đọc/sửa mật khẩu hoặc gán role. Không xóa cứng user. Backend từ chối khóa admin đang đăng nhập và admin hoạt động cuối cùng (`CANNOT_SUSPEND_SELF`, `LAST_ACTIVE_ADMIN`). Mặc định `pageSize=20`, tối đa 100.

## Dữ liệu cá nhân: sự kiện đã lưu, đăng ký và check-in

Tất cả endpoint dưới đây yêu cầu Bearer token của chính người dùng.

| Method và path | Request | Response thành công |
|---|---|---|
| `GET /api/me/saved-events` | Không có | `200 { data: [{ eventId, savedAt, event }] }` |
| `POST /api/me/saved-events/:eventId` | Không có | `200 { eventId, status: "saved" }` |
| `DELETE /api/me/saved-events/:eventId` | Không có | `200 { eventId, status: "unsaved" }` |
| `GET /api/me/registrations` | Không có | `200 { data: [{ eventId, status, registeredAt, checkedInAt?, event }] }` |
| `POST /api/me/registrations/:eventId` | Không có | `201 { eventId, status: "registered" }` |
| `DELETE /api/me/registrations/:eventId` | Không có | `200 { eventId, status: "cancelled" }` |
| `POST /api/me/registrations/:eventId/check-in` | `{ "qrValue": "eventId" }` (cũng chấp nhận `student-event:eventId`) | `200 { eventId, status: "checked-in" }` |

Trạng thái đăng ký: `registered | cancelled | checked-in`. Không thể đăng ký sự kiện đã bắt đầu/đã lưu trữ, sự kiện hết chỗ hoặc đăng ký trùng. Không thể hủy sau check-in. Check-in yêu cầu đã đăng ký và QR phải khớp event ID.

## Mã lỗi ổn định

Các lỗi có dạng `{ code, message }`; lỗi validation có thể thêm `details: [{ path, message }]`.

| HTTP | Code thường gặp | Ý nghĩa |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Thiếu/sai trường hoặc dữ liệu không hợp lệ |
| `401` | `UNAUTHORIZED`, `INVALID_CREDENTIALS` | Thiếu/hết hạn token hoặc thông tin đăng nhập sai |
| `403` | `FORBIDDEN`, `ACCOUNT_SUSPENDED`, `INVALID_QR` | Không đủ quyền, tài khoản bị khóa hoặc QR không hợp lệ |
| `404` | `ROUTE_NOT_FOUND`, `EVENT_NOT_FOUND`, `USER_NOT_FOUND`, `REGISTRATION_NOT_FOUND` | Không tìm thấy route/tài nguyên |
| `409` | `EMAIL_EXISTS`, `STUDENT_ID_EXISTS`, `ALREADY_REGISTERED`, `ALREADY_CHECKED_IN`, `EVENT_FULL`, `EVENT_EXPIRED`, `REGISTRATION_REQUIRED`, `CAPACITY_BELOW_REGISTRATIONS`, `CANNOT_SUSPEND_SELF`, `LAST_ACTIVE_ADMIN` | Xung đột trạng thái/dữ liệu |
| `429` | `RATE_LIMITED` | Gửi quá nhiều yêu cầu đăng nhập/đăng ký |
| `500` | `INTERNAL_ERROR` | Lỗi không dự kiến phía server |

## Những thay đổi cần phối hợp

Contract này phản ánh backend hiện tại. Những nhánh khác không tự ý đổi tên route hoặc response. Nếu nhóm quyết định đổi, cần cập nhật đồng thời contract, server, app services và Postman collection. Admin sửa hồ sơ hiện dùng `PATCH /api/admin/users/:userId/profile`; endpoint này được ghi rõ để không nhầm với `PATCH /api/admin/users/:userId`.
