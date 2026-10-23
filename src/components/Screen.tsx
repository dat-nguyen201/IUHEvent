import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, useMedia, useTheme } from '@tamagui/core';

import { ResponsiveContent } from '@/components/TamaguiPrimitives';

export function Screen({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const media = useMedia();

  return (
    <View flex={1} style={{ backgroundColor: theme.background.val }}>
      <ResponsiveContent
        style={[
          styles.screen,
          {
            flex: 1,
            paddingHorizontal: media.compact ? 12 : 16,
            paddingTop: insets.top + 16,
            paddingLeft: Math.max(insets.left, media.compact ? 12 : 16),
            paddingRight: Math.max(insets.right, media.compact ? 12 : 16),
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}>
        {children}
      </ResponsiveContent>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
