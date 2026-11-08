/** Tạo file CSV trên trình duyệt (Web): tải file về máy. */
export async function exportAttendanceCsvFile(
  csv: string,
  eventId: string,
): Promise<string> {
  const safeId =
    eventId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || "su-kien";
  const filename = `DiemDanh_${safeId}.csv`;

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
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  }
  return filename;
}
