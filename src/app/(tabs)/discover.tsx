import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { EventCard } from '@/components/EventCard';
import { Screen } from '@/components/Screen';
import { StatusMessage } from '@/components/StatusMessage';
import { colors, spacing } from '@/constants/app-theme';
import { eventCategories } from '@/data/events';
import { getEvents } from '@/services/eventService';
import type { EventCategory, StudentEvent } from '@/types/events';

const PAGE_SIZE = 5;
const allCategories = 'Tất cả' as const;

export default function DiscoverScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const validCategory = eventCategories.includes(params.category as EventCategory) ? params.category as EventCategory : allCategories;
  const [events, setEvents] = useState<StudentEvent[]>([]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<EventCategory | typeof allCategories>(validCategory);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const selectedCategory = category === allCategories ? undefined : category;

  // Chờ người dùng ngừng gõ 400ms rồi mới gọi service, tránh gọi lặp khi gõ nhanh
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  useEffect(() => { setCategory(validCategory); }, [validCategory]);

  const loadFirstPage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setLoadMoreError(null);
    try {
      const result = await getEvents({ page: 1, pageSize: PAGE_SIZE, query: debouncedQuery, category: selectedCategory });
      setEvents(result.items);
      setPage(1);
      setHasMore(result.hasMore);
    } catch {
      setEvents([]);
      setHasMore(false);
      setError('Không tải được danh sách sự kiện. Hãy thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, selectedCategory]);

  useEffect(() => { void loadFirstPage(); }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !hasMore || error || loadMoreError) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await getEvents({ page: nextPage, pageSize: PAGE_SIZE, query: debouncedQuery, category: selectedCategory });
      setEvents((current) => [...current, ...result.items]);
      setPage(nextPage);
      setHasMore(result.hasMore);
    } catch {
      setLoadMoreError('Không tải thêm được sự kiện.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [debouncedQuery, error, hasMore, isLoading, isLoadingMore, loadMoreError, page, selectedCategory]);

  const [retryToken, setRetryToken] = useState(0);
  const retryLoadMore = useCallback(() => {
    setLoadMoreError(null);
    setRetryToken((value) => value + 1);
  }, []);

  // Sau khi xoá lỗi, thử tải lại trang kế tiếp với state mới nhất
  useEffect(() => {
    if (retryToken > 0) void loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryToken]);

  const renderFooter = () => {
    if (isLoadingMore) return <ActivityIndicator style={styles.footer} color={colors.primary} />;
    if (loadMoreError) {
      return (
        <Pressable onPress={retryLoadMore} style={styles.footerRow}>
          <Text style={styles.footerError}>{loadMoreError} </Text>
          <Text style={styles.footerAction}>Thử lại</Text>
        </Pressable>
      );
    }
    if (!hasMore && events.length > 0) {
      return <Text style={styles.footerDone}>Đã hiển thị hết {events.length} sự kiện</Text>;
    }
    return null;
  };

  const categories = useMemo(() => [allCategories, ...eventCategories], []);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>TÌM HOẠT ĐỘNG MỚI</Text>
        <Text style={styles.title}>Khám phá sự kiện</Text>
        <Text style={styles.subtitle}>Chọn một trải nghiệm dành cho bạn ở IUH.</Text>
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Tìm sự kiện hoặc địa điểm"
        placeholderTextColor={colors.mutedText}
        style={styles.searchInput}
        returnKeyType="search"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryList}>
        {categories.map((item) => {
          const selected = item === category;
          return (
            <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, selected && styles.chipSelected]}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={styles.state}><ActivityIndicator color={colors.primary} /><Text style={styles.stateText}>Đang tải sự kiện...</Text></View>
      ) : error ? (
        <View style={styles.list}><StatusMessage title="Có lỗi xảy ra" message={error} actionLabel="Thử lại" onAction={loadFirstPage} /></View>
      ) : (
        <Animated.FlatList
          style={styles.list}
          data={events}
          keyExtractor={(event) => event.id}
          renderItem={({ item, index }) => <EventCard event={item} index={index} scrollY={scrollY} isLast={index === events.length - 1} />}
          contentContainerStyle={events.length ? styles.listContent : styles.emptyList}
          showsVerticalScrollIndicator={false}
          bounces={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          ListEmptyComponent={<StatusMessage title="Chưa có sự kiện phù hợp" message="Thử từ khóa khác hoặc chọn một danh mục khác." />}
          ListFooterComponent={renderFooter()}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4, marginBottom: spacing.md },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  title: { color: colors.text, fontSize: 26, fontWeight: '900' },
  subtitle: { color: colors.mutedText, fontSize: 14, lineHeight: 20 },
  searchInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 13, borderWidth: 1, color: colors.text, fontSize: 15, marginBottom: spacing.sm, minHeight: 50, paddingHorizontal: spacing.md },
  categoryScroll: { flexGrow: 0, marginBottom: spacing.sm, maxHeight: 48 },
  categoryList: { gap: spacing.xs, paddingBottom: spacing.xs, paddingRight: spacing.md },
  chip: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, justifyContent: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.mutedText, fontSize: 12, fontWeight: '700' },
  chipTextSelected: { color: '#FFFFFF' },
  list: { flex: 1, minHeight: 0 },
  listContent: { gap: spacing.md, paddingBottom: spacing.xl },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  state: { alignItems: 'center', flex: 1, gap: spacing.sm, justifyContent: 'center' },
  stateText: { color: colors.mutedText },
  footer: { paddingVertical: spacing.md },
  footerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', paddingVertical: spacing.md },
  footerError: { color: colors.mutedText, fontSize: 13 },
  footerAction: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  footerDone: { color: colors.mutedText, fontSize: 12, paddingVertical: spacing.md, textAlign: 'center' },
});
