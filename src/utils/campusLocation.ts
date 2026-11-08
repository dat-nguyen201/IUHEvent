/**
 * Chỉ dẫn khuôn viên IUH theo sơ đồ ảnh do người dùng cung cấp.
 * Vùng đánh dấu là ước lượng trên ảnh (không phải tọa độ GPS).
 * Cần đối chiếu lại với sơ đồ chính thức trước khi triển khai rộng rãi.
 */
export type CampusBuildingCode = 'A' | 'B' | 'D' | 'E' | 'F' | 'G' | 'H' | 'V' | 'X' | 'T';

export interface CampusBuilding {
  code: CampusBuildingCode;
  label: string;
  note: string;
  /** Tỷ lệ phần trăm so với toàn bộ ảnh 2048 × 1536. */
  region: { x: number; y: number; width: number; height: number };
}

export const CAMPUS_BUILDINGS: CampusBuilding[] = [
  { code: 'A', label: 'Nhà A / Hội trường A7', note: 'Tìm khu nhà A phía đường Nguyễn Văn Bảo; hội trường A7 được thể hiện ở phía trái sơ đồ.', region: { x: 18, y: 31, width: 18, height: 22 } },
  { code: 'H', label: 'Nhà H', note: 'Nhà H nằm phía sau khu A trên sơ đồ. Kiểm tra số tầng và phòng trên biển chỉ dẫn khi đến nơi.', region: { x: 30, y: 21, width: 13, height: 27 } },
  { code: 'B', label: 'Nhà B', note: 'Nhà B nằm ở phía trong, gần nhà H và phía sau khu nhà xe trung tâm.', region: { x: 41, y: 24, width: 13, height: 22 } },
  { code: 'V', label: 'Nhà V', note: 'Nhà V là tòa nhà cao ở phía trên, gần trung tâm sơ đồ.', region: { x: 51, y: 13, width: 16, height: 28 } },
  { code: 'E', label: 'Nhà E / Hội trường E4', note: 'Khu E nằm trước nhà V và bên cạnh nhà xe trung tâm. Hỏi nhân viên nếu cần tìm hội trường E4.', region: { x: 47, y: 34, width: 13, height: 22 } },
  { code: 'D', label: 'Nhà D', note: 'Khu D ở phía bên phải sơ đồ, cạnh cụm nhà X.', region: { x: 61, y: 33, width: 13, height: 25 } },
  { code: 'X', label: 'Nhà X', note: 'Nhà X nằm sát phía đường Lê Lợi, về phía bên phải khuôn viên trong sơ đồ.', region: { x: 70, y: 27, width: 18, height: 30 } },
  { code: 'F', label: 'Nhà F', note: 'Khu F nằm phía dưới và trước nhà D trên sơ đồ.', region: { x: 62, y: 46, width: 10, height: 17 } },
  { code: 'G', label: 'Nhà G', note: 'Khu G nằm gần cổng 3, trên dãy nhà phía dưới sơ đồ.', region: { x: 48, y: 52, width: 13, height: 20 } },
  { code: 'T', label: 'Nhà T', note: 'Nhà T nằm ở phía bên phải, gần đường Lê Lợi và khu X.', region: { x: 68, y: 52, width: 10, height: 19 } },
];

export interface ResolvedCampusLocation {
  code: CampusBuildingCode | null;
  room: string | null;
  floorHint: string | null;
  warning: string | null;
}

export function resolveCampusLocation(locationName: string): ResolvedCampusLocation {
  // Bỏ dấu tiếng Việt để nhận được cả "Phòng C3.02", "Nha H", "Hội trường E4".
  const normalized = locationName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  const upper = normalized.toUpperCase();
  const result = upper.match(/\b(?:NHA|TOA|PHONG|LAB|HOI TRUONG|SANH NHA)\s+([ABCDEFGHVXT])(?=[0-9\s.,/-]|$)/);
  if (!result) {
    return {
      code: null,
      room: null,
      floorHint: null,
      warning: 'Địa điểm này chưa được xác định chính xác trên ảnh sơ đồ. Bạn có thể chọn một tòa nhà để xem khu vực tham khảo hoặc liên hệ ban tổ chức.',
    };
  }

  const code = result[1] as CampusBuildingCode | 'C';
  // Ảnh tham khảo không có nhãn C rõ ràng: không đưa ra vị trí đoán.
  if (code === 'C') {
    return {
      code: null,
      room: null,
      floorHint: null,
      warning: 'Ảnh sơ đồ này chưa thể hiện rõ khu C. Vui lòng xác nhận vị trí nhà C với ban tổ chức hoặc bảo vệ của trường.',
    };
  }

  const roomMatch = upper.match(/\b(?:PHONG|LAB)\s+[A-Z]\d+(?:\.\d+)?\b/);
  const roomStart = roomMatch?.index ?? -1;
  const room = roomMatch && roomStart >= 0 ? locationName.slice(roomStart, roomStart + roomMatch[0].length) : null;
  const floorMatch = roomMatch?.[0].match(/\b[A-Z](\d+)\./);
  const floorHint = floorMatch ? `Tầng ${Number(floorMatch[1])} (suy ra từ mã phòng; vui lòng kiểm tra tại tòa nhà)` : null;
  return { code, room, floorHint, warning: null };
}
