import { MutedText, SectionTitle } from '@/components/TamaguiPrimitives';
import { View } from '@tamagui/core';

import { ActionButton } from '@/components/ActionButton';

type StatusMessageProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function StatusMessage({ title, message, actionLabel, onAction }: StatusMessageProps) {
  return (
    <View style={{ alignItems: 'center', gap: 12, padding: 24 }}>
      <SectionTitle style={{ textAlign: 'center' }}>{title}</SectionTitle>
      <MutedText lineHeight={22} style={{ textAlign: 'center' }}>{message}</MutedText>
      {actionLabel && onAction ? (
        <ActionButton label={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
}
