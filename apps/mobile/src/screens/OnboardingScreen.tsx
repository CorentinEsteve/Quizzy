import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { GlassCard } from "../components/GlassCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pill } from "../components/Pill";

type Props = {
  locale: Locale;
  onDone: () => void;
};

export function OnboardingScreen({ locale, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const orbSize = Math.max(220, width * 0.64);
  const orbSizeSmall = Math.max(150, width * 0.4);
  const footerInset = theme.spacing.lg + insets.bottom + 86;
  const steps = useMemo(
    () => [
      {
        key: "01",
        title: t(locale, "onboardingStep1"),
        body: t(locale, "onboardingStep1Body"),
        icon: "plus",
        accent: theme.colors.primary,
        backdrop: ["rgba(94, 124, 255, 0.18)", "rgba(255, 255, 255, 0.9)"] as const
      },
      {
        key: "02",
        title: t(locale, "onboardingStep2"),
        body: t(locale, "onboardingStep2Body"),
        icon: "clock-o",
        accent: theme.colors.secondary,
        backdrop: ["rgba(46, 196, 182, 0.16)", "rgba(255, 255, 255, 0.9)"] as const
      },
      {
        key: "03",
        title: t(locale, "onboardingStep3"),
        body: t(locale, "onboardingStep3Body"),
        icon: "trophy",
        accent: theme.colors.accent,
        backdrop: ["rgba(216, 164, 58, 0.2)", "rgba(255, 255, 255, 0.9)"] as const
      }
    ],
    [locale]
  );
  return (
    <View style={styles.page}>
      <LinearGradient
        colors={["#08112E", "#0D1B4A", "#142A60"]}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbPrimary,
          {
            width: orbSize,
            height: orbSize,
            borderRadius: orbSize / 2
          }
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbSecondary,
          {
            width: orbSizeSmall,
            height: orbSizeSmall,
            borderRadius: orbSizeSmall / 2
          }
        ]}
      />
      <LinearGradient
        colors={["rgba(105, 139, 255, 0.32)", "rgba(105, 139, 255, 0)"]}
        start={{ x: 0.05, y: 0.05 }}
        end={{ x: 0.65, y: 0.65 }}
        style={styles.backgroundSweep}
      />
      <LinearGradient
        colors={["rgba(243, 194, 88, 0.14)", "rgba(243, 194, 88, 0)"]}
        start={{ x: 0.78, y: 0.8 }}
        end={{ x: 0.2, y: 0.2 }}
        style={styles.backgroundGoldSweep}
      />
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.container,
          { paddingTop: theme.spacing.lg + insets.top, paddingBottom: footerInset }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <Pill label={t(locale, "appName")} />
            <View style={styles.heroCountPill}>
              <Text style={styles.heroCountText}>{`${steps.length + 1}`}</Text>
            </View>
          </View>
          <Text style={styles.title}>{t(locale, "onboardingTitle")}</Text>
          <Text style={styles.subtitle}>{t(locale, "onboardingSubtitle")}</Text>
          <View style={styles.progressDots}>
            {Array.from({ length: steps.length + 1 }).map((_, index) => (
              <View key={`onboarding-dot-${index}`} style={styles.progressDot} />
            ))}
          </View>
        </View>

        <View style={styles.cards}>
          {steps.map((step) => (
            <GlassCard key={step.key} style={[styles.card, styles.stepCard]} accent={step.accent}>
              <LinearGradient
                colors={step.backdrop}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardBackdrop}
              />
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.step}>{step.key}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{step.title}</Text>
                </View>
                <View style={[styles.stepIcon, { borderColor: step.accent }]}>
                  <FontAwesome name={step.icon} size={16} color={step.accent} />
                </View>
              </View>
              <Text style={styles.cardBody}>{step.body}</Text>
            </GlassCard>
          ))}
          <View style={styles.dailyDivider} />
          <GlassCard style={[styles.card, styles.dailyCard]} accent={theme.colors.reward}>
            <LinearGradient
              colors={["rgba(243, 183, 78, 0.24)", "rgba(255, 255, 255, 0.92)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardBackdrop}
            />
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.stepBadge, styles.dailyBadge]}>
                  <Text style={[styles.step, styles.dailyBadgeText]}>Daily</Text>
                </View>
                <Text style={styles.cardTitle}>{t(locale, "onboardingDailyTitle")}</Text>
              </View>
              <View style={[styles.stepIcon, styles.dailyIconRing]}>
                <FontAwesome name="globe" size={16} color={theme.colors.reward} />
              </View>
            </View>
            <Text style={styles.cardBody}>{t(locale, "onboardingDailyBody")}</Text>
          </GlassCard>
        </View>
      </ScrollView>

      <LinearGradient
        pointerEvents="none"
        colors={["rgba(8, 17, 46, 0)", "rgba(8, 17, 46, 0.92)"]}
        style={styles.footerFade}
      />
      <View style={[styles.footer, { paddingBottom: theme.spacing.lg + insets.bottom }]}>
        <PrimaryButton
          label={t(locale, "getStarted")}
          icon="arrow-right"
          iconPosition="right"
          style={styles.getStartedButton}
          onPress={onDone}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.background,
    overflow: "hidden"
  },
  scroll: {
    flex: 1
  },
  container: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    flexGrow: 1
  },
  hero: {
    gap: theme.spacing.sm,
    alignItems: "flex-start"
  },
  heroTopRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm
  },
  heroCountPill: {
    minWidth: 34,
    height: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(214, 228, 255, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(214, 228, 255, 0.3)"
  },
  heroCountText: {
    color: "rgba(236, 244, 255, 0.96)",
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700"
  },
  title: {
    color: "#F3F7FF",
    fontFamily: theme.typography.fontFamily,
    fontSize: 30,
    fontWeight: "700",
    maxWidth: 300
  },
  subtitle: {
    color: "rgba(214, 228, 255, 0.86)",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    lineHeight: 22,
    maxWidth: 300
  },
  progressDots: {
    marginTop: theme.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  progressDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "rgba(214, 228, 255, 0.4)"
  },
  heroRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    alignItems: "center"
  },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(105, 139, 255, 0.24)",
    alignItems: "center",
    justifyContent: "center"
  },
  heroCopy: {
    flex: 1,
    gap: 4
  },
  heroTitle: {
    color: "#F3F7FF",
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600"
  },
  heroBody: {
    color: "rgba(214, 228, 255, 0.84)",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    lineHeight: 18
  },
  cards: {
    gap: theme.spacing.sm
  },
  dailyDivider: {
    height: 4
  },
  dailyBadge: {
    backgroundColor: "rgba(243, 183, 78, 0.18)"
  },
  dailyBadgeText: {
    color: theme.colors.reward
  },
  dailyIconRing: {
    borderColor: "rgba(243, 183, 78, 0.5)"
  },
  card: {
    gap: theme.spacing.xs,
    overflow: "hidden",
    backgroundColor: "rgba(241, 246, 255, 0.88)",
    borderColor: "rgba(145, 177, 244, 0.3)"
  },
  stepCard: {
    minHeight: 104
  },
  dailyCard: {
    borderColor: "rgba(216, 164, 58, 0.35)"
  },
  cardBackdrop: {
    ...StyleSheet.absoluteFillObject
  },
  step: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  stepBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(11, 14, 20, 0.06)"
  },
  cardTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 18,
    fontWeight: "600"
  },
  cardBody: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    lineHeight: 22,
    maxWidth: "94%"
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flex: 1
  },
  stepIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)"
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    backgroundColor: "rgba(8, 17, 46, 0.72)",
    borderTopWidth: 1,
    borderTopColor: "rgba(146, 176, 242, 0.22)",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xs
  },
  getStartedButton: {
    backgroundColor: theme.colors.cta,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.24)"
  },
  footerFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    zIndex: 10
  },
  orb: {
    position: "absolute",
    opacity: 0.22
  },
  backgroundSweep: {
    ...StyleSheet.absoluteFillObject
  },
  backgroundGoldSweep: {
    ...StyleSheet.absoluteFillObject
  },
  orbPrimary: {
    top: -120,
    right: -80,
    backgroundColor: "rgba(94, 124, 255, 0.35)"
  },
  orbSecondary: {
    bottom: -110,
    left: -70,
    backgroundColor: "rgba(245, 195, 92, 0.3)"
  }
});
