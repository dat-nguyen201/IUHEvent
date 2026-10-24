# IUH Event: Hiện Trạng, Hướng Dẫn Sử Dụng Và Phân Công

## Tóm Tắt

Repo hiện có một ứng dụng Expo/React Native chạy được với luồng intro, đăng nhập/đăng ký demo, Get Started, bốn tab chính và trang chi tiết sự kiện. Đây đã là nền sản phẩm để nhóm phát triển tiếp, nhưng chưa đủ chuẩn đầu ra: dữ liệu sự kiện vẫn là mẫu, trạng thái lưu/check-in chưa được lưu bền vững, check-in QR, nhắc giờ, AI, Tamagui và các minh chứng học phần còn thiếu.

Tài liệu PDF yêu cầu ứng dụng thống nhất có ít nhất 3 luồng nghiệp vụ hoàn chỉnh, 6 màn hình/trạng thái có ý nghĩa, danh sách FlatList/SectionList có tải thêm, Fetch/Axios và trạng thái tải/lỗi/rỗng/thử lại, deep link, hai Expo SDK API phù hợp có xử lý quyền, hai animation Reanimated trong đó một animation gắn gesture, Tamagui với ít nhất hai theme và ba component tái sử dụng, một tính năng AI có kiểm soát, cùng build và hồ sơ minh chứng.

## Cách Ứng Dụng Đang Hoạt Động

- Khi mở app, màn intro “IUH Event” hiện khoảng 2 giây. App sau đó kiểm tra phiên đăng nhập và trạng thái Get Started để điều hướng đến màn phù hợp.
- Chưa có tài khoản: chọn Đăng ký hoặc Đăng nhập. Đăng ký nhận họ tên, mã sinh viên, email, mật khẩu và xác nhận mật khẩu. Tài khoản admin demo là `admin` / `123456789`.
- Đăng nhập lần đầu: xem Get Started rồi chọn bắt đầu để vào trang chính. Những lần sau, nếu phiên còn hiệu lực, app đi thẳng vào trang chính sau intro.
- **Trang chủ:** xem lời chào, sự kiện nổi bật/sắp diễn ra, danh mục, số liệu lịch cá nhân và lối sang khám phá.
- **Khám phá:** tìm theo tên, lọc danh mục, xem danh sách có phân trang/tải thêm và mở chi tiết sự kiện.
- **Lịch của tôi:** xem sự kiện đã lưu, chia sắp diễn ra/đã qua, xem trạng thái lưu/check-in, hủy lưu hoặc mở chi tiết.
- **Hồ sơ:** xem thông tin tài khoản, số liệu hoạt động và đăng xuất. Đăng xuất xóa phiên và đưa về xác thực.
- **Chi tiết sự kiện:** xem thông tin sự kiện và lưu/hủy lưu. Hiện chưa có quét QR, nút check-in thực hiện được, nhắc giờ hay tóm tắt AI.

Tài khoản demo và phiên đăng nhập được lưu cục bộ: SecureStore trên iOS/Android, localStorage trên web. Đây không phải xác thực production; không có backend. Mật khẩu tài khoản đăng ký được lưu dưới dạng hash có salt, nhưng admin là thông tin cố định trong mã nguồn nên chỉ dùng cho demo.

## Đã Làm Và Còn Thiếu

**Đã có**

- Expo Router, các màn intro/auth/Get Started, nhóm tab và route `/events/[id]`.
- Đăng ký/đăng nhập demo, kiểm tra đầu vào cơ bản, phiên đăng nhập và trạng thái Get Started lưu cục bộ.
- Bốn tab Trang chủ, Khám phá, Lịch của tôi, Hồ sơ; danh sách sự kiện mẫu, tìm kiếm/lọc/tải thêm và trạng thái tải/lỗi/rỗng.
- Context dùng chung cho user, sự kiện đã lưu và check-in; component sự kiện/badge/thông báo trạng thái.
- Cấu hình tên IUH Event và scheme `studenteventapp`. TypeScript, lint và web export đã từng chạy thành công.

**Còn thiếu so với đề**

- Dữ liệu sự kiện hiện là 12 mục hard-code; service giả lập độ trễ/lỗi, chưa gọi API Fetch/Axios. Cần chọn API hoặc mock API có căn cứ và giữ chế độ demo dự phòng.
- Lưu sự kiện/check-in chỉ ở Context trong bộ nhớ, chưa tồn tại sau khi đóng app. Một vài hàm service đăng ký/check-in cũng chưa nối với luồng UI.
- Deep link cần kiểm thử trên thiết bị/build thật; route có chưa đồng nghĩa đã chứng minh hoạt động.
- Chưa có ít nhất hai Expo SDK API trong nhóm Camera/Location/Notifications/FileSystem. SecureStore không thay thế yêu cầu này. Nên dùng Camera và Notifications, có luồng từ chối quyền.
- Reanimated/Gesture Handler có trong dependencies nhưng chưa có hai animation có mục đích, trong đó một animation được kích hoạt bằng gesture.
- Chưa cài/cấu hình Tamagui, hai theme, tokens và ba component Tamagui tái sử dụng.
- Chưa có tính năng AI hoàn chỉnh, kiểm soát đầu vào, đồng ý về dữ liệu, giới hạn chi phí, trạng thái chờ/lỗi và phương án dự phòng.
- Chưa có bằng chứng trong repo cho khảo sát ít nhất 3 người, kiểm thử khả dụng ít nhất 5 lượt, tối thiểu 8 test case, build APK/AAB hoặc iOS, EAS/OTA/CI-CD, README hướng dẫn hoàn chỉnh, báo cáo, slide/video, nhật ký đóng góp và công bố AI.
- `README.md` hiện còn là hướng dẫn Expo starter; `PLAN.md` mô tả kế hoạch cũ và chữ Việt bị lỗi encoding. Hai tài liệu này không phản ánh đúng hiện trạng.

**Trạng thái CLO:** CLO1–2 có nền tảng triển khai nhưng cần giải trình kiến trúc và bổ sung minh chứng. CLO3 mới có phân trang/lỗi mô phỏng, chưa có Fetch/Axios thật hoặc tương đương. CLO4–5 chưa triển khai tính năng yêu cầu. CLO6 có Expo/Router nhưng thiếu hai API Expo phù hợp, build và kế hoạch phát hành. CLO7 chưa có AI.

## Chia Việc Cho 5 Thành Viên

Mỗi nhánh dưới đây nên là một PR chức năng nhỏ, có tiêu chí nghiệm thu riêng. Mỗi PR chỉ nên chạm vào màn hình/service thuộc phần sở hữu; thay đổi Context, route dùng chung, cấu hình Expo hoặc component chung cần thống nhất trước với người phụ trách tích hợp.

**Thành viên 1 – DAT : Lịch cá nhân và lưu trạng thái**

- `feat/schedule-persistence`: thêm lưu cục bộ cho danh sách sự kiện đã lưu và check-in; khôi phục trạng thái khi mở app; giữ API Context hiện tại để các nhánh khác không phải tự lưu dữ liệu.
- `feat/schedule-empty-and-groups`: hoàn thiện trạng thái chưa có sự kiện, phân nhóm sắp diễn ra/đã qua, badge check-in, hủy lưu và mở chi tiết.
- Nghiệm thu: lưu sự kiện ở một màn, thấy ở lịch; đóng/mở lại vẫn còn; hủy lưu cập nhật cả lịch và chi tiết.
- Phạm vi chủ yếu là state, storage và UI; không nhận hậu cần hay tích hợp thiết bị.

**Thành viên 2 – Khám phá sự kiện và dữ liệu**

- `feat/events-api`: định nghĩa kiểu response và lớp service gọi Fetch/Axios; dùng API phù hợp hoặc mock API có nguồn/căn cứ; ánh xạ dữ liệu vào model hiện có.
- `feat/discover-list-states`: dùng FlatList/SectionList, tìm kiếm/lọc, tải thêm, loading/error/empty/retry và chống gọi lặp khi tải trang.
- `feat/home-data`: thay dữ liệu hard-code ở trang chủ bằng cùng service, tránh hai nguồn dữ liệu khác nhau.
- Nghiệm thu: mất mạng/lỗi API có thông báo và retry; cuối danh sách hiển thị hết dữ liệu; demo vẫn dùng được khi nguồn ngoài không khả dụng.

**Thành viên 3 – Chi tiết, đăng ký sự kiện và deep link**

- `feat/event-detail-data`: lấy sự kiện theo ID từ service, xử lý ID không hợp lệ/không tồn tại, hiển thị chi tiết và số chỗ nếu dữ liệu hỗ trợ.
- `feat/event-registration`: hoàn thiện thao tác đăng ký/hủy đăng ký demo và trạng thái kết quả nhìn thấy được.
- `feat/event-deep-link`: kiểm tra link `studenteventapp://events/event-1` mở đúng nội dung trên build mục tiêu; xử lý link sai hoặc sự kiện không tồn tại.
- Nghiệm thu: đi được từ Khám phá và Lịch đến cùng một chi tiết; đăng ký phản hồi rõ; link ngoài mở đúng sự kiện.

**Thành viên 4 – Camera QR và thông báo**

- `feat/qr-checkin-screen`: thêm màn quét QR bằng Expo Camera; yêu cầu quyền camera, hướng dẫn khi bị từ chối và không crash.
- `feat/qr-checkin-flow`: xác nhận QR chứa eventId hợp lệ, chống quét lặp, cập nhật check-in qua API Context đã thống nhất với thành viên 1.
- `feat/event-reminders`: dùng Expo Notifications để xin quyền, lên lịch/hủy nhắc trước sự kiện; thêm điểm vào “Nhắc tôi” ở chi tiết thông qua PR tích hợp với thành viên 3.
- Nghiệm thu: QR hợp lệ check-in đúng sự kiện; QR sai/đã check-in có kết quả rõ; từ chối quyền vẫn dùng được phần còn lại; nhắc lịch có thể bật/tắt.
- Đây là nhánh rủi ro cao hơn vì cần cấu hình và kiểm thử trên thiết bị/dev build.

**Thành viên 5 – Tamagui, tương tác và AI**

- `feat/tamagui-foundation`: cấu hình Tamagui đúng Expo SDK của repo, tokens, hai theme và responsive UI; thống nhất cách dùng với component React Native hiện có.
- `feat/shared-ui`: triển khai tối thiểu ba component Tamagui tái sử dụng, ví dụ nút, thẻ sự kiện và banner trạng thái.
- `feat/event-animations`: triển khai hai animation Reanimated phục vụ phản hồi trạng thái; ít nhất một animation được kích hoạt bằng gesture có ý nghĩa, không chỉ trang trí. Phối hợp thành viên 2 để tránh cùng sửa EventCard.
- Trạng thái tích hợp hiện tại: `TamaguiProvider` dùng config v6 với theme sáng/tối, token màu/khoảng cách/bán kính và media query compact/tablet. `Screen`, `ActionButton`, `Badge` và `StatusMessage` dùng chung primitive Tamagui; màn chi tiết hỗ trợ vuốt ngang sang phải để quay lại. `EventCard` giữ ownership animation xếp chồng và phản hồi lưu của thành viên 2.
- `feat/ai-event-summary`: tạo tóm tắt sự kiện qua proxy/server hoặc giải pháp không để API key trong app; thêm đồng ý gửi dữ liệu, kiểm soát nội dung/giới hạn, loading/error và fallback demo. Giao diện tóm tắt đặt trong component riêng để tránh xung đột với màn chi tiết của thành viên 3.
- Trạng thái tích hợp AI: `EventSummary` đã được gắn vào màn chi tiết; người dùng phải đồng ý trước khi gửi dữ liệu công khai. App gọi proxy tùy chọn qua `EXPO_PUBLIC_AI_SUMMARY_URL`, kiểm tra/giới hạn payload và response, có loading, retry, thông báo lỗi và fallback demo cục bộ khi chưa có proxy hoặc proxy thất bại. Không có API key trong mobile app.
- Nghiệm thu: hai theme và ba component được dùng trong app thật; hai animation hoạt động; AI có phương án lỗi/dự phòng và không gửi dữ liệu nhạy cảm khi chưa đồng ý.

**Việc chung, mỗi người có phần sở hữu rõ**

- Mỗi thành viên tự viết test/checklist cho nhánh mình; cả nhóm cùng hoàn thành tối thiểu 8 test case tích hợp, kiểm thử khả dụng ít nhất 5 lượt và ghi nhận vấn đề/sửa đổi.
- Mỗi người cập nhật nhật ký đóng góp theo tuần và có thể giải thích phần code của mình.
- Chỉ định một lượt tích hợp cuối để chuẩn bị EAS build, README, báo cáo, slide/video và công bố việc dùng AI. Đây là đầu việc chung, không thay thế phần chức năng của từng thành viên.

## Quy Ước Git Và Thứ Tự Merge

- Tạo nhánh ngắn theo chức năng, ví dụ `feat/discover-list-states`; mỗi PR gắn issue, mô tả cách kiểm tra, ảnh/video nếu có và không gom nhiều chức năng không liên quan.
- Giữ `main` chạy được. Tạo nhánh từ `main`, cập nhật lại trước khi mở PR; không commit trực tiếp lên `main`.
- Thống nhất API Context trước: thành viên 1 sở hữu lưu/check-in bền vững; thành viên 4 gọi các hàm đã chốt thay vì sửa song song logic lưu. Thành viên 3 sở hữu màn chi tiết; thành viên 4 và 5 cung cấp component/service riêng rồi tạo PR tích hợp nhỏ khi cần.
- Thứ tự merge đề xuất: API/kiểu dữ liệu của thành viên 2 → dữ liệu chi tiết/deep link của thành viên 3 → lưu lịch của thành viên 1 → Tamagui và component dùng chung của thành viên 5 → Camera/Notifications của thành viên 4 → AI/animation và tích hợp cuối.
- Sau mỗi PR chạy `npx tsc --noEmit` và `npx expo lint`; trước nghiệm thu chạy thêm test case, kiểm tra thiết bị và EAS build. Khóa thay đổi tính năng trước khi tạo bản phát hành/tag.

## Giả Định

- Giữ tài khoản `admin / 123456789` chỉ cho demo; không dùng để đại diện cho hệ thống quyền quản trị thật.
- Giữ scheme `studenteventapp` để tương thích link hiện tại.
- Ưu tiên Camera + Notifications làm hai Expo SDK API vì phù hợp luồng sự kiện; nhóm có thể dùng mock API/backend đơn giản, không cần xây backend phức tạp.
- Sự kiện, QR và tài khoản hiện tại là dữ liệu demo cho đến khi nhóm bổ sung nguồn dữ liệu và kiểm thử tương ứng.
