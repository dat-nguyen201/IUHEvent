# IUH Event – Báo cáo sơ bộ và hướng dẫn sử dụng

## 1. Giới thiệu

**IUH Event – Đồng hành sự kiện sinh viên** là ứng dụng di động giúp sinh viên theo dõi hoạt động tại trường: tìm sự kiện, xem thông tin, đăng ký tham gia, lưu vào lịch cá nhân, nhận nhắc lịch và check-in bằng QR. Tài khoản quản trị có thêm công cụ đăng sự kiện và quản lý tài khoản sinh viên.

Tài liệu này mô tả các chức năng đang có trong phiên bản hiện tại và cách thao tác. Một số thao tác phụ thuộc vào việc chạy máy chủ API và MongoDB; những nội dung đó được ghi rõ bên dưới.

## 2. Bắt đầu sử dụng

### 2.1 Khởi động ứng dụng

Mở terminal tại thư mục dự án và chạy:

```powershell
npm install
npx expo start
```

Có thể mở ứng dụng bằng Expo Go/Development Build hoặc trình duyệt theo cấu hình của nhóm. Camera QR và thông báo nên được trình diễn trên điện thoại thật.

### 2.2 Chọn chế độ dữ liệu

- **Demo:** dùng tài khoản và dữ liệu demo trên thiết bị; phù hợp xem giao diện, luồng cơ bản và demo nhanh.
- **Remote:** ứng dụng kết nối API của nhóm, API kết nối MongoDB. Cần chạy server trong thư mục `server` và khai báo `EXPO_PUBLIC_APP_MODE=remote`, `EXPO_PUBLIC_API_URL` trong `.env` của ứng dụng. Khi dùng điện thoại thật, URL phải dùng địa chỉ IP LAN của máy tính, ví dụ `http://192.168.1.x:3000`, không dùng `localhost`.

Chế độ được cấu hình bởi nhóm phát triển, không chuyển trong giao diện ứng dụng. Sau khi đổi `.env`, khởi động lại Expo.

### 2.3 Đăng nhập và đăng ký

1. Ở màn hình xác thực, chọn **Đăng nhập** hoặc **Đăng ký**.
2. Đăng ký yêu cầu họ tên, mã sinh viên, email và mật khẩu; nhập đủ trường hợp lệ rồi chọn tạo tài khoản.
3. Đăng nhập dùng email và mật khẩu trong chế độ remote. Trong demo có thể dùng tài khoản demo được hiển thị trên màn đăng nhập.
4. Sau lần đăng nhập đầu tiên, chọn **Bắt đầu khám phá** ở màn Get Started để vào ứng dụng.

Trong remote mode, thông tin được xác thực qua API. Trong demo mode, tài khoản chỉ phục vụ thử nghiệm trên thiết bị và không thay thế hệ thống xác thực chính thức.

## 3. Chức năng dành cho sinh viên

Ứng dụng có thanh điều hướng bốn mục ở đáy màn hình: **Trang chủ**, **Khám phá**, **Lịch của tôi**, **Hồ sơ**.

### 3.1 Trang chủ

Trang chủ là nơi xem nhanh hoạt động nổi bật và các lối tắt.

1. Xem lời chào và thông tin tài khoản.
2. Chọn sự kiện nổi bật hoặc sự kiện sắp diễn ra để mở trang chi tiết.
3. Dùng ô tìm nhanh hoặc chọn danh mục để chuyển sang Khám phá.
4. Chọn **Quét mã QR Check-in** để mở chức năng điểm danh.
5. Xem số sự kiện đã lưu, số lần check-in và các sự kiện sắp tới.

### 3.2 Khám phá sự kiện

1. Mở tab **Khám phá**.
2. Nhập tên sự kiện hoặc địa điểm vào ô tìm kiếm.
3. Chọn chip danh mục để lọc; có thể xóa từ khóa để xem lại danh sách.
4. Cuộn danh sách để tải thêm sự kiện khi còn dữ liệu.
5. Chạm vào thẻ sự kiện để mở chi tiết.
6. Nếu danh sách báo lỗi, chọn **Thử lại**. Nếu không có kết quả, đổi từ khóa hoặc danh mục.

### 3.3 Chi tiết sự kiện

Trang chi tiết hiển thị tên, mô tả, thời gian, địa điểm, danh mục, đơn vị tổ chức và thông tin tham gia.

- Chọn **Đăng ký tham gia ngay** để ghi danh. Nếu đã đăng ký, có thể hủy đăng ký theo nút hiển thị.
- Chọn **Lưu vào lịch** để theo dõi sự kiện trong Lịch của tôi; chọn lại để bỏ lưu.
- Chọn **Nhắc tôi khi sắp diễn ra** để cấp quyền thông báo và đặt nhắc. Có thể tắt nhắc trên cùng nút.
- Chọn **Quét mã QR Check-in** khi đã đăng ký sự kiện để mở màn quét.
- Mục **Tóm tắt nhanh** sử dụng thông tin công khai của sự kiện. Người dùng cần đồng ý trước khi tạo tóm tắt. Nếu chưa cấu hình dịch vụ AI hoặc dịch vụ lỗi, ứng dụng hiển thị tóm tắt demo.

### 3.4 Lịch của tôi

Tab này có các nhóm **Đã lưu**, **Đã đăng ký** và **Đã check-in**. Trong danh sách, các sự kiện được phân biệt theo trạng thái và thời gian.

1. Chọn nhóm muốn xem.
2. Chạm sự kiện để mở chi tiết.
3. Dùng nút **Hủy lưu** hoặc **Hủy đăng ký** nếu muốn bỏ theo dõi/tham gia.
4. Với sự kiện đã đăng ký, chọn **Quét QR** để check-in.
5. Nếu nhóm dữ liệu đang trống, dùng liên kết gợi ý trên màn hình để sang Khám phá hoặc mở quét QR.

### 3.5 Check-in bằng QR

1. Mở từ Trang chủ, Lịch của tôi hoặc trang chi tiết sự kiện.
2. Cho phép ứng dụng sử dụng camera khi được hỏi.
3. Đưa mã QR của sự kiện vào giữa khung quét. Có thể bật đèn pin hoặc đổi camera trước/sau.
4. Ứng dụng kiểm tra mã, tài khoản và trạng thái đăng ký rồi hiển thị kết quả.
5. Nếu không cấp quyền camera hoặc đang chạy Web, mở **Nhập mã thủ công / chọn sự kiện demo**. Nhập Event ID (ví dụ `event-1`) hoặc chọn một sự kiện thử nghiệm.

Check-in yêu cầu đăng ký sự kiện trước. QR cần chứa Event ID mà server nhận diện được. Luồng nhập tay/sự kiện mẫu là phương án thử nghiệm, không thay thế QR chính thức tại sự kiện.

### 3.6 Hồ sơ và giao diện

1. Mở tab **Hồ sơ** để xem họ tên, mã sinh viên, email, vai trò và số liệu hoạt động.
2. Chạm ảnh đại diện để chọn ảnh khác.
3. Chọn sáng/tối hoặc tùy chọn giao diện có sẵn trong mục **Giao diện**.
4. Chọn **Đăng xuất** để kết thúc phiên và trở lại màn hình xác thực.

## 4. Chức năng dành cho quản trị viên

Chức năng quản trị chỉ hiển thị cho tài khoản **admin đang hoạt động trong remote mode**. Tài khoản demo không có quyền quản trị backend. Admin mở tab **Hồ sơ** rồi chọn **Quản trị sự kiện IUH**.

### 4.1 Quản lý sự kiện

- Danh sách sự kiện có thể tìm theo tên/địa điểm, lọc theo bản nháp/đã đăng/lưu trữ và chuyển trang.
- Chọn **Thêm sự kiện** để tạo mới. Các trường có dấu `*` bắt buộc: tên, mô tả, danh mục, ngày, giờ, địa điểm, đơn vị tổ chức và sức chứa.
- Chọn ngày bằng lịch và chọn giờ bằng bộ chọn thời gian; không cần tự gõ định dạng ngày/giờ.
- **Nguồn tóm tắt**, **Tên ảnh có sẵn** và **URL hình ảnh** là các trường tùy chọn.
- Chọn **Tạo bản nháp** để lưu. Nếu trường bắt buộc thiếu hoặc không hợp lệ, màn hình báo lỗi và không gửi yêu cầu tạo.
- Tại danh sách, chọn **Sửa** để cập nhật; **Đăng** để công khai; **Hủy đăng** để chuyển về nháp; **Lưu trữ** để ẩn khỏi luồng sự kiện thông thường; có thể khôi phục sự kiện lưu trữ về nháp.

Lưu trữ được dùng thay cho xóa cứng để giữ lịch sử đăng ký/check-in.

### 4.2 Quản lý tài khoản sinh viên

1. Trong màn quản lý sự kiện, chọn **Quản lý sinh viên**.
2. Tìm theo tên, email hoặc mã sinh viên; dùng bộ lọc trạng thái và chuyển trang để duyệt danh sách.
3. Chạm một tài khoản để xem hồ sơ.
4. Chọn **Sửa hồ sơ** để cập nhật họ tên, mã sinh viên hoặc ngành.
5. Chọn **Khóa** hoặc **Mở** để đổi trạng thái tài khoản và xác nhận thao tác.

Mật khẩu không được hiển thị hoặc chỉnh sửa trong màn quản trị. Quyền admin được cấp ở phía backend, không phải do người dùng tự chọn trong ứng dụng.

## 5. Trình tự demo đề xuất

1. Khởi động MongoDB/API và ứng dụng ở remote mode.
2. Đăng nhập bằng tài khoản admin đã seed; mở **Quản trị sự kiện IUH**.
3. Tạo sự kiện mới với đủ trường bắt buộc, lưu bản nháp rồi đăng sự kiện.
4. Đăng xuất admin; đăng nhập tài khoản sinh viên.
5. Tìm sự kiện vừa đăng, mở chi tiết, đăng ký, lưu vào lịch và đặt nhắc.
6. Mở Lịch của tôi để xác nhận sự kiện xuất hiện.
7. Tạo QR chứa Event ID của sự kiện, quét bằng điện thoại; hoặc dùng nhập mã thủ công để minh họa.
8. Đăng nhập lại admin, vào quản lý sinh viên, xem hồ sơ hoặc khóa/mở tài khoản thử nghiệm.

## 6. Ghi chú về trạng thái và giới hạn

- Tính năng remote cần server chạy, MongoDB kết nối được và URL API truy reachable từ thiết bị.
- Tài khoản demo và remote là hai chế độ riêng; admin remote được seed trong server. Không dùng mật khẩu mẫu trong môi trường thật.
- Nhắc thông báo cần quyền hệ điều hành; trên Web thông báo cục bộ/camera có thể không được hỗ trợ như trên điện thoại.
- Tóm tắt AI có thể chạy fallback demo khi chưa có proxy AI.
- Chức năng cần mạng có thể báo lỗi khi server không sẵn sàng; kiểm tra kết nối rồi dùng nút thử lại.

## 7. Tệp mã nguồn tham khảo

- Các màn hình chính: `src/app/(tabs)/`, chi tiết `src/app/events/[id].tsx`.
- Đăng nhập/đăng ký: `src/app/auth.tsx`; check-in: `src/app/check-in.tsx`.
- Quản trị: `src/app/admin/events/`, `src/app/admin-users.tsx`.
- Kết nối ứng dụng: `src/services/`; API và MongoDB: `server/src/`.

