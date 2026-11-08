import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@tamagui/core";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import {
  EVENT_CARD_GAP,
  EVENT_CARD_HEIGHT,
  EventCard,
} from "@/components/EventCard";
import { Screen } from "@/components/Screen";
import { StatusMessage } from "@/components/StatusMessage";
import { appMode } from "@/constants/app-mode";
import { colors, spacing } from "@/constants/app-theme";
import { eventCategories } from "@/data/events";
import { invalidateEventsCache } from "@/services/eventsApi";
import { getEvents } from "@/services/eventService";
import type { EventCategory, StudentEvent } from "@/types/events";

const PAGE_SIZE = 10;
const allCategories = "Tất cả" as const;
type CategoryFilter = EventCategory | typeof allCategories;

const chipIcons: Record<CategoryFilter, keyof typeof Ionicons.glyphMap> = {
  "Tất cả": "apps",
  "Học thuật": "school",
  CLB: "people",
  "Tình nguyện": "heart",
  "Giải trí": "musical-notes",
};

const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList<StudentEvent>,
);

/** Khung xương nhấp nháy khi đang tải lần đầu. */
function SkeletonCard() {
  const theme = useTheme();
  const pulse = useSharedValue(0.4);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 800 }), -1, true));
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[styles.skeleton, { backgroundColor: theme.surface.val }, style]}
    >
      <View
        style={[styles.skeletonCover, { backgroundColor: theme.border.val }]}
      />
      <View style={styles.skeletonBody}>
        <View
          style={[
            styles.skeletonLine,
            { backgroundColor: theme.border.val, width: "80%", height: 18 },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            { backgroundColor: theme.border.val, width: "55%" },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            { backgroundColor: theme.border.val, width: "65%" },
          ]}
        />
      </View>
    </Animated.View>
  );
}

function CategoryChip({
  label,
  selected,
  onPress,
}: {
  label: CategoryFilter;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View style={style}>
      <Pressable
        onPress={onPress}
        onPressIn={() => scale.set(withTiming(0.92, { duration: 90 }))}
        onPressOut={() => scale.set(withTiming(1, { duration: 140 }))}
        style={[
          styles.chip,
          { backgroundColor: theme.surface.val, borderColor: theme.border.val },
          selected && styles.chipSelected,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected }}
      >
        <Ionicons
          name={chipIcons[label]}
          size={14}
          color={selected ? "#FFFFFF" : theme.muted.val}
        />
        <Text
          style={[
            styles.chipText,
            { color: selected ? "#FFFFFF" : theme.muted.val },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function DiscoverScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{
    category?: string;
    focusSearch?: string;
    upcomingOnly?: string;
    organizer?: string;
  }>();
  const validCategory = eventCategories.includes(
    params.category as EventCategory,
  )
    ? (params.category as EventCategory)
    : allCategories;
  const [events, setEvents] = useState<StudentEvent[]>([]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>(validCategory);
  const [organizerFilter, setOrganizerFilter] = useState<string | undefined>(
    params.organizer ? String(params.organizer) : undefined,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "this_week" | "this_month"
  >("all");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const listRef = useRef<FlatList<StudentEvent>>(null);
  const searchInputRef = useRef<{ focus: () => void } | null>(null);
  const selectedCategory = category === allCategories ? undefined : category;
  const showUpcomingOnly = Array.isArray(params.upcomingOnly)
    ? params.upcomingOnly[0] === "1"
    : params.upcomingOnly === "1";

  // Chờ người dùng ngừng gõ 400ms rồi mới gọi service, tránh gọi lặp khi gõ nhanh
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setCategory(validCategory);
  }, [validCategory]);

  useEffect(() => {
    if (params.organizer) {
      setOrganizerFilter(String(params.organizer));
    }
  }, [params.organizer]);

  useEffect(() => {
    const shouldFocus = Array.isArray(params.focusSearch)
      ? params.focusSearch[0] === "1"
      : params.focusSearch === "1";

    if (!shouldFocus) {
      return undefined;
    }

    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
      setSearchFocused(true);
    }, 180);

    return () => clearTimeout(timer);
  }, [params.focusSearch]);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // Header thu gọn khi cuộn: tiêu đề lớn mờ dần và thu lại
  const heroStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, 80], [76, 0], Extrapolation.CLAMP),
    opacity: interpolate(scrollY.value, [0, 50], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, 80],
          [0, -16],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));
  const compactTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [40, 80], [0, 1], Extrapolation.CLAMP),
  }));
  const fabStyle = useAnimatedStyle(() => {
    const visible = scrollY.value > EVENT_CARD_HEIGHT * 1.5 ? 1 : 0;
    return {
      opacity: withTiming(visible, { duration: 200 }),
      transform: [{ scale: withTiming(visible ? 1 : 0.6, { duration: 200 }) }],
    };
  });

  const loadFirstPage = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);
      setLoadMoreError(null);
      try {
        const result = await getEvents({
          page: 1,
          pageSize: PAGE_SIZE,
          query: debouncedQuery,
          category: selectedCategory,
          organizer: organizerFilter,
          upcomingOnly: showUpcomingOnly,
        });
        setEvents(result.items);
        setPage(1);
        setHasMore(result.hasMore);
      } catch {
        setEvents([]);
        setHasMore(false);
        setError(
          "Không tải được danh sách sự kiện. Hãy kiểm tra kết nối và thử lại.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [debouncedQuery, selectedCategory, organizerFilter, showUpcomingOnly],
  );

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  useFocusEffect(
    useCallback(() => {
      if (appMode === "remote") {
        invalidateEventsCache();
        void loadFirstPage("refresh");
      }
    }, [loadFirstPage]),
  );

  const loadMore = useCallback(async () => {
    if (
      isLoading ||
      isRefreshing ||
      isLoadingMore ||
      !hasMore ||
      error ||
      loadMoreError
    )
      return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await getEvents({
        page: nextPage,
        pageSize: PAGE_SIZE,
        query: debouncedQuery,
        category: selectedCategory,
        organizer: organizerFilter,
        upcomingOnly: showUpcomingOnly,
      });
      setEvents((current) => [...current, ...result.items]);
      setPage(nextPage);
      setHasMore(result.hasMore);
    } catch {
      setLoadMoreError("Không tải thêm được sự kiện.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    debouncedQuery,
    error,
    hasMore,
    isLoading,
    isLoadingMore,
    isRefreshing,
    loadMoreError,
    organizerFilter,
    page,
    selectedCategory,
    showUpcomingOnly,
  ]);

  const retryLoadMore = useCallback(() => {
    setLoadMoreError(null);
    setRetryToken((value) => value + 1);
  }, []);

  // Sau khi xoá lỗi, thử tải lại trang kế tiếp với state mới nhất
  useEffect(() => {
    if (retryToken > 0) void loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryToken]);

  const displayedEvents = useMemo(() => {
    if (dateFilter === "all") return events;
    if (dateFilter === "today") {
      const now = new Date();
      return events.filter((ev) => {
        const d = new Date(ev.startsAt);
        return (
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });
    }
    if (dateFilter === "this_week") {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const next7 = new Date(now.getTime() + 7 * 86400000);
      return events.filter((ev) => {
        const d = new Date(ev.startsAt);
        return d >= now && d <= next7;
      });
    }
    if (dateFilter === "this_month") {
      const now = new Date();
      return events.filter((ev) => {
        const d = new Date(ev.startsAt);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      });
    }
    return events;
  }, [events, dateFilter]);

  const categories = useMemo<CategoryFilter[]>(
    () => [allCategories, ...eventCategories],
    [],
  );
  const isTyping = query !== debouncedQuery;

  const selectCategory = (item: CategoryFilter) => {
    if (item === category) return;
    setCategory(item);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.footerRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.footerMuted}>Đang tải thêm...</Text>
        </View>
      );
    }
    if (loadMoreError) {
      return (
        <Pressable onPress={retryLoadMore} style={styles.footerRow}>
          <Ionicons
            name="cloud-offline-outline"
            size={16}
            color={theme.muted.val}
          />
          <Text style={styles.footerMuted}>{loadMoreError}</Text>
          <Text style={styles.footerAction}>Thử lại</Text>
        </Pressable>
      );
    }
    if (!hasMore && events.length > 0) {
      return (
        <View style={styles.footerRow}>
          <View style={styles.footerLine} />
          <Text style={styles.footerDone}>
            Đã hiển thị hết {events.length} sự kiện
          </Text>
          <View style={styles.footerLine} />
        </View>
      );
    }
    return null;
  };

  return (
    <Screen>
      {/* Thanh tiêu đề gọn hiện ra khi cuộn */}
      <View style={styles.topBar}>
        <Animated.Text
          style={[
            styles.compactTitle,
            compactTitleStyle,
            { color: theme.color.val },
          ]}
        >
          Khám phá
        </Animated.Text>
      </View>

      {/* Tiêu đề lớn, thu gọn khi cuộn */}
      <Animated.View style={[styles.hero, heroStyle]}>
        <View style={styles.headerBrandRow}>
          <Image
            source={require("@/IMG/logo.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.headerTextWrap}>
            <Text style={styles.eyebrow}>TÌM HOẠT ĐỘNG MỚI</Text>
            <Text style={[styles.title, { color: theme.color.val }]}>
              Khám phá sự kiện
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Ô tìm kiếm + Lọc ngày + Quét QR Check-in */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: theme.surface.val,
              borderColor: searchFocused ? theme.primary.val : theme.border.val,
            },
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={searchFocused ? theme.color.val : theme.muted.val}
          />
          <TextInput
            ref={searchInputRef as any}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Tìm sự kiện, địa điểm, đơn vị..."
            placeholderTextColor={theme.muted.val}
            style={[styles.searchInput, { color: theme.color.val }]}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
            autoCorrect={false}
            autoFocus={
              Array.isArray(params.focusSearch)
                ? params.focusSearch[0] === "1"
                : params.focusSearch === "1"
            }
          />
          {isTyping ? (
            <ActivityIndicator size="small" color={theme.muted.val} />
          ) : query.length > 0 ? (
            <Pressable
              hitSlop={10}
              onPress={() => setQuery("")}
              accessibilityLabel="Xoá từ khoá"
            >
              <Ionicons name="close-circle" size={18} color={theme.muted.val} />
            </Pressable>
          ) : null}
        </View>

        {/* Compact Calendar Date Filter Button */}
        <Pressable
          onPress={() => setShowDatePicker((prev) => !prev)}
          style={[
            styles.dateFilterBtn,
            {
              backgroundColor:
                dateFilter !== "all" ? theme.primary.val : theme.surface.val,
              borderColor:
                dateFilter !== "all" ? theme.primary.val : theme.border.val,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Lọc theo ngày"
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={dateFilter !== "all" ? "#FFFFFF" : theme.color.val}
          />
        </Pressable>

        {/* QR Scan Button */}
        <Pressable
          onPress={() => router.push("/check-in")}
          style={[styles.qrScanBtn, { backgroundColor: theme.primary.val }]}
          accessibilityRole="button"
          accessibilityLabel="Quét mã QR Check-in"
        >
          <Ionicons name="qr-code-outline" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Date Filter Pills (Toggleable) */}
      {showDatePicker && (
        <View style={styles.dateFilterRow}>
          {[
            { id: "all" as const, label: "Tất cả" },
            { id: "today" as const, label: "Hôm nay" },
            { id: "this_week" as const, label: "7 ngày tới" },
            { id: "this_month" as const, label: "Tháng này" },
          ].map((item) => {
            const isSelected = dateFilter === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setDateFilter(item.id)}
                style={[
                  styles.datePill,
                  {
                    backgroundColor: isSelected
                      ? theme.primary.val
                      : theme.surface.val,
                    borderColor: isSelected
                      ? theme.primary.val
                      : theme.border.val,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.datePillText,
                    { color: isSelected ? "#FFFFFF" : theme.color.val },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Organizer active badge */}
      {organizerFilter ? (
        <View style={styles.activeOrganizerRow}>
          <View
            style={[
              styles.activeOrganizerChip,
              {
                backgroundColor: theme.surface.val,
                borderColor: theme.primary.val,
              },
            ]}
          >
            <Ionicons name="business" size={14} color={theme.primary.val} />
            <Text
              numberOfLines={1}
              style={[styles.activeOrganizerText, { color: theme.color.val }]}
            >
              Đơn vị: {organizerFilter}
            </Text>
            <Pressable
              hitSlop={8}
              onPress={() => setOrganizerFilter(undefined)}
              accessibilityLabel="Xoá lọc theo đơn vị"
            >
              <Ionicons
                name="close-circle"
                size={16}
                color={theme.primary.val}
              />
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Danh mục */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryList}
      >
        {categories.map((item) => (
          <CategoryChip
            key={item}
            label={item}
            selected={item === category}
            onPress={() => selectCategory(item)}
          />
        ))}
      </ScrollView>

      {/* Số kết quả */}
      {!isLoading && !error ? (
        <Animated.View entering={FadeIn.duration(250)} style={styles.resultRow}>
          <Text style={styles.resultText}>
            {displayedEvents.length}
            {hasMore ? "+" : ""} sự kiện
            {debouncedQuery ? (
              <Text
                style={styles.resultQuery}
              >{` cho “${debouncedQuery}”`}</Text>
            ) : null}
          </Text>
        </Animated.View>
      ) : null}

      {isLoading ? (
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <View style={styles.list}>
          <StatusMessage
            title="Có lỗi xảy ra"
            message={error}
            actionLabel="Thử lại"
            onAction={() => loadFirstPage()}
          />
        </View>
      ) : (
        <AnimatedFlatList
          ref={listRef}
          style={styles.list}
          data={displayedEvents}
          keyExtractor={(event) => event.id}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.delay(Math.min(index, 4) * 70).duration(380)}
            >
              <EventCard
                event={item}
                index={index}
                scrollY={scrollY}
                isLast={index === events.length - 1}
              />
            </Animated.View>
          )}
          contentContainerStyle={
            events.length ? styles.listContent : styles.emptyList
          }
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          bounces={false}
          overScrollMode="never"
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadFirstPage("refresh")}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.border}
            />
          }
          ListEmptyComponent={
            <StatusMessage
              title="Không tìm thấy sự kiện"
              message="Thử từ khoá khác hoặc chọn một danh mục khác."
              actionLabel={
                query || category !== allCategories ? "Xoá bộ lọc" : undefined
              }
              onAction={() => {
                setQuery("");
                setCategory(allCategories);
              }}
            />
          }
          ListFooterComponent={renderFooter() ?? undefined}
        />
      )}

      {/* Nút cuộn lên đầu */}
      <Animated.View pointerEvents="box-none" style={[styles.fab, fabStyle]}>
        <Pressable
          onPress={() =>
            listRef.current?.scrollToOffset({ offset: 0, animated: true })
          }
          style={styles.fabButton}
          accessibilityLabel="Cuộn lên đầu danh sách"
        >
          <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
        </Pressable>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: "center",
    height: 22,
    justifyContent: "center",
    marginTop: -spacing.xs,
  },
  compactTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  hero: {
    gap: 2,
    justifyContent: "flex-end",
    overflow: "hidden",
    paddingBottom: spacing.sm,
  },
  headerBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.sm,
  },
  searchBox: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    height: 48,
    paddingHorizontal: 12,
  },
  dateFilterBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  qrScanBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0D6EFD",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 3,
  },
  dateFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: spacing.sm,
  },
  datePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  datePillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  searchBoxFocused: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  activeOrganizerRow: {
    marginBottom: spacing.xs,
    flexDirection: "row",
  },
  activeOrganizerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: "100%",
  },
  activeOrganizerText: {
    fontSize: 12.5,
    fontWeight: "700",
    flexShrink: 1,
  },
  searchInput: { color: colors.text, flex: 1, fontSize: 15, height: "100%" },
  categoryScroll: { flexGrow: 0, marginHorizontal: -spacing.md, maxHeight: 44 },
  categoryList: { gap: spacing.xs, paddingHorizontal: spacing.md },
  chip: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { color: colors.mutedText, fontSize: 13, fontWeight: "700" },
  chipTextSelected: { color: "#FFFFFF" },
  resultRow: { marginBottom: spacing.xs, marginTop: spacing.sm },
  resultText: { color: colors.mutedText, fontSize: 12.5, fontWeight: "700" },
  resultQuery: { color: colors.text },
  list: { flex: 1, minHeight: 0 },
  listContent: { gap: EVENT_CARD_GAP, paddingBottom: spacing.xl },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  footerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  footerMuted: { color: colors.mutedText, fontSize: 13 },
  footerAction: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  footerLine: { backgroundColor: colors.border, flex: 1, height: 1 },
  footerDone: { color: colors.mutedText, fontSize: 12 },
  skeleton: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    height: 300,
    marginBottom: EVENT_CARD_GAP,
    marginTop: spacing.xs,
    overflow: "hidden",
  },
  skeletonCover: { backgroundColor: colors.border, height: 170 },
  skeletonBody: { gap: 10, padding: spacing.md },
  skeletonLine: { backgroundColor: colors.border, borderRadius: 6, height: 12 },
  fab: { bottom: spacing.lg, position: "absolute", right: spacing.lg },
  fabButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    elevation: 8,
    height: 46,
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    width: 46,
  },
});
