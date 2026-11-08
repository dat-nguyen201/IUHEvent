import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@tamagui/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { AdminButton, AdminConfirmDialog, AdminNotice, AdminPanel } from '@/components/admin/AdminWidgets';
import { Screen } from '@/components/Screen';
import { getAdminUserError, listAdminUsers, setAdminUserStatus } from '@/services/adminUserService';
import type { AuthUser, UserStatus } from '@/types/auth';
import { useAuth } from '@/context/AuthContext';

const PAGE_SIZE = 10;
export default function AdminUsersScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const [items, setItems] = useState<AuthUser[]>([]);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<UserStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<AuthUser | null>(null);
  const [busy, setBusy] = useState(false);
  const requestRef = useRef(0);

  useEffect(() => { const timer = setTimeout(() => setSearch(query.trim()), 350); return () => clearTimeout(timer); }, [query]);
  useEffect(() => { setPage(1); }, [search, status]);

  const load = useCallback(async (refresh = false) => {
    const request = ++requestRef.current;
    setError('');
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const response = await listAdminUsers({ page, pageSize: PAGE_SIZE, query: search, status: status === 'all' ? undefined : status });
      if (request !== requestRef.current) return;
      setItems(response.data); setTotal(response.total); setHasMore(response.hasMore);
    } catch (cause) {
      if (request !== requestRef.current) return;
      setError(getAdminUserError(cause)); setItems([]); setTotal(0);
    } finally { if (request === requestRef.current) { setLoading(false); setRefreshing(false); } }
  }, [page, search, status]);

  useFocusEffect(useCallback(() => { void load(); return () => { requestRef.current++; }; }, [load]));

  const changeStatus = async () => {
    if (!pending || busy) return;
    setBusy(true); setNotice('');
    try {
      const next = pending.status === 'active' ? 'suspended' : 'active';
      await setAdminUserStatus(pending.id, next);
      setPending(null);
      setNotice(next === 'active' ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.');
      await load();
    } catch (cause) { setPending(null); setError(getAdminUserError(cause)); }
    finally { setBusy(false); }
  };

  if (user?.role !== 'admin') {
    return (
      <Screen>
        <View style={styles.root}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/admin/events' as never)} style={styles.link}>
            <Ionicons name="arrow-back" size={18} color={theme.color.val} />
            <Text style={{ color: theme.color.val, fontWeight: '800' }}>Quản lý sự kiện</Text>
          </Pressable>
          <AdminNotice>Bạn không có quyền truy cập chức năng Quản lý sinh viên. Chức năng này chỉ dành cho Quản trị viên hệ thống.</AdminNotice>
        </View>
      </Screen>
    );
  }

  return <Screen>
    <View style={styles.root}>
      <Pressable accessibilityRole="button" onPress={() => router.push('/admin/events' as never)} style={styles.link}><Ionicons name="arrow-back" size={18} color={theme.color.val} /><Text style={{ color: theme.color.val, fontWeight: '800' }}>Quản trị sự kiện</Text></Pressable>
      <Text style={[styles.heading, { color: theme.color.val }]}>Quản lý sinh viên</Text>
      <Text style={[styles.sub, { color: theme.muted.val }]}>Xem hồ sơ, cập nhật thông tin và khóa/mở tài khoản.</Text>
      <View style={[styles.search, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
        <Ionicons name="search-outline" size={19} color={theme.muted.val} />
        <TextInput accessibilityLabel="Tìm sinh viên" value={query} onChangeText={setQuery} placeholder="Họ tên, email, mã sinh viên..." placeholderTextColor={theme.muted.val} style={[styles.input, { color: theme.color.val }]} />
        {query ? <Pressable onPress={() => setQuery('')} accessibilityLabel="Xóa tìm kiếm"><Ionicons name="close-circle" color={theme.muted.val} size={20} /></Pressable> : null}
      </View>
      <View style={styles.filters}>{(['all', 'active', 'suspended'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: status === value }} onPress={() => setStatus(value)} style={[styles.filter, { backgroundColor: status === value ? theme.primary.val : theme.surface.val, borderColor: status === value ? theme.primary.val : theme.border.val }]}><Text style={{ color: status === value ? '#FFFFFF' : theme.color.val, fontSize: 12, fontWeight: '800' }}>{value === 'all' ? 'Tất cả' : value === 'active' ? 'Hoạt động' : 'Đã khóa'}</Text></Pressable>)}</View>
      {notice ? <AdminNotice kind="success">{notice}</AdminNotice> : null}
      <Text style={{ color: theme.muted.val, fontSize: 12 }}>{loading ? 'Đang tải...' : `Tìm thấy ${total} tài khoản`}</Text>
      {loading && !refreshing ? <ActivityIndicator style={{ marginTop: 28 }} size="large" color={theme.primary.val} /> : error ? <View style={styles.message}><AdminNotice>{error}</AdminNotice><AdminButton label="Thử lại" onPress={() => void load()} /></View> :
        <FlatList data={items} keyExtractor={item => item.id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary.val} />} renderItem={({ item }) => <AdminPanel>
          <View style={styles.identity}><Text style={[styles.name, { color: theme.color.val }]}>{item.name}</Text><View style={[styles.badge, { backgroundColor: item.status === 'active' ? '#D1FAE5' : '#FEE2E2' }]}><Text style={{ color: item.status === 'active' ? '#065F46' : '#B91C1C', fontSize: 11, fontWeight: '800' }}>{item.status === 'active' ? 'Hoạt động' : 'Đã khóa'}</Text></View></View>
          <Text style={[styles.meta, { color: theme.muted.val }]}>{item.studentId} · {item.role === 'admin' ? 'Admin' : item.role === 'organizer' ? 'Đơn vị tổ chức' : 'Sinh viên'}</Text>
          <Text style={[styles.meta, { color: theme.muted.val }]}>{item.email}</Text>
          <Text style={[styles.meta, { color: theme.muted.val }]}>{item.major || 'Chưa khai báo ngành'}</Text>
          <View style={styles.actions}><AdminButton label="Chi tiết / sửa" compact icon="create-outline" variant="secondary" onPress={() => router.push({ pathname: '/admin/users/[id]', params: { id: item.id } } as never)} /><AdminButton label={item.status === 'active' ? 'Khóa' : 'Mở khóa'} compact variant={item.status === 'active' ? 'danger' : 'primary'} onPress={() => setPending(item)} /></View>
        </AdminPanel>}
        ListEmptyComponent={<View style={styles.message}><Text style={{ color: theme.muted.val }}>Không tìm thấy tài khoản phù hợp.</Text></View>}
        ListFooterComponent={total ? <View style={styles.pageRow}><AdminButton label="Trước" compact variant="secondary" disabled={page === 1} onPress={() => setPage(n => n - 1)} /><Text style={{ color: theme.color.val, fontSize: 12 }}>Trang {page} / {Math.ceil(total / PAGE_SIZE)}</Text><AdminButton label="Sau" compact variant="secondary" disabled={!hasMore} onPress={() => setPage(n => n + 1)} /></View> : undefined}
      />}
    </View>
    <AdminConfirmDialog visible={Boolean(pending)} title={pending?.status === 'active' ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'} message={`Bạn có chắc muốn ${pending?.status === 'active' ? 'khóa' : 'mở khóa'} tài khoản ${pending?.name ?? ''}?`} confirmLabel={pending?.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'} danger={pending?.status === 'active'} busy={busy} onCancel={() => setPending(null)} onConfirm={() => void changeStatus()} />
  </Screen>;
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 12, minHeight: 0, width: '100%', maxWidth: 840, alignSelf: 'center' },
  link: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 8, alignSelf: 'flex-start' },
  heading: { fontSize: 25, fontWeight: '900' }, sub: { fontSize: 13 },
  search: { borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, minHeight: 45 },
  input: { flex: 1, fontSize: 13, paddingVertical: 8, minWidth: 0 },
  filters: { flexDirection: 'row', gap: 9, flexWrap: 'wrap' }, filter: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  list: { gap: 12, paddingBottom: 30 }, message: { alignItems: 'center', gap: 15, padding: 20 },
  identity: { flexDirection: 'row', gap: 8, justifyContent: 'space-between', alignItems: 'center' }, name: { fontSize: 16, fontWeight: '900', flex: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 }, meta: { fontSize: 12 }, actions: { flexDirection: 'row', gap: 9, flexWrap: 'wrap' },
  pageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 15, gap: 5 },
});
