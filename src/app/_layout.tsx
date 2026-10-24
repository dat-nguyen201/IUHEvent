import { router, Stack, useLocalSearchParams, useSegments } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider } from '@/context/AppStateContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { getSafeEventRedirect } from '@/utils/event-links';

export default function RootLayout() {
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
            </Stack>
          </AuthProvider>
        </AppStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RouteGuard() {
  const segments = useSegments() as readonly string[];
  const { redirect } = useLocalSearchParams<{ redirect?: string | string[] }>();
  const { user, isReady, hasSeenGetStarted } = useAuth();
  const route = segments[0];
  const pendingRedirect = useMemo(() => getSafeEventRedirect(redirect), [redirect]);

  useEffect(() => {
    if (!isReady || !route || route === 'index') return;
    const isAuthRoute = route === 'auth';
    const isOnboardingRoute = route === 'get-started';
    const isProtectedRoute = route === '(tabs)' || route === 'events';

    const pendingEventPath = route === 'events' && segments[1]
      ? `/events/${encodeURIComponent(segments[1])}`
      : undefined;
    const pendingParams = pendingEventPath ? { redirect: pendingEventPath } : undefined;
    if (!user && (isProtectedRoute || isOnboardingRoute)) {
      router.replace(pendingParams ? { pathname: '/auth', params: pendingParams } : '/auth');
    }
    else if (user && isProtectedRoute && !hasSeenGetStarted) {
      router.replace(pendingParams ? { pathname: '/get-started', params: pendingParams } : '/get-started');
    }
    else if (user && isAuthRoute) router.replace(hasSeenGetStarted ? '/(tabs)' : '/get-started');
    else if (user && isOnboardingRoute && hasSeenGetStarted) router.replace(pendingRedirect ?? '/(tabs)');
  }, [hasSeenGetStarted, isReady, pendingRedirect, redirect, route, segments, user]);

  return null;
}
