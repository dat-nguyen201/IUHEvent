import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  type ScrollViewInstance,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@tamagui/core";
import {
  CAMPUS_BUILDINGS,
  IUH_CAMPUSES,
  resolveCampusLocation,
  type CampusBuildingCode,
  type CampusRegion,
  type IUHCampusId,
} from "@/utils/campusLocation";
import { resolveEventCampusLocationAI } from "@/services/aiChatService";

interface CampusMapModalProps {
  visible: boolean;
  locationName: string;
  eventTitle?: string;
  eventDescription?: string;
  onClose: () => void;
}

type ViewMode = "campus" | "directions";

const MAP_SOURCE = require("@/assets/campus-map-iuh.png");

// Ảnh sơ đồ IUH mới có tỷ lệ 4:3
const MAP_RATIO = 4 / 3;

const percent = (value: number): `${number}%` => `${value}%`;
const regionStyle = (region: CampusRegion) => ({
  left: percent(region.x),
  top: percent(region.y),
  width: percent(region.width),
  height: percent(region.height),
});

export function CampusMapModal({
  visible,
  locationName,
  eventTitle,
  eventDescription,
  onClose,
}: CampusMapModalProps) {
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const syncSuggested = useMemo(
    () => resolveCampusLocation(locationName, `${eventTitle || ""} ${eventDescription || ""}`),
    [locationName, eventTitle, eventDescription],
  );

  const [mode, setMode] = useState<ViewMode>("campus");
  const [selectedCampusId, setSelectedCampusId] = useState<IUHCampusId>(
    syncSuggested.campus.id,
  );
  const [selectedCode, setSelectedCode] = useState<CampusBuildingCode | null>(
    syncSuggested.code,
  );
  const [viewportWidth, setViewportWidth] = useState(0);
  const mapScrollRef = useRef<ScrollViewInstance>(null);

  const currentCampus = IUH_CAMPUSES[selectedCampusId] || IUH_CAMPUSES.main;

  // Ảnh được mở rộng để có thể đọc rõ chữ và kéo ngang trên điện thoại.
  const mapWidth = Math.max(760, Math.min(screenWidth - 44, 1060));
  const mapHeight = mapWidth / MAP_RATIO;
  const selectedBuilding = CAMPUS_BUILDINGS.find(
    (b) => b.code === selectedCode,
  );

  // Khi modal mở: Khởi tạo giá trị đồng bộ ngay lập tức và phân tích ngầm
  useEffect(() => {
    if (!visible) return;

    const initial = resolveCampusLocation(
      locationName,
      `${eventTitle || ""} ${eventDescription || ""}`,
    );
    setSelectedCampusId(initial.campus.id);
    setSelectedCode(initial.code);

    // Nếu là cơ sở vệ tinh (không có sơ đồ toà nhà nội bộ), mặc định mở tab chỉ đường
    if (!initial.campus.hasInternalMap) {
      setMode("directions");
    } else {
      setMode("campus");
    }

    // Phân tích ngầm bằng backend service
    let isCancelled = false;
    void resolveEventCampusLocationAI(locationName, {
      title: eventTitle,
      description: eventDescription,
    })
      .then((data) => {
        if (isCancelled) return;
        setSelectedCampusId(data.campusId);
        if (data.buildingCode) {
          setSelectedCode(data.buildingCode as CampusBuildingCode);
        }
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [visible, locationName, eventTitle, eventDescription]);

  useEffect(() => {
    if (!visible || mode !== "campus" || !selectedBuilding || !viewportWidth)
      return;
    const firstRegion = selectedBuilding.regions[0];
    const centerPercent = firstRegion.x + firstRegion.width / 2;
    const offset = (centerPercent / 100) * mapWidth - viewportWidth / 2;
    const timeout = setTimeout(() => {
      mapScrollRef.current?.scrollTo({
        x: Math.max(0, offset),
        animated: true,
      });
    }, 200);
    return () => clearTimeout(timeout);
  }, [visible, mode, selectedBuilding, mapWidth, viewportWidth]);

  const openGoogleMaps = async () => {
    try {
      await Linking.openURL(currentCampus.directionsUrl);
    } catch {
      Alert.alert(
        "Không mở được Google Maps",
        "Vui lòng kiểm tra kết nối mạng hoặc ứng dụng bản đồ trên thiết bị.",
      );
    }
  };

  const onPickBuilding = (code: CampusBuildingCode) => {
    setSelectedCode(code);
  };

  const allCampusList = (Object.keys(IUH_CAMPUSES) as IUHCampusId[]).map(
    (id) => IUH_CAMPUSES[id],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface.val,
              borderColor: theme.border.val,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require("@/IMG/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: theme.color.val }]} numberOfLines={1}>
                {currentCampus.name}
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.muted.val }]} numberOfLines={1}>
                {currentCampus.address}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng sơ đồ"
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons name="close-circle" size={28} color={theme.muted.val} />
            </Pressable>
          </View>

          {/* Mode Switcher Tabs for Main Campus */}
          {currentCampus.hasInternalMap && (
            <View
              style={[
                styles.modeTabs,
                {
                  backgroundColor: theme.background.val,
                  borderColor: theme.border.val,
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: mode === "campus" }}
                onPress={() => setMode("campus")}
                style={[
                  styles.modeTab,
                  mode === "campus" && { backgroundColor: theme.primary.val },
                ]}
              >
                <Ionicons
                  name="map-outline"
                  size={17}
                  color={mode === "campus" ? "#FFFFFF" : theme.color.val}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    { color: mode === "campus" ? "#FFFFFF" : theme.color.val },
                  ]}
                >
                  Sơ đồ tòa nhà
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: mode === "directions" }}
                onPress={() => setMode("directions")}
                style={[
                  styles.modeTab,
                  mode === "directions" && { backgroundColor: theme.primary.val },
                ]}
              >
                <Ionicons
                  name="navigate-outline"
                  size={17}
                  color={mode === "directions" ? "#FFFFFF" : theme.color.val}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    {
                      color: mode === "directions" ? "#FFFFFF" : theme.color.val,
                    },
                  ]}
                >
                  Chỉ đường Google Maps
                </Text>
              </Pressable>
            </View>
          )}

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Event Location Box */}
            <View
              style={[
                styles.eventBox,
                {
                  backgroundColor: theme.background.val,
                  borderColor: theme.border.val,
                },
              ]}
            >
              <Ionicons
                name="location-outline"
                size={20}
                color={theme.primary.val}
              />
              <View style={styles.flex}>
                <Text style={[styles.minorLabel, { color: theme.muted.val }]}>
                  ĐỊA ĐIỂM SỰ KIỆN
                </Text>
                <Text
                  style={[styles.eventLocation, { color: theme.color.val }]}
                >
                  {locationName}
                </Text>
              </View>
            </View>

            {mode === "campus" && currentCampus.hasInternalMap ? (
              <>
                <Text
                  style={[styles.sectionHeading, { color: theme.color.val }]}
                >
                  Sơ đồ các tòa nhà (Trụ sở chính)
                </Text>
                <Text style={[styles.instructions, { color: theme.muted.val }]}>
                  Kéo ngang sơ đồ để xem toàn cảnh. Chạm vào tòa nhà hoặc chọn
                  mã nhà bên dưới để khoanh vùng.
                </Text>

                <View
                  style={[styles.mapFrame, { borderColor: theme.border.val }]}
                >
                  <ScrollView
                    ref={mapScrollRef}
                    horizontal
                    nestedScrollEnabled
                    showsHorizontalScrollIndicator
                    onLayout={(event) =>
                      setViewportWidth(event.nativeEvent.layout.width)
                    }
                    contentContainerStyle={styles.mapScrollContent}
                  >
                    <View style={{ width: mapWidth, height: mapHeight }}>
                      <Image
                        source={MAP_SOURCE}
                        style={styles.mapImage}
                        resizeMode="stretch"
                        accessibilityLabel="Sơ đồ khuôn viên Đại học Công nghiệp TP.HCM"
                      />
                      {selectedBuilding?.regions.map((region, index) => (
                        <View
                          key={`${selectedBuilding.code}-highlight-${index}`}
                          pointerEvents="none"
                          style={[styles.selectedRegion, regionStyle(region)]}
                        >
                          {index === 0 && (
                            <View style={styles.selectedMarker}>
                              <Ionicons
                                name="location-sharp"
                                color="#7C2D12"
                                size={16}
                              />
                              <Text style={styles.selectedMarkerLabel}>
                                {selectedBuilding.code}
                              </Text>
                            </View>
                          )}
                        </View>
                      ))}
                      {CAMPUS_BUILDINGS.flatMap((building) =>
                        building.regions.map((region, index) => (
                          <Pressable
                            key={`${building.code}-touch-${index}`}
                            accessibilityRole="button"
                            accessibilityLabel={`Xem vị trí ${building.label}`}
                            onPress={() => onPickBuilding(building.code)}
                            style={[styles.mapTouchTarget, regionStyle(region)]}
                          />
                        )),
                      )}
                    </View>
                  </ScrollView>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.buildingPicker}
                >
                  {CAMPUS_BUILDINGS.map((building) => (
                    <Pressable
                      key={building.code}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: selectedCode === building.code,
                      }}
                      accessibilityLabel={`Chọn ${building.label}`}
                      style={[
                        styles.buildingChip,
                        {
                          borderColor:
                            selectedCode === building.code
                              ? "#EAB308"
                              : theme.border.val,
                          backgroundColor:
                            selectedCode === building.code
                              ? "#FFF7D6"
                              : theme.background.val,
                        },
                      ]}
                      onPress={() => onPickBuilding(building.code)}
                    >
                      <Text
                        style={[
                          styles.buildingChipText,
                          {
                            color:
                              selectedCode === building.code
                                ? "#713F12"
                                : theme.color.val,
                          },
                        ]}
                      >
                        {building.code}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {syncSuggested.warning && (
                  <View style={styles.warningBox}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={19}
                      color="#92400E"
                    />
                    <Text style={styles.warningText}>{syncSuggested.warning}</Text>
                  </View>
                )}

                <View
                  style={[
                    styles.guideBox,
                    {
                      borderColor: theme.border.val,
                      backgroundColor: theme.background.val,
                    },
                  ]}
                >
                  <View style={styles.guideTitleRow}>
                    <Ionicons
                      name="information-circle"
                      size={20}
                      color={theme.primary.val}
                    />
                    <Text
                      style={[styles.guideTitle, { color: theme.color.val }]}
                    >
                      {selectedBuilding
                        ? syncSuggested.code === selectedCode
                          ? selectedBuilding.label
                          : `Khu tham khảo: ${selectedBuilding.label}`
                        : "Hướng dẫn tìm địa điểm"}
                    </Text>
                  </View>
                  <Text style={[styles.guideText, { color: theme.color.val }]}>
                    {selectedBuilding?.note ??
                      "Chọn một tòa nhà trên sơ đồ để xem vùng đánh dấu và hướng dẫn."}
                  </Text>
                  {syncSuggested.code === selectedCode && syncSuggested.room && (
                    <Text
                      style={[styles.roomText, { color: theme.primary.val }]}
                    >
                      Phòng sự kiện: {syncSuggested.room}
                    </Text>
                  )}
                  {syncSuggested.code === selectedCode && syncSuggested.floorHint && (
                    <Text
                      style={[styles.guideText, { color: theme.color.val }]}
                    >
                      {syncSuggested.floorHint}
                    </Text>
                  )}
                  <Text style={[styles.disclaimer, { color: theme.muted.val }]}>
                    Vùng màu vàng là vị trí tham khảo trên ảnh minh họa, không
                    phải dẫn đường GPS trong trường. Hãy đối chiếu bảng chỉ dẫn
                    tại tòa nhà.
                  </Text>
                </View>
              </>
            ) : (
              /* Directions View with Dynamic Campus */
              <View style={styles.directionsContent}>
                <View
                  style={[
                    styles.directionsIcon,
                    { backgroundColor: `${theme.primary.val}18` },
                  ]}
                >
                  <Ionicons
                    name="navigate-circle-outline"
                    size={56}
                    color={theme.primary.val}
                  />
                </View>
                <Text
                  style={[styles.directionsHeading, { color: theme.color.val }]}
                >
                  Chỉ đường đến {currentCampus.name}
                </Text>
                <Text
                  style={[styles.directionsAddress, { color: theme.muted.val }]}
                >
                  {currentCampus.address}
                </Text>

                <View
                  style={[
                    styles.transportTipBox,
                    {
                      backgroundColor: theme.background.val,
                      borderColor: theme.border.val,
                    },
                  ]}
                >
                  <Ionicons name="bus-outline" size={19} color={theme.primary.val} />
                  <View style={styles.flex}>
                    <Text style={[styles.transportTipTitle, { color: theme.color.val }]}>
                      Hướng dẫn di chuyển
                    </Text>
                    <Text style={[styles.transportTipText, { color: theme.muted.val }]}>
                      {currentCampus.transportHint}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.guideText,
                    { color: theme.color.val, textAlign: "center" },
                  ]}
                >
                  Google Maps sẽ tự động mở với điểm đến là{" "}
                  <Text style={{ fontWeight: "700" }}>{currentCampus.shortName}</Text>.
                  Ứng dụng sẽ tự động chọn lộ trình tối ưu từ vị trí hiện tại của bạn.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void openGoogleMaps()}
                  style={[
                    styles.directionsAction,
                    { backgroundColor: theme.primary.val },
                  ]}
                >
                  <Ionicons name="navigate" size={19} color="#FFFFFF" />
                  <Text style={styles.actionText}>
                    Mở Google Maps chỉ đường đến {currentCampus.badge}
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>

          {/* Bottom Fixed Action Button */}
          {mode === "campus" && (
            <Pressable
              accessibilityRole="button"
              onPress={() => void openGoogleMaps()}
              style={[
                styles.bottomAction,
                { backgroundColor: theme.primary.val },
              ]}
            >
              <Ionicons name="navigate-outline" size={18} color="#FFFFFF" />
              <Text style={styles.actionText}>
                Chỉ đường tới {currentCampus.shortName} bằng Google Maps
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  card: {
    maxHeight: "92%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  logo: {
    width: 36,
    height: 36,
    marginRight: 10,
  },
  headerCopy: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
  },
  closeButton: {
    padding: 4,
  },
  modeTabs: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 12,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: "700",
  },
  content: {
    paddingBottom: 20,
    gap: 12,
  },
  eventBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  flex: {
    flex: 1,
  },
  minorLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  eventLocation: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  aiInsightBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
  },
  aiInsightTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#92400E",
    marginBottom: 2,
  },
  aiInsightText: {
    fontSize: 12,
    color: "#78350F",
    lineHeight: 17,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "800",
  },
  instructions: {
    fontSize: 12,
    lineHeight: 17,
  },
  mapFrame: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
  },
  mapScrollContent: {
    alignItems: "center",
  },
  mapImage: {
    width: "100%",
    height: "100%",
  },
  selectedRegion: {
    position: "absolute",
    borderRadius: 6,
    borderWidth: 3,
    borderColor: "#EAB308",
    backgroundColor: "rgba(250, 204, 21, 0.45)",
  },
  selectedMarker: {
    position: "absolute",
    top: -20,
    left: "50%",
    transform: [{ translateX: -12 }],
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF08A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CA8A04",
  },
  selectedMarkerLabel: {
    fontSize: 11,
    fontWeight: "900",
    color: "#713F12",
  },
  mapTouchTarget: {
    position: "absolute",
  },
  buildingPicker: {
    gap: 8,
    paddingVertical: 4,
  },
  buildingChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  buildingChipText: {
    fontSize: 13,
    fontWeight: "800",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
  },
  guideBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  guideTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  guideText: {
    fontSize: 13,
    lineHeight: 18,
  },
  roomText: {
    fontSize: 13,
    fontWeight: "800",
  },
  disclaimer: {
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 4,
  },
  satelliteCard: {
    gap: 14,
    paddingTop: 8,
  },
  satelliteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  satelliteIconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  satelliteTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  satelliteAddress: {
    fontSize: 12,
    marginTop: 2,
  },
  satelliteInfoBlock: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  satelliteDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  satelliteTransportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  satelliteTransportText: {
    flex: 1,
    fontSize: 12,
  },
  satelliteActionRow: {
    gap: 10,
    marginTop: 6,
  },
  satelliteActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  satelliteSwitchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  satelliteSwitchBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  directionsContent: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  directionsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  directionsHeading: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  directionsAddress: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  transportTipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    width: "100%",
  },
  transportTipTitle: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 2,
  },
  transportTipText: {
    fontSize: 12,
    lineHeight: 16,
  },
  directionsAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
    width: "100%",
    marginTop: 6,
  },
  bottomAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 16,
    gap: 8,
    marginTop: 10,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
