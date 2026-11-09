# Thành viên 5 - Tamagui, Shared UI và Animation

Tài liệu này ghi nhận ba chức năng đầu tiên của thành viên 5 trong IUH Event:

1. `feat/tamagui-foundation`
2. `feat/shared-ui`
3. `feat/event-animations`

Phần AI tóm tắt sự kiện (`feat/ai-event-summary`) được ghi ở mục 6 của tài liệu này.

## 1. Kết quả đã triển khai

### `feat/tamagui-foundation`

- Dùng `@tamagui/config/v6` và `createTamagui` để tạo cấu hình chung.
- Tích hợp duy nhất một `TamaguiProvider` ở root layout.
- Khai báo token dùng chung cho khoảng cách, bán kính và màu ứng dụng.
- Khai báo hai theme `light` và `dark`.
- Thêm media query `compact` và `tablet` cho responsive UI.
- Root layout chọn theme ban đầu theo `useColorScheme`.
- Giữ nguyên các provider và navigation hiện có: Gesture Handler, Safe Area, AppState, Auth và Expo Router.
- Các màn hình React Native hiện hữu tiếp tục hoạt động; chỉ các component dùng chung và vùng cần theme động được chuyển đổi dần.

### `feat/shared-ui`

Các component dùng chung đã được tạo hoặc chuẩn hóa:

- `Surface`: primitive nền/bề mặt dùng cho card và control.
- `AppText`: text primitive dùng chung.
- `MutedText`: text phụ cho mô tả, trạng thái và thông báo.
- `SectionTitle`: tiêu đề section có typography thống nhất.
- `ResponsiveContent`: wrapper nội dung có thể mở rộng cho responsive layout.
- `ActionButton`: nút hành động có các variant `primary`, `secondary`, `danger`.
- `Badge`: nhãn trạng thái với tone `neutral` và `success`.
- `StatusMessage`: trạng thái rỗng/lỗi kèm nút thử lại hoặc điều hướng.
- `Screen`: vùng màn hình dùng safe area, theme background và responsive padding.

Các component trên được sử dụng trong app thật, đặc biệt ở màn chi tiết, lịch, khám phá và các trạng thái rỗng/lỗi; không chỉ tồn tại dưới dạng ví dụ độc lập.

### `feat/event-animations`

Đã có các animation phục vụ tương tác:

- `EventCard` co nhẹ khi nhấn, bookmark nảy bằng spring khi lưu/hủy lưu và có hiệu ứng xếp chồng khi cuộn.
- Trang Khám phá có animation cho chip filter, skeleton loading, header thu gọn, danh sách xuất hiện dần và nút cuộn lên đầu.
- Màn chi tiết sự kiện có gesture vuốt từ trái sang phải để quay lại:
  - Chỉ kích hoạt khi kéo ngang đủ rõ.
  - Không kích hoạt khi chuyển động chủ yếu theo chiều dọc.
  - Vuốt quá ngưỡng sẽ gọi `router.back()`.
  - Vuốt chưa đủ ngưỡng sẽ spring về vị trí ban đầu.

`EventCard` giữ ownership của thành viên 2 đối với animation danh sách và phản hồi lưu sự kiện. Gesture quay lại được đặt ở màn chi tiết để tránh sửa chồng chéo vào logic danh sách.

## 2. Dependency và phiên bản

Repo hiện dùng Expo SDK 57:

```json
{
  "expo": "~57.0.31",
  "react": "19.2.3",
  "react-native": "0.86.3",
  "@tamagui/config": "^3.0.18",
  "@tamagui/core": "^3.0.18",
  "react-native-gesture-handler": "~2.32.0",
  "react-native-reanimated": "4.5.1"
}
```

Reanimated 4 yêu cầu React Native New Architecture. Không thêm package animation hoặc Tamagui khác ngoài dependency đã có nếu chưa kiểm tra compatibility với Expo SDK 57.

## 3. Cấu hình Tamagui

### File chính

- [`tamagui.config.ts`](./tamagui.config.ts): config, tokens, themes và media queries.
- [`src/app/_layout.tsx`](./src/app/_layout.tsx): nơi gắn `TamaguiProvider`.
- [`src/components/TamaguiPrimitives.tsx`](./src/components/TamaguiPrimitives.tsx): primitive dùng chung.

### Token ứng dụng

| Nhóm | Token | Giá trị |
|---|---|---:|
| `space` | `appXs` | 8 |
| `space` | `appSm` | 12 |
| `space` | `appMd` | 16 |
| `space` | `appLg` | 24 |
| `space` | `appXl` | 32 |
| `radius` | `card` | 20 |
| `radius` | `control` | 16 |
| `radius` | `pill` | 999 |

Các token mặc định từ `@tamagui/config/v6` vẫn được giữ lại.

### Theme

Theme được khai báo với các key được component dùng trực tiếp:

| Key | Light | Dark |
|---|---|---|
| `background` | `#F7F8FB` | `#111827` |
| `color` | `#111827` | `#F9FAFB` |
| `primary` | `#2563EB` | `#60A5FA` |
| `surface` | `#FFFFFF` | `#1F2937` |
| `border` | `#E5E7EB` | `rgba(255,255,255,0.1)` |
| `muted` | `#6B7280` | `#9CA3AF` |
| `success` | `#059669` | `#34D399` |
| `danger` | `#DC2626` | `#F87171` |

Media query:

- `compact`: màn hình rộng tối đa 420px.
- `tablet`: màn hình rộng từ 768px.

## 4. Cách sử dụng component

### `ActionButton`

File: [`src/components/ActionButton.tsx`](./src/components/ActionButton.tsx)

```tsx
<ActionButton
  label="Lưu vào lịch"
  variant="primary"
  onPress={() => saveEvent(event.id)}
/>
```

Variant hợp lệ:

- `primary`: hành động chính.
- `secondary`: hành động phụ.
- `danger`: hủy hoặc thao tác có tính phá hủy.

Component giữ `PressableProps`, nên có thể truyền `disabled`, accessibility props và handler theo chuẩn React Native.

### `Badge`

File: [`src/components/Badge.tsx`](./src/components/Badge.tsx)

```tsx
<Badge label="Chưa lưu" />
<Badge label="Đã check-in" tone="success" />
```

Badge lấy màu từ `useTheme()`, vì vậy không dùng màu cố định chỉ phù hợp với một theme.

### `StatusMessage`

File: [`src/components/StatusMessage.tsx`](./src/components/StatusMessage.tsx)

```tsx
<StatusMessage
  title="Bạn chưa lưu sự kiện nào"
  message="Vào Khám phá để chọn một sự kiện."
  actionLabel="Khám phá sự kiện"
  onAction={() => router.push('/(tabs)/discover')}
/>
```

Nếu không truyền cả `actionLabel` và `onAction`, component chỉ hiển thị nội dung trạng thái.

### `Screen`

File: [`src/components/Screen.tsx`](./src/components/Screen.tsx)

```tsx
return (
  <Screen>
    <Text>Nội dung màn hình</Text>
  </Screen>
);
```

`Screen` tự xử lý safe area, background theo theme và padding responsive. Không bọc thêm `TamaguiProvider` trong screen.

### Primitive Tamagui

Các primitive nằm trong [`src/components/TamaguiPrimitives.tsx`](./src/components/TamaguiPrimitives.tsx):

```tsx
import { MutedText, SectionTitle, Surface } from '@/components/TamaguiPrimitives';

<Surface style={{ padding: 16 }}>
  <SectionTitle>Thông tin sự kiện</SectionTitle>
  <MutedText>Chi tiết được cập nhật từ service.</MutedText>
</Surface>
```

Với component mới, ưu tiên dùng primitive và `useTheme()` thay vì hard-code màu. Các style layout đặc thù vẫn có thể dùng `StyleSheet` của React Native.

## 5. Cách sử dụng animation và gesture

### Animation trên EventCard

File: [`src/components/EventCard.tsx`](./src/components/EventCard.tsx)

- Nhấn card: `pressScale` dùng `withTiming` khi nhấn và `withSpring` khi thả.
- Nhấn bookmark: `bookmarkScale` nảy để phản hồi việc lưu/hủy lưu.
- Cuộn danh sách: `stackStyle` tính scale/translate theo `scrollY` để tạo hiệu ứng xếp chồng.
- Overlay giảm sáng card phía sau giúp phân biệt độ sâu khi cuộn.

Không thêm animation khác trực tiếp vào EventCard nếu chưa thống nhất với thành viên 2.

### Animation trang Khám phá

File: [`src/app/(tabs)/discover.tsx`](./src/app/(tabs)/discover.tsx)

- Category chip co nhẹ khi nhấn.
- Skeleton nhấp nháy khi tải.
- Header lớn thu gọn theo `scrollY`.
- FAB hiện/ẩn theo vị trí cuộn.
- Kết quả và card đi vào bằng `FadeIn`/`FadeInDown`.

### Gesture vuốt quay lại

File: [`src/app/events/[id].tsx`](./src/app/events/[id].tsx)

Gesture hiện tại dùng `Gesture.Pan()`:

```tsx
const swipeBack = Gesture.Pan()
  .activeOffsetX(24)
  .failOffsetY([-18, 18])
  .onUpdate((gesture) => {
    gestureX.set(Math.max(0, gesture.translationX));
  })
  .onEnd(() => {
    if (gestureX.value > 120) {
      runOnJS(router.back)();
    } else {
      gestureX.set(withSpring(0));
    }
  });
```

Khi thêm gesture mới:

1. Dùng `GestureDetector` bên trong `GestureHandlerRootView`.
2. Có ngưỡng kích hoạt rõ ràng.
3. Không chiếm gesture dọc của `ScrollView`.
4. Có phản hồi trực quan trong lúc kéo.
5. Có hành vi hoàn tác khi chưa đạt ngưỡng.

## 6. AI event summary

### Mục tiêu và nguyên tắc an toàn

Tóm tắt AI được đặt trong component riêng để không làm xung đột với màn chi tiết do thành viên 3 sở hữu:

- [`src/components/EventSummary.tsx`](./src/components/EventSummary.tsx): UI consent, loading, kết quả, fallback và thử lại.
- [`src/services/aiSummaryService.ts`](./src/services/aiSummaryService.ts): gọi proxy tùy chọn và tạo tóm tắt demo.
- [`src/app/events/[id].tsx`](./src/app/events/[id].tsx): chỉ chèn `EventSummary` sau phần thông tin sự kiện.

Ứng dụng không chứa API key. Nếu dùng AI thật, app chỉ gọi endpoint proxy qua biến môi trường `EXPO_PUBLIC_AI_SUMMARY_URL`; API key của nhà cung cấp phải nằm ở server proxy, không nằm trong Expo bundle.

Payload gửi đi chỉ gồm dữ liệu công khai của sự kiện:

- tiêu đề, mô tả, thời gian, địa điểm;
- danh mục, đơn vị tổ chức và `summarySource`.

Không gửi user, email, mã sinh viên, saved state, check-in state hoặc thông tin xác thực. Các trường text được giới hạn độ dài trước khi gửi; response cũng được kiểm tra và giới hạn tối đa.

### Luồng sử dụng

1. Người dùng mở chi tiết sự kiện.
2. Component hiển thị giải thích dữ liệu nào sẽ được gửi.
3. Người dùng phải bật consent bằng checkbox.
4. Bấm `Tạo tóm tắt` để bắt đầu.
5. Trong lúc chờ, nút hiển thị loading và không cho gửi lặp.
6. Nếu proxy trả về `{ "summary": "..." }` hoặc `{ "text": "..." }`, kết quả được đánh dấu là remote.
7. Nếu chưa cấu hình endpoint, timeout, HTTP lỗi hoặc response sai định dạng, app hiển thị tóm tắt demo cục bộ kèm thông báo rõ ràng.
8. Người dùng có thể bấm `Tạo lại`; consent phải được bật lại sau khi kết quả bị đóng.

Fallback demo luôn tạo từ dữ liệu sự kiện hiện có, nên màn hình vẫn hữu ích khi offline hoặc chưa có backend. Không coi fallback là kết quả AI thật.

### Cấu hình endpoint proxy

Tạo biến môi trường public khi chạy app:

```text
EXPO_PUBLIC_AI_SUMMARY_URL=https://your-domain.example/api/event-summary
```

Proxy nên:

1. xác thực request và giới hạn tần suất;
2. kiểm soát độ dài/nội dung đầu vào;
3. gọi nhà cung cấp AI bằng secret ở server;
4. trả JSON tối giản `{ "summary": "..." }`;
5. không ghi log dữ liệu người dùng hoặc prompt nhạy cảm.

Không đặt `OPENAI_API_KEY`, `GEMINI_API_KEY` hoặc secret tương tự vào `EXPO_PUBLIC_*`, `app.json`, source code hay file bundle.

## 7. Quy tắc theme động

Không dùng `colors` tĩnh cho nội dung cần thay đổi theo theme. Sử dụng:

```tsx
const theme = useTheme();

<View style={{ backgroundColor: theme.surface.val }}>
  <Text style={{ color: theme.color.val }}>Nội dung</Text>
</View>
```

Quy tắc này đặc biệt quan trọng với:

- Card và panel thông tin.
- Tiêu đề, metadata và placeholder.
- Search box, chip và skeleton.
- Nút, badge và trạng thái lỗi/rỗng.

Bảng màu trong [`src/constants/app-theme.ts`](./src/constants/app-theme.ts) vẫn được giữ cho các màn React Native chưa chuyển hoàn toàn, nhưng component mới nên ưu tiên `useTheme()`. Khi sửa một màn hình có cả hai hệ màu, cần kiểm tra cả Light và Dark để tránh chữ/nền bị hòa màu.

## 8. Phạm vi tích hợp và ownership

- `TamaguiProvider` và config: thành viên 5.
- Primitive, button, badge, status message và screen: thành viên 5.
- `EventCard` và animation danh sách: giữ ownership thành viên 2; thành viên 5 chỉ tích hợp màu theme động và không thay đổi API dữ liệu.
- Màn chi tiết: thành viên 3 sở hữu luồng dữ liệu; thành viên 5 cung cấp gesture riêng, không thay đổi Context hoặc service.
- AI summary: component/service riêng của thành viên 5; không thay đổi API Context hoặc service sự kiện.

Khi tích hợp nhánh khác:

1. Không tạo provider Tamagui thứ hai.
2. Không sửa trực tiếp API `AppStateContext` chỉ để phục vụ UI.
3. Không di chuyển route vào `src/components`.
4. Giữ accessibility label, điều hướng và hành vi lưu sự kiện hiện có.
5. Nếu conflict ở EventCard, ưu tiên giữ logic dữ liệu của thành viên 2 và áp dụng lại phần theme/animation có kiểm soát.

## 9. Chạy và kiểm tra

Cài dependency:

```bash
npm install
```

Chạy app:

```bash
npm start
npm run android
npm run ios
npm run web
```

Sau khi thay đổi config hoặc Babel, làm sạch Metro cache:

```bash
npx expo start --clear
```

Kiểm tra bắt buộc:

```bash
npx tsc --noEmit
npx expo lint --no-cache
npx expo-doctor
```

Kết quả tại thời điểm ghi tài liệu:

- TypeScript: đạt.
- Expo lint: đạt.
- Expo Doctor: `21/21 checks passed`.

## 10. Checklist nghiệm thu

- [x] Tamagui config dùng `@tamagui/config/v6`.
- [x] Root layout có một `TamaguiProvider`.
- [x] Có token spacing/radius/color.
- [x] Có theme Light và Dark.
- [x] Có responsive media query compact/tablet.
- [x] Có tối thiểu ba component Tamagui dùng trong app thật.
- [x] Button, badge, status message và screen dùng theme động.
- [x] EventCard có phản hồi nhấn/lưu và animation xếp chồng.
- [x] Khám phá có animation cho filter, loading và scroll.
- [x] Có gesture vuốt ngang có ý nghĩa để quay lại.
- [x] Gesture không sửa chồng vào ownership dữ liệu của thành viên 2.
- [x] AI summary có consent trước khi gửi dữ liệu.
- [x] Không có API key trong mobile app.
- [x] Có proxy tùy chọn, loading, lỗi, giới hạn payload và fallback demo.
- [x] TypeScript, lint và Expo Doctor đều đạt.
