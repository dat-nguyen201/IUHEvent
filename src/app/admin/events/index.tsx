import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@tamagui/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, RefreshControl, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { AdminButton, AdminConfirmDialog, AdminNotice, AdminPanel, AdminStatusBadge } from '@/components/admin/AdminWidgets';
import { AdminEventReviewsModal } from '@/components/admin/AdminEventReviewsModal';
import { Screen } from '@/components/Screen';
import { exportAttendanceCsvFile } from '@/services/attendanceCsvFile';
import { generateAttendanceCsv, getAdminEventError, getEventAttendance, listAdminEvents, setAdminEventStatus } from '@/services/adminEventService';
import type { AdminEvent, AdminEventStatus } from '@/types/admin-events';
import { formatEventDate } from '@/utils/date';
import { useAuth } from '@/context/AuthContext';

const PAGE_SIZE = 10;
const STATUSES = [
  { value: 'all', label: 'Tất cả' },
  { value: 'draft', label: 'Bản nháp' },
  { value: 'published', label: 'Đã đăng' },
  { value: 'archived', label: 'Lưu trữ' },
] as const;
type StatusFilter = AdminEventStatus | 'all';
type PendingChange = { event: AdminEvent; status: AdminEventStatus };

const SUCCESS_MESSAGES: Record<string, string> = {
  created: 'Tạo sự kiện thành công. Sự kiện đang ở trạng thái bản nháp.',
  updated: 'Đã lưu những thay đổi của sự kiện.',
};

export default function AdminEventsScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const { feedback } = useLocalSearchParams<{ feedback?: string }>();
  const [items, setItems] = useState<AdminEvent[]>([]);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [selectedReviewEvent, setSelectedReviewEvent] = useState<AdminEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => { setPage(1); }, [search, status]);

  const loadEvents = useCallback(async (isRefresh = false) => {
    const requestId = ++requestIdRef.current;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const response = await listAdminEvents({ page, pageSize: PAGE_SIZE, query: search, status: status === 'all' ? undefined : status });
      if (requestId !== requestIdRef.current) return;
      setItems(response.data);
      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (cause) {
      if (requestId !== requestIdRef.current) return;
      setError(getAdminEventError(cause));
      setItems([]);
      setTotal(0);
      setHasMore(false);
    } finally {
      if (requestId === requestIdRef.current) { setLoading(false); setRefreshing(false); }
    }
  }, [page, search, status]);

  // Mỗi lần trở lại màn sau khi thêm/sửa, tải dữ liệu mới nhất từ backend.
  useFocusEffect(useCallback(() => {
    void loadEvents();
    return () => { requestIdRef.current += 1; };
  }, [loadEvents]));

  const changeStatus = async () => {
    if (!pending || busy) return;
    setBusy(true);
    setNotice('');
    try {
      await setAdminEventStatus(pending.event.id, pending.status);
      setPending(null);
      setNotice(pending.status === 'published'
        ? 'Sự kiện đã được đăng và có thể hiển thị cho sinh viên.'
        : pending.status === 'archived'
          ? 'Sự kiện đã được lưu trữ, dữ liệu lịch sử vẫn được giữ lại.'
          : 'Sự kiện đã chuyển về bản nháp.');
      await loadEvents();
    } catch (cause) {
      setPending(null);
      setError(getAdminEventError(cause));
    } finally { setBusy(false); }
  };

  const confirmTitle = pending?.status === 'archived'
    ? 'Lưu trữ sự kiện?'
    : pending?.status === 'published'
      ? 'Đăng sự kiện?'
      : 'Chuyển sự kiện về nháp?';
  const confirmMessage = pending?.status === 'archived'
    ? `“${pending.event.title}” sẽ không còn xuất hiện trong danh sách sự kiện công khai. Lịch sử đăng ký vẫn được giữ.`
    : pending?.status === 'published'
      ? `Sự kiện “${pending.event.title}” sẽ hiển thị ở Trang chủ và Khám phá.`
      : pending ? `Sự kiện “${pending.event.title}” sẽ tạm ẩn khỏi danh sách công khai.` : '';

  const handleExportAttendance = async (event: AdminEvent) => {
    try {
      const result = await getEventAttendance(event.id);
      if (result.data.length === 0) {
        Alert.alert(
          'Chưa có dữ liệu sinh viên',
          `Sự kiện “${event.title}” hiện chưa có sinh viên nào đăng ký hoặc điểm danh.\n\nBạn có muốn xuất file mẫu điểm danh (Template) để kiểm tra định dạng nộp P.CTSV không?`,
          [
            { text: 'Đóng', style: 'cancel' },
            {
              text: 'Xuất file mẫu',
              onPress: async () => {
                const sampleRows = [
                  {
                    studentId: '21088888',
                    name: 'Nguyễn Văn Minh',
                    email: 'minh.nguyen@iuh.edu.vn',
                    major: 'Công nghệ Thông tin',
                    status: 'checked-in',
                    checkedInAt: new Date().toISOString(),
                  },
                  {
                    studentId: '21099999',
                    name: 'Lê Thị Thu Hằng',
                    email: 'hang.le@iuh.edu.vn',
                    major: 'Quản trị Kinh doanh',
                    status: 'registered',
                  },
                ];
                const csv = generateAttendanceCsv(event.title, sampleRows);
                try {
                  await exportAttendanceCsvFile(csv, event.id);
                } catch {
                  await Share.share({
                    title: `Mẫu danh sách điểm danh - ${event.title}`,
                    message: csv,
                  });
                }
              },
            },
          ],
        );
        return;
      }
      const csv = generateAttendanceCsv(event.title, result.data);
      try {
        await exportAttendanceCsvFile(csv, event.id);
      } catch {
        await Share.share({
          title: `Danh sách điểm danh - ${event.title}`,
          message: csv,
        });
      }
    } catch (e) {
      Alert.alert('Lỗi xuất dữ liệu', e instanceof Error ? e.message : 'Không thể lấy danh sách điểm danh.');
    }
  };

  const renderItem = ({ item }: { item: AdminEvent }) => (
    <AdminPanel>
      <View style={styles.cardHeader}>
        <Text numberOfLines={2} style={[styles.eventTitle, { color: theme.color.val }]}>{item.title}</Text>
        <AdminStatusBadge status={item.status} />
      </View>
      <View style={styles.metaLine}><Ionicons name="calendar-outline" color={theme.muted.val} size={15} /><Text style={[styles.metaText, { color: theme.muted.val }]}>{formatEventDate(item.startsAt)}</Text></View>
      <View style={styles.metaLine}><Ionicons name="location-outline" color={theme.muted.val} size={15} /><Text numberOfLines={2} style={[styles.metaText, { color: theme.muted.val }]}>{item.location} · {item.organizer}</Text></View>
      <View style={styles.metaLine}><Ionicons name="people-outline" color={theme.muted.val} size={15} /><Text style={[styles.metaText, { color: theme.muted.val }]}>Sức chứa {item.capacity} · Đã check-in {item.checkedInCount}</Text></View>
      <View style={styles.metaLine}>
        <Ionicons name="star" color="#F59E0B" size={15} />
        <Text style={[styles.metaText, { color: theme.color.val }]}>
          {item.avgRating ? `Đánh giá: ${item.avgRating} / 5.0 (${item.reviewCount || 0} lượt)` : 'Chưa có đánh giá nào'}
        </Text>
        {Boolean(item.reviewCount && item.reviewCount > 0) && (
          <Pressable
            onPress={() => setSelectedReviewEvent(item)}
            style={[styles.reviewPillBtn, { backgroundColor: `${theme.primary.val}15`, borderColor: `${theme.primary.val}35` }]}
          >
            <Text style={[styles.reviewPillBtnText, { color: theme.primary.val }]}>Xem góp ý</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.actionGrid}>
        <View style={styles.actionRow}>
          <View style={styles.actionCol}>
            <AdminButton label="Sửa thông tin" icon="create-outline" compact variant="secondary" onPress={() => router.push({ pathname: '/admin/events/[id]', params: { id: item.id } } as never)} />
          </View>
          <View style={styles.actionCol}>
            <AdminButton label="Xuất CSV" icon="download-outline" compact variant="secondary" onPress={() => void handleExportAttendance(item)} />
          </View>
        </View>
        <View style={styles.actionRow}>
          <View style={styles.actionCol}>
            {item.status === 'draft' ? <AdminButton label="Đăng sự kiện" icon="send-outline" compact onPress={() => setPending({ event: item, status: 'published' })} /> : null}
            {item.status === 'published' ? <AdminButton label="Hủy đăng" icon="eye-off-outline" compact variant="secondary" onPress={() => setPending({ event: item, status: 'draft' })} /> : null}
            {item.status === 'archived' ? <AdminButton label="Khôi phục" icon="refresh-outline" compact variant="secondary" onPress={() => setPending({ event: item, status: 'draft' })} /> : null}
          </View>
          <View style={styles.actionCol}>
            {item.status !== 'archived' ? <AdminButton label="Lưu trữ" icon="archive-outline" compact variant="danger" onPress={() => setPending({ event: item, status: 'archived' })} /> : null}
          </View>
        </View>
      </View>
    </AdminPanel>
  );

  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(total, page * PAGE_SIZE);

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerBrandRow}>
            <Image source={require('@/IMG/logo.png')} style={styles.headerLogo} resizeMode="contain" />
            <View style={styles.headerText}>
              <Text style={[styles.eyebrow, { color: theme.primary.val }]}>
                {user?.role === 'organizer' ? 'IUH EVENT · ĐƠN VỊ TỔ CHỨC' : 'IUH EVENT · ADMIN'}
              </Text>
              <Text style={[styles.heading, { color: theme.color.val }]}>Quản lý sự kiện</Text>
              <Text style={[styles.subheading, { color: theme.muted.val }]}>Tạo mới, cập nhật, công khai và lưu trữ sự kiện.</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Về hồ sơ" onPress={() => router.push('/(tabs)/profile')} style={[styles.profileButton, { borderColor: theme.border.val }]}>
            <Ionicons name="person-circle-outline" color={theme.color.val} size={25} />
          </Pressable>
        </View>
        <View style={styles.adminNav}>
          <View style={styles.adminNavItem}><AdminButton label="Thêm sự kiện" icon="add-circle-outline" onPress={() => router.push('/admin/events/new' as never)} /></View>
          <View style={styles.adminNavItem}><AdminButton label={user?.role === 'organizer' ? 'Đơn vị của tôi' : 'Đơn vị tổ chức'} icon="business-outline" variant="secondary" onPress={() => router.push('/admin/organizers' as never)} /></View>
          {user?.role === 'admin' ? (
            <>
              <View style={styles.adminNavItem}><AdminButton label="Quản lý sinh viên" icon="people-outline" variant="secondary" onPress={() => router.push('/admin/users' as never)} /></View>
            </>
          ) : null}
          <View style={styles.adminNavItem}>
            <AdminButton
              label={user?.role === 'organizer' ? 'Thống kê đơn vị' : 'Thống kê báo cáo'}
              icon="bar-chart-outline"
              variant="secondary"
              onPress={() => router.push('/admin/analytics' as never)}
            />
          </View>
        </View>
        <View style={[styles.search, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
          <Ionicons name="search" size={19} color={theme.muted.val} />
          <TextInput
            accessibilityLabel="Tìm sự kiện theo tiêu đề hoặc địa điểm"
            placeholder="Tìm tên sự kiện, địa điểm..."
            placeholderTextColor={theme.muted.val}
            value={query}
            onChangeText={setQuery}
            style={[styles.searchInput, { color: theme.color.val }]}
          />
          {query ? <Pressable accessibilityLabel="Xóa tìm kiếm" onPress={() => setQuery('')}><Ionicons name="close-circle" color={theme.muted.val} size={20} /></Pressable> : null}
        </View>
        <View style={styles.filters}>
          {STATUSES.map(option => {
            const selected = status === option.value;
            return <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setStatus(option.value)} style={[styles.filter, { borderColor: selected ? theme.primary.val : theme.border.val, backgroundColor: selected ? theme.primary.val : theme.surface.val }]}>
              <Text style={[styles.filterText, { color: selected ? '#FFFFFF' : theme.color.val }]}>{option.label}</Text>
            </Pressable>;
          })}
        </View>
        {feedback && SUCCESS_MESSAGES[feedback] ? <AdminNotice kind="success">{SUCCESS_MESSAGES[feedback]}</AdminNotice> : null}
        {notice ? <AdminNotice kind="success">{notice}</AdminNotice> : null}
        <View style={styles.resultRow}><Text style={[styles.resultText, { color: theme.muted.val }]}>{loading ? 'Đang tải dữ liệu...' : `Hiển thị ${start}–${end} / ${total} sự kiện`}</Text><Pressable onPress={() => void loadEvents(true)} accessibilityRole="button" accessibilityLabel="Làm mới danh sách"><Ionicons name="refresh-outline" color={theme.primary.val} size={21} /></Pressable></View>
        {loading && !refreshing ? (
          <View style={styles.center}><ActivityIndicator size="large" color={theme.primary.val} /><Text style={{ color: theme.muted.val }}>Đang tải sự kiện...</Text></View>
        ) : error ? (
          <View style={styles.center}><AdminNotice>{error}</AdminNotice><AdminButton label="Thử lại" icon="refresh-outline" onPress={() => void loadEvents()} /></View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadEvents(true)} tintColor={theme.primary.val} />}
            ListEmptyComponent={<View style={styles.center}><Ionicons name="calendar-clear-outline" color={theme.muted.val} size={45} /><Text style={[styles.emptyTitle, { color: theme.color.val }]}>Không có sự kiện phù hợp</Text><Text style={{ color: theme.muted.val, textAlign: 'center' }}>Thử đổi bộ lọc, từ khóa hoặc thêm sự kiện mới.</Text></View>}
            ListFooterComponent={total > 0 ? <View style={styles.pagination}>
              <AdminButton label="Trang trước" icon="chevron-back" variant="secondary" compact disabled={page === 1} onPress={() => setPage(value => Math.max(1, value - 1))} />
              <Text style={[styles.pageText, { color: theme.color.val }]}>Trang {page} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}</Text>
              <AdminButton label="Trang sau" icon="chevron-forward" variant="secondary" compact disabled={!hasMore} onPress={() => setPage(value => value + 1)} />
            </View> : undefined}
          />
        )}
      </View>
      <AdminConfirmDialog
        visible={Boolean(pending)}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={pending?.status === 'published' ? 'Đăng sự kiện' : pending?.status === 'archived' ? 'Lưu trữ' : 'Chuyển nháp'}
        danger={pending?.status === 'archived'}
        busy={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => void changeStatus()}
      />
      <AdminEventReviewsModal
        visible={Boolean(selectedReviewEvent)}
        event={selectedReviewEvent}
        onClose={() => setSelectedReviewEvent(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, width: '100%', maxWidth: 840, alignSelf: 'center', gap: 12 },
  adminNav: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  adminNavItem: { flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerLogo: { width: 44, height: 44, borderRadius: 10 },
  headerText: { flex: 1, gap: 4 }, eyebrow: { fontWeight: '900', fontSize: 11 },
  heading: { fontWeight: '900', fontSize: 24 }, subheading: { fontSize: 12 },
  profileButton: { padding: 9, borderRadius: 12, borderWidth: 1 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, minHeight: 47, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 8, minWidth: 0 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  filterText: { fontSize: 11, fontWeight: '800' },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultText: { fontSize: 12 }, list: { gap: 12, paddingBottom: 34 },
  center: { gap: 16, alignItems: 'center', padding: 30, justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  cardHeader: { flexDirection: 'row', gap: 9, justifyContent: 'space-between', alignItems: 'flex-start' },
  eventTitle: { flex: 1, fontSize: 16, fontWeight: '900', lineHeight: 22 },
  metaLine: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  metaText: { flex: 1, fontSize: 12, lineHeight: 19 },
  reviewPillBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  reviewPillBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  actionGrid: {
    gap: 8,
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.18)',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionCol: {
    flex: 1,
  },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingVertical: 15, flexWrap: 'wrap' },
  pageText: { fontSize: 12, fontWeight: '800' },
});
