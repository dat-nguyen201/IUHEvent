# Bổ sung dữ liệu cho MongoDB Atlas – GIỮ NGUYÊN CODE IUHEvent(5).rar

## 1. Nội dung bộ dữ liệu

**Chỉ thêm dữ liệu** vào database đang có tên `iuh_event`. Không tạo database mới, không sửa một dòng nào trong source React Native hoặc Node.js của nhóm.

| Collection | Document mẫu mới | Ý nghĩa |
|---|---:|---|
| `events` | 72 | 18 sự kiện cho mỗi nhóm Học thuật, CLB, Tình nguyện, Giải trí; 28 ảnh URL khác nhau, địa điểm và ngày tháng |
| `users` | 40 | Tài khoản sinh viên **giả lập** với mật khẩu bcrypt riêng từng tài khoản |
| `registrations` | 446 | Trạng thái `registered`, `cancelled`, `checked-in` gắn đúng user + event |
| `reviews` | 104 | Đánh giá 3–5 sao của những sinh viên đã check-in sự kiện mẫu |
| `savedEvents` | 265 | Những lượt lưu sự kiện không trùng cặp user + event |
| `notifications` | 353 | Thông báo về đăng ký, check-in, hệ thống |

72 sự kiện gồm 24 đã diễn ra, 44 còn ở tương lai và 4 bản nháp (`draft`). Trong 72 sự kiện có 28 ảnh URL khác nhau từ `images.unsplash.com` (ảnh mẫu, cần Internet để tải, liên kết có thể thay đổi theo thời gian).

**Những gì KHÔNG thay đổi:** 12/13 sự kiện cũ (tùy dữ liệu thực tế Atlas), admin đang có, các reviews, notifications, registrations và savedEvents cũ; source code project gốc; tên và quan hệ của 6 collection.

**Ngày hết hạn:** dự án gốc có `startsAt`, chưa có `registrationDeadline` và `endsAt` trong DTO. Vì yêu cầu KHÔNG sửa code, dữ liệu phân biệt **trước / sau thời điểm bắt đầu** chứ không bổ sung tính năng hiển thị hạn đăng ký riêng.

## 2. Cách nhập an toàn nhất: chạy script từ project GỐC

### Bước 1: Giải nén ZIP dữ liệu

Giải nén tệp `IUHEvent_Atlas_DataOnly_6Collections.zip` **cạnh thư mục `server`** của project IUHEvent, cấu trúc sẽ như sau:

```text
IUHEvent/
  server/                         <-- thư mục backend gốc của bạn, GIỮ NGUYÊN
    .env
    package.json
    src/
  src/                            <-- code React Native gốc, GIỮ NGUYÊN
  IUHEvent_Atlas_DataOnly_6Collections/
    seed-atlas.cjs
    HUONG_DAN_NHAP_MONGODB_ATLAS.md
    DANH_SACH_72_SU_KIEN.csv
    data/
      users.jsonl
      events.jsonl
      registrations.jsonl
      reviews.jsonl
      savedEvents.jsonl
      notifications.jsonl
```

**Không cần chép file nào vào `server/src`**. Script được chạy từ bên ngoài, dùng package MongoDB đã khai báo trong `server/package.json`.

### Bước 2: Cấu hình `server/.env`

Kiểm tra đã có cấu hình Atlas **thật của nhóm**, ví dụ cấu trúc (không dùng dữ liệu minh họa làm mật khẩu):

```dotenv
MONGODB_URI=mongodb+srv://DB_USER:DB_PASSWORD@DB_CLUSTER.mongodb.net/
MONGODB_DB_NAME=iuh_event
```

Đây là thông tin **bí mật của server**, không nhập vào Expo `EXPO_PUBLIC_`, không gửi vào nhóm chat và không commit lên GitHub. Nếu thiếu, tự tạo `server/.env` và điền URI lấy từ Atlas: Cluster → Connect → Drivers. Phải cho phép IP máy đang chạy trong Atlas Network Access (chọn địa chỉ IP phù hợp, tránh mở toàn mạng nếu không cần).

### Bước 3: Mở PowerShell / Terminal trong `IUHEvent/server`

```powershell
cd .\server
npm install
```

Nếu đang ở đúng thư mục `server`, chạy xem trước **không ghi lên Atlas**:

```powershell
node .\db_IUHEvent\seed-atlas.cjs
```

Khi chắc chắn `.env` trỏ đúng `iuh_event`, chạy lệnh nhập thực tế:

```powershell
node .\db_IUHEvent\seed-atlas.cjs --apply
```

Chờ log hiển thị lần lượt `users`, `events`, `registrations`, `reviews`, `savedEvents`, `notifications` và dòng `HOÀN THÀNH`.

**Chú ý:** chạy lần đầu mới thêm dữ liệu; chạy lần sau sẽ **không nhân đôi hoặc ghi đè nội dung mẫu cũ** (script dùng `_id` cố định và `$setOnInsert`). Sau khi thêm, script chỉ đồng bộ lại `registeredCount`/`checkedInCount` trên **72 sự kiện mẫu mới** dựa vào số đăng ký thực tế, không sửa 12/13 sự kiện cũ.

Nếu lỗi kết nối, kiểm tra `MONGODB_URI`, quyền ghi của database user, Atlas Network Access và kết nối Internet. Nếu đã nhập một phần thì **không xóa dữ liệu**; sửa lỗi và chạy lại đúng lệnh để hoàn tất.

## 3. Kiểm tra trong MongoDB Atlas

Vào **Cluster0 → Data Explorer → iuh_event**. Từng collection sẽ có thêm dữ liệu:

- `events`: lọc `{ "id": { "$regex": "^event-demo26-" } }` để xem 72 sự kiện mới. Mở một document và kiểm tra `startsAt` kiểu Date, `imageUrl` bắt đầu bằng `https://`.
- `users`: lọc `{ "studentId": { "$regex": "^DEMO26-" } }` để xem 40 sinh viên mẫu. `passwordHash` là bcrypt hash, **không phải mật khẩu rõ**.
- `registrations`: lọc `{ "eventId": { "$regex": "^event-demo26-" } }`.
- `reviews`: lọc `{ "eventId": { "$regex": "^event-demo26-" } }`.
- `savedEvents`: lọc `{ "eventId": { "$regex": "^event-demo26-" } }`.
- `notifications`: có thể lọc `{ "title": "Bạn đã đăng ký sự kiện" }` để thấy một nhóm thông báo mới.

### Kiểm tra trên app

App phải ở chế độ sử dụng backend thật (`remote`) và `EXPO_PUBLIC_API_URL` phải trỏ tới API server đang chạy. Atlas là dịch vụ DB cloud nhưng **không thay thế Express API**. Nếu chưa dùng chế độ remote thì dữ liệu Atlas sẽ không hiển thị trên app. Làm mới app/danh sách sau khi seed.

Các sự kiện có trạng thái `draft` hiển thị cho admin nhưng **không xuất hiện trong API sự kiện của sinh viên**. Những sự kiện trong quá khứ vẫn có `status: published` để thử danh sách/đánh giá; API gốc tự chặn đăng ký khi `startsAt <= now`.

## 4. Dữ liệu định dạng JSONL nếu muốn nhập bằng giao diện

Thư mục `data/` có **6 file JSONL**, mỗi dòng là một document theo MongoDB Extended JSON:

- `{"$oid":"..."}` tương ứng kiểu ObjectId
- `{"$date":"..."}` tương ứng kiểu Date

Có thể sử dụng công cụ nhập JSON/JSONL phù hợp (ví dụ MongoDB Compass hoặc mongoimport). Tuy nhiên **cách này sẽ không tự bỏ qua document trùng**, vì thế khuyên dùng script ở bước 3 để import một lần hoặc chạy lại mà không trùng.

Nếu tự nhập, nhập theo thứ tự: `users` → `events` → `registrations` → `reviews` → `savedEvents` → `notifications`. Đảm bảo trình nhập hỗ trợ MongoDB Extended JSON để `userId`, `_id`, `createdAt`, `startsAt` có đúng kiểu dữ liệu BSON.

## 5. Tài khoản sinh viên DEMO (nếu muốn đăng nhập kiểm thử)

Email có dạng `demo26.student001@example.com` đến `demo26.student040@example.com` và studentId từ `DEMO26-001` đến `DEMO26-040`. Đây **không phải sinh viên thật**.

Mỗi tài khoản được gán một mật khẩu mạnh khác nhau, mã hóa bcrypt; danh sách email/mật khẩu nằm trong file **riêng** `IUHEvent_TaiKhoanDemo_BAO_MAT.csv` cung cấp ngoài gói ZIP. **Không commit file này lên GitHub hoặc đăng công khai**. Không dùng dữ liệu demo trong hệ thống thật.

## 6. Lưu ý bảo mật quan trọng

Trong archive project gốc có dấu hiệu file cấu hình mẫu chứa thông tin đăng nhập thật thay vì placeholder. Hãy **đổi mật khẩu database user trên Atlas**, đổi mật khẩu admin/JWT secret nếu từng đưa lên GitHub hoặc chia sẻ; tuyệt đối không đưa `.env` vào git. Chỉ chạy script này vào database thử nghiệm/dữ liệu đồ án đã được đồng ý bổ sung.

## 7. Phạm vi kiểm thử đã thực hiện

- Đã xác nhận cấu trúc dựa trên `server/src/types/domain.ts` và các API routes từ **đúng file IUHEvent(5).rar**.
- Đã kiểm tra các bộ ID liên kết, quan hệ giữa 6 collection, ngày giờ, số lượng, sức chứa; dữ liệu có bcrypt hash.
- Đã chạy kiểm tra cú pháp JavaScript `node --check` và chế độ xem trước **không ghi**.
- **Chưa kết nối và chưa nhập trực tiếp vào MongoDB Atlas của bạn** trong môi trường này. Bước `--apply` cần thực hiện trên máy có `server/.env` hợp lệ.
