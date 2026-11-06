import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@tamagui/core';

import type { AdminEventStatus } from '@/types/admin-events';

export function AdminPanel({ children }: PropsWithChildren) {
  const theme = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
      {children}
    </View>
  );
}

export function AdminButton({
  label, onPress, icon, variant = 'primary', busy, disabled, compact,
}: {
  label: string;
  onPress: () => void;
  icon?: ComponentProps<typeof Ionicons>['name'];
  variant?: 'primary' | 'secondary' | 'danger';
  busy?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  const theme = useTheme();
  const primary = variant === 'primary';
  const danger = variant === 'danger';
  const fg = primary ? '#FFFFFF' : danger ? theme.danger.val : theme.color.val;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: primary ? theme.primary.val : theme.surface.val,
          borderColor: danger ? theme.danger.val : primary ? theme.primary.val : theme.border.val,
          opacity: disabled || busy ? 0.5 : pressed ? 0.76 : 1 },
      ]}>
      {busy ? <ActivityIndicator size="small" color={fg} /> : icon ? <Ionicons size={16} name={icon} color={fg} /> : null}
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const STATUS_META: Record<AdminEventStatus, { label: string; tint: string; surface: string }> = {
  draft: { label: 'Bản nháp', tint: '#A16207', surface: '#FEF3C7' },
  published: { label: 'Đã đăng', tint: '#047857', surface: '#D1FAE5' },
  archived: { label: 'Đã lưu trữ', tint: '#6B7280', surface: '#E5E7EB' },
};

export function AdminStatusBadge({ status }: { status: AdminEventStatus }) {
  const item = STATUS_META[status];
  return (
    <View style={[styles.badge, { backgroundColor: item.surface }]}>
      <Text style={[styles.badgeText, { color: item.tint }]}>{item.label}</Text>
    </View>
  );
}

export function AdminNotice({
  children, kind = 'error',
}: { children: ReactNode; kind?: 'error' | 'success' }) {
  const theme = useTheme();
  const color = kind === 'error' ? theme.danger.val : theme.success.val;
  return (
    <View style={[styles.notice, { borderColor: color }]}>
      <Ionicons name={kind === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'} color={color} size={19} />
      <Text accessibilityRole={kind === 'error' ? 'alert' : 'text'} style={[styles.noticeText, { color: theme.color.val }]}>
        {children}
      </Text>
    </View>
  );
}

/** Modal có nút riêng thay cho Alert.alert để web/Android/iOS đều xác nhận được. */
export function AdminConfirmDialog({
  visible, title, message, confirmLabel = 'Xác nhận', danger = false, busy = false,
  onCancel, onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!busy) onCancel(); }}>
      <View style={styles.modalScrim}>
        <View style={[styles.modalCard, { backgroundColor: theme.background.val, borderColor: theme.border.val }]}>
          <Text style={[styles.modalTitle, { color: theme.color.val }]}>{title}</Text>
          <Text style={[styles.modalMessage, { color: theme.muted.val }]}>{message}</Text>
          <View style={styles.modalActions}>
            <AdminButton label="Hủy" variant="secondary" disabled={busy} onPress={onCancel} />
            <AdminButton label={confirmLabel} variant={danger ? 'danger' : 'primary'} busy={busy} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  button: { minHeight: 44, borderWidth: 1, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 9 },
  buttonCompact: { minHeight: 38, paddingHorizontal: 11, paddingVertical: 6 },
  buttonText: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '800' },
  notice: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  noticeText: { fontSize: 13, lineHeight: 19, flex: 1 },
  modalScrim: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, backgroundColor: 'rgba(0, 0, 0, 0.55)' },
  modalCard: { maxWidth: 500, alignSelf: 'center', width: '100%', borderRadius: 20, padding: 20, borderWidth: 1, gap: 18 },
  modalTitle: { fontSize: 19, fontWeight: '900' },
  modalMessage: { fontSize: 14, lineHeight: 21 },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' },
});
