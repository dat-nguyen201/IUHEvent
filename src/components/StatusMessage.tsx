import { Text, View, useTheme } from '@tamagui/core';

import { ActionButton } from '@/components/ActionButton';

type StatusMessageProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function StatusMessage({ title, message, actionLabel, onAction }: StatusMessageProps) {
  const theme = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: 12, padding: 24 }}>
      <Text style={{ color: theme.color.val, fontSize: 20, fontWeight: '900', textAlign: 'center' }}>{title}</Text>
      <Text style={{ color: theme.color.val, fontSize: 15, lineHeight: 22, opacity: 0.65, textAlign: 'center' }}>{message}</Text>
      {actionLabel && onAction ? (
        <ActionButton label={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
}
