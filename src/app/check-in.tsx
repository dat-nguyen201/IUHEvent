import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/components/Badge';
import { colors, spacing } from '@/constants/app-theme';
import { useAppState } from '@/context/AppStateContext';
import { studentEvents } from '@/data/events';
import { getEventByIdSync } from '@/services/eventService';
import type { StudentEvent } from '@/types/events';
import { formatEventDate } from '@/utils/date';
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
  const { checkedInEventIds, checkInEvent, isEventSaved, saveEvent } = useAppState();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [manualInput, setManualInput] = useState(preselectedEventId ?? '');
  const [showManualSection, setShowManualSection] = useState(Platform.OS === 'web' || Boolean(preselectedEventId));

  useEffect(() => {
    if (preselectedEventId) {
      setManualInput(preselectedEventId);
    }
  }, [preselectedEventId]);

  const [scanResult, setScanResult] = useState<{
    status: 'success' | 'already' | 'invalid';
    event?: StudentEvent;
    scannedCode?: string;
    message: string;
  } | null>(null);

  const processingRef = useRef(false);

  const handleProcessQr = useCallback(
    (rawData: string) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setScanned(true);

      const parsedEventId = parseEventQrCode(rawData);
      const foundEvent = parsedEventId ? getEventByIdSync(parsedEventId) : undefined;

      if (!foundEvent) {
        setScanResult({
          status: 'invalid',
          scannedCode: rawData,
          message: `Mã QR "${rawData.slice(0, 30)}${rawData.length > 30 ? '...' : ''}" không khớp với bất kỳ sự kiện nào tại IUH.`,
        });
        processingRef.current = false;
        return;
      }

      if (checkedInEventIds.includes(foundEvent.id)) {
        setScanResult({
          status: 'already',
          event: foundEvent,
          scannedCode: rawData,
          message: `Bạn đã điểm danh sự kiện "${foundEvent.title}" trước đó rồi!`,
        });
        processingRef.current = false;
        return;
      }

      // Check-in success!
      checkInEvent(foundEvent.id);
      if (!isEventSaved(foundEvent.id)) {
        saveEvent(foundEvent.id);
      }

      setScanResult({
        status: 'success',
        event: foundEvent,
        scannedCode: rawData,
        message: `Điểm danh thành công sự kiện "${foundEvent.title}"! Dữ liệu đã được ghi nhận.`,
      });
      processingRef.current = false;
    },
    [checkInEvent, checkedInEventIds, isEventSaved, saveEvent],
  );

  const resetScanner = () => {
    processingRef.current = false;
    setScanResult(null);
    setScanned(false);
  };

  const isWeb = Platform.OS === 'web';

  return (
    <View style={[styles.container, { backgroundColor: theme.background.val, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Top Header */}
      <View style={[styles.topBar, { backgroundColor: theme.surface.val, borderBottomColor: theme.border.val }]}>
        <Pressable onPress={() => router.back()} style={styles.circleButton}>
          <Text style={styles.buttonText}>✕</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.color.val }]}>Quét mã QR Check-in</Text>
        <View style={styles.headerRightActions}>
          {!isWeb && (
            <>
              <Pressable
                onPress={() => setTorchEnabled((prev) => !prev)}
                style={[styles.circleButton, torchEnabled && styles.circleButtonActive]}>
                <Text style={styles.buttonText}>{torchEnabled ? '🔦' : '💡'}</Text>
              </Pressable>
              <Pressable
                onPress={() => setFacing((curr) => (curr === 'back' ? 'front' : 'back'))}
                style={styles.circleButton}>
                <Text style={styles.buttonText}>🔄</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Main Scanner or Permission Area */}
      <View style={styles.scannerWrapper}>
        {isWeb ? (
          <View style={[styles.fallbackContainer, { backgroundColor: theme.surface.val }]}>
            <Text style={styles.fallbackEmoji}>💻</Text>
            <Text style={[styles.fallbackTitle, { color: theme.color.val }]}>Chế độ Web / Mô phỏng</Text>
            <Text style={[styles.fallbackDesc, { color: theme.muted.val }]}>
              Camera quét trực tiếp tối ưu trên thiết bị di động thật. Bạn có thể dùng ô nhập mã hoặc chọn sự kiện thử nghiệm bên dưới để kiểm tra điểm danh ngay!
            </Text>
          </View>
        ) : !permission ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary.val} />
            <Text style={[styles.loadingText, { color: theme.muted.val }]}>Đang kiểm tra quyền camera...</Text>
          </View>
        ) : !permission.granted ? (
          <View style={[styles.deniedContainer, { backgroundColor: theme.surface.val }]}>
            <Text style={styles.deniedEmoji}>📷</Text>
            <Text style={[styles.deniedTitle, { color: theme.color.val }]}>Cần quyền truy cập Camera</Text>
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

            {/* Viewfinder Target Overlay */}
            <View style={styles.overlay}>
              <View style={styles.overlayUnfocused} />
              <View style={styles.overlayCenterRow}>
                <View style={styles.overlayUnfocused} />
                <View style={styles.targetFrame}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                  <View style={styles.scanLine} />
                </View>
                <View style={styles.overlayUnfocused} />
              </View>
              <View style={styles.overlayUnfocused}>
                <Text style={styles.targetHint}>Đặt mã QR vào giữa khung hình để quét</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Manual / Demo Check-in Trigger */}
      <View style={styles.bottomControls}>
        <Pressable
          style={styles.toggleManualButton}
          onPress={() => setShowManualSection((prev) => !prev)}>
          <Text style={styles.toggleManualText}>
            {showManualSection ? '▲ Ẩn nhập mã thủ công' : '⌨️ Hoặc nhập mã thủ công / chọn sự kiện demo'}
          </Text>
        </Pressable>

        {showManualSection && (
          <ScrollView style={[styles.manualCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]} showsVerticalScrollIndicator={false}>
            <Text style={[styles.manualLabel, { color: theme.color.val }]}>Nhập mã QR hoặc Event ID:</Text>
            <View style={styles.manualInputRow}>
              <TextInput
                style={[styles.manualInput, { backgroundColor: theme.background.val, borderColor: theme.border.val, color: theme.color.val }]}
                placeholder="VD: event-1 hoặc student-event:event-1"
                placeholderTextColor={theme.muted.val}
                value={manualInput}
                onChangeText={setManualInput}
                autoCapitalize="none"
              />
              <Pressable
                style={styles.manualSubmitButton}
                onPress={() => {
                  if (manualInput.trim()) {
                    handleProcessQr(manualInput.trim());
                  } else {
                    Alert.alert('Vui lòng nhập mã', 'Nhập ID sự kiện (vd: event-1) để kiểm tra.');
                  }
                }}>
                <Text style={styles.manualSubmitText}>Check-in</Text>
              </Pressable>
            </View>

            <Text style={styles.demoPickerLabel}>Sự kiện thử nghiệm nhanh:</Text>
            <View style={styles.demoList}>
              {studentEvents.slice(0, 4).map((evt) => {
                const isChecked = checkedInEventIds.includes(evt.id);
                return (
                  <Pressable
                    key={evt.id}
                    style={[styles.demoItem, isChecked && styles.demoItemChecked]}
                    onPress={() => handleProcessQr(evt.id)}>
                    <Text style={styles.demoItemTitle} numberOfLines={1}>
                      {evt.title} ({evt.id})
                    </Text>
                    <Badge
                      label={isChecked ? 'Đã check-in' : 'Quét thử'}
                      tone={isChecked ? 'success' : 'neutral'}
                    />
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Result Modal */}
      {scanResult && (
        <View style={styles.resultBackdrop}>
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultEmoji}>
                {scanResult.status === 'success'
                  ? '🎉'
                  : scanResult.status === 'already'
                    ? 'ℹ️'
                    : '⚠️'}
              </Text>
              <Text
                style={[
                  styles.resultTitle,
                  scanResult.status === 'success' && styles.resultTitleSuccess,
                  scanResult.status === 'invalid' && styles.resultTitleError,
                ]}>
                {scanResult.status === 'success'
                  ? 'Điểm danh thành công!'
                  : scanResult.status === 'already'
                    ? 'Đã điểm danh trước đó'
                    : 'Mã QR không hợp lệ'}
              </Text>
            </View>

            {scanResult.event && (
              <View style={styles.eventInfoBox}>
                <Image source={scanResult.event.image} style={styles.eventThumb} />
                <View style={styles.eventInfoDetails}>
                  <Badge label={scanResult.event.category} tone="neutral" />
                  <Text style={styles.eventInfoTitle} numberOfLines={2}>
                    {scanResult.event.title}
                  </Text>
                  <Text style={styles.eventInfoMeta}>
                    📍 {scanResult.event.location}
                  </Text>
                  <Text style={styles.eventInfoMeta}>
                    🕒 {formatEventDate(scanResult.event.startsAt)}
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.resultMessage}>{scanResult.message}</Text>

            <View style={styles.resultActions}>
              {scanResult.event && (
                <Pressable
                  style={styles.primaryActionButton}
                  onPress={() => {
                    const id = scanResult.event!.id;
                    resetScanner();
                    router.replace({ pathname: '/events/[id]', params: { id } });
                  }}>
                  <Text style={styles.primaryActionText}>Xem chi tiết sự kiện</Text>
                </Pressable>
              )}

              <Pressable style={styles.secondaryActionButton} onPress={resetScanner}>
                <Text style={styles.secondaryActionText}>
                  {scanResult.status === 'invalid' ? 'Thử quét lại' : 'Tiếp tục quét'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    zIndex: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  circleButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  circleButtonActive: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  scannerWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  cameraBox: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  overlayUnfocused: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  overlayCenterRow: {
    flexDirection: 'row',
    height: 250,
  },
  targetFrame: {
    borderColor: 'transparent',
    height: 250,
    position: 'relative',
    width: 250,
  },
  corner: {
    borderColor: '#38BDF8',
    height: 28,
    position: 'absolute',
    width: 28,
  },
  cornerTL: {
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
    borderTopWidth: 4,
    left: 0,
    top: 0,
  },
  cornerTR: {
    borderRightWidth: 4,
    borderTopRightRadius: 8,
    borderTopWidth: 4,
    right: 0,
    top: 0,
  },
  cornerBL: {
    borderBottomLeftRadius: 8,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    bottom: 0,
    left: 0,
  },
  cornerBR: {
    borderBottomRightRadius: 8,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    bottom: 0,
    right: 0,
  },
  scanLine: {
    backgroundColor: '#38BDF8',
    height: 2,
    position: 'absolute',
    top: '50%',
    width: '100%',
  },
  targetHint: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  deniedContainer: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  deniedEmoji: {
    fontSize: 50,
  },
  deniedTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  deniedDesc: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  grantButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  grantButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  fallbackContainer: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  fallbackEmoji: {
    fontSize: 48,
  },
  fallbackTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  fallbackDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  bottomControls: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '45%',
    padding: spacing.md,
  },
  toggleManualButton: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  toggleManualText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  manualCard: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  manualLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  manualInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  manualSubmitButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  manualSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  demoPickerLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  demoList: {
    gap: spacing.xs,
  },
  demoItem: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  demoItemChecked: {
    borderColor: '#86EFAC',
  },
  demoItemTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  resultBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    padding: spacing.lg,
    zIndex: 100,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    gap: spacing.md,
    maxWidth: 400,
    padding: spacing.lg,
    width: '100%',
  },
  resultHeader: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  resultEmoji: {
    fontSize: 44,
  },
  resultTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  resultTitleSuccess: {
    color: '#16A34A',
  },
  resultTitleError: {
    color: colors.danger,
  },
  eventInfoBox: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  eventThumb: {
    borderRadius: 10,
    height: 70,
    width: 70,
  },
  eventInfoDetails: {
    flex: 1,
    gap: 3,
  },
  eventInfoTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  eventInfoMeta: {
    color: colors.mutedText,
    fontSize: 11,
  },
  resultMessage: {
    color: colors.mutedText,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  resultActions: {
    gap: spacing.xs,
  },
  primaryActionButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryActionButton: {
    alignItems: 'center',
    backgroundColor: colors.border,
    borderRadius: 14,
    paddingVertical: spacing.md,
  },
  secondaryActionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
