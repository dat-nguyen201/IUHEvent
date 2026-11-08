import React, { useEffect, useMemo, useRef, useState } from "react";
import {
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
  resolveCampusLocation,
  type CampusBuildingCode,
  type CampusRegion,
} from "@/utils/campusLocation";

interface CampusMapModalProps {
  visible: boolean;
  locationName: string;
  onClose: () => void;
}

type ViewMode = "campus" | "directions";

const IUH_ADDRESS = "12 Nguyễn Văn Bảo, Phường Hạnh Thông, TP. Hồ Chí Minh";
const GOOGLE_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
  "Trường Đại học Công nghiệp Thành phố Hồ Chí Minh, 12 Nguyễn Văn Bảo, TP. Hồ Chí Minh",
)}&dir_action=navigate`;

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
  onClose,
}: CampusMapModalProps) {
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const suggested = useMemo(
    () => resolveCampusLocation(locationName),
    [locationName],
  );
  const [mode, setMode] = useState<ViewMode>("campus");
  const [selectedCode, setSelectedCode] = useState<CampusBuildingCode | null>(
    suggested.code,
  );
  const [viewportWidth, setViewportWidth] = useState(0);
  const mapScrollRef = useRef<ScrollViewInstance>(null);

  // Ảnh được mở rộng để có thể đọc rõ chữ và kéo ngang trên điện thoại.
  const mapWidth = Math.max(760, Math.min(screenWidth - 44, 1060));
  const mapHeight = mapWidth / MAP_RATIO;
  const selectedBuilding = CAMPUS_BUILDINGS.find(
    (b) => b.code === selectedCode,
  );

  useEffect(() => {
    if (visible) {
      setMode("campus");
      setSelectedCode(suggested.code);
    }
  }, [visible, suggested.code, locationName]);

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
      await Linking.openURL(GOOGLE_DIRECTIONS_URL);
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
          <View style={styles.header}>
            <Image
              source={require("@/IMG/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.headerCopy}>
              <Text style={[styles.eyebrow, { color: theme.primary.val }]}>
                CAMPUS SMART NAVIGATION
              </Text>
              <Text style={[styles.title, { color: theme.color.val }]}>
                Sơ đồ & chỉ đường IUH
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
                Trong trường
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
                Đến IUH
              </Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
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

            {mode === "campus" ? (
              <>
                <Text
                  style={[styles.sectionHeading, { color: theme.color.val }]}
                >
                  Sơ đồ các tòa nhà
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

                {suggested.warning && (
                  <View style={styles.warningBox}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={19}
                      color="#92400E"
                    />
                    <Text style={styles.warningText}>{suggested.warning}</Text>
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
                        ? suggested.code === selectedCode
                          ? selectedBuilding.label
                          : `Khu tham khảo: ${selectedBuilding.label}`
                        : "Hướng dẫn tìm địa điểm"}
                    </Text>
                  </View>
                  <Text style={[styles.guideText, { color: theme.color.val }]}>
                    {selectedBuilding?.note ??
                      "Chọn một tòa nhà trên sơ đồ để xem vùng đánh dấu và hướng dẫn."}
                  </Text>
                  {suggested.code === selectedCode && suggested.room && (
                    <Text
                      style={[styles.roomText, { color: theme.primary.val }]}
                    >
                      Phòng sự kiện: {suggested.room}
                    </Text>
                  )}
                  {suggested.code === selectedCode && suggested.floorHint && (
                    <Text
                      style={[styles.guideText, { color: theme.color.val }]}
                    >
                      {suggested.floorHint}
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
                  Chỉ đường đến cơ sở chính IUH
                </Text>
                <Text
                  style={[styles.directionsAddress, { color: theme.muted.val }]}
                >
                  {IUH_ADDRESS}
                </Text>
                <Text
                  style={[
                    styles.guideText,
                    { color: theme.color.val, textAlign: "center" },
                  ]}
                >
                  Google Maps sẽ mở với điểm đến là IUH. Nếu thiết bị cho phép
                  truy cập vị trí, Google Maps có thể lấy vị trí hiện tại làm
                  điểm xuất phát; nếu không, bạn có thể chọn điểm xuất phát thủ
                  công.
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
                    Mở Google Maps chỉ đường
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>

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
                Chỉ đường tới IUH bằng Google Maps
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
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  card: {
    flexShrink: 1,
    width: "100%",
    maxWidth: 780,
    height: "96%",
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 12,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 9 },
  logo: { width: 38, height: 38 },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  title: { fontSize: 17, fontWeight: "900" },
  closeButton: { padding: 4 },
  modeTabs: {
    flexDirection: "row",
    borderRadius: 13,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modeTabText: { fontWeight: "800", fontSize: 13 },
  content: { paddingBottom: 12, gap: 12 },
  eventBox: {
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    borderRadius: 13,
    padding: 10,
    borderWidth: 1,
  },
  flex: { flex: 1 },
  minorLabel: { fontSize: 10, fontWeight: "800" },
  eventLocation: { fontSize: 14, fontWeight: "800", marginTop: 2 },
  sectionHeading: { fontSize: 15, fontWeight: "900" },
  instructions: { fontSize: 12, lineHeight: 18 },
  mapFrame: { borderWidth: 1, overflow: "hidden", borderRadius: 14 },
  mapScrollContent: { alignItems: "flex-start" },
  mapImage: { width: "100%", height: "100%" },
  selectedRegion: {
    position: "absolute",
    borderColor: "#FACC15",
    backgroundColor: "rgba(250,204,21,0.18)",
    borderWidth: 3,
    borderRadius: 6,
  },
  selectedMarker: {
    position: "absolute",
    right: -8,
    top: -13,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#92400E",
    backgroundColor: "#FDE68A",
    elevation: 5,
  },
  selectedMarkerLabel: { fontSize: 13, fontWeight: "900", color: "#78350F" },
  mapTouchTarget: { position: "absolute" },
  buildingPicker: { gap: 8, paddingVertical: 2 },
  buildingChip: {
    minWidth: 44,
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderRadius: 20,
  },
  buildingChipText: { fontWeight: "900", fontSize: 13 },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 12,
  },
  warningText: { flex: 1, fontSize: 12, lineHeight: 18, color: "#78350F" },
  guideBox: { borderWidth: 1, padding: 13, borderRadius: 14, gap: 8 },
  guideTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  guideTitle: { flex: 1, fontSize: 15, fontWeight: "900" },
  guideText: { fontSize: 13, lineHeight: 20 },
  roomText: { fontSize: 13, fontWeight: "800" },
  disclaimer: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  bottomAction: {
    borderRadius: 14,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 10,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
  },
  directionsContent: {
    paddingHorizontal: 12,
    paddingTop: 24,
    gap: 20,
    alignItems: "center",
  },
  directionsIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  directionsHeading: { fontSize: 20, fontWeight: "900", textAlign: "center" },
  directionsAddress: { fontSize: 14, lineHeight: 22, textAlign: "center" },
  directionsAction: {
    minHeight: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
  },
});
