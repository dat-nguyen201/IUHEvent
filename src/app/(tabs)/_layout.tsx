import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/app-theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 68 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          position: 'relative',
        },
        tabBarItemStyle: {
          height: 52,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color }) => <TabGlyph color={color} glyph="⌂" />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Khám phá',
          tabBarIcon: ({ color }) => <TabGlyph color={color} glyph="⌕" />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Lịch của tôi',
          tabBarIcon: ({ color }) => <TabGlyph color={color} glyph="▦" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color }) => <TabGlyph color={color} glyph="◯" />,
        }}
      />
    </Tabs>
  );
}

function TabGlyph({ color, glyph }: { color: ColorValue; glyph: string }) {
  return <Text style={{ color, fontSize: 22, fontWeight: '700', lineHeight: 24 }}>{glyph}</Text>;
}
