import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/app-theme';

type ReminderModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectOption: (minutesBefore: number, isDemoNow?: boolean) => void;
  onCancelReminder?: () => void;
  isScheduled: boolean;
};

export function ReminderModal({
  visible,
  onClose,
  onSelectOption,
  onCancelReminder,
  isScheduled,
}: ReminderModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>⏰ Nhắc nhở sự kiện</Text>
            <Text style={styles.subtitle}>
              Chọn thời điểm bạn muốn nhận thông báo nhắc lịch trên thiết bị
            </Text>
          </View>

          <View style={styles.optionsList}>
            <Pressable
              style={styles.optionItem}
              onPress={() => {
                onClose();
                onSelectOption(15, false);
              }}>
              <Text style={styles.optionIcon}>⏳</Text>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Trước 15 phút</Text>
                <Text style={styles.optionDesc}>Chuẩn bị di chuyển đến địa điểm</Text>
              </View>
              <Text style={styles.optionChevron}>›</Text>
            </Pressable>

            <Pressable
              style={styles.optionItem}
              onPress={() => {
                onClose();
                onSelectOption(60, false);
              }}>
              <Text style={styles.optionIcon}>🕒</Text>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Trước 1 giờ</Text>
                <Text style={styles.optionDesc}>Sắp xếp công việc và học tập</Text>
              </View>
              <Text style={styles.optionChevron}>›</Text>
            </Pressable>

            <Pressable
              style={styles.optionItem}
              onPress={() => {
                onClose();
                onSelectOption(1440, false);
              }}>
              <Text style={styles.optionIcon}>📅</Text>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Trước 1 ngày (24 giờ)</Text>
                <Text style={styles.optionDesc}>Lên kế hoạch trước cho ngày mai</Text>
              </View>
              <Text style={styles.optionChevron}>›</Text>
            </Pressable>

            <Pressable
              style={[styles.optionItem, styles.demoOptionItem]}
              onPress={() => {
                onClose();
                onSelectOption(0, true);
              }}>
              <Text style={styles.optionIcon}>⚡</Text>
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, styles.demoTitle]}>Thử nghiệm ngay (sau 5 giây)</Text>
                <Text style={styles.optionDesc}>Dành cho chấm điểm và kiểm thử thông báo tức thì</Text>
              </View>
              <Text style={styles.optionChevron}>›</Text>
            </Pressable>
          </View>

          {isScheduled && onCancelReminder && (
            <Pressable
              style={styles.cancelReminderButton}
              onPress={() => {
                onClose();
                onCancelReminder();
              }}>
              <Text style={styles.cancelReminderText}>Tắt / Hủy nhắc nhở này</Text>
            </Pressable>
          )}

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Đóng</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: spacing.md,
    maxHeight: '85%',
    padding: spacing.lg,
    width: '100%',
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  optionsList: {
    gap: spacing.sm,
  },
  optionItem: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  demoOptionItem: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  optionIcon: {
    fontSize: 22,
  },
  optionTextContainer: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  demoTitle: {
    color: colors.primary,
  },
  optionDesc: {
    color: colors.mutedText,
    fontSize: 12,
  },
  optionChevron: {
    color: colors.mutedText,
    fontSize: 20,
  },
  cancelReminderButton: {
    alignItems: 'center',
    borderColor: colors.danger,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: spacing.sm,
  },
  cancelReminderText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.sm,
  },
  closeButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
