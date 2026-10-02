import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/app-theme';

type StatusMessageProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function StatusMessage({ title, message, actionLabel, onAction }: StatusMessageProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.button}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    color: colors.mutedText,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
