import { ImageSourcePropType } from 'react-native';

export type OrganizerType = 'faculty' | 'union' | 'club' | 'center';

export interface Organizer {
  id: string;
  name: string;
  shortName: string;
  type: OrganizerType;
  typeLabel: string;
  description: string;
  logo: ImageSourcePropType;
  coverImage?: ImageSourcePropType;
  eventCount: number;
  followerCount: number;
  contactEmail?: string;
  phone?: string;
  location?: string;
  isVerified: boolean;
  color: string;
}

export const organizers: Organizer[] = [
  {
    id: 'org-fit',
    name: 'Khoa Công nghệ thông tin',
    shortName: 'Khoa CNTT - FIT',
    type: 'faculty',
    typeLabel: 'Khoa chuyên ngành',
    description: 'Khoa Công nghệ Thông tin IUH đào tạo kỹ sư công nghệ chất lượng cao, thường xuyên tổ chức hội thảo công nghệ, hackathon và giải đấu IT.',
    logo: require('../../assets/images/organizers/fit_iuh.png'),
    eventCount: 8,
    followerCount: 4250,
    contactEmail: 'fit@iuh.edu.vn',
    location: 'Lầu 2 Nhà H, IUH',
    isVerified: true,
    color: '#0D6EFD',
  },
  {
    id: 'org-doan',
    name: 'Đoàn Thanh niên IUH',
    shortName: 'Đoàn trường IUH',
    type: 'union',
    typeLabel: 'Tổ chức Đoàn thể',
    description: 'Đoàn Thanh niên Trường ĐH Công nghiệp TP.HCM phụ trách phong trào rèn luyện, ngày hội văn hóa, phát triển kỹ năng toàn diện cho sinh viên.',
    logo: require('../../assets/images/organizers/doan_thanh_nien.png'),
    eventCount: 15,
    followerCount: 9800,
    contactEmail: 'doantn@iuh.edu.vn',
    location: 'Văn phòng Đoàn Nhà V, IUH',
    isVerified: true,
    color: '#DC3545',
  },
  {
    id: 'org-hsv',
    name: 'Hội Sinh viên IUH',
    shortName: 'Hội Sinh viên',
    type: 'union',
    typeLabel: 'Hội Sinh viên',
    description: 'Cơ quan đại diện và chăm lo đời sống, học tập, các hoạt động thiện nguyện, phong trào Sinh viên 5 tốt của trường.',
    logo: require('../../assets/images/organizers/hoi_sinh_vien.png'),
    eventCount: 12,
    followerCount: 8600,
    contactEmail: 'hoisinhvien@iuh.edu.vn',
    location: 'Văn phòng Hội SV Nhà V, IUH',
    isVerified: true,
    color: '#0088CC',
  },
  {
    id: 'org-ctxh',
    name: 'Đội Công tác xã hội',
    shortName: 'Đội CTXH IUH',
    type: 'club',
    typeLabel: 'CLB - Đội nhóm',
    description: 'Tập hợp những bạn trẻ giàu lòng nhiệt huyết, chuyên tổ chức chiến dịch Chủ nhật xanh, Mùa hè xanh, hiến máu và thăm trẻ em vùng cao.',
    logo: require('../../assets/images/organizers/doi_ctxh.png'),
    eventCount: 6,
    followerCount: 3100,
    contactEmail: 'ctxh@iuh.edu.vn',
    location: 'Sân nhà A, IUH',
    isVerified: true,
    color: '#198754',
  },
  {
    id: 'org-tienganh',
    name: 'CLB Tiếng Anh IUH',
    shortName: 'English Speaking Club',
    type: 'club',
    typeLabel: 'CLB Học thuật',
    description: 'Môi trường rèn luyện giao tiếp tiếng Anh tự tin, năng động với các chủ đề campus life, debate và săn học bổng quốc tế.',
    logo: require('../../assets/images/organizers/clb_tienganh.png'),
    eventCount: 5,
    followerCount: 2900,
    contactEmail: 'iec.club@iuh.edu.vn',
    location: 'Phòng C3.02, IUH',
    isVerified: true,
    color: '#6F42C1',
  },
  {
    id: 'org-guitar',
    name: 'CLB Âm nhạc & Guitar IUH',
    shortName: 'CLB Guitar IUH',
    type: 'club',
    typeLabel: 'CLB Nghệ thuật',
    description: 'Sân khấu âm nhạc mở cho sinh viên yêu ca hát, nhạc cụ giao lưu, biểu diễn acoustic hàng tuần và tham gia các show văn nghệ lớn.',
    logo: require('../../assets/images/organizers/clb_guitar.png'),
    eventCount: 7,
    followerCount: 3800,
    contactEmail: 'guitar.iuh@gmail.com',
    location: 'Sân KTX IUH',
    isVerified: true,
    color: '#FD7E14',
  },
  {
    id: 'org-qhdn',
    name: 'Trung tâm Quan hệ doanh nghiệp',
    shortName: 'Trung tâm QHDN',
    type: 'center',
    typeLabel: 'Trung tâm hợp tác',
    description: 'Cầu nối giữa sinh viên và các tập đoàn lớn, mang lại cơ hội thực tập, ngày hội việc làm và các buổi talkshow định hướng sự nghiệp.',
    logo: require('../../assets/images/organizers/tt_qhdn.png'),
    eventCount: 9,
    followerCount: 6500,
    contactEmail: 'qhdn@iuh.edu.vn',
    location: 'Tầng trệt Nhà E, IUH',
    isVerified: true,
    color: '#20C997',
  },
  {
    id: 'org-iuh',
    name: 'Trường ĐH Công nghiệp TP.HCM',
    shortName: 'IUH - Ban Giám hiệu',
    type: 'faculty',
    typeLabel: 'Nhà trường',
    description: 'Các sự kiện trọng điểm cấp trường, lễ khai giảng, tốt nghiệp và ngày hội truyền thống 70 năm thành lập IUH.',
    logo: require('@/IMG/logo.png'),
    eventCount: 18,
    followerCount: 15400,
    contactEmail: 'iuh@iuh.edu.vn',
    location: 'Số 12 Nguyễn Văn Bảo, Gò Vấp, TP.HCM',
    isVerified: true,
    color: '#0A58CA',
  },
];

export function getOrganizerByName(name: string): Organizer | undefined {
  const normalized = name.toLowerCase().trim();
  return organizers.find(
    (org) =>
      org.name.toLowerCase().includes(normalized) ||
      normalized.includes(org.name.toLowerCase()) ||
      org.shortName.toLowerCase().includes(normalized) ||
      normalized.includes(org.shortName.toLowerCase())
  );
}

export function getOrganizerLogo(name: string): ImageSourcePropType {
  const org = getOrganizerByName(name);
  if (org) return org.logo;
  return require('@/IMG/logo.png');
}
