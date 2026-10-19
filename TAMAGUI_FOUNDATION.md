# Tamagui Foundation

Tài liệu này mô tả phần nền Tamagui do thành viên 5 triển khai cho ứng dụng IUH Event.

## 1. Phạm vi chức năng

Phần này tương ứng với nhánh `feat/tamagui-foundation` trong [HUONGDAN.md](./HUONGDAN.md).

Đã thực hiện:

- Cài đặt Tamagui tương thích với Expo SDK 57 và React Native hiện tại của dự án.
- Tạo cấu hình Tamagui dùng chung cho toàn ứng dụng.
- Tích hợp `TamaguiProvider` vào root layout.
- Khai báo theme sáng và theme tối.
- Khai báo token spacing và radius dành cho giao diện IUH Event.
- Cho phép theme tự động theo cài đặt sáng/tối của thiết bị.
- Giữ nguyên các màn hình React Native hiện có; việc tích hợp không bắt buộc phải chuyển đổi toàn bộ UI ngay lập tức.

Chưa thuộc phạm vi của phần này:

- Ba component dùng chung `AppButton`, `EventCard`, `StatusBanner`.
- Animation bằng Reanimated.
- Gesture swipe để lưu sự kiện.
- Tính năng AI tóm tắt sự kiện.

Các phần trên là những chức năng tiếp theo trong phân công của thành viên 5.

## 2. Công nghệ và phiên bản

Các dependency chính:

```json
{
  "expo": "~57.0.25",
  "react": "19.2.3",
  "react-native": "0.86.3",
  "@tamagui/config": "^3.0.18",
  "@tamagui/core": "^3.0.18"
}
```

Tamagui được dùng ở mức core/config để tránh thay đổi lớn đến UI hiện tại. Theo hướng dẫn Tamagui, phần nền có thể hoạt động mà chưa cần thêm compiler hoặc Metro plugin.

## 3. Các file liên quan

### `tamagui.config.ts`

File cấu hình Tamagui ở thư mục gốc:

- Nhận cấu hình mặc định từ `@tamagui/config/v6`.
- Tạo cấu hình bằng `createTamagui`.
- Gộp token mặc định với token riêng của ứng dụng.
- Ghi đè một số giá trị màu trong theme `light` và `dark`.
- Export `tamaguiConfig` để root layout sử dụng.
- Khai báo `TamaguiCustomConfig` để các component Tamagui được kiểm tra kiểu chính xác.

### `src/app/_layout.tsx`

Root layout:

- Đọc theme hệ thống bằng `useColorScheme`.
- Chọn `light` khi thiết bị không ở dark mode.
- Bọc các provider hiện có bằng `TamaguiProvider`.
- Giữ nguyên thứ tự hoạt động của `GestureHandlerRootView`, `SafeAreaProvider`, `AppStateProvider` và `AuthProvider`.

### `app.json`

Thuộc tính sau được đổi:

```json
{
  "expo": {
    "userInterfaceStyle": "automatic"
  }
}
```

Giá trị `automatic` cho phép ứng dụng nhận biết lựa chọn sáng/tối của hệ điều hành.

### `package.json` và `package-lock.json`

Hai package Tamagui được thêm vào dependency:

- `@tamagui/core`
- `@tamagui/config`

Không sửa thủ công `package-lock.json`; file này được cập nhật bởi npm khi cài dependency.

## 4. Cài đặt từ đầu

### Điều kiện

- Node.js và npm đã được cài đặt.
- Đang đứng tại thư mục gốc dự án.
- Có quyền cài package từ npm registry.

### Cài dependency

Chạy:

```bash
npm install @tamagui/core@latest @tamagui/config@latest --legacy-peer-deps --no-audit --no-fund
```

Trong repository hiện tại, lệnh trên đã tạo phiên bản:

```text
@tamagui/core@3.0.18
@tamagui/config@3.0.18
```

Nếu checkout một commit đã có sẵn `package.json` và `package-lock.json` mới, chỉ cần chạy:

```bash
npm install
```

Không cài Tamagui bằng `npx expo install`, vì Tamagui không phải Expo SDK package cần Expo chọn phiên bản. Nếu có thay đổi package tương lai, cần kiểm tra compatibility với Expo SDK 57 trước khi cập nhật.

## 5. Cách chạy ứng dụng

```bash
npm start
```

Hoặc chạy trực tiếp theo nền tảng:

```bash
npm run android
npm run ios
npm run web
```

Để làm sạch cache Metro sau khi thay đổi cấu hình Tamagui:

```bash
npx expo start -c
```

## 6. Cách sử dụng cấu hình Tamagui

### Dùng provider

Root layout đã tích hợp sẵn provider. Không thêm một `TamaguiProvider` khác ở từng screen hoặc component.

Mẫu cấu trúc hiện tại:

```tsx
<TamaguiProvider config={tamaguiConfig} defaultTheme={defaultTheme}>
  {/* AppStateProvider, AuthProvider và Expo Router */}
</TamaguiProvider>
```

`defaultTheme` được chọn từ `useColorScheme`:

```tsx
const colorScheme = useColorScheme();
const defaultTheme = colorScheme === 'dark' ? 'dark' : 'light';
```

### Dùng token trong component Tamagui

Các token của Tamagui có thể được dùng trong component sau này:

```tsx
import { Button, YStack } from '@tamagui/core';

export function Example() {
  return (
    <YStack gap="$appSm" padding="$appMd">
      <Button borderRadius="$control">Lưu sự kiện</Button>
    </YStack>
  );
}
```

Token ứng dụng hiện có:

| Nhóm | Token | Giá trị |
|---|---|---:|
| `space` | `$appXs` | `8` |
| `space` | `$appSm` | `12` |
| `space` | `$appMd` | `16` |
| `space` | `$appLg` | `24` |
| `space` | `$appXl` | `32` |
| `radius` | `$card` | `20` |
| `radius` | `$control` | `16` |

Các token mặc định của Tamagui vẫn được giữ lại và có thể tiếp tục sử dụng.

### Dùng theme

Hai theme chính của ứng dụng là:

- `light`
  - Background: `#F7F8FB`
  - Text: `#111827`
  - Primary: `#2563EB`
- `dark`
  - Background: `#111827`
  - Text: `#F9FAFB`
  - Primary: `#60A5FA`

Component Tamagui nên ưu tiên dùng giá trị theo theme thay vì hard-code màu:

```tsx
import { Text, YStack } from '@tamagui/core';

export function ThemeAwareContent() {
  return (
    <YStack backgroundColor="$background" padding="$appMd">
      <Text color="$color">Nội dung theo theme</Text>
    </YStack>
  );
}
```

## 7. Quy tắc tích hợp với UI hiện có

Hiện tại phần lớn màn hình vẫn dùng `StyleSheet` của React Native. Đây là chủ ý để giảm xung đột với các nhánh đang phát triển.

Khi tạo component mới:

1. Ưu tiên component Tamagui cho UI dùng chung.
2. Dùng token thay vì lặp lại khoảng cách, radius và màu.
3. Không đặt component dùng chung trong `src/app/`; route chỉ nên chứa screen.
4. Không tạo provider riêng trong từng screen.
5. Không thay đổi API của `AppStateContext` chỉ để phục vụ Tamagui.
6. Nếu chuyển đổi một component hiện có, cần giữ nguyên hành vi điều hướng, lưu sự kiện và accessibility.

Các component React Native hiện tại như [EventCard.tsx](./src/components/EventCard.tsx) vẫn hoạt động độc lập. Việc chuyển `EventCard` sang Tamagui nên được thực hiện trong nhánh `feat/shared-ui` và cần phối hợp với thành viên đang phụ trách danh sách sự kiện.

## 8. Kiểm tra và xác nhận

### Lint

```bash
npx expo lint
```

Kết quả hiện tại: đạt, không có lỗi hoặc warning từ phần Tamagui foundation.

### Typecheck

```bash
npx tsc --noEmit
```

Trong trạng thái repository hiện tại, typecheck còn báo hai lỗi nền không phát sinh từ Tamagui:

```text
src/components/animated-icon.web.tsx:
Cannot find module './animated-icon.module.css'

src/constants/theme.ts:
Cannot find module or type declarations for side-effect import of '@/global.css'
```

Do đó cần phân biệt:

- Lint của phần foundation: đã đạt.
- Typecheck toàn repository: chưa đạt vì hai file tài nguyên/type declaration có sẵn đang thiếu.

### Kiểm tra dependency

```bash
npm ls @tamagui/core @tamagui/config --depth=0
```

Kết quả mong đợi:

```text
@tamagui/config@3.0.18
@tamagui/core@3.0.18
```

## 9. Sự cố thường gặp

### Theme tối không thay đổi

Kiểm tra:

1. `app.json` có `"userInterfaceStyle": "automatic"`.
2. Root layout có `TamaguiProvider`.
3. `defaultTheme` được lấy từ `useColorScheme`.
4. Component đang dùng token theme như `$background` hoặc `$color`, không phải màu hard-code.
5. Khởi động lại Metro bằng `npx expo start -c`.

### Lỗi không tìm thấy package Tamagui

Chạy:

```bash
npm install
npm ls @tamagui/core @tamagui/config --depth=0
```

Nếu lockfile bị lệch so với `package.json`, không sửa thủ công; xóa/cài lại dependency chỉ khi đã xác nhận thay đổi đó thuộc phạm vi công việc và không ảnh hưởng thay đổi của người khác.

### Lỗi peer dependency khi cài

Repository hiện tại dùng React Native/Expo phiên bản mới, trong khi một số dependency Tamagui có thể khai báo peer dependency rộng hoặc chưa khớp hoàn toàn. Lệnh cài đã dùng `--legacy-peer-deps` để hoàn tất việc resolve dependency. Sau khi cài cần chạy lint, typecheck và mở app để kiểm tra runtime.

Không nên bỏ qua lỗi runtime chỉ vì npm cài đặt thành công.

## 10. Hướng phát triển tiếp theo

Các nhánh tiếp theo nên dựa trên cấu hình này:

1. Tạo `AppButton`, `EventCard`, `StatusBanner` bằng Tamagui.
2. Dùng chung token `$appSm`, `$appMd`, `$card` và `$control`.
3. Bổ sung animation Reanimated nhưng không đặt logic animation vào `tamagui.config.ts`.
4. Thêm gesture swipe ở component card, bảo đảm vẫn có nút bấm thay thế cho accessibility.
5. Tạo component AI summary độc lập với màn chi tiết sự kiện.
6. Sau mỗi nhánh chạy:

```bash
npx tsc --noEmit
npx expo lint
```

7. Khi thay đổi package hoặc cấu hình native, kiểm tra lại bằng Expo SDK 57 và thử trên Android/iOS/web nếu có thể.

## 11. Tài liệu tham khảo

- [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/)
- [Tamagui installation](https://tamagui.dev/docs/intro/installation)
- [Tamagui Expo guide](https://tamagui.dev/docs/guides/expo)
- [Tamagui configuration](https://tamagui.dev/docs/core/configuration)
