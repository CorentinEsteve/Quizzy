import React from "react";
import { Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";
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

  const heroWidth = Math.min(width * 0.7, 260);
  const heroHeight = heroWidth;

  return (
    <View style={styles.page}>
      <LinearGradient colors={["#F6F7FB", "#FFFFFF"]} style={StyleSheet.absoluteFill} />

      <View style={[styles.content, { paddingTop: insets.top + theme.spacing.xl }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t(locale, "appName")}</Text>
          <Text style={styles.subtitle}>{t(locale, "splashTagline")}</Text>
        </View>

        <View style={[styles.hero, { width: heroWidth, height: heroHeight }]}>
          <View style={styles.heroCard}>
            <View style={styles.logoWrap}>
              <Image source={require("../../assets/logo-big.png")} style={styles.logoImage} resizeMode="contain" />
            </View>
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
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xl
  },
  header: {
    alignItems: "center",
    gap: theme.spacing.sm
  },
  title: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 34,
    fontWeight: "700",
    textAlign: "center"
  },
  subtitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    textAlign: "center",
    maxWidth: 320
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
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(230, 231, 236, 0.9)"
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
  }
});
