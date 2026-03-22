import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale } from "../i18n";

type Props = {
  locale: Locale;
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function TwinkleStar({
  x,
  y,
  size,
  delay,
  color,
}: {
  x: `${number}%` | number;
  y: `${number}%` | number;
  size: number;
  delay: number;
  color: string;
}) {
  const opacity = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    const duration = 1300 + Math.random() * 1400;
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
      }}
    />
  );
}

function FloatOrb({
  orbStyle,
  delay,
}: {
  orbStyle: object | object[];
  delay: number;
}) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -16,
          duration: 3000,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[orbStyle, { transform: [{ translateY }] }]} />
  );
}

// ─── Star positions ───────────────────────────────────────────────────────────

const STARS: Array<{ x: `${number}%`; y: `${number}%`; size: number; delay: number; color: string }> = [
  { x: "6%",  y: "5%",  size: 3, delay: 0,    color: "rgba(171,198,255,0.95)" },
  { x: "20%", y: "9%",  size: 2, delay: 380,  color: "rgba(245,195,92,0.9)"  },
  { x: "48%", y: "3%",  size: 4, delay: 720,  color: "rgba(171,198,255,0.9)" },
  { x: "74%", y: "8%",  size: 2, delay: 190,  color: "rgba(46,196,182,0.85)" },
  { x: "89%", y: "14%", size: 3, delay: 920,  color: "rgba(171,198,255,0.8)" },
  { x: "4%",  y: "24%", size: 2, delay: 310,  color: "rgba(245,195,92,0.75)" },
  { x: "94%", y: "31%", size: 3, delay: 610,  color: "rgba(171,198,255,0.85)"},
  { x: "12%", y: "44%", size: 2, delay: 1100, color: "rgba(46,196,182,0.7)"  },
  { x: "88%", y: "49%", size: 4, delay: 440,  color: "rgba(245,195,92,0.85)" },
  { x: "8%",  y: "63%", size: 2, delay: 820,  color: "rgba(171,198,255,0.7)" },
  { x: "91%", y: "68%", size: 3, delay: 260,  color: "rgba(245,195,92,0.65)" },
  { x: "28%", y: "83%", size: 2, delay: 660,  color: "rgba(171,198,255,0.8)" },
  { x: "68%", y: "87%", size: 3, delay: 360,  color: "rgba(46,196,182,0.7)"  },
  { x: "50%", y: "93%", size: 2, delay: 540,  color: "rgba(171,198,255,0.6)" },
  { x: "38%", y: "17%", size: 2, delay: 1040, color: "rgba(245,195,92,0.7)"  },
  { x: "62%", y: "55%", size: 2, delay: 780,  color: "rgba(171,198,255,0.75)"},
  { x: "78%", y: "76%", size: 3, delay: 150,  color: "rgba(46,196,182,0.65)" },
];

// ─── Main screen ──────────────────────────────────────────────────────────────

export function SplashScreen({ locale: _locale }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const heroSize = Math.min(width * 0.60, 230);

  // Entrance
  const logoScale   = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Glow pulse
  const glowScale   = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.28)).current;

  // Title
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY       = useRef(new Animated.Value(20)).current;

  // Ring halo
  const ringScale   = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  // Loading dots
  const dot1 = useRef(new Animated.Value(0.25)).current;
  const dot2 = useRef(new Animated.Value(0.25)).current;
  const dot3 = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    // ── 1. Logo springs in
    Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 52,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // ── 2. Title slides up
    Animated.sequence([
      Animated.delay(420),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(titleY, {
          toValue: 0,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // ── 3. Glow breathes
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 1.16,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.52,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.22,
            duration: 1800,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // ── 4. Outer ring ripple
    Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.45,
            duration: 1400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.35,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(ringOpacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(ringScale, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(800),
      ])
    ).start();

    // ── 5. Loading dots stagger
    const dotAnim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.25,
            duration: 260,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(520),
        ])
      );

    dotAnim(dot1, 0).start();
    dotAnim(dot2, 190).start();
    dotAnim(dot3, 380).start();
  }, []);

  const makeDotStyle = (dot: Animated.Value) => ({
    opacity: dot,
    transform: [
      {
        scale: dot.interpolate({
          inputRange: [0.25, 1],
          outputRange: [0.65, 1.25],
        }),
      },
    ],
  });

  return (
    <View style={styles.page}>
      {/* Background gradient */}
      <LinearGradient
        colors={["#050C20", "#08112E", "#0C1840", "#091228"]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Stars */}
      {STARS.map((s, i) => (
        <TwinkleStar key={i} {...s} />
      ))}

      {/* Ambient orbs */}
      <FloatOrb delay={0}    orbStyle={[styles.orb, styles.orbBlue]}   />
      <FloatOrb delay={700}  orbStyle={[styles.orb, styles.orbGold]}   />
      <FloatOrb delay={1300} orbStyle={[styles.orb, styles.orbTeal]}   />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + theme.spacing.lg,
            paddingBottom: insets.bottom + theme.spacing.xl,
          },
        ]}
      >
        {/* ── Title ── */}
        <Animated.View
          style={{ opacity: titleOpacity, transform: [{ translateY: titleY }] }}
        >
          <Text style={styles.title}>QWIZZY</Text>
          <View style={styles.titleUnderline} />
        </Animated.View>

        {/* ── Logo + glow ── */}
        <Animated.View
          style={[
            styles.logoWrap,
            { width: heroSize, height: heroSize },
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          {/* Ripple ring */}
          <Animated.View
            style={[
              styles.rippleRing,
              { transform: [{ scale: ringScale }], opacity: ringOpacity },
            ]}
          />

          {/* Breathing glow */}
          <Animated.View
            style={[
              styles.glowBlob,
              { transform: [{ scale: glowScale }], opacity: glowOpacity },
            ]}
          />

          {/* Inner soft glow */}
          <View style={styles.innerGlow} />

          {/* Logo card */}
          <View style={styles.logoCard}>
            <Image
              source={require("../../assets/logo-big.png")}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>

          {/* Gold accent dot top-right */}
          <View style={styles.accentDotTR} />
          <View style={styles.accentDotBL} />
        </Animated.View>

        {/* ── Loading dots ── */}
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, { backgroundColor: theme.colors.primary },   makeDotStyle(dot1)]} />
          <Animated.View style={[styles.dot, { backgroundColor: theme.colors.accent },    makeDotStyle(dot2)]} />
          <Animated.View style={[styles.dot, { backgroundColor: theme.colors.secondary }, makeDotStyle(dot3)]} />
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.background,
    overflow: "hidden",
  },

  // Ambient orbs
  orb: {
    position: "absolute",
    borderRadius: 999,
  },
  orbBlue: {
    width: 300,
    height: 300,
    top: -110,
    right: -90,
    backgroundColor: "rgba(94, 124, 255, 0.13)",
  },
  orbGold: {
    width: 260,
    height: 260,
    bottom: -110,
    left: 10,
    backgroundColor: "rgba(245, 195, 92, 0.10)",
  },
  orbTeal: {
    width: 200,
    height: 200,
    top: 130,
    left: -90,
    backgroundColor: "rgba(46, 196, 182, 0.10)",
  },

  // Layout
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xl,
  },

  // Title
  title: {
    color: "#F3F7FF",
    fontFamily: theme.typography.fontFamily,
    fontSize: 50,
    fontWeight: "900",
    letterSpacing: 10,
    textAlign: "center",
    textShadowColor: "rgba(94, 124, 255, 0.7)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  titleUnderline: {
    marginTop: 8,
    alignSelf: "center",
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.accent,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },

  // Logo
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  rippleRing: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "rgba(94, 124, 255, 0.55)",
  },
  glowBlob: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(94, 124, 255, 0.20)",
  },
  innerGlow: {
    position: "absolute",
    width: "84%",
    height: "84%",
    borderRadius: 999,
    backgroundColor: "rgba(94, 124, 255, 0.10)",
  },
  logoCard: {
    width: "76%",
    aspectRatio: 1,
    borderRadius: 999,
    backgroundColor: "rgba(214, 228, 255, 0.16)",
    borderWidth: 1.5,
    borderColor: "rgba(171, 198, 255, 0.30)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: "130%",
    height: "130%",
    transform: [{ scale: 1.06 }],
  },
  accentDotTR: {
    position: "absolute",
    top: "12%",
    right: "8%",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  accentDotBL: {
    position: "absolute",
    bottom: "14%",
    left: "10%",
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.secondary,
    shadowColor: theme.colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },

  // Loading dots
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
});
