import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@tamagui/core';

import { useAuth } from '@/context/AuthContext';

/** UI gate; backend vẫn kiểm tra JWT + role cho từng API. */
export default function AdminLayout() {
  const { user, mode, isReady } = useAuth();
  const theme = useTheme();

  if (!isReady) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background.val }}><ActivityIndicator size="large" color={theme.primary.val} /></View>;
  }
  if (!user) return <Redirect href="/auth" />;
  if (mode !== 'remote' || user.role !== 'admin' || user.status !== 'active') {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="organizers/index" />
      <Stack.Screen name="events/index" />
      <Stack.Screen name="events/new" />
      <Stack.Screen name="events/[id]" />
      <Stack.Screen name="users/index" />
      <Stack.Screen name="users/[id]" />
    </Stack>
  );
}
