import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/constants/app-theme';

export default function IntroScreen() {
  const insets = useSafeAreaInsets();
  const { user, isReady, hasSeenGetStarted } = useAuth();
  const [introElapsed, setIntroElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIntroElapsed(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!introElapsed || !isReady) return;
    if (!user) router.replace('/auth');
    else if (!hasSeenGetStarted) router.replace('/get-started');
    else router.replace('/(tabs)');
  }, [introElapsed, isReady, user, hasSeenGetStarted]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.brandMark}><Text style={styles.brandMarkText}>IUH</Text></View>
      <Text style={styles.brand}>IUH Event</Text>
      <Text style={styles.tagline}>Cùng bạn đến mọi sự kiện</Text>
      <ActivityIndicator style={styles.loader} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 22,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  brandMarkText: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  brand: { color: colors.text, fontSize: 32, fontWeight: '900', marginTop: spacing.md },
  tagline: { color: colors.mutedText, fontSize: 15, marginTop: spacing.xs },
  loader: { marginTop: spacing.xl },
});
