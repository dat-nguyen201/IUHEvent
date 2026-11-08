import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@tamagui/core';

import { fetchEventReviews, type EventReviewItem } from '@/services/reviewService';
import type { AdminEvent } from '@/types/admin-events';

interface AdminEventReviewsModalProps {
  visible: boolean;
  event: AdminEvent | null;
  onClose: () => void;
}

export function AdminEventReviewsModal({
  visible,
  event,
  onClose,
}: AdminEventReviewsModalProps) {
  const theme = useTheme();
  const [reviews, setReviews] = useState<EventReviewItem[]>([]);
  const [avgRating, setAvgRating] = useState(5.0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible || !event) return;
    setLoading(true);
    fetchEventReviews(event.id)
      .then((res) => {
        setReviews(res.data);
        setAvgRating(res.averageRating);
        setTotalCount(res.totalReviews);
      })
      .catch(() => {
        setReviews([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [visible, event]);

  if (!event) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={[styles.card, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border.val }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.eyebrow, { color: theme.primary.val }]}>KHẢO SÁT CHẤT LƯỢNG</Text>
              <Text style={[styles.title, { color: theme.color.val }]} numberOfLines={2}>
                {event.title}
              </Text>
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { borderColor: theme.border.val }]}>
              <Ionicons name="close" size={20} color={theme.color.val} />
            </Pressable>
          </View>

          {/* Banner Summary */}
          <View style={[styles.summaryBanner, { backgroundColor: theme.background.val, borderColor: theme.border.val }]}>
            <View style={styles.scoreWrap}>
              <Text style={[styles.scoreValue, { color: theme.color.val }]}>
                {avgRating.toFixed(1)}
              </Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons
                    key={s}
                    name={s <= Math.round(avgRating) ? 'star' : 'star-outline'}
                    size={14}
                    color="#F59E0B"
                  />
                ))}
              </View>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.summaryTitle, { color: theme.color.val }]}>
                {totalCount} lượt đánh giá từ sinh viên
              </Text>
              <Text style={[styles.summarySub, { color: theme.muted.val }]}>
                Đơn vị tổ chức: {event.organizer}
              </Text>
            </View>
          </View>

          {/* Reviews List */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.primary.val} />
              <Text style={{ marginTop: 10, color: theme.muted.val }}>Đang tải đánh giá...</Text>
            </View>
          ) : reviews.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="chatbubbles-outline" size={40} color={theme.muted.val} />
              <Text style={[styles.emptyText, { color: theme.muted.val }]}>
                Chưa có phản hồi nào cho sự kiện này.
              </Text>
            </View>
          ) : (
            <FlatList
              data={reviews}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={[styles.itemCard, { borderBottomColor: theme.border.val }]}>
                  <View style={styles.itemTopRow}>
                    <View style={styles.userRow}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{item.studentName.charAt(0)}</Text>
                      </View>
                      <View>
                        <Text style={[styles.userName, { color: theme.color.val }]}>{item.studentName}</Text>
                        <Text style={[styles.studentId, { color: theme.muted.val }]}>MSSV: {item.studentId}</Text>
                      </View>
                    </View>
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={13} color="#F59E0B" />
                      <Text style={styles.ratingBadgeText}>{item.rating}</Text>
                    </View>
                  </View>

                  <Text style={[styles.comment, { color: theme.color.val }]}>
                    {item.comment || '(Không có lời nhận xét)'}
                  </Text>

                  {item.tags && item.tags.length > 0 && (
                    <View style={styles.tagsRow}>
                      {item.tags.map((tag) => (
                        <View key={tag} style={[styles.tag, { backgroundColor: `${theme.primary.val}14` }]}>
                          <Text style={[styles.tagText, { color: theme.primary.val }]}>#{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            />
          )}

          {/* Bottom Action */}
          <View style={styles.bottomBar}>
            <Pressable
              style={[styles.doneBtn, { backgroundColor: theme.primary.val }]}
              onPress={onClose}
            >
              <Text style={styles.doneBtnText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    display: 'flex',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  scoreWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  summaryTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  summarySub: {
    fontSize: 11.5,
  },
  center: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  itemCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 6,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0D6EFD15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0D6EFD',
  },
  userName: {
    fontSize: 13,
    fontWeight: '800',
  },
  studentId: {
    fontSize: 11,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingBadgeText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#B45309',
  },
  comment: {
    fontSize: 13,
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bottomBar: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.15)',
  },
  doneBtn: {
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
