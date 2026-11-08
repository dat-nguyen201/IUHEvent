import React from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@tamagui/core';

interface CampusMapModalProps {
  visible: boolean;
  locationName: string;
  onClose: () => void;
}

const CAMPUS_LOCATIONS: {
  match: string;
  building: string;
  floor: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    match: 'A7',
    building: 'Nhà A (Khu Trung tâm)',
    floor: 'Lầu 7',
    desc: 'Hội trường lớn A7 với sức chứa 500 sinh viên. Đi thang máy trung tâm tòa nhà A lên lầu 7 rẽ phải.',
    icon: 'business',
  },
  {
    match: 'E4',
    building: 'Nhà E',
    floor: 'Lầu 4',
    desc: 'Hội trường E4 chuyên tổ chức hội thảo khoa học và workshop học thuật.',
    icon: 'school',
  },
  {
    match: 'X',
    building: 'Nhà thi đấu X',
    floor: 'Tầng trệt & Khán đài',
    desc: 'Khu liên hợp thể thao và tổ chức các ngày hội lớn, hội quân, giải thi đấu sinh viên.',
    icon: 'football',
  },
  {
    match: 'H',
    building: 'Nhà H (Khoa CNTT)',
    floor: 'Tầng 2 - 8',
    desc: 'Tòa nhà công nghệ cao, phòng lab máy tính và văn phòng các Viện đào tạo.',
    icon: 'hardware-chip',
  },
  {
    match: 'Sân',
    building: 'Sân trường chính',
    floor: 'Khuôn viên ngoài trời',
    desc: 'Khu vực sân khấu ngoài trời trước sảnh nhà A, chuyên tổ chức văn nghệ và hội trại.',
    icon: 'people',
  },
];

export function CampusMapModal({ visible, locationName, onClose }: CampusMapModalProps) {
  const theme = useTheme();

  const matched = CAMPUS_LOCATIONS.find((loc) =>
    locationName.toLowerCase().includes(loc.match.toLowerCase()),
  ) || {
    building: 'Cơ sở chính IUH',
    floor: 'Khu vực sự kiện',
    desc: 'Sự kiện diễn ra tại khuôn viên Cơ sở chính Trường ĐH Công nghiệp TP.HCM.',
    icon: 'location' as const,
  };

  const openGoogleMaps = () => {
    void Linking.openURL('https://maps.google.com/?q=Trường+Đại+học+Công+nghiệp+TP.HCM+12+Nguyễn+Văn+Bảo');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Image source={require('@/IMG/logo.png')} style={styles.logo} resizeMode="contain" />
              <View style={styles.headerTextWrap}>
                <Text style={[styles.eyebrow, { color: theme.primary.val }]}>SƠ ĐỒ CƠ SỞ IUH</Text>
                <Text style={[styles.title, { color: theme.color.val }]} numberOfLines={1}>
                  {locationName}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.background.val, borderColor: theme.border.val }]}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={20} color={theme.color.val} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Highlighted Location Box */}
            <View style={[styles.highlightBox, { backgroundColor: `${theme.primary.val}10`, borderColor: `${theme.primary.val}35` }]}>
              <View style={styles.highlightHeader}>
                <View style={[styles.locIconWrap, { backgroundColor: theme.primary.val }]}>
                  <Ionicons name={matched.icon} size={22} color="#FFFFFF" />
                </View>
                <View style={styles.highlightInfo}>
                  <Text style={[styles.buildingText, { color: theme.primary.val }]}>{matched.building}</Text>
                  <Text style={[styles.floorText, { color: theme.color.val }]}>Vị trí: {matched.floor}</Text>
                </View>
              </View>
              <Text style={[styles.descText, { color: theme.color.val }]}>{matched.desc}</Text>
            </View>

            {/* Campus Address */}
            <View style={[styles.addressBox, { backgroundColor: theme.background.val, borderColor: theme.border.val }]}>
              <Ionicons name="navigate-circle-outline" size={20} color={theme.primary.val} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.addressTitle, { color: theme.color.val }]}>Trường ĐH Công nghiệp TP.HCM</Text>
                <Text style={[styles.addressSub, { color: theme.muted.val }]}>
                  Số 12 Nguyễn Văn Bảo, Phường 4, Quận Gò Vấp, TP.HCM
                </Text>
              </View>
            </View>

            {/* Campus Building Guide */}
            <Text style={[styles.sectionTitle, { color: theme.color.val }]}>Toà nhà tiêu biểu tại IUH:</Text>
            <View style={styles.buildingGrid}>
              {[
                { code: 'Nhà A', name: 'Hội trường A7, Ban Giám hiệu, Phòng Đào tạo' },
                { code: 'Nhà B-C', name: 'Giảng đường trung tâm, phòng học lý thuyết' },
                { code: 'Nhà E', name: 'Hội trường E4, Văn phòng Đoàn Thanh niên' },
                { code: 'Nhà H', name: 'Khoa Công nghệ Thông tin, Phòng Lab máy tính' },
                { code: 'Nhà X', name: 'Nhà thi đấu đa năng, sân bóng chuyền & cầu lông' },
              ].map((b) => (
                <View key={b.code} style={[styles.buildingItem, { backgroundColor: theme.background.val, borderColor: theme.border.val }]}>
                  <Text style={[styles.buildingCode, { color: theme.primary.val }]}>{b.code}</Text>
                  <Text style={[styles.buildingSub, { color: theme.muted.val }]}>{b.name}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Action Row */}
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.mapsBtn, { backgroundColor: theme.primary.val }]}
              onPress={openGoogleMaps}
            >
              <Ionicons name="map-outline" size={18} color="#FFFFFF" />
              <Text style={styles.mapsBtnText}>Chỉ đường Google Maps</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    fontSize: 10,
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
  scroll: {
    gap: 12,
    paddingBottom: 4,
  },
  highlightBox: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    gap: 8,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightInfo: {
    flex: 1,
    gap: 2,
  },
  buildingText: {
    fontSize: 14,
    fontWeight: '900',
  },
  floorText: {
    fontSize: 12,
    fontWeight: '700',
  },
  descText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  addressTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  addressSub: {
    fontSize: 11,
    lineHeight: 15,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  buildingGrid: {
    gap: 6,
  },
  buildingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  buildingCode: {
    fontSize: 12,
    fontWeight: '900',
    width: 55,
  },
  buildingSub: {
    fontSize: 11,
    flex: 1,
  },
  actionRow: {
    marginTop: 4,
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
  },
  mapsBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
