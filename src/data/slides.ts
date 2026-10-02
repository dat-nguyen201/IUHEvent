export interface Slide {
  id: string;
  title: string;
  description: string;
  image: any; 
}

export const slides: Slide[] = [
  {
    id: '1',
    title: 'Khám phá Sự kiện',
    description: 'Bắt trọn mọi sự kiện sinh viên nóng hổi nhất quanh khuôn viên trường. Mọi hoạt động từ hội thảo, CLB đến giải trí đều nằm gọn trong túi bạn.',
    image: require('../IMG/anh01.png'),
  },
  {
    id: '2',
    title: 'Quản lý Lịch thông minh',
    description: 'Lên lịch cá nhân tự động, đồng bộ hoàn hảo. Nhắc nhở trước giờ G để bạn luôn sẵn sàng và không bỏ lỡ bất kỳ khoảnh khắc nào.',
    image: require('../IMG/anh02.png'),
  },
  {
    id: '3',
    title: 'Check-in Mã QR Nhanh chóng',
    description: 'Quét mã QR để điểm danh tức thì. Tạm biệt tình trạng xếp hàng dài mệt mỏi, an toàn và chống check-in giả mạo tuyệt đối.',
    image: require('../IMG/anh03.png'),
  },
  {
    id: '4',
    title: 'AI Trợ lý Quyền năng',
    description: 'Không cần ghi chép! AI sẽ tự động phân tích và tóm tắt toàn bộ nội dung cốt lõi của sự kiện để bạn tra cứu nhanh chóng.',
    image: require('../IMG/anh04.png'),
  }
];
