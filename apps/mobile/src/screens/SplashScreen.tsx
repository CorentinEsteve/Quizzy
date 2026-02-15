import React from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";

type Props = {
  locale: Locale;
};

export function SplashScreen({ locale }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const heroWidth = Math.min(width * 0.68, 270);
  const heroHeight = heroWidth;

  return (
    <View style={styles.page}>
      <LinearGradient
        colors={["#08112E", "#0D1B4A", "#142A60"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.orb, styles.orbPrimary]} />
      <View style={[styles.orb, styles.orbSecondary]} />
      <View style={[styles.orb, styles.orbAccent]} />
      <View style={[styles.dot, styles.dotPrimary]} />
      <View style={[styles.dot, styles.dotSecondary]} />
      <View style={[styles.dot, styles.dotAccent]} />

      <View style={[styles.content, { paddingTop: insets.top + theme.spacing.xl }]}>
        <View style={styles.headerWrap}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t(locale, "appName")}</Text>
          </View>
          <Text style={styles.title}>{t(locale, "appName")}</Text>
          <Text style={styles.subtitle}>{t(locale, "onboardingSubtitle")}</Text>
        </View>

        <View style={[styles.hero, { width: heroWidth, height: heroHeight }]}>
          <View style={styles.heroGlow} />
          <View style={styles.heroCard}>
            <Image source={require("../../assets/logo-big.png")} style={styles.logoImage} resizeMode="cover" />
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.loadingPill}>
            <ActivityIndicator size="small" color={theme.colors.cta} />
          </View>
          <View style={styles.sparkRow}>
            <View style={[styles.spark, { backgroundColor: theme.colors.primary }]} />
            <View style={[styles.spark, { backgroundColor: theme.colors.secondary }]} />
            <View style={[styles.spark, { backgroundColor: theme.colors.accent }]} />
          </View>
        </View>
      </View>
      <View style={{ paddingBottom: insets.bottom + theme.spacing.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.background,
    overflow: "hidden"
  },
  orb: {
    position: "absolute",
    borderRadius: 999
  },
  orbPrimary: {
    width: 230,
    height: 230,
    top: -70,
    right: -40,
    backgroundColor: "rgba(105, 139, 255, 0.22)"
  },
  orbSecondary: {
    width: 180,
    height: 180,
    top: 110,
    left: -80,
    backgroundColor: "rgba(86, 70, 184, 0.18)"
  },
  orbAccent: {
    width: 220,
    height: 220,
    bottom: -90,
    left: 30,
    backgroundColor: "rgba(243, 194, 88, 0.16)"
  },
  dot: {
    position: "absolute",
    borderRadius: 999
  },
  dotPrimary: {
    width: 10,
    height: 10,
    top: 140,
    right: 54,
    backgroundColor: "rgba(105, 139, 255, 0.36)"
  },
  dotSecondary: {
    width: 8,
    height: 8,
    top: 190,
    right: 30,
    backgroundColor: "rgba(86, 70, 184, 0.36)"
  },
  dotAccent: {
    width: 12,
    height: 12,
    top: 90,
    left: 28,
    backgroundColor: "rgba(245, 195, 92, 0.35)"
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xl
  },
  headerWrap: {
    alignItems: "center",
    gap: theme.spacing.sm
  },
  badge: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 999,
    backgroundColor: "rgba(214, 228, 255, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(171, 198, 255, 0.3)"
  },
  badgeText: {
    color: "rgba(226, 236, 255, 0.9)",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  title: {
    color: "#F3F7FF",
    fontFamily: theme.typography.fontFamily,
    fontSize: 42,
    fontWeight: "700",
    textAlign: "center"
  },
  subtitle: {
    color: "rgba(214, 228, 255, 0.86)",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 320
  },
  hero: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center"
  },
  heroGlow: {
    position: "absolute",
    width: "94%",
    height: "94%",
    borderRadius: 999,
    backgroundColor: "rgba(105, 139, 255, 0.24)"
  },
  heroCard: {
    width: "82%",
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: "rgba(214, 228, 255, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(171, 198, 255, 0.28)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  logoImage: {
    width: "128%",
    height: "128%",
    transform: [{ scale: 1.08 }]
  },
  footer: {
    alignItems: "center",
    gap: theme.spacing.sm
  },
  loadingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 999,
    backgroundColor: "rgba(214, 228, 255, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(171, 198, 255, 0.3)"
  },
  sparkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  spark: {
    width: 7,
    height: 7,
    borderRadius: 999
  }
});
