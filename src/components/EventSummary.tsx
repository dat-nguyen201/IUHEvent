import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@tamagui/core';

import { getEventSummary, type EventSummaryResult } from '@/services/aiSummaryService';
import type { StudentEvent } from '@/types/events';

type EventSummaryProps = {
  event: StudentEvent;
};

export function EventSummary({ event }: EventSummaryProps) {
  const theme = useTheme();
  const [consented, setConsented] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EventSummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    if (!consented || isLoading) return;

    setIsLoading(true);
    setError(null);
    try {
      setResult(await getEventSummary(event));
    } catch {
      setResult(null);
      setError('Chưa thể tạo tóm tắt. Bạn có thể thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface.val, borderColor: theme.border.val }]}>
      <Text style={[styles.title, { color: theme.color.val }]}>Tóm tắt nhanh</Text>
      <Text style={[styles.description, { color: theme.muted.val }]}>
        Tóm tắt chỉ dùng thông tin công khai của sự kiện, không gửi tài khoản hay dữ liệu cá nhân.
      </Text>

      {!result ? (
        <>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consented }}
            onPress={() => setConsented((value) => !value)}
            style={styles.consentRow}>
            <View style={[styles.checkbox, { borderColor: consented ? theme.primary.val : theme.border.val }]}>
              {consented ? <View style={[styles.checkboxMark, { backgroundColor: theme.primary.val }]} /> : null}
            </View>
            <Text style={[styles.consentText, { color: theme.muted.val }]}>
              Tôi đồng ý gửi dữ liệu sự kiện công khai đến máy chủ tóm tắt.
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={!consented || isLoading}
            onPress={() => void generateSummary()}
            style={[
              styles.generateButton,
              { backgroundColor: consented ? theme.primary.val : theme.border.val },
            ]}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.generateText}>Tạo tóm tắt</Text>
            )}
          </Pressable>
          {error ? <Text style={[styles.error, { color: theme.danger.val }]}>{error}</Text> : null}
        </>
      ) : (
        <>
          <Text style={[styles.summary, { color: theme.color.val }]}>{result.text}</Text>
          {result.notice ? <Text style={[styles.notice, { color: theme.muted.val }]}>{result.notice}</Text> : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => setResult(null)}
            style={[styles.retryButton, { borderColor: theme.border.val }]}>
            <Text style={[styles.retryText, { color: theme.primary.val }]}>Tạo lại</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
  },
  consentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  checkbox: {
    alignItems: 'center',
    borderRadius: 5,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkboxMark: {
    borderRadius: 2,
    height: 12,
    width: 12,
  },
  consentText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  generateButton: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 44,
  },
  generateText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  error: {
    fontSize: 12,
    textAlign: 'center',
  },
  summary: {
    fontSize: 14,
    lineHeight: 22,
  },
  notice: {
    fontSize: 12,
    lineHeight: 18,
  },
  retryButton: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
