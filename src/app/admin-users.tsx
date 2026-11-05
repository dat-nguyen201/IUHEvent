import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@tamagui/core';

import { Screen } from '@/components/Screen';
import { StatusMessage } from '@/components/StatusMessage';
import { appMode } from '@/constants/app-mode';
import { spacing } from '@/constants/app-theme';
import { useAuth } from '@/context/AuthContext';
import {
  getAdminUser,
  listAdminUsers,
  updateAdminUserProfile,
  updateAdminUserStatus,
} from '@/services/adminUserService';
import type { AuthUser, UserStatus } from '@/types/auth';

const PAGE_SIZE = 20;

export default function AdminUsersScreen() {
  const { user, isReady } = useAuth();
  const theme = useTheme();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAdmin = appMode === 'remote' && user?.role === 'admin' && user.status === 'active';

  const loadUsers = useCallback(async (nextPage: number, append: boolean) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await listAdminUsers({
        page: nextPage,
        pageSize: PAGE_SIZE,
        query: submittedQuery,
        status: statusFilter,
      });
      setUsers((current) => append ? [...current, ...response.data] : response.data);
      setPage(response.page);
      setHasMore(response.hasMore);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể tải danh sách sinh viên.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [statusFilter, submittedQuery]);

  useEffect(() => {
    if (isReady && isAdmin) void loadUsers(1, false);
  }, [isAdmin, isReady, loadUsers]);

  const changeFilter = (nextStatus: UserStatus | 'all') => {
    setStatusFilter(nextStatus);
    setPage(1);
  };

  const search = () => {
    setSubmittedQuery(query.trim());
    setPage(1);
  };

  const openDetails = async (item: AuthUser) => {
    setSelectedUser(item);
    try {
      const response = await getAdminUser(item.id);
      setSelectedUser(response.user);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể tải chi tiết sinh viên.');
    }
  };

  const saveProfile = async (input: Pick<AuthUser, 'name' | 'studentId' | 'major'>) => {
    if (!editingUser) return;
    try {
      const response = await updateAdminUserProfile(editingUser.id, input);
      setUsers((current) => current.map((item) => item.id === response.user.id ? response.user : item));
      setSelectedUser(response.user);
      setEditingUser(null);
    } catch (error) {
      Alert.alert('Không thể lưu', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    }
  };

  const confirmStatusChange = (item: AuthUser) => {
    const nextStatus: UserStatus = item.status === 'active' ? 'suspended' : 'active';
    Alert.alert(
      nextStatus === 'suspended' ? 'Khóa tài khoản?' : 'Mở tài khoản?',
      `${item.name} sẽ chuyển sang trạng thái ${nextStatus === 'suspended' ? 'bị khóa' : 'hoạt động'}.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          style: nextStatus === 'suspended' ? 'destructive' : 'default',
          onPress: () => void changeStatus(item, nextStatus),
        },
      ],
    );
  };

  const changeStatus = async (item: AuthUser, status: UserStatus) => {
    try {
      const response = await updateAdminUserStatus(item.id, status);
      setUsers((current) => current.map((entry) => entry.id === response.user.id ? response.user : entry));
      setSelectedUser(response.user);
    } catch (error) {
      Alert.alert('Không thể cập nhật', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    }
  };

  const renderItem = ({ item }: { item: AuthUser }) => (
    <View style={[styles.userCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
      <Pressable onPress={() => void openDetails(item)} style={styles.userInfo}>
        <View style={[styles.avatar, { backgroundColor: theme.primary.val }]}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.userCopy}>
          <Text style={[styles.userName, { color: theme.color.val }]}>{item.name}</Text>
          <Text style={[styles.userMeta, { color: theme.muted.val }]}>{item.studentId} · {item.email}</Text>
          <Text style={[styles.status, { color: item.status === 'active' ? '#15803D' : theme.danger.val }]}>
            {item.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}
          </Text>
        </View>
      </Pressable>
      <View style={styles.cardActions}>
        <Pressable onPress={() => setEditingUser(item)} style={[styles.secondaryButton, { borderColor: theme.border.val }]}>
          <Text style={[styles.secondaryButtonText, { color: theme.color.val }]}>Sửa</Text>
        </Pressable>
        <Pressable onPress={() => confirmStatusChange(item)} style={[styles.secondaryButton, { borderColor: item.status === 'active' ? theme.danger.val : theme.primary.val }]}>
          <Text style={[styles.secondaryButtonText, { color: item.status === 'active' ? theme.danger.val : theme.primary.val }]}>
            {item.status === 'active' ? 'Khóa' : 'Mở'}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  if (!isReady) {
    return <Screen><ActivityIndicator color={theme.primary.val} /></Screen>;
  }

  if (!isAdmin) {
    return (
      <Screen>
        <StatusMessage
          title="Không có quyền truy cập"
          message="Chỉ admin remote đang hoạt động mới được quản lý sinh viên."
          actionLabel="Quay lại"
          onAction={() => router.replace('/(tabs)')}
        />
      </Screen>
    );
  }

  const empty = !isLoading && !errorMessage && users.length === 0;
  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={[styles.back, { color: theme.primary.val }]}>‹ Quay lại</Text></Pressable>
        <Text style={[styles.eyebrow, { color: theme.primary.val }]}>QUẢN TRỊ</Text>
        <Text style={[styles.title, { color: theme.color.val }]}>Quản lý sinh viên</Text>
        <Text style={[styles.subtitle, { color: theme.muted.val }]}>Xem, chỉnh sửa và quản lý trạng thái tài khoản.</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          placeholder="Tìm tên, email hoặc mã sinh viên"
          placeholderTextColor={theme.muted.val}
          returnKeyType="search"
          style={[styles.searchInput, { backgroundColor: theme.surface.val, borderColor: theme.border.val, color: theme.color.val }]}
        />
        <Pressable onPress={search} style={[styles.searchButton, { backgroundColor: theme.primary.val }]}>
          <Text style={styles.searchButtonText}>Tìm</Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        {(['all', 'active', 'suspended'] as const).map((filter) => (
          <Pressable key={filter} onPress={() => changeFilter(filter)} style={[styles.filter, { borderColor: statusFilter === filter ? theme.primary.val : theme.border.val }, statusFilter === filter && { backgroundColor: theme.primary.val }]}>
            <Text style={{ color: statusFilter === filter ? '#FFFFFF' : theme.color.val, fontWeight: '700' }}>
              {filter === 'all' ? 'Tất cả' : filter === 'active' ? 'Hoạt động' : 'Đã khóa'}
            </Text>
          </Pressable>
        ))}
      </View>

      {errorMessage ? (
        <StatusMessage title="Không tải được dữ liệu" message={errorMessage} actionLabel="Thử lại" onAction={() => void loadUsers(1, false)} />
      ) : empty ? (
        <StatusMessage title="Chưa có sinh viên" message="Không tìm thấy tài khoản phù hợp." />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); void loadUsers(1, false); }} tintColor={theme.primary.val} />}
          onEndReached={() => { if (hasMore && !isLoadingMore) void loadUsers(page + 1, true); }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator color={theme.primary.val} /> : undefined}
        />
      )}

      <UserDetailsModal user={selectedUser} onClose={() => setSelectedUser(null)} onEdit={() => { setEditingUser(selectedUser); setSelectedUser(null); }} onStatusChange={confirmStatusChange} />
      <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSave={saveProfile} />
    </Screen>
  );
}

function UserDetailsModal({ user, onClose, onEdit, onStatusChange }: { user: AuthUser | null; onClose: () => void; onEdit: () => void; onStatusChange: (user: AuthUser) => void }) {
  return (
    <Modal visible={Boolean(user)} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.detailsBackdrop}>
        <Pressable onPress={(event) => event.stopPropagation()} style={styles.detailsCard}>
          <Text style={styles.modalTitle}>Chi tiết sinh viên</Text>
          <Text style={styles.detailLabel}>Họ tên</Text><Text style={styles.detailValue}>{user?.name}</Text>
          <Text style={styles.detailLabel}>Mã sinh viên</Text><Text style={styles.detailValue}>{user?.studentId}</Text>
          <Text style={styles.detailLabel}>Email</Text><Text style={styles.detailValue}>{user?.email}</Text>
          <Text style={styles.detailLabel}>Ngành</Text><Text style={styles.detailValue}>{user?.major || 'Chưa cập nhật'}</Text>
          <Text style={styles.detailLabel}>Trạng thái</Text><Text style={styles.detailValue}>{user?.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}</Text>
          <View style={styles.modalActions}>
            <Pressable onPress={onClose}><Text style={styles.modalLink}>Đóng</Text></Pressable>
            {user ? <Pressable onPress={onEdit}><Text style={styles.modalLink}>Sửa hồ sơ</Text></Pressable> : null}
            {user ? <Pressable onPress={() => onStatusChange(user)}><Text style={styles.modalDanger}>{user.status === 'active' ? 'Khóa' : 'Mở'}</Text></Pressable> : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function EditUserModal({ user, onClose, onSave }: { user: AuthUser | null; onClose: () => void; onSave: (input: Pick<AuthUser, 'name' | 'studentId' | 'major'>) => Promise<void> }) {
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [major, setMajor] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(user?.name ?? '');
    setStudentId(user?.studentId ?? '');
    setMajor(user?.major ?? '');
  }, [user]);

  const submit = async () => {
    if (!name.trim() || !studentId.trim() || !major.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ tên, mã sinh viên và ngành.');
      return;
    }

    const nextProfile = {
      name: name.trim(),
      studentId: studentId.trim(),
      major: major.trim(),
    };
    const hasChanges = user
      && (nextProfile.name !== user.name
        || nextProfile.studentId !== user.studentId
        || nextProfile.major !== user.major);

    if (!hasChanges) {
      Alert.alert('Chưa có thay đổi', 'Bạn chưa thay đổi thông tin hồ sơ.');
      return;
    }

    Alert.alert(
      'Xác nhận thay đổi',
      'Bạn có chắc muốn lưu các thông tin hồ sơ mới không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => {
            setIsSaving(true);
            void onSave(nextProfile).finally(() => setIsSaving(false));
          },
        },
      ],
    );
  };

  return (
    <Modal visible={Boolean(user)} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.editBackdrop}
      >
        <Pressable onPress={onClose} style={styles.editDismissArea}>
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.editCard}>
            <ScrollView
              contentContainerStyle={styles.editScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalTitle}>Sửa hồ sơ</Text>
              {[['Họ tên', name, setName], ['Mã sinh viên', studentId, setStudentId], ['Ngành', major, setMajor]].map(([label, value, setter]) => (
                <View key={label as string} style={styles.field}>
                  <Text style={styles.detailLabel}>{label as string}</Text>
                  <TextInput
                    value={value as string}
                    onChangeText={setter as (value: string) => void}
                    style={styles.modalInput}
                    returnKeyType={label === 'Ngành' ? 'done' : 'next'}
                  />
                </View>
              ))}
              <View style={styles.modalActions}>
                <Pressable onPress={onClose} disabled={isSaving}><Text style={styles.modalLink}>Hủy</Text></Pressable>
                <Pressable onPress={() => void submit()} disabled={isSaving}><Text style={styles.modalLink}>{isSaving ? 'Đang lưu...' : 'Lưu'}</Text></Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { gap: 5, marginBottom: spacing.md },
  back: { fontSize: 15, fontWeight: '700', marginBottom: spacing.sm },
  eyebrow: { fontSize: 11, fontWeight: '900' },
  title: { fontSize: 26, fontWeight: '900' },
  subtitle: { fontSize: 13, lineHeight: 19 },
  searchRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  searchInput: { borderRadius: 12, borderWidth: 1, flex: 1, minHeight: 46, paddingHorizontal: 12 },
  searchButton: { alignItems: 'center', borderRadius: 12, justifyContent: 'center', paddingHorizontal: 16 },
  searchButtonText: { color: '#FFFFFF', fontWeight: '800' },
  filters: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  filter: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  userCard: { borderRadius: 16, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  userInfo: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  avatar: { alignItems: 'center', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  userCopy: { flex: 1, gap: 3 },
  userName: { fontSize: 15, fontWeight: '900' },
  userMeta: { fontSize: 11 },
  status: { fontSize: 11, fontWeight: '800' },
  cardActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  secondaryButton: { borderRadius: 9, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  secondaryButtonText: { fontSize: 12, fontWeight: '800' },
  modalBackdrop: { backgroundColor: 'rgba(0, 0, 0, 0.45)', flex: 1 },
  detailsBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.45)', flex: 1, justifyContent: 'center', padding: 20 },
  detailsCard: { backgroundColor: '#FFFFFF', borderRadius: 22, gap: 8, maxWidth: 520, padding: 20, width: '100%' },
  editBackdrop: { backgroundColor: 'rgba(0, 0, 0, 0.45)', flex: 1 },
  editDismissArea: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 20 },
  editCard: { backgroundColor: '#FFFFFF', borderRadius: 22, maxHeight: '90%', maxWidth: 520, width: '100%' },
  editScrollContent: { gap: 8, padding: 20 },
  modalScrollContent: { flexGrow: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, gap: 8, padding: 20, paddingBottom: 28 },
  modalTitle: { color: '#111827', fontSize: 20, fontWeight: '900', marginBottom: 8 },
  detailLabel: { color: '#6B7280', fontSize: 11, fontWeight: '700' },
  detailValue: { color: '#111827', fontSize: 14, fontWeight: '600', marginBottom: 5 },
  modalActions: { flexDirection: 'row', gap: 20, justifyContent: 'flex-end', marginTop: 12 },
  modalLink: { color: '#1F4E79', fontSize: 14, fontWeight: '800' },
  modalDanger: { color: '#B91C1C', fontSize: 14, fontWeight: '800' },
  field: { gap: 4 },
  modalInput: { borderColor: '#D1D5DB', borderRadius: 10, borderWidth: 1, color: '#111827', minHeight: 44, paddingHorizontal: 12 },
});
