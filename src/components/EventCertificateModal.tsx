import React from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@tamagui/core';

import { QRCodeView } from '@/components/QRCodeView';
import type { StudentEvent } from '@/types/events';
import type { AuthUser } from '@/types/auth';

interface EventCertificateModalProps {
  visible: boolean;
  event?: StudentEvent;
  user?: AuthUser | null;
  checkedInAt?: string;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export function EventCertificateModal({
  visible,
  event,
  user,
  checkedInAt,
  onClose,
}: EventCertificateModalProps) {
  const theme = useTheme();

  if (!event) return null;

  const studentName = user?.name || 'Sinh viên IUH';
  const studentId = user?.studentId || '21000001';
  const studentMajor = user?.major || 'Khoa Công nghệ Thông tin';

  const issueDate = checkedInAt
    ? checkedInAt
    : new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date());

  const certNumber = `IUH-${new Date().getFullYear()}-CERT-${(event.id || 'EVT').toUpperCase()}-${studentId.slice(-4)}`;
  const qrValidationUrl = `https://iuh.edu.vn/verify-cert?id=${certNumber}&student=${studentId}`;

  const handleShareCertificate = async () => {
    try {
      await Share.share({
        title: `Giấy chứng nhận IUH - ${event.title}`,
        message: `📜 [GIẤY CHỨNG NHẬN THAM GIA HOẠT ĐỘNG PHONG TRÀO]\n\n🎓 TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP TP.HCM\nChứng nhận sinh viên: ${studentName}\nMSSV: ${studentId} - ${studentMajor}\n\nĐã tham gia và hoàn thành tốt sự kiện:\n📌 "${event.title}"\n🏛 Đơn vị tổ chức: ${event.organizer}\n⏱ Ngày ghi nhận: ${issueDate}\n🏆 Điểm rèn luyện: +5 điểm ĐRL\n\nMã xác thực: ${certNumber}\nTra cứu tính hợp lệ: ${qrValidationUrl}`,
      });
    } catch {
      // ignore
    }
  };

  const handleDownloadCertificate = () => {
    Alert.alert(
      'Chứng nhận điện tử đã lưu',
      `Giấy chứng nhận mã số ${certNumber} đã được ghi nhận an toàn trên hồ sơ rèn luyện điện tử của bạn. Bạn có thể xuất trình hoặc chia sẻ trực tiếp bất cứ lúc nào!`,
      [{ text: 'Tuyệt vời' }]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: '#FFFDF9' }]}>
          {/* Header Controls */}
          <View style={styles.topControlBar}>
            <View style={styles.certBadgePill}>
              <Ionicons name="ribbon" size={14} color="#D97706" />
              <Text style={styles.certBadgePillText}>CHỨNG NHẬN ĐIỆN TỬ CHÍNH THỨC</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <Ionicons name="close" size={20} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* The Certificate Frame */}
            <View style={styles.outerFrame}>
              <View style={styles.innerFrame}>
                {/* Corner Ornaments */}
                <Text style={[styles.cornerOrnament, styles.topLeft]}>❖</Text>
                <Text style={[styles.cornerOrnament, styles.topRight]}>❖</Text>
                <Text style={[styles.cornerOrnament, styles.bottomLeft]}>❖</Text>
                <Text style={[styles.cornerOrnament, styles.bottomRight]}>❖</Text>

                {/* National Header */}
                <View style={styles.nationalHeader}>
                  <Text style={styles.nationalTitle}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
                  <Text style={styles.nationalMotto}>Độc lập - Tự do - Hạnh phúc</Text>
                  <View style={styles.mottoDivider} />
                </View>

                {/* University Logo & Header */}
                <View style={styles.univSection}>
                  <Image source={require('@/IMG/logo.png')} style={styles.univLogo} resizeMode="contain" />
                  <Text style={styles.univName}>TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP TP. HỒ CHÍ MINH</Text>
                  <Text style={styles.unionName}>ĐOÀN THANH NIÊN - HỘI SINH VIÊN</Text>
                </View>

                {/* Certificate Main Title */}
                <View style={styles.titleSection}>
                  <Text style={styles.certMainTitle}>GIẤY CHỨNG NHẬN</Text>
                  <Text style={styles.certSubtitle}>THAM GIA HOẠT ĐỘNG PHONG TRÀO</Text>
                </View>

                {/* Awarded to Section */}
                <View style={styles.awardSection}>
                  <Text style={styles.awardIntro}>Chứng nhận trao tặng cho:</Text>
                  <Text style={styles.studentNameText}>{studentName.toUpperCase()}</Text>
                  <View style={styles.studentMetaRow}>
                    <Text style={styles.metaLabel}>MSSV: <Text style={styles.metaVal}>{studentId}</Text></Text>
                    <Text style={styles.metaDivider}>•</Text>
                    <Text style={styles.metaLabel}>Khoa: <Text style={styles.metaVal}>{studentMajor}</Text></Text>
                  </View>
                </View>

                {/* Event Description */}
                <View style={styles.eventSection}>
                  <Text style={styles.eventIntro}>Đã tích cực tham gia và hoàn thành tốt sự kiện:</Text>
                  <Text style={styles.eventTitleText}>"{event.title}"</Text>
                  <Text style={styles.eventOrganizerText}>Đơn vị tổ chức: {event.organizer}</Text>
                </View>

                {/* DRL Points Highlight Ribbon */}
                <LinearGradient
                  colors={['#FEF3C7', '#FDE68A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.drlBanner}
                >
                  <Ionicons name="medal" size={20} color="#D97706" />
                  <Text style={styles.drlBannerText}>Ghi nhận: <Text style={styles.drlBannerBold}>+5 Điểm Rèn Luyện (ĐRL)</Text></Text>
                </LinearGradient>

                {/* Footer Validation & Stamp */}
                <View style={styles.footerSection}>
                  {/* Left: QR Code & Verification */}
                  <View style={styles.qrCol}>
                    <View style={styles.qrBox}>
                      <QRCodeView value={qrValidationUrl} size={64} />
                    </View>
                    <Text style={styles.qrCertNo}>{certNumber}</Text>
                    <Text style={styles.qrDate}>Ngày cấp: {issueDate}</Text>
                  </View>

                  {/* Right: Signature & Stamp */}
                  <View style={styles.stampCol}>
                    <Text style={styles.stampDate}>TP.HCM, ngày {issueDate}</Text>
                    <Text style={styles.stampAuthority}>TM. BAN CHẤP HÀNH ĐOÀN TRƯỜNG</Text>
                    <View style={styles.stampMarkWrap}>
                      <View style={styles.digitalStampSeal}>
                        <Ionicons name="shield-checkmark" size={16} color="#DC2626" />
                        <Text style={styles.stampSealText}>ĐÃ XÁC THỰC SỐ</Text>
                      </View>
                    </View>
                    <Text style={styles.signatureName}>BCH ĐOÀN - HỘI IUH</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Buttons Below Frame */}
            <View style={styles.actionRow}>
              <Pressable
                onPress={handleShareCertificate}
                style={[styles.btnAction, styles.btnShare]}
              >
                <Ionicons name="share-social-outline" size={18} color="#0D6EFD" />
                <Text style={styles.btnShareText}>Chia sẻ chứng nhận</Text>
              </Pressable>

              <Pressable
                onPress={handleDownloadCertificate}
                style={[styles.btnAction, styles.btnDownload]}
              >
                <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                <Text style={styles.btnDownloadText}>Lưu về máy</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: Math.min(width - 24, 460),
    maxHeight: '92%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  topControlBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  certBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  certBadgePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  outerFrame: {
    borderWidth: 3,
    borderColor: '#D97706',
    borderRadius: 8,
    padding: 5,
    backgroundColor: '#FFFFFF',
  },
  innerFrame: {
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#FFFDF9',
  },
  cornerOrnament: {
    position: 'absolute',
    fontSize: 16,
    color: '#D97706',
    fontWeight: 'bold',
  },
  topLeft: { top: 4, left: 6 },
  topRight: { top: 4, right: 6 },
  bottomLeft: { bottom: 4, left: 6 },
  bottomRight: { bottom: 4, right: 6 },

  nationalHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  nationalTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  nationalMotto: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
    marginTop: 1,
  },
  mottoDivider: {
    width: 60,
    height: 1,
    backgroundColor: '#D97706',
    marginTop: 3,
  },

  univSection: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  univLogo: {
    width: 48,
    height: 48,
    marginBottom: 2,
  },
  univName: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  unionName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0D6EFD',
    letterSpacing: 0.5,
  },

  titleSection: {
    alignItems: 'center',
    marginVertical: 8,
  },
  certMainTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 1.5,
  },
  certSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  awardSection: {
    alignItems: 'center',
    marginVertical: 8,
    width: '100%',
  },
  awardIntro: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#64748B',
  },
  studentNameText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 4,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  studentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  metaVal: {
    fontWeight: '700',
    color: '#1E293B',
  },
  metaDivider: {
    fontSize: 10,
    color: '#CBD5E1',
  },

  eventSection: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    marginVertical: 8,
  },
  eventIntro: {
    fontSize: 11,
    color: '#475569',
  },
  eventTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D6EFD',
    textAlign: 'center',
    marginVertical: 3,
  },
  eventOrganizerText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },

  drlBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  drlBannerText: {
    fontSize: 12,
    color: '#92400E',
  },
  drlBannerBold: {
    fontWeight: '900',
    color: '#B45309',
  },

  footerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  qrCol: {
    alignItems: 'flex-start',
    gap: 2,
  },
  qrBox: {
    padding: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrCertNo: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 3,
  },
  qrDate: {
    fontSize: 9,
    color: '#94A3B8',
  },

  stampCol: {
    alignItems: 'center',
  },
  stampDate: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#64748B',
  },
  stampAuthority: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
    textAlign: 'center',
  },
  stampMarkWrap: {
    marginVertical: 4,
  },
  digitalStampSeal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#FEF2F2',
  },
  stampSealText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  signatureName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnAction: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnShare: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  btnShareText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D6EFD',
  },
  btnDownload: {
    backgroundColor: '#0D6EFD',
  },
  btnDownloadText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
