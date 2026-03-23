import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

// ─── Shooting star ────────────────────────────────────────────────────────────

// Geometry: rotate('-27deg') tilts the element CCW so local +x = upper-right.
// Gradient white→transparent goes from local x=0 (lower-left, HEAD) to x=1 (upper-right, TAIL).
// Movement (-250, 127) keeps tan(27°) ≈ 127/250 so the streak stays aligned with travel.

export function ShootingStar({ startX, startY, initialDelay }: {
  startX: number;
  startY: number;
  initialDelay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const cfg = useRef({
    trailLen: 90 + Math.random() * 55,
    duration: 520 + Math.random() * 280,
  }).current;

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: cfg.duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || cancelled) return;
        setTimeout(run, 5000 + Math.random() * 9000);
      });
    };
    const t = setTimeout(run, initialDelay);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -250] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 127] });
  const opacity = anim.interpolate({
    inputRange: [0, 0.06, 0.78, 1],
    outputRange: [0, 1, 0.7, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: startX,
        top: startY,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate: "-27deg" }],
      }}
    >
      <LinearGradient
        colors={[
          "rgba(255,255,255,0.95)",
          "rgba(200,218,255,0.7)",
          "rgba(171,198,255,0.25)",
          "rgba(255,255,255,0)",
        ]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ width: cfg.trailLen, height: 2, borderRadius: 1 }}
      />
    </Animated.View>
  );
}

const SHOOTING_STARS = [
  { startX: 355, startY: 45,  initialDelay: 2200  },
  { startX: 285, startY: 18,  initialDelay: 9400  },
  { startX: 325, startY: 95,  initialDelay: 16500 },
];

// ─── Twinkling star ───────────────────────────────────────────────────────────

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

// ─── Floating orb ─────────────────────────────────────────────────────────────

function FloatOrb({ orbStyle, delay }: { orbStyle: object | object[]; delay: number }) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -14,
          duration: 3200,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return <Animated.View style={[orbStyle, { transform: [{ translateY }] }]} />;
}

// ─── Star config ──────────────────────────────────────────────────────────────

const STARS: Array<{
  x: `${number}%`;
  y: `${number}%`;
  size: number;
  delay: number;
  color: string;
}> = [
  { x: "6%",  y: "4%",  size: 3, delay: 0,    color: "rgba(171,198,255,0.9)"  },
  { x: "20%", y: "9%",  size: 2, delay: 380,  color: "rgba(245,195,92,0.85)" },
  { x: "48%", y: "3%",  size: 4, delay: 720,  color: "rgba(171,198,255,0.85)" },
  { x: "74%", y: "7%",  size: 2, delay: 190,  color: "rgba(46,196,182,0.8)"  },
  { x: "89%", y: "13%", size: 3, delay: 920,  color: "rgba(171,198,255,0.75)" },
  { x: "4%",  y: "23%", size: 2, delay: 310,  color: "rgba(245,195,92,0.7)"  },
  { x: "94%", y: "30%", size: 3, delay: 610,  color: "rgba(171,198,255,0.8)" },
  { x: "12%", y: "43%", size: 2, delay: 1100, color: "rgba(46,196,182,0.65)" },
  { x: "88%", y: "48%", size: 4, delay: 440,  color: "rgba(245,195,92,0.8)"  },
  { x: "8%",  y: "62%", size: 2, delay: 820,  color: "rgba(171,198,255,0.65)" },
  { x: "91%", y: "67%", size: 3, delay: 260,  color: "rgba(245,195,92,0.6)"  },
  { x: "28%", y: "82%", size: 2, delay: 660,  color: "rgba(171,198,255,0.75)" },
  { x: "68%", y: "86%", size: 3, delay: 360,  color: "rgba(46,196,182,0.65)" },
  { x: "50%", y: "92%", size: 2, delay: 540,  color: "rgba(171,198,255,0.55)" },
  { x: "38%", y: "17%", size: 2, delay: 1040, color: "rgba(245,195,92,0.65)" },
  { x: "62%", y: "54%", size: 2, delay: 780,  color: "rgba(171,198,255,0.7)" },
  { x: "78%", y: "75%", size: 3, delay: 150,  color: "rgba(46,196,182,0.6)"  },
];

// ─── Main component ───────────────────────────────────────────────────────────

export function StarfieldBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={["#050C20", "#08112E", "#0C1840", "#091228"]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {STARS.map((s, i) => (
        <TwinkleStar key={i} {...s} />
      ))}

      <FloatOrb
        delay={0}
        orbStyle={[styles.orb, styles.orbBlue]}
      />
      <FloatOrb
        delay={700}
        orbStyle={[styles.orb, styles.orbGold]}
      />
      <FloatOrb
        delay={1300}
        orbStyle={[styles.orb, styles.orbTeal]}
      />

      {SHOOTING_STARS.map((s, i) => (
        <ShootingStar key={i} {...s} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
