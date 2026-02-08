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

  const heroWidth = Math.min(width * 0.66, 248);
  const heroHeight = heroWidth;

  return (
    <View style={styles.page}>
      <LinearGradient
        colors={["#EEF2FF", "#F5F6F8", "#FFFFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.orb, styles.orbPrimary]} />
      <View style={[styles.orb, styles.orbSecondary]} />
      <View style={[styles.orb, styles.orbAccent]} />

      <View style={[styles.content, { paddingTop: insets.top + theme.spacing.xl }]}>
        <View style={styles.headerWrap}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t(locale, "appName")}</Text>
          </View>
          <Text style={styles.title}>{t(locale, "appName")}</Text>
        </View>

        <View style={[styles.hero, { width: heroWidth, height: heroHeight }]}>
          <View style={styles.heroCard}>
            <View style={styles.logoWrap}>
              <Image source={require("../../assets/logo-big.png")} style={styles.logoImage} resizeMode="contain" />
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <ActivityIndicator size="small" color={theme.colors.cta} />
          <Text style={styles.loading}>{t(locale, "pleaseWait")}</Text>
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
    backgroundColor: "rgba(94, 124, 255, 0.18)"
  },
  orbSecondary: {
    width: 180,
    height: 180,
    top: 110,
    left: -80,
    backgroundColor: "rgba(46, 196, 182, 0.16)"
  },
  orbAccent: {
    width: 220,
    height: 220,
    bottom: -90,
    left: 30,
    backgroundColor: "rgba(245, 195, 92, 0.14)"
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: theme.spacing.xl
  },
  headerWrap: {
    alignItems: "center",
    gap: theme.spacing.md
  },
  badge: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.76)",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 236, 0.9)"
  },
  badgeText: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    letterSpacing: 1.1,
    textTransform: "uppercase"
  },
  title: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 40,
    fontWeight: "700",
    textAlign: "center"
  },
  hero: {
    alignItems: "center",
    justifyContent: "center"
  },
  heroCard: {
    width: "100%",
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 236, 0.9)"
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    width: "100%",
    aspectRatio: 1,
    borderRadius: theme.radius.xl,
    overflow: "hidden",
    backgroundColor: "#F6F7FB"
  },
  logoImage: {
    width: "90%",
    height: "90%"
  },
  footer: {
    alignItems: "center",
    gap: theme.spacing.sm
  },
  loading: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    textAlign: "center"
  }
});
