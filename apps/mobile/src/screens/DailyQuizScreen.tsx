import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { GlassCard } from "../components/GlassCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pill } from "../components/Pill";
import { Quiz } from "../data/types";

type Props = {
  quiz: Quiz;
  answers: Record<string, number>;
  answeredCount: number;
  totalQuestions: number;
  completed: boolean;
  submitting?: boolean;
  onAnswer: (questionId: string, answerIndex: number) => void;
  onExit: () => void;
  onSeeResults: () => void;
  locale: Locale;
};

export function DailyQuizScreen({
  quiz,
  answers,
  answeredCount,
  totalQuestions,
  completed,
  submitting = false,
  onAnswer,
  onExit,
  onSeeResults,
  locale
}: Props) {
  const insets = useSafeAreaInsets();
  const questionIndex = quiz.questions.findIndex(
    (question) => answers[question.id] === undefined
  );
  const resolvedIndex = questionIndex === -1 ? quiz.questions.length - 1 : questionIndex;
  const question = quiz.questions[resolvedIndex];
  const selectedIndex = question ? answers[question.id] : undefined;
  const hasAnsweredCurrent = selectedIndex !== undefined;
  const prompt = question?.prompt?.[locale] ?? question?.prompt?.en ?? "";
  const options = question?.options?.[locale] ?? question?.options?.en ?? [];
  const progressLabel = `${answeredCount} / ${Math.max(totalQuestions, 1)}`;

  return (
    <View style={[styles.container, { paddingBottom: theme.spacing.lg + insets.bottom }]}>
      <LinearGradient
        colors={["#FFFFFF", "#F1F3F8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>{t(locale, "dailyQuizTitle")}</Text>
          <Text style={styles.title}>{t(locale, "dailyQuizSubtitle")}</Text>
        </View>
        <Pill label={progressLabel} tone={completed ? "success" : "default"} />
      </View>

      <GlassCard accent={quiz.accent} style={styles.card}>
        <Text style={styles.prompt}>{prompt}</Text>
        <View style={styles.options}>
          {options.map((option, index) => {
            const isSelected = selectedIndex === index;
            return (
              <PrimaryButton
                key={`${question?.id}-${index}`}
                label={option}
                onPress={() => onAnswer(question.id, index)}
                variant={isSelected ? "primary" : "ghost"}
                style={styles.optionButton}
                disabled={submitting || hasAnsweredCurrent || completed}
              />
            );
          })}
        </View>
      </GlassCard>

      {completed ? (
        <GlassCard style={styles.completedCard}>
          <View style={styles.completedRow}>
            <FontAwesome name="trophy" size={14} color={theme.colors.reward} />
            <Text style={styles.completedText}>{t(locale, "dailyQuizCompleted")}</Text>
          </View>
          <PrimaryButton
            label={t(locale, "dailyQuizResults")}
            icon="arrow-right"
            iconPosition="right"
            onPress={onSeeResults}
            style={styles.completedButton}
          />
        </GlassCard>
      ) : null}

      <View style={styles.footer}>
        <PrimaryButton
          label={t(locale, "back")}
          variant="ghost"
          onPress={onExit}
          style={styles.footerButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg
  },
  headerText: {
    flex: 1,
    paddingRight: theme.spacing.sm
  },
  eyebrow: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    textTransform: "uppercase",
    letterSpacing: 1.1
  },
  title: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  card: {
    gap: theme.spacing.lg
  },
  prompt: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  options: {
    gap: theme.spacing.sm
  },
  optionButton: {
    width: "100%"
  },
  completedCard: {
    marginTop: theme.spacing.lg,
    backgroundColor: "rgba(243, 183, 78, 0.14)",
    borderColor: "rgba(243, 183, 78, 0.35)"
  },
  completedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: theme.spacing.sm
  },
  completedText: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  completedButton: {
    width: "100%"
  },
  footer: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.md
  },
  footerButton: {
    flex: 1
  }
});
