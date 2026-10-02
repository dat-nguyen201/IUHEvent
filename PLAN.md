# Phân Công Lại:

## Tóm Tắt

Bạn vẫn làm phần nền ban đầu. Sau đó, việc kỹ thuật dễ nhất nên giao cho bạn là **Lịch cá nhân + lưu/hủy lưu sự kiện**, vì phần này không đụng quyền thiết bị, không cần API thật, không cần AI key, không cần cấu hình native. Nó chủ yếu dùng route, Context và UI cơ bản.

## Thành Viên 1: Bạn - Nền Tảng + Lịch Cá Nhân

**Việc hiện tại cần làm:**

- Sửa lỗi nền app:
  - Sửa tiếng Việt bị lỗi encoding.
  - Sửa lỗi TypeScript hiện có.
  - Bỏ style không tương thích React Native native như `filter`.
  - Cấu hình lint để `npx expo lint` chạy được.
- Tạo cấu trúc thư mục:
  - `src/app`
  - `src/components`
  - `src/data`
  - `src/context`
  - `src/services`
  - `src/types`
  - `src/utils`
- Làm navigation nền:
  - Tab `Sự kiện`
  - Tab `Lịch của tôi`
  - Tab `Hồ sơ`
  - Route chi tiết `/events/[id]`
- Tạo dữ liệu demo sự kiện và service mock cơ bản.
- Tạo Context API để lưu:
  - Sự kiện đã lưu.
  - Trạng thái check-in.
  - User demo.

**Việc kỹ thuật bạn làm sau đó:**

- Hoàn thiện màn `Lịch của tôi`.
- Hiển thị danh sách sự kiện đã lưu từ Context.
- Thêm nút `Hủy lưu`.
- Thêm trạng thái empty: “Bạn chưa lưu sự kiện nào”.
- Thêm phân nhóm đơn giản:
  - `Sắp diễn ra`
  - `Đã qua`
- Thêm badge trạng thái:
  - `Đã lưu`
  - `Đã check-in`
  - `Chưa check-in`
- Khi bấm vào sự kiện trong lịch thì mở chi tiết sự kiện.

## Thành Viên 2: Danh Sách Sự Kiện + Pagination

**Nhiệm vụ:**

- Hoàn thiện tab `Sự kiện`.
- Dùng `FlatList`.
- Search theo tên sự kiện.
- Filter theo category.
- Load more/pagination.
- Loading, error, empty, retry.

**Bàn giao:**

- Danh sách sự kiện chạy ổn.
- Có nút thử lại khi lỗi.
- Có trạng thái hết dữ liệu.
- Dữ liệu đi qua `src/services`, không hard-code trong screen.

## Thành Viên 3: Chi Tiết Sự Kiện + Deep Link

**Nhiệm vụ:**

- Hoàn thiện route `/events/[id]`.
- Hiển thị chi tiết sự kiện.
- Nhận `eventId` từ route params.
- Xử lý event không tồn tại.
- Deep link mở đúng chi tiết sự kiện.

**Bàn giao:**

- Từ danh sách vào chi tiết được.
- Từ lịch cá nhân vào chi tiết được.
- Link `studenteventapp://events/event-1` mở đúng màn hình.

## Thành Viên 4: Camera QR + Notifications

**Nhiệm vụ khó hơn:**

- Làm QR check-in bằng `expo-camera`.
- Xin quyền camera.
- Xử lý khi người dùng từ chối quyền.
- Quét QR chứa `eventId`.
- Cập nhật check-in vào Context.
- Làm nhắc lịch bằng `expo-notifications`.
- Xin quyền notification.
- Lên lịch local notification trước giờ sự kiện.

**Bàn giao:**

- Check-in thành công/thất bại có thông báo rõ.
- Từ chối quyền vẫn không làm app crash.
- Có nút `Nhắc tôi` trong chi tiết sự kiện.

## Thành Viên 5: Tamagui + Animation/Gesture + AI

**Nhiệm vụ khó nhất:**

- Cài và cấu hình Tamagui.
- Tạo tokens, light/dark themes.
- Làm 3 component tái sử dụng:
  - `AppButton`
  - `EventCard`
  - `StatusBanner`
- Thêm Reanimated animation:
  - Card xuất hiện.
  - Nút lưu sự kiện đổi trạng thái.
- Thêm gesture:
  - Swipe card để lưu sự kiện.
- Làm AI tóm tắt qua proxy nhỏ:
  - Không để API key trong app.
  - Có consent trước khi gửi dữ liệu.
  - Có loading/error/fallback demo.

## Thứ Tự Làm

1. Bạn làm nền app.
2. Thành viên 2 làm danh sách sự kiện.
3. Thành viên 3 làm chi tiết và deep link.
4. Bạn làm `Lịch của tôi` dựa trên Context đã có.
5. Thành viên 4 làm Camera QR và Notifications.
6. Thành viên 5 làm Tamagui, animation/gesture và AI.
7. Cả nhóm cùng chạy `npx tsc --noEmit`, `npx expo lint`, sửa lỗi tích hợp.

## Assumptions
