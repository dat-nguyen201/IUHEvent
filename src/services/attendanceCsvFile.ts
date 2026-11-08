import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

/** Tạo file CSV thật thay vì gửi nội dung CSV dưới dạng tin nhắn văn bản. */
export async function exportAttendanceCsvFile(
  csv: string,
  eventId: string,
): Promise<string> {
  const safeId =
    eventId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || "su-kien";
  const filename = `DiemDanh_${safeId}.csv`;

  if (Platform.OS === "web") {
    // Trên trình duyệt: tải file về máy, không dùng expo-sharing (URI nội bộ không được hỗ trợ).
    if (typeof document !== "undefined") {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } finally {
        // Không thu hồi ngay để trình duyệt kịp bắt đầu tải xuống.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    }
    return filename;
  }

  // Android/iOS: tạo file trên thiết bị rồi chia sẻ chính tệp đó (không phải text).
  const file = new File(Paths.document, filename);
  await file.write(csv);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Thiết bị không hỗ trợ chia sẻ tệp CSV.");
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    dialogTitle: `Lưu hoặc chia sẻ ${filename}`,
    UTI: "public.comma-separated-values-text",
  });
  return filename;
}
