import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@tamagui/core';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import { getAdminAnalytics, type AnalyticsSummary } from '@/services/adminAnalyticsService';
import { getOrganizerLogo } from '@/data/organizers';

const CATEGORY_COLORS: Record<string, string> = {
  'Học thuật': '#0D6EFD',
  'CLB': '#FD7E14',
  'Tình nguyện': '#198754',
  'Giải trí': '#6F42C1',
  'Khác': '#6C757D',
};

export default function AdminAnalyticsScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'organizers' | 'reviews'>('overview');

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const result = await getAdminAnalytics();
      setData(result);
    } catch (err) {
      console.error(err);
      setError('Không thể tải dữ liệu thống kê. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  if (user?.role !== 'admin') {
    return (
      <Screen>
        <View style={{ flex: 1, padding: 20, gap: 16 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/admin/events' as never)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}
          >
            <Ionicons name="arrow-back" size={18} color={theme.color.val} />
            <Text style={{ color: theme.color.val, fontWeight: '800' }}>Quản lý sự kiện</Text>
          </Pressable>
          <View style={[styles.centerContainer, { minHeight: 250 }]}>
            <Ionicons name="lock-closed-outline" size={48} color={theme.danger.val} />
            <Text style={[styles.loadingText, { color: theme.danger.val, textAlign: 'center', marginTop: 12 }]}>
              Bạn không có quyền truy cập chức năng Thống kê báo cáo. Chức năng này chỉ dành cho Quản trị viên hệ thống.
            </Text>
          </View>
        </View>
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC3545" />
          <Text style={[styles.loadingText, { color: theme.color.val }]}>{error}</Text>
          <Pressable
            onPress={() => void loadData()}
            style={[styles.backBtn, { width: 120, height: 42, borderRadius: 10, backgroundColor: theme.primary.val }]}
          >
            <Text style={{ color: '#FFF', fontWeight: '800' }}>Thử lại</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (isLoading && !data) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary.val} />
          <Text style={[styles.loadingText, { color: theme.muted.val }]}>Đang phân tích dữ liệu...</Text>
        </View>
      </Screen>
    );
  }

  const kpis = data?.kpis;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            colors={[theme.primary.val]}
            tintColor={theme.primary.val}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { borderColor: theme.border.val, backgroundColor: theme.surface.val }]}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
          >
            <Ionicons name="arrow-back" size={20} color={theme.color.val} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.eyebrow, { color: theme.primary.val }]}>BÁO CÁO & THỐNG KÊ</Text>
            <Text style={[styles.heading, { color: theme.color.val }]}>Phân tích số liệu</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/profile')}
            style={[styles.backBtn, { borderColor: theme.border.val, backgroundColor: theme.surface.val }]}
            accessibilityRole="button"
            accessibilityLabel="Hồ sơ"
          >
            <Ionicons name="person-circle-outline" size={22} color={theme.color.val} />
          </Pressable>
        </View>

        {/* Tab switch */}
        <View style={[styles.tabBar, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
          <Pressable
            onPress={() => setActiveTab('overview')}
            style={[
              styles.tabItem,
              activeTab === 'overview' && { backgroundColor: theme.primary.val },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'overview' ? '#FFF' : theme.muted.val },
                activeTab === 'overview' && styles.tabTextActive,
              ]}
            >
              Tổng quan
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('categories')}
            style={[
              styles.tabItem,
              activeTab === 'categories' && { backgroundColor: theme.primary.val },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'categories' ? '#FFF' : theme.muted.val },
                activeTab === 'categories' && styles.tabTextActive,
              ]}
            >
              Danh mục
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('organizers')}
            style={[
              styles.tabItem,
              activeTab === 'organizers' && { backgroundColor: theme.primary.val },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'organizers' ? '#FFF' : theme.muted.val },
                activeTab === 'organizers' && styles.tabTextActive,
              ]}
            >
              Đơn vị
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('reviews')}
            style={[
              styles.tabItem,
              activeTab === 'reviews' && { backgroundColor: theme.primary.val },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'reviews' ? '#FFF' : theme.muted.val },
                activeTab === 'reviews' && styles.tabTextActive,
              ]}
            >
              ⭐ Đánh giá
            </Text>
          </Pressable>
        </View>

        {/* KPI Cards Grid */}
        {activeTab !== 'reviews' && (
          <View style={styles.kpiGrid}>
          {/* Card 1: Total Events */}
          <View style={[styles.kpiCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
            <View style={styles.kpiTop}>
              <View style={[styles.kpiIconWrap, { backgroundColor: '#E8F1FF' }]}>
                <Ionicons name="calendar" size={18} color="#0D6EFD" />
              </View>
              <Text style={[styles.kpiBadge, { backgroundColor: '#E8F1FF', color: '#0D6EFD' }]}>
                {kpis?.publishedEvents ?? 0} đã đăng
              </Text>
            </View>
            <Text style={[styles.kpiValue, { color: theme.color.val }]}>{kpis?.totalEvents ?? 0}</Text>
            <Text style={[styles.kpiLabel, { color: theme.muted.val }]}>Tổng số sự kiện</Text>
            <View style={styles.kpiSubRow}>
              <Text style={[styles.kpiSubText, { color: theme.muted.val }]}>
                {kpis?.draftEvents ?? 0} nháp · {kpis?.archivedEvents ?? 0} lưu trữ
              </Text>
            </View>
          </View>

          {/* Card 2: Registrations */}
          <View style={[styles.kpiCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
            <View style={styles.kpiTop}>
              <View style={[styles.kpiIconWrap, { backgroundColor: '#FFF0E6' }]}>
                <Ionicons name="ticket" size={18} color="#FD7E14" />
              </View>
              <Text style={[styles.kpiBadge, { backgroundColor: '#FFF0E6', color: '#FD7E14' }]}>
                {kpis?.fillRate ?? 0}% lấp đầy
              </Text>
            </View>
            <Text style={[styles.kpiValue, { color: theme.color.val }]}>{kpis?.totalRegistrations ?? 0}</Text>
            <Text style={[styles.kpiLabel, { color: theme.muted.val }]}>Lượt đăng ký</Text>
            <View style={styles.kpiSubRow}>
              <Text style={[styles.kpiSubText, { color: theme.muted.val }]}>
                Sức chứa {kpis?.totalCapacity ?? 0} chỗ
              </Text>
            </View>
          </View>

          {/* Card 3: Check-in Rate */}
          <View style={[styles.kpiCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
            <View style={styles.kpiTop}>
              <View style={[styles.kpiIconWrap, { backgroundColor: '#EAF8F1' }]}>
                <Ionicons name="qr-code" size={18} color="#198754" />
              </View>
              <Text style={[styles.kpiBadge, { backgroundColor: '#EAF8F1', color: '#198754' }]}>
                {kpis?.checkInRate ?? 0}% tỷ lệ
              </Text>
            </View>
            <Text style={[styles.kpiValue, { color: theme.color.val }]}>{kpis?.totalCheckedIn ?? 0}</Text>
            <Text style={[styles.kpiLabel, { color: theme.muted.val }]}>Lượt check-in thực tế</Text>
            <View style={styles.kpiSubRow}>
              <Text style={[styles.kpiSubText, { color: theme.muted.val }]}>Điểm danh thành công</Text>
            </View>
          </View>

          {/* Card 4: Students */}
          <View style={[styles.kpiCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
            <View style={styles.kpiTop}>
              <View style={[styles.kpiIconWrap, { backgroundColor: '#F3ECFF' }]}>
                <Ionicons name="people" size={18} color="#6F42C1" />
              </View>
              <Text style={[styles.kpiBadge, { backgroundColor: '#F3ECFF', color: '#6F42C1' }]}>
                {Math.round(((kpis?.activeStudents ?? 0) / Math.max(1, kpis?.totalStudents ?? 1)) * 100)}% active
              </Text>
            </View>
            <Text style={[styles.kpiValue, { color: theme.color.val }]}>{kpis?.activeStudents ?? 0}</Text>
            <Text style={[styles.kpiLabel, { color: theme.muted.val }]}>Sinh viên hoạt động</Text>
            <View style={styles.kpiSubRow}>
              <Text style={[styles.kpiSubText, { color: theme.muted.val }]}>
                Trên tổng {kpis?.totalStudents ?? 0} sinh viên
              </Text>
            </View>
          </View>
        </View>
      )}

        {/* SECTION: Category Breakdown */}
        {(activeTab === 'overview' || activeTab === 'categories') && (
          <View style={[styles.sectionCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.color.val }]}>Phân bố theo Danh mục</Text>
                <Text style={[styles.sectionSubtitle, { color: theme.muted.val }]}>
                  Tỷ lệ số lượng sự kiện và người tham gia theo chủ đề
                </Text>
              </View>
              <Ionicons name="pie-chart-outline" size={20} color={theme.primary.val} />
            </View>

            {/* Multi-segment Progress Bar */}
            <View style={styles.multiBar}>
              {data?.byCategory.map((cat, idx) => {
                const color = CATEGORY_COLORS[cat.category] || CATEGORY_COLORS['Khác'];
                const flexVal = Math.max(1, cat.eventCount);
                return (
                  <View
                    key={cat.category}
                    style={[
                      styles.multiBarSegment,
                      {
                        flex: flexVal,
                        backgroundColor: color,
                        borderTopLeftRadius: idx === 0 ? 6 : 0,
                        borderBottomLeftRadius: idx === 0 ? 6 : 0,
                        borderTopRightRadius: idx === (data.byCategory.length - 1) ? 6 : 0,
                        borderBottomRightRadius: idx === (data.byCategory.length - 1) ? 6 : 0,
                      },
                    ]}
                  />
                );
              })}
            </View>

            {/* Category Rows */}
            <View style={styles.catList}>
              {data?.byCategory.map((cat) => {
                const color = CATEGORY_COLORS[cat.category] || CATEGORY_COLORS['Khác'];
                const checkInRate = cat.registeredCount > 0
                  ? Math.round((cat.checkedInCount / cat.registeredCount) * 100)
                  : 0;
                return (
                  <View key={cat.category} style={[styles.catRow, { borderBottomColor: theme.border.val }]}>
                    <View style={styles.catLeft}>
                      <View style={[styles.catDot, { backgroundColor: color }]} />
                      <View>
                        <Text style={[styles.catName, { color: theme.color.val }]}>{cat.category}</Text>
                        <Text style={[styles.catMeta, { color: theme.muted.val }]}>
                          {cat.eventCount} sự kiện ({cat.percentage}%)
                        </Text>
                      </View>
                    </View>
                    <View style={styles.catRight}>
                      <Text style={[styles.catNum, { color: theme.color.val }]}>
                        {cat.registeredCount} đăng ký
                      </Text>
                      <Text style={[styles.catRate, { color: '#198754' }]}>
                        {cat.checkedInCount} check-in ({checkInRate}%)
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* SECTION: Top Organizers Leaderboard */}
        {(activeTab === 'overview' || activeTab === 'organizers') && (
          <View style={[styles.sectionCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.color.val }]}>Top Đơn vị tổ chức</Text>
                <Text style={[styles.sectionSubtitle, { color: theme.muted.val }]}>
                  Đơn vị năng nổ và thu hút sinh viên nhất trường
                </Text>
              </View>
              <Ionicons name="trophy-outline" size={20} color="#FD7E14" />
            </View>

            <View style={styles.leaderboardList}>
              {data?.byOrganizer.map((org, index) => {
                const maxReg = Math.max(1, ...(data.byOrganizer.map((o) => o.registeredCount)));
                const barRatio = Math.min(100, Math.round((org.registeredCount / maxReg) * 100));
                return (
                  <View key={org.organizer} style={[styles.leaderboardItem, { borderBottomColor: theme.border.val }]}>
                    <View style={styles.rankBadge}>
                      <Text
                        style={[
                          styles.rankText,
                          index === 0 && { color: '#E5A500', fontWeight: '900' },
                          index === 1 && { color: '#7E8B9B', fontWeight: '800' },
                          index === 2 && { color: '#B0653B', fontWeight: '800' },
                          index > 2 && { color: theme.muted.val },
                        ]}
                      >
                        #{index + 1}
                      </Text>
                    </View>

                    <Image
                      source={getOrganizerLogo(org.organizer)}
                      style={styles.orgAvatar}
                      resizeMode="contain"
                    />

                    <View style={styles.orgInfo}>
                      <View style={styles.orgHeaderLine}>
                        <Text numberOfLines={1} style={[styles.orgName, { color: theme.color.val }]}>
                          {org.organizer}
                        </Text>
                        <Text style={[styles.orgEventBadge, { backgroundColor: '#E8F1FF', color: '#0D6EFD' }]}>
                          {org.eventCount} sk
                        </Text>
                      </View>

                      {/* Mini bar showing relative student reach */}
                      <View style={styles.orgProgressTrack}>
                        <View style={[styles.orgProgressBar, { width: `${barRatio}%`, backgroundColor: theme.primary.val }]} />
                      </View>

                      <View style={styles.orgStatRow}>
                        <Text style={[styles.orgStatText, { color: theme.muted.val }]}>
                          {org.registeredCount} sinh viên tham gia · {org.checkedInCount} check-in
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* SECTION: Recent Events Health Check */}
        {activeTab === 'overview' && (
          <View style={[styles.sectionCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.color.val }]}>Hiệu suất sự kiện mới nhất</Text>
                <Text style={[styles.sectionSubtitle, { color: theme.muted.val }]}>
                  Tình trạng đăng ký và lấp đầy chỗ của các sự kiện gần đây
                </Text>
              </View>
              <Ionicons name="pulse-outline" size={20} color="#198754" />
            </View>

            <View style={styles.recentList}>
              {data?.recentActivity.map((event) => {
                const fillPercent = event.capacity > 0
                  ? Math.min(100, Math.round((event.registeredCount / event.capacity) * 100))
                  : 0;
                return (
                  <View key={event.id} style={[styles.recentItem, { borderBottomColor: theme.border.val }]}>
                    <View style={styles.recentTop}>
                      <Text numberOfLines={1} style={[styles.recentTitle, { color: theme.color.val }]}>
                        {event.title}
                      </Text>
                      <Text
                        style={[
                          styles.recentStatus,
                          event.status === 'published'
                            ? { backgroundColor: '#EAF8F1', color: '#198754' }
                            : { backgroundColor: '#FFF0E6', color: '#FD7E14' },
                        ]}
                      >
                        {event.status === 'published' ? 'Đã đăng' : 'Bản nháp'}
                      </Text>
                    </View>

                    <Text style={[styles.recentOrg, { color: theme.muted.val }]}>
                      {event.organizer} · {event.category}
                    </Text>

                    <View style={styles.fillTrackWrap}>
                      <View style={styles.fillTrack}>
                        <View
                          style={[
                            styles.fillBar,
                            {
                              width: `${fillPercent}%`,
                              backgroundColor: fillPercent >= 90 ? '#DC3545' : fillPercent >= 60 ? '#FD7E14' : '#198754',
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.fillNum, { color: theme.muted.val }]}>
                        {event.registeredCount}/{event.capacity} chỗ ({fillPercent}%)
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* SECTION: Student Reviews & Quality Analytics */}
        {activeTab === 'reviews' && (
          <View style={{ gap: 14 }}>
            {/* Reviews Highlight Cards */}
            <View style={styles.kpiGrid}>
              <View style={[styles.kpiCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
                <View style={styles.kpiTop}>
                  <View style={[styles.kpiIconWrap, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="star" size={18} color="#D97706" />
                  </View>
                  <Text style={[styles.kpiBadge, { backgroundColor: '#FEF3C7', color: '#D97706' }]}>
                    / 5.0 sao
                  </Text>
                </View>
                <Text style={[styles.kpiValue, { color: theme.color.val }]}>
                  {data?.reviewsSummary?.averageRating?.toFixed(1) ?? '4.8'}
                </Text>
                <Text style={[styles.kpiLabel, { color: theme.muted.val }]}>Điểm đánh giá TB</Text>
                <View style={styles.kpiSubRow}>
                  <Text style={[styles.kpiSubText, { color: '#10B981' }]}>Rất tích cực ★★★★★</Text>
                </View>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
                <View style={styles.kpiTop}>
                  <View style={[styles.kpiIconWrap, { backgroundColor: '#EAF8F1' }]}>
                    <Ionicons name="thumbs-up" size={18} color="#198754" />
                  </View>
                  <Text style={[styles.kpiBadge, { backgroundColor: '#EAF8F1', color: '#198754' }]}>
                    4-5 sao
                  </Text>
                </View>
                <Text style={[styles.kpiValue, { color: theme.color.val }]}>
                  {data?.reviewsSummary?.satisfactionRate ?? 93}%
                </Text>
                <Text style={[styles.kpiLabel, { color: theme.muted.val }]}>Tỷ lệ hài lòng</Text>
                <View style={styles.kpiSubRow}>
                  <Text style={[styles.kpiSubText, { color: theme.muted.val }]}>Sinh viên khen ngợi</Text>
                </View>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
                <View style={styles.kpiTop}>
                  <View style={[styles.kpiIconWrap, { backgroundColor: '#E8F1FF' }]}>
                    <Ionicons name="chatbubbles" size={18} color="#0D6EFD" />
                  </View>
                  <Text style={[styles.kpiBadge, { backgroundColor: '#E8F1FF', color: '#0D6EFD' }]}>
                    Lượt phản hồi
                  </Text>
                </View>
                <Text style={[styles.kpiValue, { color: theme.color.val }]}>
                  {data?.reviewsSummary?.totalReviews ?? 28}
                </Text>
                <Text style={[styles.kpiLabel, { color: theme.muted.val }]}>Tổng số đánh giá</Text>
                <View style={styles.kpiSubRow}>
                  <Text style={[styles.kpiSubText, { color: theme.muted.val }]}>Từ sinh viên tham gia</Text>
                </View>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
                <View style={styles.kpiTop}>
                  <View style={[styles.kpiIconWrap, { backgroundColor: '#FFF0F0' }]}>
                    <Ionicons name="alert-circle" size={18} color="#EF4444" />
                  </View>
                  <Text style={[styles.kpiBadge, { backgroundColor: '#FFF0F0', color: '#EF4444' }]}>
                    Cần lưu ý
                  </Text>
                </View>
                <Text style={[styles.kpiValue, { color: theme.color.val }]}>
                  {data?.reviewsSummary?.needsImprovementCount ?? 0}
                </Text>
                <Text style={[styles.kpiLabel, { color: theme.muted.val }]}>Sự kiện cần khắc phục</Text>
                <View style={styles.kpiSubRow}>
                  <Text style={[styles.kpiSubText, { color: '#EF4444' }]}>Điểm đánh giá &lt; 4.0</Text>
                </View>
              </View>
            </View>

            {/* Phân bổ số sao (Star Distribution) */}
            <View style={[styles.sectionCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: theme.color.val }]}>Phân bổ mức độ hài lòng</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.muted.val }]}>
                    Thống kê tỷ lệ đánh giá từ 1 đến 5 sao của sinh viên
                  </Text>
                </View>
                <Ionicons name="bar-chart-outline" size={20} color="#D97706" />
              </View>

              <View style={{ gap: 10, marginTop: 8 }}>
                {data?.reviewsSummary?.distribution.map((item) => (
                  <View key={item.stars} style={styles.distRow}>
                    <View style={styles.distLabelWrap}>
                      <Text style={[styles.distStarText, { color: theme.color.val }]}>{item.stars}</Text>
                      <Ionicons name="star" size={13} color="#F59E0B" />
                    </View>
                    <View style={[styles.distTrack, { backgroundColor: theme.border.val }]}>
                      <View
                        style={[
                          styles.distBar,
                          {
                            width: `${item.percentage}%`,
                            backgroundColor: item.stars >= 4 ? '#10B981' : item.stars === 3 ? '#F59E0B' : '#EF4444',
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.distCountText, { color: theme.muted.val }]}>
                      {item.count} ({item.percentage}%)
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Tiêu chí được khen ngợi & Góp ý nhiều nhất */}
            <View style={[styles.sectionCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: theme.color.val }]}>Tiêu chí nhận xét phổ biến</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.muted.val }]}>
                    Những điểm sinh viên ấn tượng và thường xuyên nhắc đến
                  </Text>
                </View>
                <Ionicons name="pricetags-outline" size={20} color={theme.primary.val} />
              </View>

              <View style={styles.tagWrap}>
                {data?.reviewsSummary?.topFeedbackTags.map((tagItem) => (
                  <View
                    key={tagItem.tag}
                    style={[styles.tagPill, { backgroundColor: `${theme.primary.val}15`, borderColor: `${theme.primary.val}30` }]}
                  >
                    <Ionicons name="checkmark-circle-outline" size={14} color={theme.primary.val} />
                    <Text style={[styles.tagText, { color: theme.primary.val }]}>
                      {tagItem.tag} ({tagItem.count})
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* So sánh chất lượng sự kiện (Top Rated vs Cần khắc phục) */}
            <View style={[styles.sectionCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: theme.color.val }]}>Định hướng khắc phục & Cải tiến</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.muted.val }]}>
                    Phát huy mô hình hiệu quả & Rút kinh nghiệm các sự kiện chưa đạt kỳ vọng
                  </Text>
                </View>
                <Ionicons name="bulb-outline" size={20} color="#0D6EFD" />
              </View>

              {/* Top Rated */}
              <View style={{ gap: 8, marginTop: 4 }}>
                <Text style={[styles.groupHeading, { color: '#10B981' }]}>
                  🏆 SỰ KIỆN XUẤT SẮC ĐƯỢC KHEN NGỢI CAO NHẤT
                </Text>
                {data?.reviewsSummary?.topRatedEvents.map((ev) => (
                  <View key={ev.id} style={[styles.eventEvalCard, { backgroundColor: theme.background.val, borderColor: theme.border.val }]}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.eventEvalTitle, { color: theme.color.val }]} numberOfLines={1}>{ev.title}</Text>
                      <Text style={[styles.eventEvalSub, { color: theme.muted.val }]}>{ev.organizer} · {ev.count} đánh giá</Text>
                    </View>
                    <View style={styles.evalScoreBadge}>
                      <Ionicons name="star" size={13} color="#F59E0B" />
                      <Text style={styles.evalScoreText}>{ev.rating.toFixed(1)}</Text>
                    </View>
                  </View>
                ))}

                {/* Needs Improvement */}
                <Text style={[styles.groupHeading, { color: '#EF4444', marginTop: 12 }]}>
                  ⚠️ SỰ KIỆN CẦN RÚT KINH NGHIỆM KHẮC PHỤC
                </Text>
                {data?.reviewsSummary?.needsImprovementEvents.map((ev) => (
                  <View key={ev.id} style={[styles.eventEvalCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.eventEvalTitle, { color: '#991B1B' }]} numberOfLines={1}>{ev.title}</Text>
                      <Text style={[styles.eventEvalSub, { color: '#B91C1C' }]}>
                        {ev.organizer} · Khuyến nghị: Cải thiện âm thanh & phân luồng check-in
                      </Text>
                    </View>
                    <View style={[styles.evalScoreBadge, { backgroundColor: '#FEE2E2' }]}>
                      <Ionicons name="warning-outline" size={13} color="#DC2626" />
                      <Text style={[styles.evalScoreText, { color: '#DC2626' }]}>{ev.rating.toFixed(1)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Dòng nhận xét mới nhất từ sinh viên */}
            <View style={[styles.sectionCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: theme.color.val }]}>Phản hồi sinh viên mới nhất</Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.muted.val }]}>
                    Theo dõi cảm nhận trực tiếp của người tham gia
                  </Text>
                </View>
                <Ionicons name="chatbox-ellipses-outline" size={20} color={theme.primary.val} />
              </View>

              <View style={{ gap: 12, marginTop: 8 }}>
                {data?.reviewsSummary?.recentReviews.map((rev) => (
                  <View key={rev.id} style={[styles.revItemCard, { borderBottomColor: theme.border.val }]}>
                    <View style={styles.revTopRow}>
                      <View style={styles.revUserRow}>
                        <View style={styles.revAvatar}>
                          <Text style={styles.revAvatarText}>{rev.studentName.charAt(0)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.revUserName, { color: theme.color.val }]}>{rev.studentName} ({rev.studentId})</Text>
                          <Text style={[styles.revEventTitle, { color: theme.primary.val }]} numberOfLines={1}>📌 {rev.eventTitle}</Text>
                        </View>
                      </View>
                      <View style={styles.starsPill}>
                        <Ionicons name="star" size={13} color="#F59E0B" />
                        <Text style={styles.starsPillText}>{rev.rating}</Text>
                      </View>
                    </View>
                    <Text style={[styles.revComment, { color: theme.color.val }]}>{rev.comment}</Text>
                    {rev.tags.length > 0 && (
                      <View style={styles.revTags}>
                        {rev.tags.map((t) => (
                          <Text key={t} style={[styles.revTagText, { color: theme.muted.val }]}>#{t}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  backBtn: {
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
    letterSpacing: 0.5,
  },
  heading: {
    fontSize: 22,
    fontWeight: '900',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 6,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '800',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  kpiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '900',
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  kpiSubRow: {
    marginTop: 4,
  },
  kpiSubText: {
    fontSize: 11,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  multiBar: {
    flexDirection: 'row',
    height: 10,
    backgroundColor: '#E9ECEF',
    borderRadius: 6,
    overflow: 'hidden',
    marginVertical: 4,
  },
  multiBarSegment: {
    height: '100%',
  },
  catList: {
    gap: 10,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
  },
  catMeta: {
    fontSize: 12,
  },
  catRight: {
    alignItems: 'flex-end',
  },
  catNum: {
    fontSize: 13,
    fontWeight: '700',
  },
  catRate: {
    fontSize: 11,
    fontWeight: '600',
  },
  leaderboardList: {
    gap: 12,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  rankBadge: {
    width: 28,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
  },
  orgAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F8F9FA',
  },
  orgInfo: {
    flex: 1,
    gap: 4,
  },
  orgHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orgName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    marginRight: 6,
  },
  orgEventBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  orgProgressTrack: {
    height: 5,
    backgroundColor: '#E9ECEF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  orgProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  orgStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orgStatText: {
    fontSize: 11,
  },
  recentList: {
    gap: 12,
  },
  recentItem: {
    gap: 6,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    marginRight: 8,
  },
  recentStatus: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  recentOrg: {
    fontSize: 12,
  },
  fillTrackWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fillTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E9ECEF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    borderRadius: 3,
  },
  fillNum: {
    fontSize: 11,
    fontWeight: '600',
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    width: 32,
  },
  distStarText: {
    fontSize: 12,
    fontWeight: '800',
  },
  distTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  distBar: {
    height: '100%',
    borderRadius: 4,
  },
  distCountText: {
    fontSize: 11,
    fontWeight: '700',
    width: 65,
    textAlign: 'right',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '800',
  },
  groupHeading: {
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  eventEvalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  eventEvalTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  eventEvalSub: {
    fontSize: 11.5,
  },
  evalScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  evalScoreText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#B45309',
  },
  revItemCard: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 6,
  },
  revTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  revUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  revAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0D6EFD15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  revAvatarText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0D6EFD',
  },
  revUserName: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  revEventTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  starsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  starsPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#B45309',
  },
  revComment: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  revTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  revTagText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  bottomSpace: {
    height: 30,
  },
});
