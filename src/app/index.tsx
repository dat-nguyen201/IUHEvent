import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "@/constants/app-theme";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@tamagui/core";

export default function IntroScreen() {
  const insets = useSafeAreaInsets();
  const { user, mode, isReady, hasSeenGetStarted } = useAuth();
  const theme = useTheme();
  const [introElapsed, setIntroElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIntroElapsed(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!introElapsed || !isReady) return;
    if (!user) router.replace("/auth");
    else if (!hasSeenGetStarted) router.replace("/get-started");
    else
      router.replace(
        mode === "remote" && user.role === "admin"
          ? ("/admin/events" as never)
          : "/(tabs)",
      );
  }, [introElapsed, isReady, user, mode, hasSeenGetStarted]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background.val,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
        },
      ]}
    >
      <View
        style={[
          styles.logoWrap,
          {
            backgroundColor: "#FFFFFF",
            shadowColor: theme.primary.val,
          },
        ]}
      >
        <Image
          source={require("@/IMG/logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      <Text style={[styles.brand, { color: theme.color.val }]}>IUH Event</Text>
      <Text style={[styles.tagline, { color: theme.muted.val }]}>
        Cùng bạn đến mọi sự kiện
      </Text>
      <ActivityIndicator style={styles.loader} color={theme.primary.val} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  logoWrap: {
    width: 104,
    height: 104,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  logoImage: {
    width: 88,
    height: 88,
  },
  brand: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
    marginTop: spacing.md,
  },
  tagline: { color: colors.mutedText, fontSize: 15, marginTop: spacing.xs },
  loader: { marginTop: spacing.xl },
});
