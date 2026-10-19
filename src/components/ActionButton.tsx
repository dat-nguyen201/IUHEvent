import { Pressable, type PressableProps } from 'react-native';
import { Text, View, useTheme } from '@tamagui/core';

import { colors, spacing } from '@/constants/app-theme';

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
      <View
        style={{
          alignItems: 'center',
          backgroundColor: isSecondary || isDanger ? theme.background.val : theme.primary.val,
          borderColor: isDanger ? colors.danger : isSecondary ? colors.border : theme.primary.val,
          borderRadius: 16,
          borderWidth: isSecondary || isDanger ? 1 : 0,
          justifyContent: 'center',
          minHeight: 44,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }}>
        <Text style={{ color: isSecondary ? theme.color.val : isDanger ? colors.danger : '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
