/**
 * Vùng tòa nhà cho CHÍNH ảnh assets/campus-map-iuh.png (bản đồ phẳng 1448x1086).
 * Đơn vị là % của toàn bộ ảnh; đổi ảnh khác cần đo lại các vùng.
 * Sơ đồ định hướng tham khảo, không phải dữ liệu định vị GPS hay tầng thực tế.
 */
export type CampusBuildingCode =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "T"
  | "V"
  | "X";

export interface CampusRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CampusBuilding {
  code: CampusBuildingCode;
  label: string;
  note: string;
  /** Một tòa có thể gồm nhiều hình chữ nhật để bám đúng mặt bằng chữ L. */
  regions: readonly CampusRegion[];
}

export const CAMPUS_BUILDINGS: CampusBuilding[] = [
  {
    code: "A",
    label: "Nhà A / Hội trường A7",
    note: "Khu A màu đỏ nằm phía bên trái, gần cổng số 1 trên đường Nguyễn Văn Bảo. Nếu đến Hội trường A7, hãy kiểm tra biển chỉ dẫn trong nhà A.",
    regions: [
      { x: 18.9, y: 56.2, width: 11.4, height: 22.8 },
      { x: 12.4, y: 72.5, width: 6.5, height: 6.5 },
    ],
  },
  {
    code: "B",
    label: "Nhà B",
    note: "Khu B màu xanh đậm nằm phía trên nhà H, sát phía đường Nguyễn Thái Sơn và gần nhà V.",
    regions: [
      { x: 18.9, y: 23.4, width: 11.2, height: 24.6 },
      { x: 18.9, y: 15.3, width: 20.0, height: 8.1 },
    ],
  },
  {
    code: "C",
    label: "Nhà C",
    note: "Nhà C màu nâu nằm phía dưới nhà F, phía trên nhà G và bên trái nhà I. Từ cổng số 2, đi vào phía dãy nhà bên phải hầm xe trung tâm, rồi tìm khu C.",
    regions: [{ x: 60.8, y: 57.9, width: 9.8, height: 13.3 }],
  },
  {
    code: "D",
    label: "Nhà D",
    note: "Nhà D màu xanh lá nằm bên phải nhà E, dưới nhà X và phía trên nhà F.",
    regions: [{ x: 62.1, y: 31.6, width: 13.0, height: 13.8 }],
  },
  {
    code: "E",
    label: "Nhà E / Hội trường E4",
    note: "Nhà E màu hồng nằm giữa khuôn viên, ở phía trên hầm xe trung tâm và bên trái nhà D. Vui lòng xem chỉ dẫn bên trong để đến Hội trường E4.",
    regions: [{ x: 35.9, y: 33.0, width: 22.6, height: 14.4 }],
  },
  {
    code: "F",
    label: "Nhà F",
    note: "Nhà F màu đỏ nâu nằm ngay phía trên nhà C và nhà I, dưới cụm nhà D/T.",
    regions: [{ x: 60.8, y: 50.7, width: 21.0, height: 7.0 }],
  },
  {
    code: "G",
    label: "Nhà G",
    note: "Nhà G màu xanh dương ở góc dưới bên phải, phía dưới nhà C và nhà I, gần cổng số 3.",
    regions: [{ x: 60.8, y: 71.7, width: 21.0, height: 7.8 }],
  },
  {
    code: "H",
    label: "Nhà H",
    note: "Nhà H màu xanh lá sáng nằm giữa nhà A và nhà B, sát phía đường Nguyễn Thái Sơn.",
    regions: [{ x: 18.9, y: 48.5, width: 11.1, height: 7.5 }],
  },
  {
    code: "I",
    label: "Nhà I",
    note: "Nhà I màu xanh dương nhạt nằm bên phải nhà C, dưới nhà F và phía trên nhà G.",
    regions: [{ x: 70.9, y: 57.9, width: 10.8, height: 13.3 }],
  },
  {
    code: "T",
    label: "Nhà T",
    note: "Nhà T màu xanh đậm là dãy hẹp sát đường Lê Lợi, ở bên phải nhà D, gần cổng số 4.",
    regions: [{ x: 75.7, y: 28.5, width: 6.1, height: 22.1 }],
  },
  {
    code: "V",
    label: "Nhà V",
    note: "Nhà V màu xanh ngọc ở gần đường Nguyễn Văn Nghi, giữa nhà B và nhà X.",
    regions: [{ x: 39.0, y: 11.8, width: 21.2, height: 16.1 }],
  },
  {
    code: "X",
    label: "Nhà X",
    note: "Nhà X màu vàng ở góc trên bên phải, sát phía đường Nguyễn Văn Nghi và gần đường Lê Lợi.",
    regions: [
      { x: 62.7, y: 12.1, width: 19.4, height: 16.0 },
      { x: 58.7, y: 14.4, width: 4.0, height: 11.3 },
    ],
  },
];

export type IUHCampusId = "main" | "cs2" | "quang_ngai" | "thanh_hoa";

export interface IUHCampusInfo {
  id: IUHCampusId;
  name: string;
  shortName: string;
  badge: string;
  address: string;
  directionsUrl: string;
  mapsUrl: string;
  hasInternalMap: boolean;
  description: string;
  transportHint: string;
}

export const IUH_CAMPUSES: Record<IUHCampusId, IUHCampusInfo> = {
  main: {
    id: "main",
    name: "Trụ sở chính IUH (Cơ sở 1 - Gò Vấp)",
    shortName: "Trụ sở chính (12 Nguyễn Văn Bảo)",
    badge: "Trụ sở chính",
    address: "Số 12 Nguyễn Văn Bảo, Phường 4, Quận Gò Vấp, TP. Hồ Chí Minh",
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("Trường Đại học Công nghiệp TP.HCM, 12 Nguyễn Văn Bảo, Gò Vấp, TP. Hồ Chí Minh")}&dir_action=navigate`,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=10.822159,106.687483",
    hasInternalMap: true,
    description: "Khuôn viên chính gồm các dãy nhà A, B, C, D, E, F, G, H, I, T, V, X, trung tâm hội nghị và các phòng ban đào tạo.",
    transportHint: "Tuyến xe buýt: 07, 148, 03. Cổng 1 nằm trên đường Nguyễn Văn Bảo, Cổng 2 và Cổng 3 thông ra các trục đường nội khu.",
  },
  cs2: {
    id: "cs2",
    name: "ĐH Công nghiệp TP.HCM - Cơ sở 2 (Gò Vấp)",
    shortName: "Cơ sở 2 (20 Nguyễn Văn Dung)",
    badge: "Cơ sở 2",
    address: "Số 20 Nguyễn Văn Dung, Phường 6, Quận Gò Vấp, TP. Hồ Chí Minh",
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("Trường Đại học Công nghiệp TP.HCM - Cơ sở 2, 20 Nguyễn Văn Dung, Gò Vấp, TP. Hồ Chí Minh")}&dir_action=navigate`,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=10.844754,106.684128",
    hasInternalMap: false,
    description: "Trung tâm Giáo dục Thể chất, sân bóng đá cỏ nhân tạo, nhà thi đấu đa năng, trung tâm thực hành và ký túc xá sinh viên.",
    transportHint: "Cách trụ sở chính khoảng 3km, đi thẳng đường Nguyễn Oanh qua ngã tư Nguyễn Văn Lượng rồi rẽ vào Nguyễn Văn Dung.",
  },
  quang_ngai: {
    id: "quang_ngai",
    name: "ĐH Công nghiệp TP.HCM - Phân hiệu Quảng Ngãi",
    shortName: "Phân hiệu Quảng Ngãi",
    badge: "Phân hiệu Miền Trung",
    address: "Số 938 Quang Trung, TP. Quảng Ngãi, Tỉnh Quảng Ngãi",
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("Đại học Công nghiệp TP.HCM Phân hiệu Quảng Ngãi, 938 Quang Trung, TP. Quảng Ngãi")}&dir_action=navigate`,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=15.111874,108.795844",
    hasInternalMap: false,
    description: "Cơ sở đào tạo bậc đại học và sau đại học trọng điểm của IUH tại khu vực miền Trung - Tây Nguyên.",
    transportHint: "Nằm trên trục đường chính Quang Trung tại trung tâm TP. Quảng Ngãi, thuận tiện đón xe khách và xe buýt liên tỉnh.",
  },
  thanh_hoa: {
    id: "thanh_hoa",
    name: "ĐH Công nghiệp TP.HCM - Cơ sở Thanh Hóa",
    shortName: "Cơ sở Thanh Hóa",
    badge: "Cơ sở Miền Bắc",
    address: "Xã Quảng Tâm, TP. Thanh Hóa, Tỉnh Thanh Hóa",
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent("Đại học Công nghiệp TP.HCM Cơ sở Thanh Hóa, Xã Quảng Tâm, TP. Thanh Hóa")}&dir_action=navigate`,
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=19.761502,105.828699",
    hasInternalMap: false,
    description: "Cơ sở đào tạo phía Bắc của Trường ĐH Công nghiệp TP.HCM, phục vụ đào tạo và nghiên cứu khoa học.",
    transportHint: "Nằm trên tuyến Quốc lộ 47, gần đường tránh TP. Thanh Hóa, kết nối trực tiếp với trung tâm thành phố và bến xe.",
  },
};

export interface ResolvedCampusLocation {
  campus: IUHCampusInfo;
  code: CampusBuildingCode | null;
  room: string | null;
  floorHint: string | null;
  warning: string | null;
  aiExplanation?: string;
}

const BUILDING_CODE_PATTERN = "[A-ITVX]";
// Có tiền tố "Phòng", "Nhà", "Hội trường" ... để không nhận nhầm tên CLB.
const LABELED_BUILDING = new RegExp(
  `\\b(?:NHA|TOA|KHU|PHONG|LAB|HOI TRUONG|GIANG DUONG|SANH NHA|SANH)\\s+(${BUILDING_CODE_PATTERN})(?=[0-9\\s.,/()\\-]|$)`,
);
const ROOM_PATTERN = new RegExp(
  `\\b(?:PHONG|LAB)\\s+(${BUILDING_CODE_PATTERN})(\\d{1,2})(?:[.\\-/](\\d{1,3}))?\\b`,
);
const STANDALONE_ROOM = new RegExp(
  `\\b(${BUILDING_CODE_PATTERN})(\\d{1,2})[.\\-/](\\d{1,3})\\b`,
);

function stripDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function resolveCampusLocation(
  locationName: string,
  extraContext?: string,
): ResolvedCampusLocation {
  const fullText = `${locationName} ${extraContext || ""}`.trim();
  const normalizedLower = stripDiacritics(fullText);
  const normalizedUpper = fullText
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase();

  // 1. Phân hiệu Quảng Ngãi
  if (normalizedLower.includes("quang ngai") || normalizedLower.includes("938 quang trung")) {
    return {
      campus: IUH_CAMPUSES.quang_ngai,
      code: null,
      room: null,
      floorHint: null,
      warning: null,
      aiExplanation: "AI phân tích địa điểm sự kiện thuộc Phân hiệu Quảng Ngãi (938 Quang Trung).",
    };
  }

  // 2. Cơ sở Thanh Hóa
  if (normalizedLower.includes("thanh hoa") || normalizedLower.includes("quang tam")) {
    return {
      campus: IUH_CAMPUSES.thanh_hoa,
      code: null,
      room: null,
      floorHint: null,
      warning: null,
      aiExplanation: "AI phân tích địa điểm sự kiện thuộc Cơ sở Thanh Hóa (Quảng Tâm).",
    };
  }

  // 3. Cơ sở 2 (20 Nguyễn Văn Dung, Gò Vấp)
  if (
    normalizedLower.includes("co so 2") ||
    normalizedLower.includes("cs2") ||
    normalizedLower.includes("nguyen van dung") ||
    normalizedLower.includes("san bong") ||
    normalizedLower.includes("san van dong") ||
    normalizedLower.includes("giao duc the chat")
  ) {
    return {
      campus: IUH_CAMPUSES.cs2,
      code: null,
      room: null,
      floorHint: null,
      warning: null,
      aiExplanation: "AI phân tích địa điểm sự kiện thuộc Cơ sở 2 (20 Nguyễn Văn Dung, Gò Vấp) - Khu giáo dục thể chất & thể thao.",
    };
  }

  // 4. Trụ sở chính (12 Nguyễn Văn Bảo, Gò Vấp)
  const roomMatch = ROOM_PATTERN.exec(normalizedUpper);
  const labeledMatch = LABELED_BUILDING.exec(normalizedUpper);
  const standaloneMatch = STANDALONE_ROOM.exec(normalizedUpper);
  const code = (labeledMatch?.[1] ??
    roomMatch?.[1] ??
    standaloneMatch?.[1] ??
    null) as CampusBuildingCode | null;

  const validCode = code && CAMPUS_BUILDINGS.some((b) => b.code === code) ? code : null;
  const matchedRoom = roomMatch ?? standaloneMatch;
  const room = matchedRoom
    ? locationName.slice(
        matchedRoom.index,
        matchedRoom.index + matchedRoom[0].length,
      )
    : null;
  const floorNumber = matchedRoom?.[2] ? Number(matchedRoom[2]) : null;
  const floorHint =
    floorNumber !== null
      ? `Tầng ${floorNumber} (suy ra từ mã phòng, hãy đối chiếu tại tòa nhà)`
      : null;

  const warning = !validCode
    ? "Chưa xác định được cụ thể tòa nhà từ địa điểm sự kiện. Hệ thống gợi ý điều hướng đến cổng Trụ sở chính IUH."
    : null;

  const aiExplanation = validCode
    ? `AI phân tích địa điểm sự kiện thuộc Trụ sở chính IUH (12 Nguyễn Văn Bảo) - Nhà ${validCode}${room ? `, Phòng ${room}` : ""}.`
    : "AI phân tích sự kiện diễn ra tại Trụ sở chính IUH (12 Nguyễn Văn Bảo, Gò Vấp).";

  return {
    campus: IUH_CAMPUSES.main,
    code: validCode,
    room,
    floorHint,
    warning,
    aiExplanation,
  };
}
