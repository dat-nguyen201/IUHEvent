import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@tamagui/core';
import type { AuthUser } from '@/types/auth';
import { fetchEventReviews, submitEventReview, type EventReviewItem } from '@/services/reviewService';

export interface EventReview {
  id: string;
  userName: string;
  userStudentId?: string;
  rating: number;
  comment: string;
  tags?: string[];
  createdAt: string;
}

const QUICK_TAGS = ['Nội dung bổ ích', 'Diễn giả nhiệt tình', 'Tổ chức chu đáo', 'Hội trường đẹp', 'Âm thanh tốt'];

interface EventReviewsProps {
  eventId: string;
  currentUser?: AuthUser | null;
  hasCheckedIn?: boolean;
}

export function EventReviews({ eventId, currentUser, hasCheckedIn = false }: EventReviewsProps) {
  const theme = useTheme();

  const [reviews, setReviews] = useState<EventReview[]>([]);
  const [avgRating, setAvgRating] = useState('5.0');
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchEventReviews(eventId);
      setReviews(
        res.data.map((r: EventReviewItem) => ({
          id: r.id,
          userName: r.studentName,
          userStudentId: r.studentId,
          rating: r.rating,
          comment: r.comment,
          tags: r.tags,
          createdAt: new Date(r.createdAt).toLocaleDateString('vi-VN'),
        })),
      );
      setAvgRating(res.averageRating.toFixed(1));
      setTotalCount(res.totalReviews);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Alert.alert('Nhập nhận xét', 'Vui lòng chia sẻ đôi lời cảm nhận của bạn về sự kiện.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitEventReview(eventId, {
        rating,
        comment: comment.trim(),
        tags: selectedTags,
      });

      const newRev: EventReview = {
        id: `rev-${Date.now()}`,
        userName: currentUser?.name || 'Sinh viên IUH',
        userStudentId: currentUser?.studentId,
        rating,
        comment: comment.trim(),
        tags: selectedTags,
        createdAt: 'Vừa xong',
      };

      setReviews((prev) => [newRev, ...prev.filter((r) => r.userStudentId !== currentUser?.studentId)]);
      setComment('');
      setSelectedTags([]);
      setShowForm(false);
      Alert.alert('Cảm ơn bạn!', 'Đánh giá của bạn đã được lưu vào hệ thống và hiển thị công khai.');
      void loadReviews();
    } catch (e) {
      Alert.alert('Không thể gửi đánh giá', e instanceof Error ? e.message : 'Vui lòng đăng nhập để gửi đánh giá.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
      {/* Header Summary */}
      <View style={styles.header}>
        <View style={styles.scoreCol}>
          <Text style={[styles.avgScore, { color: theme.color.val }]}>{avgRating}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= Math.round(Number(avgRating)) ? 'star' : 'star-outline'}
                size={16}
                color="#F59E0B"
              />
            ))}
          </View>
          <Text style={[styles.reviewCount, { color: theme.muted.val }]}>
            {totalCount > 0 ? totalCount : reviews.length} đánh giá từ sinh viên
          </Text>
        </View>

        <Pressable
          style={[styles.writeBtn, { backgroundColor: theme.primary.val }]}
          onPress={() => setShowForm((prev) => !prev)}
          accessibilityRole="button"
        >
          <Ionicons name={showForm ? 'close' : 'create-outline'} size={16} color="#FFFFFF" />
          <Text style={styles.writeBtnText}>{showForm ? 'Đóng' : 'Viết đánh giá'}</Text>
        </Pressable>
      </View>

      {/* Review Form */}
      {showForm && (
        <View style={[styles.formCard, { backgroundColor: theme.background.val, borderColor: theme.border.val }]}>
          <Text style={[styles.formTitle, { color: theme.color.val }]}>
            Đánh giá của bạn {hasCheckedIn && <Text style={{ color: '#10B981', fontSize: 11 }}>(Đã xác nhận tham gia)</Text>}
          </Text>

          {/* Star selector */}
          <View style={styles.starSelectRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)} hitSlop={6}>
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={32}
                  color="#F59E0B"
                />
              </Pressable>
            ))}
            <Text style={[styles.starDesc, { color: theme.color.val }]}>
              {rating === 5 ? 'Tuyệt vời' : rating === 4 ? 'Rất tốt' : rating === 3 ? 'Bình thường' : rating === 2 ? 'Cần cải thiện' : 'Kém'}
            </Text>
          </View>

          {/* Quick tags */}
          <View style={styles.tagsRow}>
            {QUICK_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  style={[
                    styles.tagPill,
                    {
                      backgroundColor: active ? theme.primary.val : theme.surface.val,
                      borderColor: active ? theme.primary.val : theme.border.val,
                    },
                  ]}
                >
                  <Text style={[styles.tagText, { color: active ? '#FFFFFF' : theme.color.val }]}>
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Text Input */}
          <TextInput
            placeholder="Chia sẻ cảm nhận, ý kiến đóng góp của bạn về sự kiện..."
            placeholderTextColor={theme.muted.val}
            value={comment}
            onChangeText={setComment}
            multiline
            style={[
              styles.input,
              {
                backgroundColor: theme.surface.val,
                borderColor: theme.border.val,
                color: theme.color.val,
              },
            ]}
          />

          <Pressable
            style={[styles.submitBtn, { backgroundColor: theme.primary.val, opacity: isSubmitting ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>Gửi đánh giá</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Review List */}
      <View style={styles.list}>
        {isLoading && reviews.length === 0 ? (
          <ActivityIndicator size="small" color={theme.primary.val} style={{ marginVertical: 12 }} />
        ) : (
          reviews.map((rev) => (
          <View
            key={rev.id}
            style={[styles.reviewItem, { borderTopColor: theme.border.val }]}
          >
            <View style={styles.revHeader}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>{rev.userName.charAt(0)}</Text>
              </View>
              <View style={styles.revUserInfo}>
                <Text style={[styles.userName, { color: theme.color.val }]}>{rev.userName}</Text>
                <View style={styles.revMetaRow}>
                  <View style={styles.itemStars}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons
                        key={s}
                        name={s <= rev.rating ? 'star' : 'star-outline'}
                        size={12}
                        color="#F59E0B"
                      />
                    ))}
                  </View>
                  <Text style={[styles.revTime, { color: theme.muted.val }]}>· {rev.createdAt}</Text>
                </View>
              </View>
            </View>

            {rev.tags && rev.tags.length > 0 && (
              <View style={styles.revTagsRow}>
                {rev.tags.map((t) => (
                  <View key={t} style={[styles.revTagBadge, { backgroundColor: `${theme.primary.val}15` }]}>
                    <Text style={[styles.revTagBadgeText, { color: theme.primary.val }]}>#{t}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={[styles.commentText, { color: theme.color.val }]}>{rev.comment}</Text>
          </View>
        )))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreCol: {
    gap: 3,
  },
  avgScore: {
    fontSize: 28,
    fontWeight: '900',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  reviewCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  writeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
  },
  writeBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  starSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starDesc: {
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  input: {
    minHeight: 70,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  submitBtn: {
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  list: {
    gap: 12,
  },
  reviewItem: {
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  revHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0D6EFD20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#0D6EFD',
    fontSize: 14,
    fontWeight: '900',
  },
  revUserInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 13,
    fontWeight: '800',
  },
  revMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemStars: {
    flexDirection: 'row',
    gap: 2,
  },
  revTime: {
    fontSize: 11,
  },
  revTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  revTagBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  revTagBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
