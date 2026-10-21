import { router, Stack, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider } from '@/context/AppStateContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';

import { addNotificationResponseListener } from '@/services/notificationService';

export default function RootLayout() {
  useEffect(() => {
    const unsubscribe = addNotificationResponseListener((eventId) => {
      router.push({ pathname: '/events/[id]', params: { id: eventId } });
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppStateProvider>
          <AuthProvider>
            <RouteGuard />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="auth" />
              <Stack.Screen name="get-started" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="events/[id]" />
              <Stack.Screen name="check-in" options={{ animation: 'slide_from_bottom' }} />
            </Stack>
          </AuthProvider>
        </AppStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RouteGuard() {
  const segments = useSegments() as readonly string[];
  const { user, isReady, hasSeenGetStarted } = useAuth();
  const route = segments[0];

  useEffect(() => {
    if (!isReady || !route || route === 'index') return;
    const isAuthRoute = route === 'auth';
    const isOnboardingRoute = route === 'get-started';
    const isProtectedRoute = route === '(tabs)' || route === 'events' || route === 'check-in';

    if (!user && (isProtectedRoute || isOnboardingRoute)) router.replace('/auth');
    else if (user && isProtectedRoute && !hasSeenGetStarted) router.replace('/get-started');
    else if (user && isAuthRoute) router.replace(hasSeenGetStarted ? '/(tabs)' : '/get-started');
    else if (user && isOnboardingRoute && hasSeenGetStarted) router.replace('/(tabs)');
  }, [hasSeenGetStarted, isReady, route, user]);

  return null;
}
