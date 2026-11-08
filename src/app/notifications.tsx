import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@tamagui/core';

import { Screen } from '@/components/Screen';
import { StatusMessage } from '@/components/StatusMessage';
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type AppNotification as RemoteNotification,
} from '@/services/notificationService';

export interface AppNotification {
  id: string;
  type: 'event' | 'point' | 'system';
  title: string;
  body: string;
  time: string;
  read: boolean;
  eventId?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

type NotifFilter = 'all' | 'event' | 'point' | 'system';

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  } catch {
    return 'Gần đây';
  }
}

function mapRemoteNotification(n: RemoteNotification): AppNotification {
  const icon: keyof typeof Ionicons.glyphMap =
    n.type === 'point' ? 'ribbon' : n.type === 'event' ? 'calendar' : 'shield-checkmark';
  const color =
    n.type === 'point' ? '#F59E0B' : n.type === 'event' ? '#0D6EFD' : '#10B981';

  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    time: formatRelativeTime(n.createdAt),
    read: n.read,
    eventId: n.eventId,
    icon,
    color,
  };
}

export default function NotificationsScreen() {
  const theme = useTheme();
  const [list, setList] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<NotifFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetchNotifications();
      setList(res.data.map(mapRemoteNotification));
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const unreadCount = list.filter((n) => !n.read).length;

  const markAllAsRead = async () => {
    setList((prev) => prev.map((item) => ({ ...item, read: true })));
    try {
      await markAllNotificationsAsRead();
    } catch {
      // ignore
    }
  };

  const handlePressItem = async (item: AppNotification) => {
    if (!item.read) {
      setList((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)),
      );
      try {
        await markNotificationAsRead(item.id);
      } catch {
        // ignore
      }
    }
    if (item.eventId) {
      router.push({ pathname: '/events/[id]', params: { id: item.eventId } });
    }
  };

  const filtered = list.filter((item) => filter === 'all' || item.type === filter);

  const filterTabs: { id: NotifFilter; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'event', label: 'Sự kiện' },
    { id: 'point', label: 'Điểm rèn luyện' },
    { id: 'system', label: 'Hệ thống' },
  ];

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { borderColor: theme.border.val, backgroundColor: theme.surface.val }]}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={20} color={theme.color.val} />
          </Pressable>

          <View style={styles.headerBrandRow}>
            <Image
              source={require('@/IMG/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.headerTextWrap}>
              <Text style={[styles.eyebrow, { color: theme.primary.val }]}>THÔNG BÁO IUH</Text>
              <Text style={[styles.title, { color: theme.color.val }]}>Hộp thư</Text>
            </View>
          </View>

          {unreadCount > 0 && (
            <Pressable
              onPress={markAllAsRead}
              style={[styles.readAllBtn, { borderColor: theme.border.val, backgroundColor: theme.surface.val }]}
            >
              <Ionicons name="checkmark-done" size={16} color={theme.primary.val} />
              <Text style={[styles.readAllText, { color: theme.primary.val }]}>Đã đọc</Text>
            </Pressable>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {filterTabs.map((tab) => {
            const isSelected = filter === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setFilter(tab.id)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? theme.primary.val : theme.surface.val,
                    borderColor: isSelected ? theme.primary.val : theme.border.val,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isSelected ? '#FFFFFF' : theme.color.val },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Notifications List */}
        {loading && !refreshing ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color={theme.primary.val} />
            <Text style={{ marginTop: 10, color: theme.muted.val }}>Đang tải thông báo...</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void loadData(true)}
                tintColor={theme.primary.val}
              />
            }
            ListEmptyComponent={
              <StatusMessage
                title="Không có thông báo nào"
                message="Bạn đã xem hết các thông báo mới từ nhà trường và các câu lạc bộ."
              />
            }
            renderItem={({ item }) => (
            <Pressable
              onPress={() => handlePressItem(item)}
              style={[
                styles.notifCard,
                {
                  backgroundColor: item.read ? theme.surface.val : `${theme.primary.val}08`,
                  borderColor: item.read ? theme.border.val : `${theme.primary.val}40`,
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>

              <View style={styles.textWrap}>
                <View style={styles.cardTopRow}>
                  <Text style={[styles.cardTitle, { color: theme.color.val }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!item.read && <View style={styles.unreadDot} />}
                </View>

                <Text style={[styles.cardBody, { color: theme.muted.val }]} numberOfLines={3}>
                  {item.body}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={[styles.timeText, { color: theme.muted.val }]}>🕒 {item.time}</Text>
                  {item.eventId && (
                    <Text style={[styles.linkAction, { color: theme.primary.val }]}>
                      Xem sự kiện →
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  readAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  readAllText: {
    fontSize: 12,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  notifCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  cardBody: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  linkAction: {
    fontSize: 11,
    fontWeight: '800',
  },
  loadingCenter: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
