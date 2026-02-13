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
  const steps = useMemo(
    () => [
      {
        key: "01",
        title: t(locale, "onboardingStep1"),
        body: t(locale, "onboardingStep1Body"),
        icon: "plus",
        accent: theme.colors.primary
      },
      {
        key: "02",
        title: t(locale, "onboardingStep2"),
        body: t(locale, "onboardingStep2Body"),
        icon: "clock-o",
        accent: theme.colors.secondary
      },
      {
        key: "03",
        title: t(locale, "onboardingStep3"),
        body: t(locale, "onboardingStep3Body"),
        icon: "trophy",
        accent: theme.colors.accent
      }
    ],
    [locale]
  );
  return (
    <View style={styles.page}>
      <LinearGradient
        colors={["#F6F8FF", "#FFFFFF", "#F9F2E6"]}
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
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: theme.spacing.lg + insets.top, paddingBottom: theme.spacing.lg }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Pill label={t(locale, "appName")} />
          <Text style={styles.title}>{t(locale, "onboardingTitle")}</Text>
          <Text style={styles.subtitle}>{t(locale, "onboardingSubtitle")}</Text>
        </View>

        <View style={styles.cards}>
          {steps.map((step) => (
            <GlassCard key={step.key} style={styles.card} accent={step.accent}>
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
          <GlassCard style={styles.card} accent={theme.colors.reward}>
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

      <View style={[styles.footer, { paddingBottom: theme.spacing.lg + insets.bottom }]}>
        <PrimaryButton
          label={t(locale, "getStarted")}
          icon="arrow-right"
          iconPosition="right"
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
  container: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    flexGrow: 1
  },
  hero: {
    gap: theme.spacing.sm,
    alignItems: "flex-start"
  },
  title: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 30,
    fontWeight: "700",
    maxWidth: 300
  },
  subtitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    lineHeight: 22,
    maxWidth: 300
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
    backgroundColor: "rgba(94, 124, 255, 0.14)",
    alignItems: "center",
    justifyContent: "center"
  },
  heroCopy: {
    flex: 1,
    gap: 4
  },
  heroTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "600"
  },
  heroBody: {
    color: theme.colors.muted,
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
    gap: theme.spacing.xs
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
    lineHeight: 22
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
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xs
  },
  orb: {
    position: "absolute",
    opacity: 0.22
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
