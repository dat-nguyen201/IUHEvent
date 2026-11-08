# IUH Event — Hướng dẫn cài đặt cho thành viên nhóm

Tài liệu này hướng dẫn cài app Expo, API Node.js và MongoDB Atlas sau khi clone/pull repository. Mỗi thành viên tự tạo file `.env` trên máy mình. **Không gửi hoặc commit file `.env`, mật khẩu, JWT secret, access token hay MongoDB URI.**

## 1. Yêu cầu ban đầu

- Cài Git, Node.js và npm.
- Mỗi thành viên cần tài khoản Atlas riêng nếu làm theo mô hình độc lập tại mục 3; Postman chỉ cần cho người muốn thử API.
- Cài Postman nếu cần thử API.
- Mở PowerShell tại thư mục project:

```powershell
cd D:\IUH\LT_Phone\StudentEventApp
git pull
```

Nếu đã clone repo, hãy chuyển sang đúng nhánh nhóm đang dùng trước khi chạy `git pull`.

## 2. Cài dependencies

Tại thư mục gốc project:

```powershell
npm ci
```

Sau đó cài dependencies cho API:

```powershell
cd .\server
npm ci
cd ..
```

`npm ci` cài đúng phiên bản được khóa trong package lock; không chạy `npm install` ở root nếu không cần cập nhật dependency.

## 3. Tạo Atlas riêng cho từng thành viên (mô hình độc lập)

Để mỗi người tự làm mà không cần tài khoản, máy chủ hoặc secret của bạn, **mỗi thành viên tạo Atlas account, Project, cluster, database user và `.env` riêng**. Mọi người dùng chung code trong GitHub nhưng dữ liệu Atlas tách biệt. Sự kiện/tài khoản mà một người seed sẽ không tự xuất hiện trong database của người khác.

Mỗi thành viên làm các bước sau trong Atlas của chính mình:

1. Đăng nhập hoặc tạo tài khoản tại [MongoDB Atlas](https://cloud.mongodb.com/).
2. Tạo Project riêng, ví dụ `IUH Event - TenThanhVien`.
3. Vào **Database → Clusters → Create**, chọn loại **Free (M0)** nếu Atlas hiển thị lựa chọn này, chọn provider/region gần nhóm và tạo cluster. Atlas hiện giới hạn một Free cluster trên mỗi Project; mỗi thành viên dùng Project riêng để có cluster riêng. [Tài liệu tạo Free cluster](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/)
4. Mở **Security → Database & Network Access → Database Users → Add New Database User**. Tạo username/password riêng (không dùng Atlas login). Chọn role có quyền đọc/ghi để backend tạo collections, indexes và dữ liệu. Giữ credentials riêng của mình.
5. Mở **Database & Network Access → IP Access List → Add IP Address → Add Current IP Address**. Lưu và chờ `Active`. Nếu đổi mạng/IP, cập nhật entry.
6. Trở lại **Database → Clusters**, bấm **Connect → Drivers → Node.js**, sao chép connection string và thay placeholder username/password bằng database user vừa tạo.
7. Điền connection string vào `MONGODB_URI` trong file `server/.env` riêng của mình, đặt `MONGODB_DB_NAME=iuh_event`, rồi làm các bước seed/run ở mục 4.

Atlas Free cluster có giới hạn tài nguyên phù hợp cho phát triển/demo; không dùng nó như backup hoặc môi trường production. [Giới hạn Free cluster](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/)

## 4. Cấu hình và chạy backend

Tạo file cấu hình cục bộ:

```powershell
Copy-Item .\server\.env.example .\server\.env
notepad .\server\.env
```

Điền các giá trị trong `server/.env`:

```env
PORT=3000
MONGODB_URI=mongodb+srv://DATABASE_USER:PASSWORD@CLUSTER_HOST/
MONGODB_DB_NAME=iuh_event
JWT_SECRET=RANDOM_SECRET_AT_LEAST_32_CHARACTERS
CORS_ORIGINS=http://localhost:8081,http://localhost:8084
ADMIN_EMAIL=admin@iuh.edu.vn
ADMIN_PASSWORD=PRIVATE_PASSWORD_AT_LEAST_12_CHARACTERS
ADMIN_NAME=IUH Event Admin
ADMIN_STUDENT_ID=ADMIN-001
```

- Thay URI bằng URI Atlas thật. Nếu password có ký tự đặc biệt, URL-encode phần password.
- Tạo `JWT_SECRET` ngẫu nhiên, dài ít nhất 32 ký tự. Mọi máy cùng chạy chung một API phải dùng cùng secret phía server. Không đặt secret này trong app Expo.
- `ADMIN_PASSWORD` phải dài ít nhất 12 ký tự. Chỉ người vận hành backend cần điền biến này khi seed admin.
- Để bật quên mật khẩu, cấu hình `RESEND_API_KEY` và `PASSWORD_RESET_FROM` theo mục bên dưới. API key chỉ nằm trong `server/.env`.
- Không dùng nguyên giá trị ví dụ và không commit `server/.env`.

### Cấu hình email khôi phục mật khẩu

Remote mode gửi mã xác nhận 6 chữ số qua Resend Email API. Tạo API key trong tài khoản Resend, cấu hình địa chỉ gửi được Resend cho phép (địa chỉ onboarding chỉ dùng trong phạm vi thử nghiệm của Resend), rồi thêm vào `server/.env`:

```env
RESEND_API_KEY=re_xxxxxxxxx
PASSWORD_RESET_FROM=IUH Event <onboarding@resend.dev>
```

Không đưa API key vào Expo `.env`, app mobile hoặc GitHub. Khi chưa cấu hình các biến này, endpoint quên mật khẩu báo chức năng chưa được cấu hình. Tham khảo [Resend Send Email API](https://resend.com/docs/api-reference/emails/send-email).

### Seed dữ liệu vào Atlas riêng của bạn

Mở terminal tại `server`:

```powershell
cd D:\IUH\LT_Phone\StudentEventApp\server
npm run seed:events
npm run seed:admin
```

`seed:events` an toàn để chạy lại: nó thêm các sự kiện demo còn thiếu và không ghi đè sự kiện đã có. `seed:admin` chỉ tạo admin lần đầu. Nếu báo `Admin account already exists; no changes made`, tài khoản tồn tại rồi; sửa `ADMIN_PASSWORD` trong `.env` **không** đặt lại mật khẩu đã lưu.

Mỗi người tự tạo admin trong Atlas riêng của mình. Các tài khoản admin, sự kiện và người dùng là dữ liệu riêng, không dùng chung với thành viên khác.

Khởi động API:

```powershell
npm run dev
```

Giữ terminal đó mở. Kiểm tra `http://localhost:3000/health`; kết quả đúng là:

```json
{ "ok": true, "database": "connected" }
```

## 5. Chạy app Expo ở demo mode

Tại thư mục gốc, tạo `.env`:

```powershell
cd D:\IUH\LT_Phone\StudentEventApp
Copy-Item .env.example .env
```

Mặc định `.env.example` dùng `EXPO_PUBLIC_APP_MODE=demo`. Chạy app:

```powershell
npx expo start
```

Nhấn `w` để mở web hoặc quét QR bằng Expo Go nếu đang dùng thiết bị hỗ trợ. Thay đổi biến môi trường cần khởi động lại Expo.

## 6. Chạy app với remote auth

Trong root `.env`, đặt:

```env
EXPO_PUBLIC_APP_MODE=remote
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Chạy backend ở terminal thứ nhất và Expo ở terminal thứ hai. Lưu ý URL theo thiết bị:

- Web trên cùng máy: `http://localhost:3000`.
- Android Emulator tiêu chuẩn: thử `http://10.0.2.2:3000`.
- iOS Simulator: thường dùng `http://localhost:3000`.
- Điện thoại thật: dùng IP LAN máy tính chạy API, ví dụ `http://192.168.1.20:3000`; cho phép Node.js qua firewall mạng Private nếu Windows hỏi.

Thiết bị phải truy cập được máy API. Nếu thành viên ở mạng khác nhau, IP LAN không hoạt động qua Internet; nhóm cần triển khai API lên host có thể truy cập hoặc dùng VPN.

## 7. Thử API bằng Postman

1. Import `postman/iuh-event-admin.postman_collection.json` để thử admin/events/users.
2. Import `postman/remote-auth.postman_collection.json` để thử auth.
3. Trong collection admin, điền `adminEmail` và `adminPassword` dưới **Variables**.
4. Gửi **Admin login** trước; phải nhận `200 OK` và `role: admin`. Token được giữ trong collection variables.
5. Thử **List events for admin**, **List users**, rồi các thao tác tạo/publish nếu cần. Các request ghi dữ liệu sẽ tạo hoặc thay đổi dữ liệu Atlas.

## 8. Phạm vi hiện tại và kiểm tra

- Demo mode và remote auth đã được tích hợp. Remote auth lưu phiên riêng; khi API từ chối token (`401`) hoặc báo tài khoản bị khóa (`403 ACCOUNT_SUSPENDED`), app xóa phiên và đưa người dùng về đăng nhập.
- Backend Express/MongoDB có API cho auth, hồ sơ, sự kiện công khai, quản trị sự kiện/người dùng, sự kiện đã lưu, đăng ký/hủy đăng ký và check-in. Contract chuẩn nằm ở `docs/API_CONTRACT.md`.
- Giao diện admin trong app gồm quản lý sự kiện (tạo, sửa, đăng, chuyển nháp, lưu trữ) và quản lý người dùng (tìm, lọc, phân trang, xem/sửa hồ sơ, khóa/mở tài khoản). Admin UI chỉ dùng ở remote mode với tài khoản admin.
- Luồng sinh viên remote đã nối danh sách/chi tiết sự kiện, tìm kiếm/lọc/phân trang, lịch cá nhân, saved events, đăng ký/hủy đăng ký và check-in. Demo mode tiếp tục dùng dữ liệu demo; lỗi remote không tự chuyển sang dữ liệu demo.
- `scripts/verify-student-flow.js` là smoke check API sinh viên. Chỉ chạy khi backend local đã kết nối database có dữ liệu; script tạo user, lưu/hủy sự kiện, đăng ký và check-in nên không chạy trên dữ liệu production.
- Các bước trên mô tả phạm vi đã có trong code; mỗi thành viên vẫn cần chạy app và backend theo cấu hình riêng, rồi kiểm tra luồng trên thiết bị/môi trường của mình.

## 9. Lỗi thường gặp

- **`MONGODB_URI is required`**: thiếu `server/.env` hoặc chạy seed/dev không ở thư mục `server`.
- **Server selection timeout / IP not allowed**: thêm IP máy chạy backend vào Atlas IP Access List và chờ Active.
- **Authentication failed**: kiểm tra database username/password trong URI; đây không phải mật khẩu Atlas login.
- **Admin already exists**: bình thường; seed không thay đổi tài khoản hoặc mật khẩu đã có.
- **App báo không kết nối API**: kiểm tra `EXPO_PUBLIC_API_URL`, backend còn chạy không, URL có phù hợp thiết bị không; sau khi sửa root `.env`, khởi động lại Expo.
- **Port 3000 đang được dùng**: dừng server cũ bằng `Ctrl+C` hoặc đổi `PORT` và cập nhật API URL tương ứng.
