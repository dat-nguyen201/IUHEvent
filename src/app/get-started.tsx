import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/constants/app-theme';
import { studentEvents } from '@/data/events';
import { getSafeEventRedirect } from '@/utils/event-links';

export default function GetStartedScreen() {
  const { redirect } = useLocalSearchParams<{ redirect?: string | string[] }>();
  const { user, finishGetStarted } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const continueToApp = async () => {
    setBusy(true);
    setError('');
    try {
      await finishGetStarted();
      router.replace(getSafeEventRedirect(redirect) ?? '/(tabs)');
    } catch {
      setError('Không lưu được trạng thái. Vui lòng thử lại.');
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
        <ImageBackground source={studentEvents[0].image} resizeMode="cover" imageStyle={styles.heroImage} style={styles.hero}>
          <View style={styles.heroTint} />
          <View style={styles.brandPill}><Text style={styles.brandPillText}>IUH EVENT · XIN CHÀO {user?.name.split(' ')[0]?.toUpperCase()}</Text></View>
        </ImageBackground>

      <View style={styles.content}>
        <View style={styles.stepRow}>
          <View style={styles.stepActive} /><View style={styles.stepInactive} /><View style={styles.stepInactive} />
        </View>
        <Text style={styles.title}>Sẵn sàng hòa mình vào IUH?</Text>
        <Text style={styles.description}>Khám phá hoạt động mới, lưu sự kiện vào lịch cá nhân và chuẩn bị check-in ngay trong một ứng dụng.</Text>

        <View style={styles.features}>
          <Feature number="01" title="Khám phá" detail="Tìm sự kiện theo chủ đề và thời gian" tone={styles.featureBlue} />
          <Feature number="02" title="Đồng hành" detail="Lưu lịch và theo dõi trạng thái tham gia" tone={styles.featureGreen} />
          <Feature number="03" title="Check-in" detail="Chuẩn bị cho điểm danh tại sự kiện" tone={styles.featureYellow} />
        </View>

        <Pressable disabled={busy} onPress={continueToApp} style={styles.primaryButton}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Bắt đầu khám phá</Text>}
        </Pressable>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Text style={styles.footer}>Cộng đồng sự kiện sinh viên IUH</Text>
      </View>
      </ScrollView>
    </Screen>
  );
}

function Feature({ number, title, detail, tone }: { number: string; title: string; detail: string; tone: object }) {
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureNumber, tone]}><Text style={styles.featureNumberText}>{number}</Text></View>
      <View style={styles.featureCopy}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDetail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, minHeight: 0 },
  pageContent: { flexGrow: 1 },
  hero: { borderRadius: 20, minHeight: 230, overflow: 'hidden' },
  heroImage: { borderRadius: 20 },
  heroTint: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(17, 24, 39, 0.16)' },
  brandPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, margin: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  brandPillText: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  content: { gap: spacing.md, paddingTop: spacing.lg },
  stepRow: { flexDirection: 'row', gap: 6 },
  stepActive: { backgroundColor: colors.primary, borderRadius: 3, height: 5, width: 28 },
  stepInactive: { backgroundColor: colors.border, borderRadius: 3, height: 5, width: 12 },
  title: { color: colors.text, fontSize: 26, fontWeight: '900', lineHeight: 32 },
  description: { color: colors.mutedText, fontSize: 14, lineHeight: 21 },
  features: { gap: spacing.sm, marginTop: spacing.xs },
  featureRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  featureNumber: { alignItems: 'center', borderRadius: 12, height: 42, justifyContent: 'center', width: 48 },
  featureBlue: { backgroundColor: colors.softBlue },
  featureGreen: { backgroundColor: colors.softGreen },
  featureYellow: { backgroundColor: '#FEF3C7' },
  featureNumberText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  featureCopy: { flex: 1, gap: 2 },
  featureTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  featureDetail: { color: colors.mutedText, fontSize: 12, lineHeight: 17 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 14, justifyContent: 'center', minHeight: 52, marginTop: spacing.xs },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 12, textAlign: 'center' },
  footer: { color: colors.mutedText, fontSize: 11, paddingBottom: spacing.xs, textAlign: 'center' },
});
