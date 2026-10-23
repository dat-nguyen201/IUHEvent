import { AppText, Surface } from '@/components/TamaguiPrimitives';
import { useTheme } from '@tamagui/core';

type BadgeTone = 'neutral' | 'success';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
};

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const theme = useTheme();
  const color = tone === 'success' ? theme.success.val : theme.primary.val;

  return (
    <Surface style={{
      alignSelf: 'flex-start',
      backgroundColor: theme.background.val,
      borderColor: color,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 5,
    }}>
      <AppText style={{ color, fontSize: 12, fontWeight: '800' }}>{label}</AppText>
    </Surface>
  );
}
