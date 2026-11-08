import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@tamagui/core';

import { Screen } from '@/components/Screen';
import { AttendancePassModal } from '@/components/AttendancePassModal';
import { EventCertificateModal } from '@/components/EventCertificateModal';
import { QRCodeView } from '@/components/QRCodeView';
import { useAppState } from '@/context/AppStateContext';
import {
  getOfflineTickets,
  removeOfflineTicket,
  type OfflineTicket,
} from '@/services/offlineTicketService';
import type { StudentEvent } from '@/types/events';

export default function OfflineTicketsScreen() {
  const theme = useTheme();
  const { user } = useAppState();

  const [tickets, setTickets] = useState<OfflineTicket[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPassEvent, setSelectedPassEvent] = useState<StudentEvent | null>(null);
  const [selectedCertEvent, setSelectedCertEvent] = useState<StudentEvent | null>(null);
  const [qrModalTicket, setQrModalTicket] = useState<OfflineTicket | null>(null);

  const loadTickets = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const list = await getOfflineTickets();
      setTickets(list);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTickets();
    }, [loadTickets])
  );

  const handleDeleteTicket = (ticket: OfflineTicket) => {
    Alert.alert(
      'Xóa vé ngoại tuyến',
      `Bạn có chắc muốn xóa vé "${ticket.title}" khỏi bộ nhớ ngoại tuyến trên máy?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vé',
          style: 'destructive',
          onPress: async () => {
            await removeOfflineTicket(ticket.eventId);
            setTickets((prev) => prev.filter((t) => t.eventId !== ticket.eventId));
          },
        },
      ]
    );
  };

  const toStudentEvent = (ticket: OfflineTicket): StudentEvent => ({
    id: ticket.eventId,
    title: ticket.title,
    description: `Sự kiện "${ticket.title}" do ${ticket.organizer} tổ chức tại ${ticket.location}.`,
    location: ticket.location,
    startsAt: ticket.startsAt,
    organizer: ticket.organizer,
    category: (ticket.category as any) || 'Học thuật',
    capacity: 200,
    checkedInCount: 45,
    image: require('@/IMG/logo.png'),
    summarySource: 'offline_ticket',
  });

  const renderTicketCard = ({ item }: { item: OfflineTicket }) => {
    const isCheckedIn = item.status === 'checked-in';
    const eventTimeStr = new Date(item.startsAt).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: theme.surface.val, borderColor: theme.border.val },
        ]}
      >
        {/* Card Header Status */}
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isCheckedIn ? '#ECFDF5' : '#EFF6FF',
                borderColor: isCheckedIn ? '#A7F3D0' : '#BFDBFE',
              },
            ]}
          >
            <Ionicons
              name={isCheckedIn ? 'shield-checkmark' : 'time'}
              size={14}
              color={isCheckedIn ? '#059669' : '#0D6EFD'}
            />
            <Text
              style={[
                styles.statusBadgeText,
                { color: isCheckedIn ? '#065F46' : '#1E40AF' },
              ]}
            >
              {isCheckedIn ? 'ĐÃ ĐIỂM DANH (+5đ ĐRL)' : 'ĐÃ ĐĂNG KÝ (SẴN SÀNG QUÉT)'}
            </Text>
          </View>

          <Pressable
            hitSlop={8}
            onPress={() => handleDeleteTicket(item)}
            accessibilityLabel="Xóa vé ngoại tuyến"
          >
            <Ionicons name="trash-outline" size={17} color={theme.muted.val} />
          </Pressable>
        </View>

        {/* Title & Info */}
        <Text style={[styles.eventTitle, { color: theme.color.val }]} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={15} color="#0D6EFD" />
          <Text style={[styles.metaText, { color: theme.color.val }]} numberOfLines={1}>
            {item.location}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={15} color="#64748B" />
          <Text style={[styles.metaText, { color: theme.muted.val }]}>
            {eventTimeStr}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="business-outline" size={15} color="#64748B" />
          <Text style={[styles.metaText, { color: theme.muted.val }]} numberOfLines={1}>
            {item.organizer}
          </Text>
        </View>

        {/* Ticket Actions */}
        <View style={styles.cardActionsRow}>
          <Pressable
            style={[styles.actionBtn, styles.actionPassBtn]}
            onPress={() => setSelectedPassEvent(toStudentEvent(item))}
          >
            <Ionicons name="qr-code-outline" size={16} color="#FFFFFF" />
            <Text style={styles.actionPassBtnText}>Thẻ điểm danh</Text>
          </Pressable>

          {isCheckedIn && (
            <Pressable
              style={[styles.actionBtn, styles.actionCertBtn]}
              onPress={() => setSelectedCertEvent(toStudentEvent(item))}
            >
              <Ionicons name="ribbon-outline" size={16} color="#92400E" />
              <Text style={styles.actionCertBtnText}>Giấy chứng nhận</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={theme.color.val} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.color.val }]}>
            Vé & Thẻ Điểm danh Ngoại tuyến
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.muted.val }]}>
            Offline-First Ticket Wallet
          </Text>
        </View>
      </View>

      {/* Offline Ready Banner */}
      <View style={styles.bannerWrap}>
        <LinearGradient
          colors={['#065F46', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bannerGradient}
        >
          <View style={styles.bannerIconWrap}>
            <Ionicons name="cloud-offline" size={22} color="#A7F3D0" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.bannerTitle}>CHẾ ĐỘ NGOẠI TUYẾN ĐANG BẬT</Text>
              <View style={styles.bannerPill}>
                <Text style={styles.bannerPillText}>SẴN SÀNG</Text>
              </View>
            </View>
            <Text style={styles.bannerDesc}>
              Vé của bạn được mã hóa lưu trữ trên máy. Bạn có thể mở thẻ để xuất trình điểm danh ngay cả khi hội trường mất sóng hoặc nghẽn Wi-Fi!
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* Tickets List */}
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.eventId}
        renderItem={renderTicketCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={loadTickets}
            colors={[theme.primary.val]}
            tintColor={theme.primary.val}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="ticket-outline" size={42} color={theme.muted.val} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.color.val }]}>
              Chưa có vé ngoại tuyến nào
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.muted.val }]}>
              Khi bạn bấm "Đăng ký" hoặc "Điểm danh" bất kỳ sự kiện nào, hệ thống sẽ tự động tải và lưu bản sao vé vào máy của bạn để sử dụng khi mất mạng.
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)/discover')}
              style={[styles.exploreBtn, { backgroundColor: theme.primary.val }]}
            >
              <Text style={styles.exploreBtnText}>Khám phá sự kiện ngay</Text>
            </Pressable>
          </View>
        }
      />

      {/* Attendance Pass Modal for Offline Ticket */}
      {selectedPassEvent && (
        <AttendancePassModal
          visible={Boolean(selectedPassEvent)}
          event={selectedPassEvent}
          user={user}
          isAlreadyCheckedIn={true}
          onClose={() => setSelectedPassEvent(null)}
        />
      )}

      {/* Certificate Modal for Offline Ticket */}
      {selectedCertEvent && (
        <EventCertificateModal
          visible={Boolean(selectedCertEvent)}
          event={selectedCertEvent}
          user={user}
          onClose={() => setSelectedCertEvent(null)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },

  bannerWrap: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  bannerGradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 14,
  },
  bannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ECFDF5',
    letterSpacing: 0.5,
  },
  bannerPill: {
    backgroundColor: '#34D399',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bannerPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#064E3B',
  },
  bannerDesc: {
    fontSize: 11,
    color: '#D1FAE5',
    lineHeight: 16,
    marginTop: 2,
  },

  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionPassBtn: {
    backgroundColor: '#0D6EFD',
  },
  actionPassBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionCertBtn: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  actionCertBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  exploreBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  exploreBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
