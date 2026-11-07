import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useTheme } from '@tamagui/core';

import { AdminButton, AdminNotice, AdminPanel, AdminStatusBadge } from '@/components/admin/AdminWidgets';
import { Screen } from '@/components/Screen';
import { createAdminEvent, getAdminEvent, getAdminEventError, updateAdminEvent } from '@/services/adminEventService';
import type { AdminEvent } from '@/types/admin-events';
import type { EventCategory } from '@/types/events';
import {
  ADMIN_CATEGORIES, getInitialEventValues, validateAdminEventForm,
  type AdminEventFormErrors, type AdminEventFormValues,
} from '@/utils/adminEventValidation';

export function AdminEventForm({ eventId }: { eventId?: string }) {
  const theme = useTheme();
  const [event, setEvent] = useState<AdminEvent | null>(null);
  const [values, setValues] = useState<AdminEventFormValues>(() => getInitialEventValues());
  const [errors, setErrors] = useState<AdminEventFormErrors>({});
  const [loading, setLoading] = useState(Boolean(eventId));
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const isEditing = Boolean(eventId);

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setLoadError('');
    try {
      const data = await getAdminEvent(eventId);
      setEvent(data);
      setValues(getInitialEventValues(data));
    } catch (error) { setLoadError(getAdminEventError(error)); }
    finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { void loadEvent(); }, [loadEvent]);

  const setField = useCallback(<K extends keyof AdminEventFormValues>(key: K, value: AdminEventFormValues[K]) => {
    setValues(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
    setSaveError('');
  }, []);

  const save = async () => {
    if (busy) return;
    const checked = validateAdminEventForm(values);
    setErrors(checked.errors);
    setSaveError('');
    if (!checked.input) { setSaveError('Vui lòng kiểm tra những trường được đánh dấu.'); return; }
    setBusy(true);
    try {
      if (eventId) await updateAdminEvent(eventId, checked.input);
      else await createAdminEvent(checked.input);
      router.replace({ pathname: '/admin/events', params: { feedback: eventId ? 'updated' : 'created' } } as never);
    } catch (error) { setSaveError(getAdminEventError(error)); }
    finally { setBusy(false); }
  };

  const fieldSpecs = useMemo(() => [
    { key: 'title' as const, label: 'Tên sự kiện *', placeholder: 'Workshop phát triển ứng dụng' },
    { key: 'location' as const, label: 'Địa điểm *', placeholder: 'Hội trường IUH' },
    { key: 'organizer' as const, label: 'Đơn vị tổ chức *', placeholder: 'Đoàn thanh niên IUH' },
  ], []);

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/admin/events' as never)} style={styles.back}>
            <Ionicons name="arrow-back" size={20} color={theme.color.val} />
            <Text style={[styles.backText, { color: theme.color.val }]}>Danh sách sự kiện</Text>
          </Pressable>
          <Text style={[styles.heading, { color: theme.color.val }]}>{isEditing ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}</Text>
          <Text style={[styles.subtitle, { color: theme.muted.val }]}>Các trường có dấu * là bắt buộc. Sự kiện tạo mới ở trạng thái bản nháp.</Text>
          {loading ? <ActivityIndicator size="large" color={theme.primary.val} style={styles.loader} /> : loadError ? (
            <AdminPanel><AdminNotice>{loadError}</AdminNotice><AdminButton label="Thử lại" icon="refresh-outline" onPress={() => void loadEvent()} /></AdminPanel>
          ) : (
            <AdminPanel>
              {event ? <View style={styles.currentStatus}><Text style={{ color: theme.muted.val }}>Trạng thái hiện tại</Text><AdminStatusBadge status={event.status} /></View> : null}
              {fieldSpecs.map(({ key, label, placeholder }) => (
                <EventInput key={key} label={label} value={values[key]} placeholder={placeholder} error={errors[key]} disabled={busy} onChange={text => setField(key, text)} />
              ))}
              <EventInput label="Mô tả *" value={values.description} error={errors.description} onChange={text => setField('description', text)} disabled={busy} placeholder="Nội dung và mục đích sự kiện..." multiline />
              <Text style={[styles.label, { color: theme.color.val }]}>Danh mục *</Text>
              <View style={styles.categories}>
                {ADMIN_CATEGORIES.map((category: EventCategory) => {
                  const selected = values.category === category;
                  return <Pressable key={category} disabled={busy} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setField('category', category)} style={[styles.category, { borderColor: selected ? theme.primary.val : theme.border.val, backgroundColor: selected ? theme.primary.val : theme.surface.val }]}>
                    <Text style={[styles.categoryText, { color: selected ? '#FFFFFF' : theme.color.val }]}>{category}</Text>
                  </Pressable>;
                })}
              </View>
              {errors.category ? <Text style={[styles.error, { color: theme.danger.val }]}>{errors.category}</Text> : null}
              <View style={styles.twoColumns}>
                <View style={styles.column}><EventInput label="Ngày bắt đầu *" value={values.date} error={errors.date} disabled={busy} placeholder="YYYY-MM-DD" onChange={text => setField('date', text)} /></View>
                <View style={styles.column}><EventInput label="Giờ bắt đầu *" value={values.time} error={errors.time} disabled={busy} placeholder="HH:mm" onChange={text => setField('time', text)} /></View>
              </View>
              <Text style={[styles.hint, { color: theme.muted.val }]}>Ngày và giờ theo múi giờ của thiết bị; API lưu UTC (ISO 8601).</Text>
              <EventInput label="Sức chứa *" value={values.capacity} disabled={busy} error={errors.capacity} keyboardType="number-pad" placeholder="100" onChange={text => setField('capacity', text)} />
              <EventInput label="Nguồn tóm tắt (tùy chọn)" value={values.summarySource} disabled={busy} error={errors.summarySource} placeholder="Nội dung dùng cho AI tóm tắt" multiline onChange={text => setField('summarySource', text)} />
              <EventInput label="Tên ảnh có sẵn (tùy chọn)" value={values.imageKey} disabled={busy} error={errors.imageKey} placeholder="anh01.png" onChange={text => setField('imageKey', text)} />
              <EventInput label="URL hình ảnh (tùy chọn)" value={values.imageUrl} disabled={busy} error={errors.imageUrl} placeholder="https://..." keyboardType="url" onChange={text => setField('imageUrl', text)} />
              {saveError ? <AdminNotice>{saveError}</AdminNotice> : null}
              <View style={styles.actions}>
                <AdminButton label="Hủy" variant="secondary" disabled={busy} onPress={() => router.replace('/admin/events' as never)} />
                <AdminButton label={isEditing ? 'Lưu thay đổi' : 'Tạo bản nháp'} icon="save-outline" busy={busy} onPress={() => void save()} />
              </View>
            </AdminPanel>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function EventInput({ label, value, error, onChange, placeholder, multiline, disabled, keyboardType = 'default' }: {
  label: string; value: string; error?: string; onChange: (text: string) => void;
  placeholder?: string; multiline?: boolean; disabled?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'url';
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.color.val }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        editable={!disabled}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
        keyboardType={keyboardType}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.muted.val}
        style={[styles.input, multiline && styles.multiline, { color: theme.color.val, backgroundColor: theme.background.val, borderColor: error ? theme.danger.val : theme.border.val }]}
      />
      {error ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger.val }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingBottom: 48, gap: 12 },
  back: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 9, alignSelf: 'flex-start' },
  backText: { fontSize: 13, fontWeight: '800' },
  heading: { fontSize: 25, fontWeight: '900' },
  subtitle: { fontSize: 13, lineHeight: 19, marginBottom: 6 },
  loader: { padding: 32 },
  currentStatus: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  field: { gap: 6 }, label: { fontSize: 13, fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11, minHeight: 46, fontSize: 14 },
  multiline: { minHeight: 100 },
  hint: { fontSize: 11, lineHeight: 17 },
  error: { fontSize: 12, lineHeight: 17 },
  twoColumns: { flexDirection: 'row', gap: 10 }, column: { flex: 1, minWidth: 0 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: { paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderRadius: 10, minHeight: 38 },
  categoryText: { fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', marginTop: 8 },
});
