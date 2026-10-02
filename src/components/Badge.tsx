import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/app-theme';

type BadgeTone = 'neutral' | 'success';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
};

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  return (
    <View style={[styles.badge, tone === 'success' && styles.successBadge]}>
      <Text style={[styles.text, tone === 'success' && styles.successText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.softBlue,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  successBadge: {
    backgroundColor: colors.softGreen,
  },
  text: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  successText: {
    color: colors.success,
  },
});
