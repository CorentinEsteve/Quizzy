import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { GlassCard } from "../components/GlassCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pill } from "../components/Pill";
import { QuizSummary } from "../data/types";

type Props = {
  quizzes: QuizSummary[];
  onSelect: (quizId: string) => void;
};

export function HomeScreen({ quizzes, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingBottom: theme.spacing.lg + insets.bottom }
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <LinearGradient
          colors={["#F2F4FF", "#FFFFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBackdrop}
        />
        <Text style={styles.eyebrow}>Qwizzy</Text>
        <Text style={styles.title}>Two minds. One elegant rhythm.</Text>
        <Text style={styles.body}>
          Play refined, focused quizzes designed for calm competition and delightfully clear results.
        </Text>
        <PrimaryButton
          label="Start a session"
          icon="play"
          iconPosition="right"
          onPress={() => onSelect(quizzes[0]?.id)}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Curated decks</Text>
        <Text style={styles.sectionSubtitle}>Pick a quiz and stay in flow.</Text>
      </View>

      <View style={styles.grid}>
        {quizzes.map((quiz) => (
          <GlassCard key={quiz.id} accent={quiz.accent} style={styles.card}>
            <View style={styles.cardPills}>
              <Pill label={quiz.categoryLabel} />
              <Pill label={`${quiz.rounds} rounds`} />
            </View>
            <Text style={styles.cardTitle}>{quiz.title}</Text>
            <Text style={styles.cardSubtitle}>{quiz.subtitle}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardMeta}>{quiz.questionCount} questions</Text>
              <PrimaryButton
                label="Open"
                icon="folder-open"
                iconPosition="right"
                variant="ghost"
                onPress={() => onSelect(quiz.id)}
              />
            </View>
          </GlassCard>
        ))}
      </View>

      <GlassCard style={styles.highlight}>
        <Text style={styles.highlightTitle}>Dual play mode</Text>
        <Text style={styles.highlightBody}>
          Answer together, then compare. Each round reveals a shared insight and keeps the energy light.
        </Text>
        <PrimaryButton
          label="Invite a friend"
          icon="user-plus"
          iconPosition="right"
          variant="ghost"
          onPress={() => onSelect(quizzes[0]?.id)}
        />
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg
  },
  hero: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    overflow: "hidden"
  },
  heroBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  eyebrow: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm
  },
  title: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.display,
    fontWeight: "700",
    marginBottom: theme.spacing.sm
  },
  body: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    lineHeight: 24,
    marginBottom: theme.spacing.lg
  },
  sectionHeader: {
    marginBottom: theme.spacing.md
  },
  sectionTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  sectionSubtitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  grid: {
    gap: theme.spacing.md
  },
  card: {
    gap: theme.spacing.sm
  },
  cardPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  cardTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  cardSubtitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body
  },
  cardFooter: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  cardMeta: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  highlight: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.sm
  },
  highlightTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  highlightBody: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    lineHeight: 22
  }
});
