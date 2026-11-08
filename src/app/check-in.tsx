import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Badge } from '@/components/Badge';
import { AttendancePassModal } from '@/components/AttendancePassModal';
import { useAppState } from '@/context/AppStateContext';
import { studentEvents } from '@/data/events';
import { getEventById, getEventByIdSync } from '@/services/eventService';
import { ApiError } from '@/services/apiClient';
import type { StudentEvent } from '@/types/events';
import { useTheme } from '@tamagui/core';

export function parseEventQrCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const obj = JSON.parse(trimmed);
    if (obj.eventId && typeof obj.eventId === 'string') return obj.eventId;
    if (obj.id && typeof obj.id === 'string') return obj.id;
  } catch {
    // Not JSON format
  }

  if (trimmed.startsWith('student-event:')) {
    return trimmed.replace('student-event:', '').trim();
  }

  const urlMatch = trimmed.match(/\/events\/([a-zA-Z0-9_-]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  return trimmed;
}

export default function CheckInScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { eventId: preselectedEventId } = useLocalSearchParams<{ eventId?: string }>();
  const { user, checkedInEventIds, isEventRegistered, registerEvent, checkInEvent } = useAppState();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [manualInput, setManualInput] = useState(preselectedEventId ?? '');
  const [showManualSection, setShowManualSection] = useState(
    Platform.OS === 'web' || Boolean(preselectedEventId),
  );

  const [attendancePassEvent, setAttendancePassEvent] = useState<StudentEvent | null>(null);
  const [isAlreadyCheckedIn, setIsAlreadyCheckedIn] = useState(false);

  // Unregistered prompt dialog
  const [unregisteredEvent, setUnregisteredEvent] = useState<{ event: StudentEvent; rawData: string } | null>(null);
  const [isRegisteringQuick, setIsRegisteringQuick] = useState(false);

  // Error dialog
  const [errorDialog, setErrorDialog] = useState<string | null>(null);

  const processingRef = useRef(false);

  // Scanning laser animation
  const laserTranslateY = useSharedValue(0);
  useEffect(() => {
    laserTranslateY.value = withRepeat(
      withSequence(
        withTiming(210, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [laserTranslateY]);

  const laserStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: laserTranslateY.value }],
  }));

  useEffect(() => {
    if (preselectedEventId) {
      setManualInput(preselectedEventId);
    }
  }, [preselectedEventId]);

  const handleProcessQr = useCallback(
    async (rawData: string) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setScanned(true);

      // Light haptic feedback
      try {
        Vibration.vibrate(50);
      } catch {
        // ignore
      }

      const parsedEventId = parseEventQrCode(rawData);
      let foundEvent = parsedEventId ? getEventByIdSync(parsedEventId) : undefined;
      if (!foundEvent && parsedEventId) {
        try {
          foundEvent = await getEventById(parsedEventId);
        } catch {
          // not found via API
        }
      }

      if (!foundEvent) {
        setErrorDialog(`Mã QR "${rawData.slice(0, 32)}${rawData.length > 32 ? '...' : ''}" không khớp với bất kỳ sự kiện nào tại IUH.`);
        processingRef.current = false;
        return;
      }

      // Case 1: Already checked in
      if (checkedInEventIds.includes(foundEvent.id)) {
        setIsAlreadyCheckedIn(true);
        setAttendancePassEvent(foundEvent);
        processingRef.current = false;
        return;
      }

      // Case 2: Not registered yet
      if (!isEventRegistered(foundEvent.id)) {
        setUnregisteredEvent({ event: foundEvent, rawData });
        processingRef.current = false;
        return;
      }

      // Case 3: Registered -> Proceed to Check in directly
      try {
        const result = await checkInEvent(foundEvent.id, rawData);
        if (result && !result.success) {
          setErrorDialog(result.message || 'Mã QR không hợp lệ hoặc sự kiện đã kết thúc.');
          processingRef.current = false;
          return;
        }

        // Success vibration
        try {
          Vibration.vibrate([0, 70, 40, 70]);
        } catch {
          // ignore
        }

        setIsAlreadyCheckedIn(false);
        setAttendancePassEvent(foundEvent);
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : 'Không thể ghi nhận điểm danh. Hãy thử lại.';
        setErrorDialog(message);
      } finally {
        processingRef.current = false;
      }
    },
    [checkInEvent, checkedInEventIds, isEventRegistered],
  );

  // Quick Register & Check-in Handler
  const handleQuickRegisterAndCheckIn = async () => {
    if (!unregisteredEvent) return;
    setIsRegisteringQuick(true);
    const { event, rawData } = unregisteredEvent;
    try {
      await registerEvent(event.id);
      const result = await checkInEvent(event.id, rawData);
      if (result && !result.success) {
        setErrorDialog(result.message || 'Chưa thể hoàn tất điểm danh.');
        return;
      }

      try {
        Vibration.vibrate([0, 70, 40, 70]);
      } catch {
        // ignore
      }

      setUnregisteredEvent(null);
      setIsAlreadyCheckedIn(false);
      setAttendancePassEvent(event);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Có lỗi khi đăng ký nhanh.';
      setErrorDialog(msg);
    } finally {
      setIsRegisteringQuick(false);
    }
  };

  const resetScanner = () => {
    processingRef.current = false;
    setScanned(false);
    setErrorDialog(null);
    setUnregisteredEvent(null);
    setAttendancePassEvent(null);
  };

  const isWeb = Platform.OS === 'web';

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {/* Top Glassmorphic Navigation Bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.circleBtn}
          accessibilityRole="button"
          accessibilityLabel="Đóng camera"
        >
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </Pressable>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Quét mã Check-in</Text>
          <Text style={styles.headerSubtitle}>Điểm danh sự kiện IUH</Text>
        </View>

        <View style={styles.headerRightActions}>
          {!isWeb && (
            <>
              <Pressable
                onPress={() => setTorchEnabled((prev) => !prev)}
                style={[styles.circleBtn, torchEnabled && styles.circleBtnActive]}
                accessibilityRole="button"
                accessibilityLabel="Bật đèn pin"
              >
                <Ionicons
                  name={torchEnabled ? 'flash' : 'flash-outline'}
                  size={20}
                  color={torchEnabled ? '#F59E0B' : '#FFFFFF'}
                />
              </Pressable>
              <Pressable
                onPress={() => setFacing((curr) => (curr === 'back' ? 'front' : 'back'))}
                style={styles.circleBtn}
                accessibilityRole="button"
                accessibilityLabel="Đổi camera"
              >
                <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Camera Viewfinder Area */}
      <View style={styles.scannerWrapper}>
        {isWeb ? (
          <View style={[styles.fallbackContainer, { backgroundColor: theme.surface.val }]}>
            <View style={styles.fallbackIconWrap}>
              <Ionicons name="laptop-outline" size={48} color={theme.primary.val} />
            </View>
            <Text style={[styles.fallbackTitle, { color: theme.color.val }]}>
              Chế độ Mô phỏng Web
            </Text>
            <Text style={[styles.fallbackDesc, { color: theme.muted.val }]}>
              Camera quét trực tiếp tối ưu trên thiết bị di động thật. Bạn có thể dùng ô nhập mã hoặc chọn sự kiện thử nghiệm bên dưới để kiểm tra điểm danh ngay!
            </Text>
          </View>
        ) : !permission ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0D6EFD" />
            <Text style={styles.loadingText}>Đang kiểm tra quyền camera...</Text>
          </View>
        ) : !permission.granted ? (
          <View style={[styles.deniedContainer, { backgroundColor: theme.surface.val }]}>
            <View style={styles.deniedIconWrap}>
              <Ionicons name="camera-outline" size={48} color="#EF4444" />
            </View>
            <Text style={[styles.deniedTitle, { color: theme.color.val }]}>
              Cần quyền truy cập Camera
            </Text>
            <Text style={[styles.deniedDesc, { color: theme.muted.val }]}>
              IUH Event cần quyền camera để quét mã QR điểm danh tại sự kiện. Hãy cho phép để sử dụng tính năng này.
            </Text>
            <Pressable style={styles.grantButton} onPress={requestPermission}>
              <Text style={styles.grantButtonText}>Cấp quyền Camera</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cameraBox}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing={facing}
              enableTorch={torchEnabled}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned ? undefined : (res) => handleProcessQr(res.data)}
            />

            {/* Dark Mask with Target Window */}
            <View style={styles.overlay}>
              <View style={styles.overlayUnfocused} />
              <View style={styles.overlayCenterRow}>
                <View style={styles.overlayUnfocused} />
                <View style={styles.targetFrame}>
                  {/* Glowing 4 Corner Brackets */}
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />

                  {/* Dynamic Laser Scanning Line */}
                  <Animated.View style={[styles.laserLineWrap, laserStyle]}>
                    <LinearGradient
                      colors={['rgba(56, 189, 248, 0)', '#38BDF8', 'rgba(56, 189, 248, 0)']}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.laserGradient}
                    />
                  </Animated.View>
                </View>
                <View style={styles.overlayUnfocused} />
              </View>
              <View style={styles.overlayBottom}>
                <View style={styles.hintPill}>
                  <Ionicons name="scan-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.targetHint}>Căn mã QR sự kiện vào giữa khung ngắm</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Bottom Manual & Demo Tray */}
      <View style={styles.bottomTray}>
        <Pressable
          style={styles.trayToggleBtn}
          onPress={() => setShowManualSection((prev) => !prev)}
        >
          <Ionicons
            name={showManualSection ? 'chevron-down' : 'keypad-outline'}
            size={18}
            color="#E2E8F0"
          />
          <Text style={styles.trayToggleText}>
            {showManualSection ? 'Ẩn bảng nhập mã thủ công' : 'Nhập mã ID hoặc chọn sự kiện thử nhanh'}
          </Text>
        </Pressable>

        {showManualSection && (
          <ScrollView
            style={[styles.manualScroll, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.manualLabel, { color: theme.color.val }]}>
              Nhập mã QR hoặc Event ID:
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.background.val,
                    borderColor: theme.border.val,
                    color: theme.color.val,
                  },
                ]}
                placeholder="VD: event-1 hoặc student-event:event-1"
                placeholderTextColor={theme.muted.val}
                value={manualInput}
                onChangeText={setManualInput}
                autoCapitalize="none"
              />
              <Pressable
                style={[styles.submitBtn, { backgroundColor: theme.primary.val }]}
                onPress={() => {
                  if (manualInput.trim()) {
                    void handleProcessQr(manualInput.trim());
                  } else {
                    Alert.alert('Nhập mã sự kiện', 'Vui lòng nhập ID sự kiện để kiểm tra điểm danh.');
                  }
                }}
              >
                <Text style={styles.submitBtnText}>Quét</Text>
              </Pressable>
            </View>

            <Text style={[styles.quickListTitle, { color: theme.muted.val }]}>SỰ KIỆN THỬ NGHIỆM TỨC THÌ:</Text>
            <View style={styles.quickList}>
              {studentEvents.slice(0, 4).map((evt) => {
                const isChecked = checkedInEventIds.includes(evt.id);
                return (
                  <Pressable
                    key={evt.id}
                    style={[
                      styles.quickItem,
                      { backgroundColor: theme.background.val, borderColor: theme.border.val },
                      isChecked && styles.quickItemChecked,
                    ]}
                    onPress={() => void handleProcessQr(evt.id)}
                  >
                    <View style={styles.quickItemTextWrap}>
                      <Text style={[styles.quickItemTitle, { color: theme.color.val }]} numberOfLines={1}>
                        {evt.title}
                      </Text>
                      <Text style={[styles.quickItemId, { color: theme.muted.val }]}>ID: {evt.id}</Text>
                    </View>
                    <Badge
                      label={isChecked ? 'Đã điểm danh' : 'Quét thử'}
                      tone={isChecked ? 'success' : 'neutral'}
                    />
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Unregistered Prompt Modal */}
      {unregisteredEvent && (
        <View style={styles.dialogBackdrop}>
          <View style={[styles.dialogCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
            <View style={styles.dialogIconWrap}>
              <Ionicons name="sparkles" size={32} color="#0D6EFD" />
            </View>
            <Text style={[styles.dialogTitle, { color: theme.color.val }]}>
              Chưa đăng ký trước sự kiện
            </Text>
            <Text style={[styles.dialogDesc, { color: theme.muted.val }]}>
              Bạn đang quét check-in sự kiện{' '}
              <Text style={{ fontWeight: '800', color: theme.color.val }}>
                &ldquo;{unregisteredEvent.event.title}&rdquo;
              </Text>
              . Bạn có muốn Đăng ký & Điểm danh ngay tại bàn không?
            </Text>

            <View style={styles.dialogActionCol}>
              <Pressable
                style={[styles.dialogPrimaryBtn, { backgroundColor: theme.primary.val }]}
                disabled={isRegisteringQuick}
                onPress={() => void handleQuickRegisterAndCheckIn()}
              >
                {isRegisteringQuick ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                    <Text style={styles.dialogPrimaryBtnText}>Đăng ký & Điểm danh ngay</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[styles.dialogSecondaryBtn, { borderColor: theme.border.val }]}
                disabled={isRegisteringQuick}
                onPress={resetScanner}
              >
                <Text style={[styles.dialogSecondaryBtnText, { color: theme.muted.val }]}>Hủy bỏ</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Error / Invalid QR Dialog */}
      {errorDialog && (
        <View style={styles.dialogBackdrop}>
          <View style={[styles.dialogCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
            <View style={[styles.dialogIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="alert-circle" size={34} color="#EF4444" />
            </View>
            <Text style={[styles.dialogTitle, { color: theme.color.val }]}>
              Mã QR không hợp lệ
            </Text>
            <Text style={[styles.dialogDesc, { color: theme.muted.val }]}>{errorDialog}</Text>
            <Pressable
              style={[styles.dialogPrimaryBtn, { backgroundColor: theme.primary.val }]}
              onPress={resetScanner}
            >
              <Text style={styles.dialogPrimaryBtnText}>Thử quét lại</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Attendance Pass (Certificate) Modal */}
      <AttendancePassModal
        visible={Boolean(attendancePassEvent)}
        event={attendancePassEvent ?? undefined}
        user={user}
        isAlreadyCheckedIn={isAlreadyCheckedIn}
        onClose={resetScanner}
        onViewEvent={() => {
          if (attendancePassEvent) {
            const eventId = attendancePassEvent.id;
            resetScanner();
            router.replace({ pathname: '/events/[id]', params: { id: eventId } });
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  headerTitleWrap: {
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: 10,
  },
  scannerWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  cameraBox: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  overlayUnfocused: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  overlayCenterRow: {
    flexDirection: 'row',
    height: 250,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    paddingTop: 24,
  },
  targetFrame: {
    width: 250,
    height: 250,
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#38BDF8',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 6 },
  laserLineWrap: {
    width: '100%',
    height: 4,
    position: 'absolute',
    top: 15,
  },
  laserGradient: {
    width: '100%',
    height: '100%',
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  targetHint: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomTray: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  trayToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
  },
  trayToggleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  manualScroll: {
    maxHeight: 250,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  manualLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  textInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  submitBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  quickListTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  quickList: {
    gap: 8,
    paddingBottom: 10,
  },
  quickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  quickItemChecked: {
    opacity: 0.65,
  },
  quickItemTextWrap: {
    flex: 1,
    gap: 2,
  },
  quickItemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  quickItemId: {
    fontSize: 10,
    fontWeight: '600',
  },
  fallbackContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  fallbackIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(13, 110, 253, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  fallbackDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  deniedContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  deniedIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deniedTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  deniedDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  grantButton: {
    backgroundColor: '#0D6EFD',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 6,
  },
  grantButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  dialogBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 100,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    gap: 14,
  },
  dialogIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(13, 110, 253, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  dialogDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  dialogActionCol: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
  dialogPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    width: '100%',
  },
  dialogPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  dialogSecondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  dialogSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
