import { Pressable, type PressableProps } from 'react-native';
import { Text, useTheme } from '@tamagui/core';

import { Surface } from '@/components/TamaguiPrimitives';

type ActionButtonProps = PressableProps & {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
};

export function ActionButton({ label, variant = 'primary', style, ...props }: ActionButtonProps) {
  const theme = useTheme();
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';

  return (
    <Pressable {...props} style={style}>
      <Surface style={{
          alignItems: 'center',
          backgroundColor: isSecondary || isDanger ? theme.background.val : theme.primary.val,
          borderColor: isDanger ? theme.danger.val : isSecondary ? theme.border.val : theme.primary.val,
          borderRadius: 16,
          borderWidth: isSecondary || isDanger ? 1 : 0,
          justifyContent: 'center',
          minHeight: 44,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}>
        <Text style={{ color: isSecondary ? theme.color.val : isDanger ? theme.danger.val : '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
          {label}
        </Text>
      </Surface>
    </Pressable>
  );
}
