import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QRCodeView } from './QRCodeView';
import { useTheme } from '@tamagui/core';
import type { StudentEvent } from '@/types/events';
import { formatEventDate } from '@/utils/date';

interface EventQrModalProps {
  visible: boolean;
  event?: StudentEvent;
  onClose: () => void;
}

export function EventQrModal({ visible, event, onClose }: EventQrModalProps) {
  const theme = useTheme();

  if (!event) return null;

  const qrValue = `student-event:${event.id}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Text style={[styles.eyebrow, { color: theme.primary.val }]}>MÃ QR ĐIỂM DANH</Text>
              <Text style={[styles.title, { color: theme.color.val }]} numberOfLines={1}>
                {event.title}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.background.val, borderColor: theme.border.val }]}
              accessibilityRole="button"
              accessibilityLabel="Đóng"
            >
              <Ionicons name="close" size={20} color={theme.color.val} />
            </Pressable>
          </View>

          {/* QR View */}
          <View style={styles.qrContainer}>
            <QRCodeView value={qrValue} size={230} showLogo />
            <Text style={[styles.qrCodeText, { color: theme.muted.val }]}>Mã sự kiện: {event.id}</Text>
          </View>

          {/* Event Meta */}
          <View style={[styles.metaBox, { backgroundColor: theme.background.val, borderColor: theme.border.val }]}>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={16} color={theme.primary.val} />
              <Text style={[styles.metaText, { color: theme.color.val }]} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={16} color={theme.primary.val} />
              <Text style={[styles.metaText, { color: theme.color.val }]}>
                {formatEventDate(event.startsAt)}
              </Text>
            </View>
          </View>

          <Text style={[styles.hint, { color: theme.muted.val }]}>
            Chiếu mã này lên máy chiếu hoặc đưa cho sinh viên quét để điểm danh tham gia sự kiện.
          </Text>

          {/* Action */}
          <Pressable
            style={[styles.doneBtn, { backgroundColor: theme.primary.val }]}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={styles.doneBtnText}>Xong</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerTitleWrap: {
    flex: 1,
    paddingRight: 10,
    gap: 2,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  qrCodeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaBox: {
    width: '100%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  doneBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
