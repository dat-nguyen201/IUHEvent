import React, { useState } from 'react';
import { Alert, Image, Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@tamagui/core';
import type { StudentEvent } from '@/types/events';
import type { AuthUser } from '@/types/auth';
import { EventCertificateModal } from '@/components/EventCertificateModal';

interface AttendancePassModalProps {
  visible: boolean;
  event?: StudentEvent;
  user?: AuthUser | null;
  checkedInAt?: string;
  isAlreadyCheckedIn?: boolean;
  onClose: () => void;
  onViewEvent?: () => void;
}

export function AttendancePassModal({
  visible,
  event,
  user,
  checkedInAt,
  isAlreadyCheckedIn = false,
  onClose,
  onViewEvent,
}: AttendancePassModalProps) {
  const theme = useTheme();
  const [showCertModal, setShowCertModal] = useState(false);

  if (!event) return null;

  const displayTime = checkedInAt
    ? checkedInAt
    : new Intl.DateTimeFormat('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date());

  const handleSharePass = async () => {
    try {
      await Share.share({
        title: `Chứng nhận Điểm danh IUH - ${event.title}`,
        message: `🎓 [XÁC NHẬN ĐIỂM DANH IUH EVENT]\n\nSinh viên: ${user?.name || 'Sinh viên IUH'} (MSSV: ${user?.studentId || '21000001'})\nĐã tham gia & điểm danh thành công sự kiện:\n📌 ${event.title}\n📍 Địa điểm: ${event.location}\n⏱ Thời gian ghi nhận: ${displayTime}\n🏆 Điểm rèn luyện: +5 điểm ĐRL\n\nChứng nhận chính thức từ Trường Đại học Công nghiệp TP.HCM (IUH).`,
      });
    } catch {
      // ignore
    }
  };

  const handleSaveToPhotos = () => {
    Alert.alert(
      "Đã lưu thẻ minh chứng",
      "Thẻ điểm danh điện tử của bạn đã được ghi nhận vào lịch sử cá nhân. Bạn có thể mở lại thẻ hoặc chia sẻ bất kỳ lúc nào!",
      [{ text: "Đã hiểu" }]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.ticketContainer, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
          {/* Top Decorative Header */}
          <LinearGradient
            colors={isAlreadyCheckedIn ? ['#1E293B', '#334155'] : ['#0D6EFD', '#0B5ED7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ticketHeader}
          >
            <View style={styles.univRow}>
              <View style={styles.univLogoWrap}>
                <Image source={require('@/IMG/logo.png')} style={styles.univLogo} resizeMode="contain" />
              </View>
              <View style={styles.univTextWrap}>
                <Text style={styles.univTitle}>TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP TP.HCM</Text>
                <Text style={styles.passType}>
                  {isAlreadyCheckedIn ? 'XÁC NHẬN ĐÃ ĐIỂM DANH TRƯỚC ĐÓ' : 'THẺ XÁC NHẬN ĐIỂM DANH ĐIỆN TỬ'}
                </Text>
              </View>
            </View>

            {/* Stamp Badge */}
            <View style={styles.verifiedStamp}>
              <Ionicons
                name={isAlreadyCheckedIn ? 'shield-checkmark' : 'checkmark-circle'}
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.verifiedStampText}>
                {isAlreadyCheckedIn ? 'ĐÃ ĐIỂM DANH' : 'XÁC THỰC THÀNH CÔNG'}
              </Text>
            </View>
          </LinearGradient>

          {/* Ticket Body */}
          <View style={styles.ticketBody}>
            {/* Event Name */}
            <View style={styles.eventSection}>
              <Text style={[styles.eventCategory, { color: theme.primary.val }]}>{event.category.toUpperCase()}</Text>
              <Text style={[styles.eventTitle, { color: theme.color.val }]} numberOfLines={2}>
                {event.title}
              </Text>
              <Text style={[styles.organizerText, { color: theme.muted.val }]}>
                Đơn vị tổ chức: {event.organizer || 'Trường ĐH Công nghiệp TP.HCM'}
              </Text>
            </View>

            {/* Separator Line with Cutouts */}
            <View style={styles.dashedSeparatorWrap}>
              <View style={[styles.cutoutLeft, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} />
              <View style={[styles.dashedLine, { borderColor: theme.border.val }]} />
              <View style={[styles.cutoutRight, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} />
            </View>

            {/* Student & Check-in Details Grid */}
            <View style={[styles.detailsBox, { backgroundColor: theme.background.val, borderColor: theme.border.val }]}>
              <View style={styles.detailRow}>
                <View style={styles.detailCol}>
                  <Text style={[styles.detailLabel, { color: theme.muted.val }]}>SINH VIÊN</Text>
                  <Text style={[styles.detailValue, { color: theme.color.val }]} numberOfLines={1}>
                    {user?.name || 'Sinh viên IUH'}
                  </Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={[styles.detailLabel, { color: theme.muted.val }]}>MÃ SỐ SINH VIÊN</Text>
                  <Text style={[styles.detailValue, { color: theme.color.val }]}>
                    {user?.studentId || '21000001'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailCol}>
                  <Text style={[styles.detailLabel, { color: theme.muted.val }]}>ĐỊA ĐIỂM</Text>
                  <Text style={[styles.detailValue, { color: theme.color.val }]} numberOfLines={1}>
                    📍 {event.location}
                  </Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={[styles.detailLabel, { color: theme.muted.val }]}>THỜI GIAN GHI NHẬN</Text>
                  <Text style={[styles.detailValue, { color: '#10B981' }]}>
                    ⏱ {displayTime}
                  </Text>
                </View>
              </View>

              {/* Training Points Reward */}
              <View style={styles.pointsPill}>
                <Ionicons name="ribbon-outline" size={16} color="#B45309" />
                <Text style={styles.pointsText}>+5 Điểm rèn luyện (ĐRL) đã được ghi nhận</Text>
              </View>
            </View>

            {/* Certificate Button */}
            <Pressable
              style={[styles.certButton, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
              onPress={() => setShowCertModal(true)}
              accessibilityRole="button"
            >
              <Ionicons name="ribbon" size={17} color="#B45309" />
              <Text style={styles.certButtonText}>Xem Giấy chứng nhận điện tử (E-Certificate)</Text>
            </Pressable>

            {/* Quick Share / Save Tools */}
            <View style={styles.toolsRow}>
              <Pressable
                style={[styles.toolBtn, { backgroundColor: theme.background.val, borderColor: theme.border.val }]}
                onPress={handleSaveToPhotos}
                accessibilityRole="button"
              >
                <Ionicons name="camera-outline" size={16} color={theme.color.val} />
                <Text style={[styles.toolBtnText, { color: theme.color.val }]}>Lưu thẻ</Text>
              </Pressable>

              <Pressable
                style={[styles.toolBtn, { backgroundColor: theme.background.val, borderColor: theme.border.val }]}
                onPress={() => void handleSharePass()}
                accessibilityRole="button"
              >
                <Ionicons name="share-social-outline" size={16} color={theme.color.val} />
                <Text style={[styles.toolBtnText, { color: theme.color.val }]}>Chia sẻ minh chứng</Text>
              </Pressable>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              {onViewEvent && (
                <Pressable
                  style={[styles.outlineBtn, { borderColor: theme.border.val }]}
                  onPress={onViewEvent}
                  accessibilityRole="button"
                >
                  <Ionicons name="information-circle-outline" size={18} color={theme.color.val} />
                  <Text style={[styles.outlineBtnText, { color: theme.color.val }]}>Chi tiết sự kiện</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.confirmBtn, { backgroundColor: theme.primary.val }]}
                onPress={onClose}
                accessibilityRole="button"
              >
                <Text style={styles.confirmBtnText}>Hoàn tất</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <EventCertificateModal
        visible={showCertModal}
        event={event}
        user={user}
        checkedInAt={displayTime}
        onClose={() => setShowCertModal(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  ticketContainer: {
    width: '100%',
    maxWidth: 370,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  ticketHeader: {
    padding: 18,
    gap: 12,
  },
  univRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  univLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  univLogo: {
    width: '100%',
    height: '100%',
  },
  univTextWrap: {
    flex: 1,
    gap: 2,
  },
  univTitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  passType: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  verifiedStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  verifiedStampText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ticketBody: {
    padding: 18,
    gap: 14,
  },
  eventSection: {
    gap: 4,
  },
  eventCategory: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
  },
  organizerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dashedSeparatorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  cutoutLeft: {
    position: 'absolute',
    left: -26,
    width: 16,
    height: 24,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 2,
  },
  cutoutRight: {
    position: 'absolute',
    right: -26,
    width: 16,
    height: 24,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    zIndex: 2,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  detailsBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailCol: {
    flex: 1,
    gap: 3,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  pointsText: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '800',
  },
  certButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  certButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
  },
  toolBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
  },
  outlineBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  confirmBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 14,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
