import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';

import { Badge } from '@/components/Badge';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/app-theme';
import { useAppState } from '@/context/AppStateContext';
import { eventCategories } from '@/data/events';
import { formatEventDate, isFutureEvent } from '@/utils/date';
import type { StudentEvent } from '@/types/events';
import { getEvents } from '@/services/eventService';

const categoryColors = ['#E6F0FF', '#E7F6ED', '#FFF2D9', '#FBE9EF'];

export default function HomeScreen() {
  const { user, savedEventIds, checkedInEventIds } = useAppState();
  
  const [upcomingEvents, setUpcomingEvents] = useState<StudentEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      setIsLoading(true);
      try {
        const result = await getEvents({ page: 1, pageSize: 10 });
        const futureEvents = result.items
          .filter((event) => isFutureEvent(event.startsAt))
          .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
        setUpcomingEvents(futureEvents);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadHomeData();
  }, []);

  const featured = upcomingEvents[0];

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 10, color: colors.mutedText }}>Đang tải sự kiện...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.greeting}>
            <Text style={styles.eyebrow}>IUH EVENT</Text>
            <Text style={styles.greetingTitle}>Chào {user?.name.split(' ').at(-1) ?? 'bạn'}!</Text>
            <Text style={styles.subtitle}>Hôm nay bạn muốn tham gia điều gì?</Text>
          </View>
          <Pressable onPress={() => router.push('/(tabs)/profile')} style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name.charAt(0) ?? 'S'}</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/(tabs)/discover')} style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <Text style={styles.searchPlaceholder}>Tìm sự kiện, địa điểm...</Text>
          <Text style={styles.searchFilter}>☷</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/check-in')} style={styles.quickQrBanner}>
          <View style={styles.quickQrIconWrap}>
            <Text style={styles.quickQrIcon}>📷</Text>
          </View>
          <View style={styles.quickQrTextWrap}>
            <Text style={styles.quickQrTitle}>Quét mã QR Check-in</Text>
            <Text style={styles.quickQrSub}>Điểm danh nhanh sự kiện bạn đang tham gia</Text>
          </View>
          <Text style={styles.quickQrChevron}>›</Text>
        </Pressable>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Sự kiện sắp tới</Text>
          <Pressable onPress={() => router.push('/(tabs)/discover')}><Text style={styles.link}>Xem tất cả</Text></Pressable>
        </View>
        {featured ? <FeaturedEvent event={featured} /> : <View style={styles.noEvent}><Text style={styles.noEventText}>Chưa có sự kiện sắp tới.</Text></View>}

        <View style={styles.statsRow}>
          <Pressable onPress={() => router.push('/(tabs)/schedule')} style={styles.statItem}>
            <Text style={styles.statValue}>{savedEventIds.length}</Text>
            <Text style={styles.statLabel}>Đã lưu</Text>
          </Pressable>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{checkedInEventIds.length}</Text>
            <Text style={styles.statLabel}>Đã check-in</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{upcomingEvents.length}</Text>
            <Text style={styles.statLabel}>Sắp diễn ra</Text>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Danh mục</Text>
          <Text style={styles.sectionHint}>Chọn chủ đề bạn thích</Text>
        </View>
        <View style={styles.categoryGrid}>
          {eventCategories.map((category, index) => (
            <Pressable
              key={category}
              onPress={() => router.push({ pathname: '/(tabs)/discover', params: { category } })}
              style={[styles.categoryTile, { backgroundColor: categoryColors[index] }]}>
              <Text style={styles.categoryDot}>{['✦', '◎', '♡', '♫'][index]}</Text>
              <Text style={styles.categoryLabel}>{category}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Có thể bạn quan tâm</Text>
          <Pressable onPress={() => router.push('/(tabs)/discover')}><Text style={styles.link}>Khám phá</Text></Pressable>
        </View>
        {upcomingEvents.slice(1, 4).map((event) => <SmallEvent key={event.id} event={event} />)}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </Screen>
  );
}

function FeaturedEvent({ event }: { event: StudentEvent }) {
  return (
    <Pressable onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })} style={styles.featuredWrap}>
      <ImageBackground source={event.image} resizeMode="cover" style={styles.featured} imageStyle={styles.featuredImage}>
        <View style={styles.featuredShade} />
        <View style={styles.featuredContent}>
          <Badge label={event.category} />
          <Text style={styles.featuredTitle} numberOfLines={2}>{event.title}</Text>
          <Text style={styles.featuredMeta}>{formatEventDate(event.startsAt)} · {event.location}</Text>
          <View style={styles.featuredAction}><Text style={styles.featuredActionText}>Xem chi tiết  ›</Text></View>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

function SmallEvent({ event }: { event: StudentEvent }) {
  return (
    <Pressable onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })} style={styles.smallEvent}>
      <Image source={event.image} resizeMode="cover" style={styles.smallImage} />
      <View style={styles.smallCopy}>
        <Text style={styles.smallCategory}>{event.category}</Text>
        <Text style={styles.smallTitle} numberOfLines={2}>{event.title}</Text>
        <Text style={styles.smallMeta}>{formatEventDate(event.startsAt)} · {event.location}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  greeting: { flex: 1, gap: 3 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  greetingTitle: { color: colors.text, fontSize: 25, fontWeight: '900' },
  subtitle: { color: colors.mutedText, fontSize: 13 },
  avatar: { alignItems: 'center', backgroundColor: '#FDE8D7', borderRadius: 23, height: 46, justifyContent: 'center', width: 46 },
  avatarText: { color: '#9A4D19', fontSize: 19, fontWeight: '900' },
  searchBox: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 50, paddingHorizontal: spacing.md },
  searchIcon: { color: colors.primary, fontSize: 23, lineHeight: 26 },
  searchPlaceholder: { color: colors.mutedText, flex: 1, fontSize: 14 },
  searchFilter: { color: colors.mutedText, fontSize: 20 },
  sectionHeading: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  sectionHint: { color: colors.mutedText, fontSize: 12 },
  link: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  featuredWrap: { borderRadius: 18, overflow: 'hidden' },
  featured: { justifyContent: 'flex-end', minHeight: 220 },
  featuredImage: { borderRadius: 18 },
  featuredShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(17, 24, 39, 0.46)' },
  featuredContent: { alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md },
  featuredTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', lineHeight: 27 },
  featuredMeta: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  featuredAction: { alignSelf: 'flex-end', backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  featuredActionText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  noEvent: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg },
  noEventText: { color: colors.mutedText, textAlign: 'center' },
  statsRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.md },
  statItem: { alignItems: 'center', flex: 1, gap: 3 },
  statValue: { color: colors.text, fontSize: 19, fontWeight: '900' },
  statLabel: { color: colors.mutedText, fontSize: 11 },
  statDivider: { backgroundColor: colors.border, height: 32, width: 1 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryTile: { alignItems: 'center', borderRadius: 14, flex: 1, gap: spacing.xs, minWidth: '46%', paddingVertical: spacing.md },
  categoryDot: { color: colors.text, fontSize: 19, fontWeight: '800' },
  categoryLabel: { color: colors.text, fontSize: 12, fontWeight: '800' },
  smallEvent: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, padding: spacing.sm },
  smallImage: { backgroundColor: colors.border, borderRadius: 10, height: 66, width: 66 },
  smallCopy: { flex: 1, gap: 3 },
  smallCategory: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  smallTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  smallMeta: { color: colors.mutedText, fontSize: 11 },
  chevron: { color: colors.mutedText, fontSize: 22 },
  bottomSpace: { height: spacing.xs },
  quickQrBanner: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  quickQrIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  quickQrIcon: {
    fontSize: 22,
  },
  quickQrTextWrap: {
    flex: 1,
    gap: 2,
  },
  quickQrTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  quickQrSub: {
    color: '#94A3B8',
    fontSize: 12,
  },
  quickQrChevron: {
    color: '#38BDF8',
    fontSize: 22,
    fontWeight: '800',
  },
});
