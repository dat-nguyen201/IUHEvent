import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, type ColorValue } from 'react-native';
import { useEffect } from 'react';

import { useTheme } from '@tamagui/core';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const isDark = theme.color.val === '#F9FAFB';
  const activePillBackground = isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(15, 23, 42, 0.06)';
  const activePillBorder = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(15, 23, 42, 0.18)';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary.val,
        tabBarInactiveTintColor: theme.muted.val,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: theme.surface.val,
          borderTopColor: theme.border.val,
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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon activePillBackground={activePillBackground} activePillBorder={activePillBorder} color={color} focused={focused} label="Trang chủ" name="home-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Khám phá',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon activePillBackground={activePillBackground} activePillBorder={activePillBorder} color={color} focused={focused} label="Khám phá" name="compass-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Lịch của tôi',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon activePillBackground={activePillBackground} activePillBorder={activePillBorder} color={color} focused={focused} label="Lịch của tôi" name="calendar-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hồ sơ',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon activePillBackground={activePillBackground} activePillBorder={activePillBorder} color={color} focused={focused} label="Hồ sơ" name="person-outline" />
          ),
        }}
      />
    </Tabs>
  );
}

type TabIconName = 'home-outline' | 'compass-outline' | 'calendar-outline' | 'person-outline';

function TabIcon({
  activePillBackground,
  activePillBorder,
  color,
  focused,
  label,
  name,
}: {
  activePillBackground: string;
  activePillBorder: string;
  color: ColorValue;
  focused: boolean;
  label: string;
  name: TabIconName;
}) {
  const transition = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    transition.set(withSequence(
      withTiming(0, { duration: 80, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 12, stiffness: 260 }),
    ));
  }, [focused, transition]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.76 + transition.value * 0.24,
    backgroundColor: interpolateColor(transition.value, [0, 1], ['transparent', activePillBackground]),
    borderColor: interpolateColor(transition.value, [0, 1], ['transparent', activePillBorder]),
    transform: [
      { translateY: (1 - transition.value) * 5 },
      { scale: 0.94 + transition.value * 0.06 },
    ],
  }));

  return (
    <Animated.View style={[styles.tabPill, animatedStyle]}>
      <Ionicons color={color as string} name={name} size={focused ? 22 : 21} />
      <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>{label}</Text>
    </Animated.View>
  );
}

const styles = {
  tabPill: {
    alignItems: 'center' as const,
    borderRadius: 14,
    borderWidth: 1,
    gap: 1,
    height: 50,
    justifyContent: 'center' as const,
    paddingHorizontal: 7,
    width: 88,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
};
