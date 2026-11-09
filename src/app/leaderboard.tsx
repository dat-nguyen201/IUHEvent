import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@tamagui/core';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/Screen';
import { useAppState } from '@/context/AppStateContext';
import {
  fetchLeaderboard,
  type FacultyRanking,
  type LeaderboardData,
  type LeaderboardStudent,
} from '@/services/leaderboardService';

export default function LeaderboardScreen() {
  const theme = useTheme();
  const { user, checkedInEventIds } = useAppState();

  const [activeTab, setActiveTab] = useState<'students' | 'faculties'>('students');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const res = await fetchLeaderboard();
      setData(res);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const topStudents = data?.topStudents || [];
  const facultyRankings = data?.facultyRankings || [];

  // Top 3 for Podium
  const rank1 = topStudents[0];
  const rank2 = topStudents[1];
  const rank3 = topStudents[2];
  const restStudents = topStudents.slice(3);

  // Find current user's rank in the list or from server calculation
  const myRankIndex = topStudents.findIndex(
    (s) => s.studentId === user?.studentId || s.userId === user?.id
  );
  const myRank = data?.currentUser?.rank ?? (myRankIndex >= 0 ? myRankIndex + 1 : (topStudents.length > 0 ? topStudents.length + 1 : 1));
  const myDrl = data?.currentUser?.drlPoints ?? Math.min(100, 65 + checkedInEventIds.length * 5);
  const myCheckedInCount = data?.currentUser?.checkedInCount ?? checkedInEventIds.length;

  const renderStudentItem = ({ item }: { item: LeaderboardStudent }) => {
    const isMe = item.studentId === user?.studentId || item.userId === user?.id;

    return (
      <View
        style={[
          styles.studentCard,
          {
            backgroundColor: isMe ? `${theme.primary.val}10` : theme.surface.val,
            borderColor: isMe ? theme.primary.val : theme.border.val,
          },
        ]}
      >
        <View style={styles.rankNumCol}>
          <Text
            style={[
              styles.rankNumText,
              { color: item.rank <= 3 ? '#D97706' : theme.muted.val },
            ]}
          >
            #{item.rank}
          </Text>
        </View>

        <View
          style={[
            styles.avatarCircle,
            { backgroundColor: isMe ? theme.primary.val : '#E2E8F0' },
          ]}
        >
          <Text
            style={[
              styles.avatarInitial,
              { color: isMe ? '#FFFFFF' : '#334155' },
            ]}
          >
            {item.name ? item.name.charAt(item.name.lastIndexOf(' ') + 1) || item.name.charAt(0) : 'S'}
          </Text>
        </View>

        <View style={styles.studentInfoCol}>
          <View style={styles.studentNameRow}>
            <Text
              style={[
                styles.studentName,
                { color: theme.color.val, fontWeight: isMe ? '900' : '700' },
              ]}
              numberOfLines={1}
            >
              {item.name} {isMe && '(Bạn)'}
            </Text>
          </View>
          <Text style={[styles.studentMajor, { color: theme.muted.val }]} numberOfLines={1}>
            {item.studentId} • {item.major}
          </Text>
        </View>

        <View style={styles.scoreCol}>
          <Text style={styles.scorePoints}>{item.drlPoints}đ ĐRL</Text>
          <Text style={[styles.scoreEvents, { color: theme.muted.val }]}>
            {item.checkedInCount} sự kiện
          </Text>
        </View>
      </View>
    );
  };

  const renderFacultyItem = ({ item }: { item: FacultyRanking }) => {
    return (
      <View
        style={[
          styles.facultyCard,
          { backgroundColor: theme.surface.val, borderColor: theme.border.val },
        ]}
      >
        <View
          style={[
            styles.facultyRankCircle,
            {
              backgroundColor:
                item.rank === 1
                  ? '#FEF3C7'
                  : item.rank === 2
                    ? '#F1F5F9'
                    : item.rank === 3
                      ? '#FFEDD5'
                      : '#F8FAFC',
            },
          ]}
        >
          <Text
            style={[
              styles.facultyRankText,
              {
                color:
                  item.rank === 1
                    ? '#B45309'
                    : item.rank === 2
                      ? '#475569'
                      : item.rank === 3
                        ? '#C2410C'
                        : '#64748B',
              },
            ]}
          >
            #{item.rank}
          </Text>
        </View>

        <View style={styles.facultyInfoCol}>
          <Text style={[styles.facultyName, { color: theme.color.val }]} numberOfLines={1}>
            {item.faculty}
          </Text>
          <Text style={[styles.facultySub, { color: theme.muted.val }]}>
            {item.totalParticipants} sinh viên • {item.totalEventsJoined} lượt tham gia
          </Text>
        </View>

        <View style={styles.facultyDrlCol}>
          <Text style={styles.facultyDrlAvg}>{item.averageDrl}</Text>
          <Text style={[styles.facultyDrlLabel, { color: theme.muted.val }]}>ĐRL tb</Text>
        </View>
      </View>
    );
  };

  return (
    <Screen>
      {/* Header Bar */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={theme.color.val} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: theme.color.val }]}>Bảng xếp hạng Rèn luyện</Text>
          <Text style={[styles.headerSubtitle, { color: theme.muted.val }]}>Phong trào sinh viên IUH</Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
        <Pressable
          onPress={() => setActiveTab('students')}
          style={[styles.tabItem, activeTab === 'students' && styles.tabItemActive]}
        >
          <Ionicons
            name="trophy"
            size={16}
            color={activeTab === 'students' ? '#0D6EFD' : theme.muted.val}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'students' ? '#0D6EFD' : theme.muted.val },
              activeTab === 'students' && styles.tabTextActive,
            ]}
          >
            Sinh viên xuất sắc
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('faculties')}
          style={[styles.tabItem, activeTab === 'faculties' && styles.tabItemActive]}
        >
          <Ionicons
            name="school"
            size={16}
            color={activeTab === 'faculties' ? '#0D6EFD' : theme.muted.val}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'faculties' ? '#0D6EFD' : theme.muted.val },
              activeTab === 'faculties' && styles.tabTextActive,
            ]}
          >
            Thi đua Khoa / Viện
          </Text>
        </Pressable>
      </View>

      {isLoading && !data ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.primary.val} />
          <Text style={[styles.loadingText, { color: theme.muted.val }]}>Đang tổng hợp điểm số...</Text>
        </View>
      ) : activeTab === 'students' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadData(true)}
              colors={[theme.primary.val]}
              tintColor={theme.primary.val}
            />
          }
        >
          {/* Top 3 Podium */}
          <View style={styles.podiumSection}>
            <LinearGradient
              colors={['#1E3A8A', '#0D6EFD']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.podiumBanner}
            >
              <Text style={styles.podiumHeaderTitle}>VINH DANH TOP 3 XUẤT SẮC</Text>
              <Text style={styles.podiumHeaderSub}>Cập nhật theo thời gian thực từ MongoDB Atlas</Text>

              <View style={styles.podiumRow}>
                {/* 2nd Place */}
                {rank2 && (
                  <View style={[styles.podiumCol, styles.colRank2]}>
                    <Text style={styles.podiumMedalIcon}>🥈</Text>
                    <View style={[styles.podiumAvatar, { borderColor: '#E2E8F0' }]}>
                      <Text style={styles.podiumAvatarText}>
                        {rank2.name.charAt(rank2.name.lastIndexOf(' ') + 1) || rank2.name.charAt(0)}
                      </Text>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>{rank2.name}</Text>
                    <Text style={styles.podiumMajor} numberOfLines={1}>{rank2.major}</Text>
                    <View style={styles.podiumScoreBadge}>
                      <Text style={styles.podiumScoreText}>{rank2.drlPoints}đ</Text>
                    </View>
                    <View style={[styles.podiumStand, styles.stand2]}>
                      <Text style={styles.standNum}>2</Text>
                    </View>
                  </View>
                )}

                {/* 1st Place */}
                {rank1 && (
                  <View style={[styles.podiumCol, styles.colRank1]}>
                    <Text style={[styles.podiumMedalIcon, { fontSize: 28 }]}>👑</Text>
                    <View style={[styles.podiumAvatar, { borderColor: '#F59E0B', width: 64, height: 64, borderRadius: 32 }]}>
                      <Text style={[styles.podiumAvatarText, { fontSize: 22 }]}>
                        {rank1.name.charAt(rank1.name.lastIndexOf(' ') + 1) || rank1.name.charAt(0)}
                      </Text>
                    </View>
                    <Text style={[styles.podiumName, { fontWeight: '900', fontSize: 14 }]} numberOfLines={1}>
                      {rank1.name}
                    </Text>
                    <Text style={styles.podiumMajor} numberOfLines={1}>{rank1.major}</Text>
                    <View style={[styles.podiumScoreBadge, { backgroundColor: '#F59E0B' }]}>
                      <Text style={styles.podiumScoreText}>{rank1.drlPoints}đ ĐRL</Text>
                    </View>
                    <View style={[styles.podiumStand, styles.stand1]}>
                      <Text style={[styles.standNum, { fontSize: 20 }]}>1</Text>
                    </View>
                  </View>
                )}

                {/* 3rd Place */}
                {rank3 && (
                  <View style={[styles.podiumCol, styles.colRank3]}>
                    <Text style={styles.podiumMedalIcon}>🥉</Text>
                    <View style={[styles.podiumAvatar, { borderColor: '#EA580C' }]}>
                      <Text style={styles.podiumAvatarText}>
                        {rank3.name.charAt(rank3.name.lastIndexOf(' ') + 1) || rank3.name.charAt(0)}
                      </Text>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>{rank3.name}</Text>
                    <Text style={styles.podiumMajor} numberOfLines={1}>{rank3.major}</Text>
                    <View style={styles.podiumScoreBadge}>
                      <Text style={styles.podiumScoreText}>{rank3.drlPoints}đ</Text>
                    </View>
                    <View style={[styles.podiumStand, styles.stand3]}>
                      <Text style={styles.standNum}>3</Text>
                    </View>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>

          {/* List of remaining ranks */}
          <View style={styles.listSection}>
            <Text style={[styles.sectionHeading, { color: theme.color.val }]}>
              BẢNG TỔNG SẮP (TOP 4 - 30)
            </Text>
            {restStudents.map((item) => (
              <React.Fragment key={item.userId}>
                {renderStudentItem({ item })}
              </React.Fragment>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={facultyRankings}
          keyExtractor={(item) => item.faculty}
          renderItem={renderFacultyItem}
          contentContainerStyle={styles.facultyListContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadData(true)}
              colors={[theme.primary.val]}
              tintColor={theme.primary.val}
            />
          }
        />
      )}

      {/* Sticky Bottom Bar for Current User */}
      <View
        style={[
          styles.myRankBar,
          { backgroundColor: theme.surface.val, borderTopColor: theme.border.val },
        ]}
      >
        <View style={styles.myRankLeft}>
          <View style={styles.myRankPill}>
            <Text style={styles.myRankPillText}>Hạng #{myRank}</Text>
          </View>
          <View>
            <Text style={[styles.myNameText, { color: theme.color.val }]} numberOfLines={1}>
              {user?.name || 'Bạn'}
            </Text>
            <Text style={[styles.mySubText, { color: theme.muted.val }]}>
              {myCheckedInCount} sự kiện đã check-in
            </Text>
          </View>
        </View>

        <View style={styles.myRankRight}>
          <Text style={styles.myPointsNum}>{myDrl}</Text>
          <Text style={[styles.myPointsLabel, { color: theme.muted.val }]}>Điểm ĐRL</Text>
        </View>
      </View>
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
    fontSize: 18,
    fontWeight: '900',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 6,
    marginBottom: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#EFF6FF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    fontWeight: '900',
  },

  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },

  scrollContent: {
    paddingBottom: 90,
  },
  podiumSection: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  podiumBanner: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  podiumHeaderTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FDE047',
    letterSpacing: 0.8,
  },
  podiumHeaderSub: {
    fontSize: 11,
    color: '#93C5FD',
    marginTop: 2,
    marginBottom: 16,
  },

  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: '100%',
    gap: 8,
  },
  podiumCol: {
    flex: 1,
    alignItems: 'center',
  },
  colRank1: {
    zIndex: 3,
  },
  colRank2: {
    zIndex: 2,
  },
  colRank3: {
    zIndex: 1,
  },
  podiumMedalIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  podiumAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  podiumAvatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0D6EFD',
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  podiumMajor: {
    fontSize: 10,
    color: '#BFDBFE',
    textAlign: 'center',
    marginBottom: 6,
  },
  podiumScoreBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  podiumScoreText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  podiumStand: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  stand1: {
    height: 60,
    backgroundColor: 'rgba(245, 158, 11, 0.85)',
  },
  stand2: {
    height: 44,
    backgroundColor: 'rgba(226, 232, 240, 0.55)',
  },
  stand3: {
    height: 32,
    backgroundColor: 'rgba(234, 88, 12, 0.65)',
  },
  standNum: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  listSection: {
    paddingHorizontal: 16,
    marginTop: 20,
    gap: 8,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  rankNumCol: {
    width: 28,
    alignItems: 'center',
  },
  rankNumText: {
    fontSize: 14,
    fontWeight: '900',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '800',
  },
  studentInfoCol: {
    flex: 1,
    gap: 2,
  },
  studentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentName: {
    fontSize: 14,
  },
  studentMajor: {
    fontSize: 11,
  },
  scoreCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  scorePoints: {
    fontSize: 14,
    fontWeight: '900',
    color: '#D97706',
  },
  scoreEvents: {
    fontSize: 10,
    fontWeight: '600',
  },

  facultyListContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 90,
  },
  facultyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  facultyRankCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  facultyRankText: {
    fontSize: 13,
    fontWeight: '900',
  },
  facultyInfoCol: {
    flex: 1,
    gap: 2,
  },
  facultyName: {
    fontSize: 14,
    fontWeight: '800',
  },
  facultySub: {
    fontSize: 11,
  },
  facultyDrlCol: {
    alignItems: 'flex-end',
  },
  facultyDrlAvg: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0D6EFD',
  },
  facultyDrlLabel: {
    fontSize: 10,
    fontWeight: '600',
  },

  myRankBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  myRankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  myRankPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  myRankPillText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#92400E',
  },
  myNameText: {
    fontSize: 14,
    fontWeight: '800',
  },
  mySubText: {
    fontSize: 11,
  },
  myRankRight: {
    alignItems: 'flex-end',
  },
  myPointsNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#D97706',
  },
  myPointsLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});
