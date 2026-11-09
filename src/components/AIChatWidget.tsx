import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useSegments } from 'expo-router';
import { useTheme } from '@tamagui/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/apiClient';
import { sendChatMessage, type ChatMessage } from '@/services/aiChatService';
import { cacheStudentEvents } from '@/services/eventsApi';
import { CampusMapModal } from '@/components/CampusMapModal';

const welcomeMessage: ChatMessage = {
  role: 'assistant',
  content: 'Xin chào! Mình là trợ lý IUH Event. Mình có thể giúp bạn kiểm tra thứ hạng BXH, xem sự kiện đã/chưa check-in, chỉ đường tới các cơ sở hoặc gợi ý sự kiện phù hợp.',
};

export function AIChatWidget() {
  const { user } = useAuth();
  const { openChat } = useLocalSearchParams<{ openChat?: string }>();
  const segments = useSegments() as readonly string[];
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [error, setError] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mapLocationName, setMapLocationName] = useState('Trụ sở chính 12 Nguyễn Văn Bảo');

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const isNavigatingToEvent = useRef(false);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useMemo(() => [
    'Thứ hạng của tôi trên BXH',
    'Sự kiện tôi đã đăng ký',
    'Lịch sử sự kiện đã check-in',
    'Hội trường A7 ở đâu?',
    'Phòng E4.01 ở cơ sở nào?',
    'Cơ sở Quảng Ngãi ở đâu?',
    'Làm sao đổi mật khẩu?',
  ], []);

  useEffect(() => () => {
    if (navigationTimer.current) clearTimeout(navigationTimer.current);
  }, []);

  useEffect(() => {
    if (openChat === '1') setVisible(true);
  }, [openChat]);

  const isProfileArea = segments.some((segment) => [
    'profile',
    'change-password',
    'forgot-password',
    'offline-tickets',
  ].includes(segment));

  const scrollToLatest = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  const openCampusMap = useCallback((location: string) => {
    setMapLocationName(location);
    setVisible(false);
    setTimeout(() => {
      setMapModalVisible(true);
    }, 350);
  }, []);

  const closeCampusMap = useCallback(() => {
    setMapModalVisible(false);
    setTimeout(() => {
      setVisible(true);
    }, 350);
  }, []);

  const send = useCallback(async (customMessage?: string) => {
    const content = (customMessage ?? input).trim();
    if (!content || isSending) return;

    setInput('');
    setError(null);
    setRetryMessage(null);
    setIsSending(true);

    const userMessage: ChatMessage = { role: 'user', content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);

    try {
      const reply = await sendChatMessage(nextMessages);
      setMessages((current) => [...current, reply]);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'Không thể kết nối trợ lý. Hãy thử lại.');
      setRetryMessage(content);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, messages]);

  if (!user || isProfileArea) return null;

  return (
    <View pointerEvents="box-none" style={styles.overlayHost}>
      <Pressable
        accessibilityLabel="Mở trợ lý AI"
        onPress={() => setVisible(true)}
        style={[styles.floatingButton, { backgroundColor: theme.primary.val }]}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFFFFF" />
      </Pressable>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
          <SafeAreaView style={[styles.sheet, { backgroundColor: theme.background.val }]}>
            <View style={[styles.header, { borderBottomColor: theme.border.val }]}>
              <View style={styles.headerTitle}>
                <View style={[styles.avatar, { backgroundColor: theme.primary.val }]}>
                  <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={[styles.title, { color: theme.color.val }]}>Trợ lý IUH Event</Text>
                  <Text style={[styles.subtitle, { color: theme.muted.val }]}>Hỗ trợ tìm kiếm, sự kiện & chỉ đường</Text>
                </View>
              </View>
              <Pressable accessibilityLabel="Đóng trợ lý AI" onPress={() => setVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={26} color={theme.color.val} />
              </Pressable>
            </View>

            <FlatList
              ref={listRef}
              style={styles.list}
              contentContainerStyle={styles.messageList}
              data={messages}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(_, index) => `${index}`}
              onContentSizeChange={scrollToLatest}
              renderItem={({ item }) => (
                <View>
                  <View style={[styles.message, item.role === 'user' ? styles.userMessage : styles.assistantMessage, { backgroundColor: item.role === 'user' ? theme.primary.val : theme.surface.val }]}>
                    <Text style={[styles.messageText, { color: item.role === 'user' ? '#FFFFFF' : theme.color.val }]}>{item.content}</Text>
                  </View>

                  {/* Leaderboard Navigation Button */}
                  {item.navigateTo ? (
                    <Pressable
                      accessibilityLabel="Mở Bảng xếp hạng"
                      onPress={() => {
                        setVisible(false);
                        setTimeout(() => {
                          router.push(item.navigateTo as never);
                        }, 300);
                      }}
                      style={[styles.navigateBtn, { backgroundColor: theme.primary.val }]}
                    >
                      <Ionicons name="trophy-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.navigateBtnText}>Xem Bảng xếp hạng DRL</Text>
                      <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                    </Pressable>
                  ) : null}

                  {/* Campus Map & Directions Card */}
                  {item.mapAction ? (
                    <View style={[styles.mapCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
                      <View style={styles.mapCardHeader}>
                        <View style={[styles.mapIconCircle, { backgroundColor: `${theme.primary.val}15` }]}>
                          <Ionicons name="location" size={20} color={theme.primary.val} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={[styles.mapCardTitle, { color: theme.color.val }]}>
                            {item.mapAction.campusName}
                          </Text>
                          <Text style={[styles.mapCardAddress, { color: theme.muted.val }]}>
                            📍 {item.mapAction.address}
                          </Text>
                          {item.mapAction.buildingCode ? (
                            <Text style={[styles.mapCardBuilding, { color: theme.primary.val }]}>
                              🏢 Nhà {item.mapAction.buildingCode}
                              {item.mapAction.floorHint ? ` · ${item.mapAction.floorHint}` : ''}
                              {item.mapAction.room ? ` (Phòng ${item.mapAction.room})` : ''}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.mapCardActions}>
                        {item.mapAction.hasInternalMap ? (
                          <Pressable
                            accessibilityLabel="Xem sơ đồ khuôn viên"
                            onPress={() => {
                              const loc = item.mapAction?.room
                                ? item.mapAction.room
                                : item.mapAction?.buildingCode
                                  ? `Nhà ${item.mapAction.buildingCode}`
                                  : 'Trụ sở chính 12 Nguyễn Văn Bảo';
                              openCampusMap(loc);
                            }}
                            style={[styles.mapBtn, { backgroundColor: theme.primary.val }]}
                          >
                            <Ionicons name="map-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.mapBtnText}>Xem sơ đồ khuôn viên</Text>
                          </Pressable>
                        ) : null}

                        <Pressable
                          accessibilityLabel="Mở chỉ đường Google Maps"
                          onPress={() => {
                            if (item.mapAction?.googleMapsUrl) {
                              void Linking.openURL(item.mapAction.googleMapsUrl);
                            }
                          }}
                          style={[styles.mapBtnSecondary, { borderColor: theme.primary.val }]}
                        >
                          <Ionicons name="navigate-outline" size={16} color={theme.primary.val} />
                          <Text style={[styles.mapBtnTextSecondary, { color: theme.primary.val }]}>
                            Chỉ đường Google Maps
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}

                  {/* Event Cards */}
                  {item.events?.map((event) => (
                    <Pressable
                      accessibilityLabel={`Mở sự kiện ${event.title}`}
                      key={event.id}
                      onPress={() => {
                        if (isNavigatingToEvent.current) return;
                        isNavigatingToEvent.current = true;
                        cacheStudentEvents([event], 'remote');
                        setVisible(false);
                        navigationTimer.current = setTimeout(() => {
                          navigationTimer.current = null;
                          router.push({
                            pathname: '/events/[id]',
                            params: { id: String(event.id), fromChat: '1' },
                          });
                          setTimeout(() => {
                            isNavigatingToEvent.current = false;
                          }, 500);
                        }, 300);
                      }}
                      style={[styles.eventCard, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}
                    >
                      <Image source={event.image} style={styles.eventImage} />
                      <View style={styles.eventInfo}>
                        <Text numberOfLines={2} style={[styles.eventTitle, { color: theme.color.val }]}>{event.title}</Text>
                        <Text numberOfLines={1} style={[styles.eventMeta, { color: theme.muted.val }]}>{event.location}</Text>
                        <Text numberOfLines={1} style={[styles.eventMeta, { color: theme.muted.val }]}>
                          Còn {event.remainingSpots ?? Math.max(0, event.capacity - (event.registeredCount ?? 0))} chỗ
                        </Text>
                        <Text style={[styles.eventLink, { color: theme.primary.val }]}>Xem chi tiết</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.muted.val} />
                    </Pressable>
                  ))}
                </View>
              )}
              ListFooterComponent={(
                <>
                  <View style={styles.suggestions}>
                    {suggestions.map((suggestion) => (
                      <Pressable key={suggestion} onPress={() => void send(suggestion)} style={[styles.suggestion, { borderColor: theme.border.val }]}>
                        <Text style={[styles.suggestionText, { color: theme.primary.val }]}>{suggestion}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {isSending ? <ActivityIndicator color={theme.primary.val} style={styles.loading} /> : null}
                  {error ? (
                    <View style={styles.errorRow}>
                      <Text style={[styles.error, { color: theme.danger.val }]}>{error}</Text>
                      {retryMessage ? (
                        <Pressable
                          accessibilityLabel="Thử gửi lại tin nhắn"
                          disabled={isSending}
                          onPress={() => void send(retryMessage)}
                        >
                          <Text style={[styles.retry, { color: theme.primary.val }]}>Thử lại</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}
                </>
              )}
            />

            <View style={[styles.inputRow, { borderTopColor: theme.border.val, backgroundColor: theme.surface.val }]}>
              <TextInput
                editable={!isSending}
                onChangeText={setInput}
                onSubmitEditing={() => void send()}
                placeholder="Hỏi trợ lý..."
                placeholderTextColor={theme.muted.val}
                style={[styles.input, { color: theme.color.val }]}
                value={input}
                returnKeyType="send"
              />
              <Pressable accessibilityLabel="Gửi tin nhắn" disabled={!input.trim() || isSending} onPress={() => void send()} style={[styles.sendButton, { backgroundColor: theme.primary.val, opacity: input.trim() && !isSending ? 1 : 0.5 }]}>
                <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Campus Map Modal (Rendered outside to prevent iOS modal nesting issues) */}
      <CampusMapModal
        visible={mapModalVisible}
        locationName={mapLocationName}
        onClose={closeCampusMap}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlayHost: {
    bottom: 0,
    elevation: 20,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  floatingButton: {
    alignItems: 'center',
    borderRadius: 28,
    bottom: 184,
    elevation: 5,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 6,
    width: 56,
    zIndex: 10,
  },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '88%', overflow: 'hidden' },
  header: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  headerTitle: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  avatar: { alignItems: 'center', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  list: { flex: 1 },
  messageList: { gap: 10, padding: 16 },
  message: { borderRadius: 16, maxWidth: '86%', padding: 12 },
  userMessage: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  assistantMessage: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 21 },
  navigateBtn: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  navigateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  mapCard: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
    padding: 12,
  },
  mapCardHeader: {
    flexDirection: 'row',
    gap: 10,
  },
  mapIconCircle: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  mapCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  mapCardAddress: {
    fontSize: 12,
    lineHeight: 16,
  },
  mapCardBuilding: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  mapCardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mapBtn: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mapBtnSecondary: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapBtnTextSecondary: {
    fontSize: 12,
    fontWeight: '700',
  },
  eventCard: { alignItems: 'center', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, marginTop: 8, padding: 8 },
  eventImage: { borderRadius: 10, height: 64, width: 64 },
  eventInfo: { flex: 1, gap: 3 },
  eventTitle: { fontSize: 14, fontWeight: '700', lineHeight: 18 },
  eventMeta: { fontSize: 12 },
  eventLink: { fontSize: 12, fontWeight: '600' },
  suggestions: { gap: 8, marginTop: 8 },
  suggestion: { borderRadius: 14, borderWidth: 1, padding: 10 },
  suggestionText: { fontSize: 13 },
  loading: { alignSelf: 'flex-start', margin: 8 },
  errorRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 8 },
  error: { flex: 1, fontSize: 13 },
  retry: { fontSize: 13, fontWeight: '700' },
  inputRow: { alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 8, padding: 12 },
  input: { flex: 1, fontSize: 16, maxHeight: 100, paddingHorizontal: 10, paddingVertical: 8 },
  sendButton: { alignItems: 'center', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
});
