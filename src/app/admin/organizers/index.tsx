import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@tamagui/core';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import type { Organizer, OrganizerType } from '@/data/organizers';
import {
  createOrganizer,
  deleteCustomOrganizer,
  getAllOrganizers,
  type CreateOrganizerInput,
} from '@/services/organizerService';
import { getAdminUserError, updateOwnOrganizer } from '@/services/adminUserService';

const TYPE_OPTIONS: { value: OrganizerType; label: string }[] = [
  { value: 'faculty', label: 'Khoa chuyên ngành' },
  { value: 'union', label: 'Đoàn - Hội' },
  { value: 'club', label: 'CLB - Đội nhóm' },
  { value: 'center', label: 'Trung tâm trực thuộc' },
];

export default function AdminOrganizersScreen() {
  const { user, mode } = useAuth();
  const isOrganizer = user?.role === 'organizer';
  const canEditOrganizer = isOrganizer && mode === 'remote';
  const theme = useTheme();
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<OrganizerType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [createdAccount, setCreatedAccount] = useState<{ email: string; password: string } | null>(null);
  const [editingOrganizer, setEditingOrganizer] = useState<Organizer | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [type, setType] = useState<OrganizerType>('club');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');

  const resetForm = () => {
    setName('');
    setShortName('');
    setType('club');
    setDescription('');
    setEmail('');
    setLocation('');
    setFormError('');
  };

  const closeForm = () => {
    setModalVisible(false);
    setEditingOrganizer(null);
    resetForm();
  };

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setLoadError('');
    try {
      const list = await getAllOrganizers(user);
      setOrganizers(list);
    } catch (e) {
      console.warn('Cannot load organizers:', e);
      setLoadError(getAdminUserError(e));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const handleCreate = async () => {
    if (isOrganizer) return;
    if (!name.trim()) {
      setFormError('Vui lòng nhập tên đơn vị tổ chức.');
      return;
    }
    setFormError('');
    setIsSubmitting(true);
    try {
      const input: CreateOrganizerInput = {
        name: name.trim(),
        shortName: shortName.trim() || name.trim(),
        type,
        description: description.trim(),
        contactEmail: email.trim(),
        location: location.trim(),
        color: type === 'faculty' ? '#0D6EFD' : type === 'union' ? '#DC3545' : type === 'club' ? '#FD7E14' : '#20C997',
      };
      const result = await createOrganizer(input);
      setName('');
      setShortName('');
      setDescription('');
      setEmail('');
      setLocation('');
      setModalVisible(false);
      setCreatedAccount(result.account);
      await loadData();
    } catch (e) {
      console.warn(e);
      setFormError(getAdminUserError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (org: Organizer) => {
    setEditingOrganizer(org);
    setName(org.name);
    setShortName(org.shortName);
    setType(org.type);
    setDescription(org.description);
    setEmail(org.contactEmail || '');
    setLocation(org.location || '');
    setFormError('');
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!canEditOrganizer || !editingOrganizer) return;
    if (!name.trim() || !shortName.trim() || !email.trim()) {
      setFormError('Vui lòng nhập tên, tên viết tắt và email liên hệ.');
      return;
    }

    setFormError('');
    setIsSubmitting(true);
    try {
      await updateOwnOrganizer({
        name: name.trim(),
        shortName: shortName.trim(),
        description: description.trim(),
        contactEmail: email.trim(),
      });
      setModalVisible(false);
      setEditingOrganizer(null);
      resetForm();
      await loadData();
    } catch (e) {
      console.warn('Cannot update organizer profile:', e);
      setFormError(getAdminUserError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (org: Organizer) => {
    if (!org.id.startsWith('org-custom-')) return;
    try {
      await deleteCustomOrganizer(org.id);
      await loadData();
    } catch (e) {
      console.warn('Cannot delete organizer:', e);
    }
  };

  const filtered = organizers.filter((org) => {
    const matchesQuery =
      !query.trim() ||
      org.name.toLowerCase().includes(query.toLowerCase()) ||
      org.shortName.toLowerCase().includes(query.toLowerCase());
    const matchesType = selectedType === 'all' || org.type === selectedType;
    return matchesQuery && matchesType;
  });

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.iconBtn, { borderColor: theme.border.val, backgroundColor: theme.surface.val }]}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
          >
            <Ionicons name="arrow-back" size={20} color={theme.color.val} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.eyebrow, { color: theme.primary.val }]}>{isOrganizer ? 'TÀI KHOẢN ĐƠN VỊ' : 'QUẢN TRỊ IUH'}</Text>
            <Text style={[styles.heading, { color: theme.color.val }]}>{isOrganizer ? 'Đơn vị của tôi' : 'Đơn vị tổ chức'}</Text>
          </View>
          {!isOrganizer ? (
            <Pressable
              onPress={() => {
                resetForm();
                setEditingOrganizer(null);
                setModalVisible(true);
              }}
              style={[styles.addBtn, { backgroundColor: theme.primary.val }]}
              accessibilityRole="button"
              accessibilityLabel="Thêm đơn vị"
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.addBtnText}>Thêm mới</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Search */}
        {!isOrganizer ? <View style={[styles.searchBox, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
          <Ionicons name="search" size={18} color={theme.muted.val} />
          <TextInput
            placeholder="Tìm tên đơn vị, từ viết tắt..."
            placeholderTextColor={theme.muted.val}
            value={query}
            onChangeText={setQuery}
            style={[styles.searchInput, { color: theme.color.val }]}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.muted.val} />
            </Pressable>
          ) : null}
        </View> : null}

        {/* Filter Type Pills */}
        {!isOrganizer ? <View style={styles.typesRow}>
          <Pressable
            onPress={() => setSelectedType('all')}
            style={[
              styles.typePill,
              selectedType === 'all' && { backgroundColor: theme.primary.val },
              { borderColor: theme.border.val },
            ]}
          >
            <Text style={[styles.typePillText, selectedType === 'all' && { color: '#FFF' }]}>
              Tất cả ({organizers.length})
            </Text>
          </Pressable>
          {TYPE_OPTIONS.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setSelectedType(item.value)}
              style={[
                styles.typePill,
                selectedType === item.value && { backgroundColor: theme.primary.val },
                { borderColor: theme.border.val },
              ]}
            >
              <Text style={[styles.typePillText, selectedType === item.value && { color: '#FFF' }]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View> : null}
        {loadError ? <Text style={styles.formErrorText}>{loadError}</Text> : null}

        {/* Organizers List */}
        {isLoading && organizers.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.primary.val} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => loadData(true)}
                colors={[theme.primary.val]}
                tintColor={theme.primary.val}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="business-outline" size={44} color={theme.muted.val} />
                <Text style={[styles.emptyText, { color: theme.muted.val }]}>
                  Không tìm thấy đơn vị phù hợp.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isCustom = !isOrganizer && item.id.startsWith('org-custom-');
              const isRemote = /^[a-f\d]{24}$/i.test(item.id);
              return (
                <View
                  style={[
                    styles.orgCard,
                    { backgroundColor: theme.surface.val, borderColor: theme.border.val },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.avatarRow}>
                      <View style={[styles.avatarRing, { borderColor: item.color || theme.primary.val }]}>
                        <Image source={item.logo} style={styles.avatar} resizeMode="contain" />
                      </View>
                      <View style={styles.nameWrap}>
                        <View style={styles.titleLine}>
                          <Text numberOfLines={1} style={[styles.orgName, { color: theme.color.val }]}>
                            {item.name}
                          </Text>
                          {item.isVerified ? (
                            <Ionicons name="checkmark-circle" size={15} color="#0D6EFD" />
                          ) : null}
                        </View>
                        <Text style={[styles.orgShort, { color: theme.muted.val }]}>
                          {item.shortName} · {item.typeLabel}
                        </Text>
                      </View>
                    </View>
                    {isCustom ? (
                      <Pressable
                        onPress={() => void handleDelete(item)}
                        style={styles.deleteBtn}
                        hitSlop={8}
                        accessibilityLabel="Xóa đơn vị"
                      >
                        <Ionicons name="trash-outline" size={18} color="#DC3545" />
                      </Pressable>
                    ) : canEditOrganizer ? (
                      <Pressable
                        onPress={() => openEdit(item)}
                        style={styles.deleteBtn}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Chỉnh sửa thông tin đơn vị"
                      >
                        <Ionicons name="create-outline" size={19} color={theme.primary.val} />
                      </Pressable>
                    ) : !isOrganizer && !isRemote ? (
                      <View style={styles.systemBadge}>
                        <Text style={styles.systemBadgeText}>Hệ thống</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text numberOfLines={2} style={[styles.desc, { color: theme.muted.val }]}>
                    {item.description}
                  </Text>

                  <View style={styles.metaRow}>
                    {item.contactEmail ? (
                      <View style={styles.metaItem}>
                        <Ionicons name="mail-outline" size={13} color={theme.muted.val} />
                        <Text style={[styles.metaText, { color: theme.muted.val }]}>{item.contactEmail}</Text>
                      </View>
                    ) : null}
                    {item.location ? (
                      <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={13} color={theme.muted.val} />
                        <Text numberOfLines={1} style={[styles.metaText, { color: theme.muted.val }]}>
                          {item.location}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={[styles.cardFooter, { borderTopColor: theme.border.val }]}>
                    <Text style={[styles.eventCountText, { color: theme.primary.val }]}>
                      {item.eventCount} sự kiện đã diễn ra
                    </Text>
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)/discover',
                          params: { organizer: item.name },
                        })
                      }
                      style={styles.viewEventsBtn}
                    >
                      <Text style={[styles.viewEventsText, { color: theme.primary.val }]}>Xem sự kiện</Text>
                      <Ionicons name="arrow-forward" size={13} color={theme.primary.val} />
                    </Pressable>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Modal thêm hoặc cập nhật đơn vị */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => {
            closeForm();
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.color.val }]}>
                  {editingOrganizer ? 'Chỉnh sửa đơn vị của tôi' : 'Thêm đơn vị tổ chức'}
                </Text>
                <Pressable onPress={closeForm} hitSlop={10}>
                  <Ionicons name="close" size={22} color={theme.muted.val} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
                {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}

                <Text style={[styles.inputLabel, { color: theme.color.val }]}>Tên đơn vị đầy đủ *</Text>
                <TextInput
                  placeholder="Ví dụ: Khoa Quản trị Kinh doanh, CLB Robotics..."
                  placeholderTextColor={theme.muted.val}
                  value={name}
                  onChangeText={setName}
                  style={[styles.textInput, { color: theme.color.val, borderColor: theme.border.val }]}
                />

                <Text style={[styles.inputLabel, { color: theme.color.val }]}>Tên viết tắt *</Text>
                <TextInput
                  placeholder="Ví dụ: Khoa QTKD, CLB Robotics IUH..."
                  placeholderTextColor={theme.muted.val}
                  value={shortName}
                  onChangeText={setShortName}
                  style={[styles.textInput, { color: theme.color.val, borderColor: theme.border.val }]}
                />

                <Text style={[styles.inputLabel, { color: theme.color.val }]}>Phân loại đơn vị</Text>
                <View style={[styles.formTypeGrid, editingOrganizer && styles.disabledField]}>
                  {TYPE_OPTIONS.map((item) => (
                    <Pressable
                      key={item.value}
                      disabled={Boolean(editingOrganizer)}
                      onPress={() => setType(item.value)}
                      style={[
                        styles.formTypePill,
                        type === item.value && { backgroundColor: theme.primary.val, borderColor: theme.primary.val },
                        { borderColor: theme.border.val },
                      ]}
                    >
                      <Text
                        style={[
                          styles.formTypePillText,
                          type === item.value && { color: '#FFF', fontWeight: '800' },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { color: theme.color.val }]}>
                  {editingOrganizer ? 'Email liên hệ của đơn vị' : 'Email tài khoản / liên hệ'}
                </Text>
                <TextInput
                  placeholder={editingOrganizer ? 'Email liên hệ của đơn vị' : 'Để trống để tự tạo email theo tên đơn vị'}
                  placeholderTextColor={theme.muted.val}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  style={[styles.textInput, { color: theme.color.val, borderColor: theme.border.val }]}
                />

                <Text style={[styles.inputLabel, { color: theme.color.val }]}>Văn phòng / Địa điểm</Text>
                <TextInput
                  placeholder="Ví dụ: Lầu 3 Nhà D, IUH"
                  placeholderTextColor={theme.muted.val}
                  value={location}
                  onChangeText={setLocation}
                  editable={!editingOrganizer}
                  style={[
                    styles.textInput,
                    editingOrganizer && styles.disabledField,
                    { color: theme.color.val, borderColor: theme.border.val },
                  ]}
                />

                <Text style={[styles.inputLabel, { color: theme.color.val }]}>Mô tả giới thiệu</Text>
                <TextInput
                  placeholder="Giới thiệu mục tiêu hoạt động, các phong trào nổi bật..."
                  placeholderTextColor={theme.muted.val}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  style={[
                    styles.textInput,
                    styles.textArea,
                    { color: theme.color.val, borderColor: theme.border.val },
                  ]}
                />

                <View style={styles.modalActions}>
                  <Pressable
                    onPress={closeForm}
                    style={[styles.cancelBtn, { borderColor: theme.border.val }]}
                  >
                    <Text style={[styles.cancelBtnText, { color: theme.color.val }]}>Hủy</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void (editingOrganizer ? handleUpdate() : handleCreate())}
                    disabled={isSubmitting}
                    style={[styles.submitBtn, { backgroundColor: theme.primary.val }]}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        {editingOrganizer ? 'Lưu thay đổi' : 'Thêm đơn vị'}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
        <Modal
          visible={Boolean(createdAccount)}
          transparent
          animationType="fade"
          onRequestClose={() => setCreatedAccount(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
              <Text style={[styles.modalTitle, { color: theme.color.val }]}>Tài khoản đơn vị đã được tạo</Text>
              <Text style={[styles.desc, { color: theme.muted.val }]}>Hãy lưu thông tin đăng nhập này và gửi cho đơn vị. Mật khẩu sẽ không hiển thị lại.</Text>
              <Text selectable style={[styles.credential, { color: theme.color.val }]}>Email: {createdAccount?.email}</Text>
              <Text selectable style={[styles.credential, { color: theme.color.val }]}>Mật khẩu ban đầu: {createdAccount?.password}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setCreatedAccount(null)}
                style={[styles.credentialDismissButton, { backgroundColor: theme.primary.val }]}
              >
                <Text style={styles.credentialDismissText}>Đã lưu thông tin</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
  },
  heading: {
    fontSize: 22,
    fontWeight: '900',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  credential: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  typesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  typePillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
  },
  orgCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  nameWrap: {
    flex: 1,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orgName: {
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 1,
  },
  orgShort: {
    fontSize: 12,
    marginTop: 1,
  },
  deleteBtn: {
    padding: 6,
  },
  systemBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  systemBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  desc: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11.5,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  eventCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  viewEventsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewEventsText: {
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  formContent: {
    gap: 8,
    paddingBottom: 20,
  },
  formErrorText: {
    color: '#DC3545',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    marginTop: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  formTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  disabledField: {
    opacity: 0.55,
  },
  formTypePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  formTypePillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  credentialDismissButton: {
    alignSelf: 'stretch',
    minHeight: 48,
    marginTop: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  credentialDismissText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
});
