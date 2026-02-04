import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { GlassCard } from "../components/GlassCard";
import { PrimaryButton } from "../components/PrimaryButton";

type Props = {
  locale: Locale;
  onDone: () => void;
};

export function OnboardingScreen({ locale, onDone }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.page}>
      <LinearGradient colors={["#F4F6FB", "#FFFFFF"]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: theme.spacing.lg }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{t(locale, "appName")}</Text>
          <Text style={styles.title}>{t(locale, "onboardingTitle")}</Text>
          <Text style={styles.subtitle}>{t(locale, "onboardingSubtitle")}</Text>
        </View>

        <View style={styles.cards}>
          <GlassCard style={styles.card}>
            <Text style={styles.step}>01</Text>
            <Text style={styles.cardTitle}>{t(locale, "onboardingStep1")}</Text>
            <Text style={styles.cardBody}>{t(locale, "onboardingStep1Body")}</Text>
          </GlassCard>
          <GlassCard style={styles.card}>
            <Text style={styles.step}>02</Text>
            <Text style={styles.cardTitle}>{t(locale, "onboardingStep2")}</Text>
            <Text style={styles.cardBody}>{t(locale, "onboardingStep2Body")}</Text>
          </GlassCard>
          <GlassCard style={styles.card}>
            <Text style={styles.step}>03</Text>
            <Text style={styles.cardTitle}>{t(locale, "onboardingStep3")}</Text>
            <Text style={styles.cardBody}>{t(locale, "onboardingStep3Body")}</Text>
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
  eyebrow: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  title: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.display,
    fontWeight: "700"
  },
  subtitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body
  },
  cards: {
    gap: theme.spacing.md
  },
  card: {
    gap: theme.spacing.xs
  },
  step: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    letterSpacing: 1
  },
  cardTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  cardBody: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm
  }
});
