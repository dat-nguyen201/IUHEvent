import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "@tamagui/core";

import { Screen } from "@/components/Screen";
import { StatusMessage } from "@/components/StatusMessage";
import { organizers, type Organizer } from "@/data/organizers";
import { getAllOrganizers } from "@/services/organizerService";
import { getEvents } from "@/services/eventService";
import type { StudentEvent } from "@/types/events";

type OrganizerTypeFilter = "all" | Organizer["type"];

export default function OrganizersDirectoryScreen() {
  const theme = useTheme();

  const [organizerList, setOrganizerList] = useState<Organizer[]>(organizers);
  const [allEvents, setAllEvents] = useState<StudentEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<OrganizerTypeFilter>("all");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [orgs, eventsResult] = await Promise.all([
        getAllOrganizers(),
        getEvents({ page: 1, pageSize: 100 }),
      ]);
      setOrganizerList(orgs);
      setAllEvents(eventsResult.items);
    } catch (e) {
      console.warn("Failed to load organizers directory:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  // Compute real event counts from backend events
  const eventCountsByOrg = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ev of allEvents) {
      if (!ev.organizer) continue;
      const key = ev.organizer.trim().toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [allEvents]);

  const getRealCount = useCallback(
    (org: Organizer) => {
      const normName = org.name.toLowerCase().trim();
      const normShort = org.shortName.toLowerCase().trim();
      let total = 0;
      for (const [key, count] of Object.entries(eventCountsByOrg)) {
        if (
          key === normName ||
          key === normShort ||
          key.includes(normShort) ||
          normName.includes(key)
        ) {
          total += count;
        }
      }
      return total;
    },
    [eventCountsByOrg],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return organizerList.filter((org) => {
      const matchesQuery =
        !q ||
        org.name.toLowerCase().includes(q) ||
        org.shortName.toLowerCase().includes(q) ||
        (org.description && org.description.toLowerCase().includes(q));
      const matchesType = selectedType === "all" || org.type === selectedType;
      return matchesQuery && matchesType;
    });
  }, [organizerList, searchQuery, selectedType]);

  const typeTabs: { id: OrganizerTypeFilter; label: string }[] = [
    { id: "all", label: "Tất cả" },
    { id: "faculty", label: "Khoa / Viện" },
    { id: "union", label: "Đoàn - Hội" },
    { id: "club", label: "Câu lạc bộ" },
    { id: "center", label: "Trung tâm" },
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
            accessibilityLabel="Quay lại"
          >
            <Ionicons name="arrow-back" size={20} color={theme.color.val} />
          </Pressable>

          <View style={styles.headerBrandRow}>
            <Image
              source={require("@/IMG/logo.png")}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View style={styles.headerTextWrap}>
              <Text style={[styles.eyebrow, { color: theme.primary.val }]}>DANH BẠ IUH</Text>
              <Text style={[styles.title, { color: theme.color.val }]}>Đơn vị tổ chức</Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
          <Ionicons name="search" size={18} color={theme.muted.val} />
          <TextInput
            placeholder="Tìm tên khoa, đoàn hội, câu lạc bộ..."
            placeholderTextColor={theme.muted.val}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.color.val }]}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={theme.muted.val} />
            </Pressable>
          )}
        </View>

        {/* Type Filter Pills */}
        <View style={styles.typeRow}>
          {typeTabs.map((tab) => {
            const isSelected = selectedType === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setSelectedType(tab.id)}
                style={[
                  styles.typePill,
                  {
                    backgroundColor: isSelected ? theme.primary.val : theme.surface.val,
                    borderColor: isSelected ? theme.primary.val : theme.border.val,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typePillText,
                    { color: isSelected ? "#FFFFFF" : theme.color.val },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Organizers List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => void loadData()}
              colors={[theme.primary.val]}
              tintColor={theme.primary.val}
            />
          }
          ListEmptyComponent={
            <StatusMessage
              title="Không tìm thấy đơn vị"
              message="Thử nhập từ khóa khác hoặc chọn nhóm đơn vị khác."
              actionLabel="Xem tất cả"
              onAction={() => {
                setSearchQuery("");
                setSelectedType("all");
              }}
            />
          }
          renderItem={({ item: org }) => {
            const realCount = getRealCount(org);
            const typeLabel =
              org.type === "faculty"
                ? "Khoa / Viện"
                : org.type === "union"
                  ? "Đoàn - Hội"
                  : org.type === "club"
                    ? "Câu lạc bộ"
                    : "Trung tâm";

            return (
              <Pressable
                style={[
                  styles.orgCard,
                  {
                    backgroundColor: theme.surface.val,
                    borderColor: theme.border.val,
                  },
                ]}
                onPress={() => {
                  router.push({
                    pathname: "/(tabs)/discover",
                    params: { organizer: org.shortName },
                  });
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.avatarWrap, { borderColor: `${org.color}30` }]}>
                    <Image source={org.logo} style={styles.avatar} resizeMode="contain" />
                    {org.isVerified && (
                      <View style={styles.verifiedDot}>
                        <Ionicons name="checkmark-circle" size={14} color="#0D6EFD" />
                      </View>
                    )}
                  </View>

                  <View style={styles.cardInfo}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.shortName, { color: theme.color.val }]} numberOfLines={1}>
                        {org.shortName}
                      </Text>
                      <View style={[styles.typeBadge, { backgroundColor: `${org.color}15` }]}>
                        <Text style={[styles.typeBadgeText, { color: org.color }]}>{typeLabel}</Text>
                      </View>
                    </View>

                    <Text style={[styles.fullName, { color: theme.muted.val }]} numberOfLines={2}>
                      {org.name}
                    </Text>
                  </View>
                </View>

                {org.description ? (
                  <Text style={[styles.description, { color: theme.color.val }]} numberOfLines={2}>
                    {org.description}
                  </Text>
                ) : null}

                <View style={[styles.cardFooter, { borderTopColor: theme.border.val }]}>
                  <View style={styles.countBadge}>
                    <Ionicons name="calendar-outline" size={14} color={theme.primary.val} />
                    <Text style={[styles.countText, { color: theme.color.val }]}>
                      {realCount} sự kiện {realCount > 0 ? "đang có" : ""}
                    </Text>
                  </View>

                  <View style={styles.actionBtn}>
                    <Text style={[styles.actionBtnText, { color: theme.primary.val }]}>
                      Xem sự kiện
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.primary.val} />
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  orgCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  avatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: "#FFFFFF",
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  verifiedDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#FFFFFF",
    borderRadius: 7,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  shortName: {
    fontSize: 16,
    fontWeight: "900",
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  fullName: {
    fontSize: 12,
    lineHeight: 16,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
