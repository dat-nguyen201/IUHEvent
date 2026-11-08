import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createElement, useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useTheme } from '@tamagui/core';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import { AdminButton, AdminNotice, AdminPanel, AdminStatusBadge } from '@/components/admin/AdminWidgets';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import { createAdminEvent, getAdminEvent, getAdminEventError, updateAdminEvent } from '@/services/adminEventService';
import { getAllOrganizers } from '@/services/organizerService';
import type { Organizer } from '@/data/organizers';
import type { AdminEvent } from '@/types/admin-events';
import type { EventCategory } from '@/types/events';
import {
  ADMIN_CATEGORIES, getInitialEventValues, validateAdminEventForm,
  type AdminEventFormErrors, type AdminEventFormValues,
} from '@/utils/adminEventValidation';

export function AdminEventForm({ eventId }: { eventId?: string }) {
  const { user } = useAuth();
  const theme = useTheme();
  const isOrganizer = user?.role === 'organizer';
  const defaultOrgName = user?.organizerName || user?.name || '';
  const [event, setEvent] = useState<AdminEvent | null>(null);
  const [values, setValues] = useState<AdminEventFormValues>(() => {
    const initial = getInitialEventValues();
    if (!eventId && user?.role === 'organizer' && defaultOrgName) {
      initial.organizer = defaultOrgName;
    }
    return initial;
  });
  const [errors, setErrors] = useState<AdminEventFormErrors>({});
  const [loading, setLoading] = useState(Boolean(eventId));
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const [availableOrganizers, setAvailableOrganizers] = useState<Organizer[]>([]);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [pickerDraft, setPickerDraft] = useState(() => new Date());
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
  useEffect(() => {
    void getAllOrganizers(user).then(setAvailableOrganizers);
  }, [user]);

  const setField = useCallback(<K extends keyof AdminEventFormValues>(key: K, value: AdminEventFormValues[K]) => {
    setValues(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
    setSaveError('');
  }, []);

  const openPicker = (mode: 'date' | 'time') => {
    const initial = makePickerDate(values);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode,
        display: mode === 'date' ? 'calendar' : 'clock',
        is24Hour: true,
        onValueChange: (_event, selectedDate) => {
          setField(mode, mode === 'date' ? formatDate(selectedDate) : formatTime(selectedDate));
        },
      });
      return;
    }

    setPickerDraft(initial);
    setPickerMode(mode);
  };

  const confirmPicker = () => {
    if (!pickerMode) return;
    setField(pickerMode, pickerMode === 'date' ? formatDate(pickerDraft) : formatTime(pickerDraft));
    setPickerMode(null);
  };

  const save = async () => {
    if (busy) return;
    const submissionValues = {
      ...values,
      organizer: isOrganizer ? defaultOrgName : values.organizer,
    };
    const checked = validateAdminEventForm(submissionValues);
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

  const fieldSpecs = useMemo(() => {
    const list: { key: keyof AdminEventFormValues; label: string; placeholder: string }[] = [
      { key: 'title' as const, label: 'Tên sự kiện *', placeholder: 'Workshop phát triển ứng dụng' },
      { key: 'location' as const, label: 'Địa điểm *', placeholder: 'Hội trường IUH' },
    ];
    if (!isOrganizer) {
      list.push({ key: 'organizer' as const, label: 'Đơn vị tổ chức *', placeholder: 'Đoàn thanh niên IUH' });
    }
    return list;
  }, [isOrganizer]);

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
                <View key={key}>
                  <EventInput label={label} value={values[key]} placeholder={placeholder} error={errors[key]} disabled={busy} onChange={text => setField(key, text)} />
                  {key === 'organizer' && availableOrganizers.length > 0 ? (
                    <View style={styles.organizerSuggestions}>
                      <Text style={[styles.suggestionLabel, { color: theme.muted.val }]}>Chọn nhanh đơn vị:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionChips}>
                        {availableOrganizers.map(org => {
                          const selected = values.organizer === org.name;
                          return (
                            <Pressable
                              key={org.id}
                              disabled={busy}
                              onPress={() => setField('organizer', org.name)}
                              style={[
                                styles.suggestionChip,
                                {
                                  borderColor: selected ? theme.primary.val : theme.border.val,
                                  backgroundColor: selected ? `${theme.primary.val}18` : theme.surface.val,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.suggestionChipText,
                                  { color: selected ? theme.primary.val : theme.color.val },
                                  selected && { fontWeight: '800' },
                                ]}
                              >
                                {org.shortName || org.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                        <Pressable
                          disabled={busy}
                          onPress={() => router.push('/admin/organizers' as never)}
                          style={[styles.suggestionChip, { borderColor: theme.border.val, backgroundColor: theme.surface.val }]}
                        >
                          <Ionicons name="settings-outline" size={12} color={theme.primary.val} />
                          <Text style={[styles.suggestionChipText, { color: theme.primary.val }]}>Quản lý đơn vị</Text>
                        </Pressable>
                      </ScrollView>
                    </View>
                  ) : null}
                </View>
              ))}
              {isOrganizer ? (
                <View style={[styles.orgLockNotice, { backgroundColor: `${theme.primary.val}15`, borderColor: `${theme.primary.val}40` }]}>
                  <Ionicons name="business" size={18} color={theme.primary.val} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.orgLockLabel, { color: theme.muted.val }]}>Đơn vị tổ chức</Text>
                    <Text style={[styles.orgLockValue, { color: theme.color.val }]}>{defaultOrgName}</Text>
                  </View>
                  <View style={[styles.orgLockBadge, { backgroundColor: theme.primary.val }]}>
                    <Text style={styles.orgLockBadgeText}>Cố định</Text>
                  </View>
                </View>
              ) : null}
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
                <View style={styles.column}><DateTimeField label="Ngày bắt đầu *" mode="date" value={values.date} error={errors.date} disabled={busy} onChange={value => setField('date', value)} onPress={() => openPicker('date')} /></View>
                <View style={styles.column}><DateTimeField label="Giờ bắt đầu *" mode="time" value={values.time} error={errors.time} disabled={busy} onChange={value => setField('time', value)} onPress={() => openPicker('time')} /></View>
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
      {Platform.OS === 'ios' && pickerMode ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setPickerMode(null)}>
          <View style={styles.pickerBackdrop}>
            <View style={[styles.pickerCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
              <Text style={[styles.pickerTitle, { color: theme.color.val }]}>{pickerMode === 'date' ? 'Chọn ngày bắt đầu' : 'Chọn giờ bắt đầu'}</Text>
              <DateTimePicker
                value={pickerDraft}
                mode={pickerMode}
                display={pickerMode === 'date' ? 'inline' : 'spinner'}
                is24Hour
                onValueChange={(_event, date) => setPickerDraft(date)}
                style={styles.iosPicker}
              />
              <View style={styles.pickerActions}>
                <Pressable accessibilityRole="button" onPress={() => setPickerMode(null)} style={[styles.pickerAction, { borderColor: theme.border.val }]}>
                  <Text style={{ color: theme.color.val, fontWeight: '700' }}>Hủy</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={confirmPicker} style={[styles.pickerAction, { backgroundColor: theme.primary.val, borderColor: theme.primary.val }]}>
                  <Text style={styles.pickerConfirmText}>Chọn</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </Screen>
  );
}

function makePickerDate(values: AdminEventFormValues) {
  const [year, month, day] = values.date.split('-').map(Number);
  const [hour, minute] = values.time.split(':').map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function DateTimeField({ label, mode, value, error, disabled, onChange, onPress }: {
  label: string;
  mode: 'date' | 'time';
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onPress: () => void;
}) {
  const theme = useTheme();
  const displayValue = mode === 'date' ? value.split('-').reverse().join('/') : value;
  const borderColor = error ? theme.danger.val : theme.border.val;

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.color.val }]}>{label}</Text>
      {Platform.OS === 'web' ? (
        createElement('input', {
          type: mode,
          value,
          disabled,
          'aria-label': label,
          onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(event.currentTarget.value),
          style: {
            boxSizing: 'border-box',
            width: '100%',
            minHeight: 46,
            borderRadius: 10,
            border: `1px solid ${borderColor}`,
            padding: '10px 12px',
            color: theme.color.val,
            backgroundColor: theme.background.val,
            fontSize: 14,
          },
        })
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${displayValue}`}
          accessibilityState={{ disabled: Boolean(disabled) }}
          disabled={disabled}
          onPress={onPress}
          style={[styles.pickerInput, { backgroundColor: theme.background.val, borderColor }]}
        >
          <Text style={[styles.pickerValue, { color: theme.color.val }]}>{displayValue}</Text>
          <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={19} color={theme.primary.val} />
        </Pressable>
      )}
      {error ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger.val }]}>{error}</Text> : null}
    </View>
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
  pickerInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 13, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pickerValue: { fontSize: 14, flex: 1 },
  pickerBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: 20 },
  pickerCard: { width: '100%', maxWidth: 420, borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 },
  pickerTitle: { fontSize: 17, fontWeight: '900' },
  iosPicker: { alignSelf: 'center' },
  pickerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  pickerAction: { minWidth: 84, minHeight: 42, borderWidth: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  pickerConfirmText: { color: '#FFFFFF', fontWeight: '800' },
  multiline: { minHeight: 100 },
  hint: { fontSize: 11, lineHeight: 17 },
  error: { fontSize: 12, lineHeight: 17 },
  twoColumns: { flexDirection: 'row', gap: 10 }, column: { flex: 1, minWidth: 0 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: { paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderRadius: 10, minHeight: 38 },
  categoryText: { fontSize: 12, fontWeight: '700' },
  organizerSuggestions: { marginTop: 6, gap: 4 },
  suggestionLabel: { fontSize: 11, fontWeight: '600' },
  suggestionChips: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  suggestionChipText: { fontSize: 11.5, fontWeight: '600' },
  orgLockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 4,
  },
  orgLockLabel: { fontSize: 11, fontWeight: '600' },
  orgLockValue: { fontSize: 14, fontWeight: '800' },
  orgLockBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  orgLockBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', marginTop: 8 },
});
