import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";

type Props = {
  locale: Locale;
};

export function SplashScreen({ locale }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const shimmer = useRef(new Animated.Value(0)).current;
  const floatPrimary = useRef(new Animated.Value(0)).current;
  const floatSecondary = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true
        })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatPrimary, {
          toValue: 1,
          duration: 3200,
          useNativeDriver: true
        }),
        Animated.timing(floatPrimary, {
          toValue: 0,
          duration: 3200,
          useNativeDriver: true
        })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatSecondary, {
          toValue: 1,
          duration: 3600,
          useNativeDriver: true
        }),
        Animated.timing(floatSecondary, {
          toValue: 0,
          duration: 3600,
          useNativeDriver: true
        })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true
        })
      ])
    ).start();
  }, [floatPrimary, floatSecondary, shimmer, pulse]);

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-160, 160]
  });
  const floatPrimaryTranslate = floatPrimary.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18]
  });
  const floatSecondaryTranslate = floatSecondary.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 14]
  });
  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06]
  });

  const heroWidth = Math.min(width * 0.78, 320);
  const heroHeight = heroWidth * 0.9;

  const orbSize = useMemo(() => Math.max(220, width * 0.55), [width]);
  const orbSizeSmall = useMemo(() => Math.max(160, width * 0.4), [width]);

  return (
    <View style={styles.page}>
      <LinearGradient
        colors={["#F6F8FF", "#FFFFFF", "#F9F2E6"]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.orb,
          styles.orbPrimary,
          {
            width: orbSize,
            height: orbSize,
            borderRadius: orbSize / 2,
            transform: [{ translateY: floatPrimaryTranslate }]
          }
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orbSecondary,
          {
            width: orbSizeSmall,
            height: orbSizeSmall,
            borderRadius: orbSizeSmall / 2,
            transform: [{ translateY: floatSecondaryTranslate }]
          }
        ]}
      />

      <View style={[styles.content, { paddingTop: insets.top + theme.spacing.xl }]}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t(locale, "appName")}</Text>
          <Text style={styles.title}>{t(locale, "splashTagline")}</Text>
          <Text style={styles.subtitle}>{t(locale, "splashCaption")}</Text>
        </View>

        <View style={[styles.hero, { width: heroWidth, height: heroHeight }]}>
          <Animated.View style={[styles.heroGlow, { transform: [{ scale: pulseScale }] }]} />
          <View style={styles.heroCard}>
            <View style={styles.logoStack}>
              <View style={styles.logoCore}>
                <FontAwesome5 name="trophy" size={30} color="#FFFFFF" solid />
              </View>
              <Animated.View style={[styles.logoShimmer, { transform: [{ translateX: shimmerTranslate }] }]} />
            </View>
            <View style={styles.heroMeta}>
              <View style={styles.heroLine} />
              <Text style={styles.heroMetaText}>{t(locale, "splashMeta")}</Text>
              <View style={styles.heroLine} />
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
  eyebrow: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    textTransform: "uppercase",
    letterSpacing: 1.4
  },
  title: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 28,
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
  heroGlow: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(94, 124, 255, 0.12)"
  },
  heroCard: {
    width: "100%",
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(230, 231, 236, 0.9)",
    shadowColor: "#1C2A4A",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 }
  },
  logoStack: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg
  },
  logoCore: {
    width: 86,
    height: 86,
    borderRadius: 26,
    backgroundColor: theme.colors.ink,
    alignItems: "center",
    justifyContent: "center"
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    fontFamily: theme.typography.fontFamily,
    letterSpacing: 1
  },
  logoShimmer: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.18)"
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm
  },
  heroMetaText: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.4
  },
  heroLine: {
    width: 34,
    height: 1,
    backgroundColor: "rgba(109, 115, 128, 0.25)"
  },
  orb: {
    position: "absolute",
    opacity: 0.5
  },
  orbPrimary: {
    top: -80,
    right: -40,
    backgroundColor: "rgba(94, 124, 255, 0.18)"
  },
  orbSecondary: {
    bottom: -60,
    left: -40,
    backgroundColor: "rgba(243, 183, 78, 0.2)"
  }
});
