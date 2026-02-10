import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { GlassCard } from "../components/GlassCard";
import { PrimaryButton } from "../components/PrimaryButton";
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
  const feedbackDurationMs = 750;
  const [feedback, setFeedback] = useState<{
    questionId: string;
    selectedIndex: number;
    isCorrect: boolean | null;
  } | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionIndex = quiz.questions.findIndex(
    (question) => answers[question.id] === undefined
  );
  const resolvedIndex = questionIndex === -1 ? quiz.questions.length - 1 : questionIndex;
  const question = quiz.questions[resolvedIndex];
  const selectedIndex = question ? answers[question.id] : undefined;
  const hasAnsweredCurrent = selectedIndex !== undefined;
  const prompt = question?.prompt?.[locale] ?? question?.prompt?.en ?? "";
  const options = question?.options?.[locale] ?? question?.options?.en ?? [];
  const feedbackActive = question ? feedback?.questionId === question.id : false;
  const progressLabel = `${answeredCount} / ${Math.max(totalQuestions, 1)}`;
  const footerInset = theme.spacing.lg + insets.bottom + 96;

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    setFeedback(null);
  }, [question?.id]);

  if (!question) {
    return (
      <View style={styles.screen}>
        <View style={[styles.container, { paddingTop: theme.spacing.lg + insets.top }]}>
          <GlassCard style={styles.statusCard}>
            <Text style={styles.statusTitle}>{t(locale, "pleaseWait")}</Text>
          </GlassCard>
        </View>
      </View>
    );
  }

  const handleSelectAnswer = (index: number) => {
    if (submitting || hasAnsweredCurrent || completed || feedbackActive) return;
    Haptics.selectionAsync();
    const correctIndex = typeof question.answer === "number" ? question.answer : null;
    const isAnswerCorrect = correctIndex === null ? null : correctIndex === index;
    if (isAnswerCorrect === true) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (isAnswerCorrect === false) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setFeedback({
      questionId: question.id,
      selectedIndex: index,
      isCorrect: isAnswerCorrect
    });
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      onAnswer(question.id, index);
    }, feedbackDurationMs);
  };

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#FFFFFF", "#F1F3F8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: theme.spacing.lg + insets.top,
            paddingBottom: footerInset
          }
        ]}
        contentInsetAdjustmentBehavior="never"
      >
        <View style={styles.header}>
          <View style={styles.headerMain}>
            <Text style={styles.title}>{quiz.title}</Text>
            <View style={styles.headerMetaRow}>
              <View style={styles.modeChip}>
                <FontAwesome name="calendar" size={10} color={theme.colors.primary} />
                <Text style={styles.modeChipText}>{t(locale, "dailyQuizTitle")}</Text>
              </View>
              <Text numberOfLines={1} style={styles.subtitle}>
                {t(locale, "dailyQuizSubtitle")}
              </Text>
            </View>
          </View>
          <View style={styles.headerPills}>
            <View style={styles.progressPill}>
              <Text style={styles.progressPillText}>{progressLabel}</Text>
            </View>
          </View>
        </View>

        {!completed ? (
          <GlassCard accent={quiz.accent} style={styles.card}>
            <Text style={styles.prompt}>{prompt}</Text>
            <View style={styles.options}>
              {options.map((option, index) => {
                const isFeedbackSelected = feedbackActive && feedback?.selectedIndex === index;
                const showFeedback = feedbackActive && isFeedbackSelected;
                const isCorrect = showFeedback ? feedback?.isCorrect === true : false;
                const isIncorrect = showFeedback ? feedback?.isCorrect === false : false;
                return (
                  <PrimaryButton
                    key={`${question.id}-${index}`}
                    label={`${String.fromCharCode(65 + index)}. ${option}`}
                    onPress={() => handleSelectAnswer(index)}
                    variant="ghost"
                    style={[
                      styles.optionButton,
                      showFeedback && styles.optionFeedback,
                      showFeedback && isCorrect && styles.optionCorrect,
                      showFeedback && isIncorrect && styles.optionIncorrect
                    ]}
                  />
                );
              })}
            </View>
          </GlassCard>
        ) : (
          <GlassCard style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <FontAwesome name="trophy" size={14} color={theme.colors.reward} />
              <View style={styles.statusHeaderText}>
                <Text style={styles.statusTitle}>{t(locale, "dailyQuizCompleted")}</Text>
                <Text style={styles.statusBody}>{t(locale, "dailyQuizResultsSubtitle")}</Text>
              </View>
            </View>
          </GlassCard>
        )}

        {submitting ? (
          <View style={styles.submittingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.submittingText}>{t(locale, "pleaseWait")}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: theme.spacing.lg + insets.bottom }]}>
        {completed ? (
          <PrimaryButton
            label={t(locale, "dailyQuizResults")}
            icon="arrow-right"
            iconPosition="right"
            onPress={onSeeResults}
            style={styles.footerButton}
          />
        ) : (
          <PrimaryButton
            label={t(locale, "leave")}
            icon="arrow-left"
            variant="ghost"
            onPress={onExit}
            style={styles.footerButton}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md
  },
  headerMain: {
    flex: 1,
    gap: 6
  },
  headerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(94, 124, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(94, 124, 255, 0.26)"
  },
  modeChipText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "700"
  },
  headerPills: {
    alignItems: "flex-end",
    gap: theme.spacing.xs
  },
  progressPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.12)"
  },
  progressPillText: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700"
  },
  title: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  subtitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    flexShrink: 1
  },
  card: {
    gap: theme.spacing.md
  },
  prompt: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34
  },
  options: {
    gap: theme.spacing.sm
  },
  optionButton: {
    width: "100%",
    minHeight: 52
  },
  optionFeedback: {
    borderWidth: 1,
    shadowColor: "rgba(11, 14, 20, 0.18)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2
  },
  optionCorrect: {
    backgroundColor: "rgba(43, 158, 102, 0.12)",
    borderColor: "rgba(43, 158, 102, 0.35)"
  },
  optionIncorrect: {
    backgroundColor: "rgba(235, 87, 87, 0.12)",
    borderColor: "rgba(235, 87, 87, 0.35)"
  },
  statusCard: {
    marginTop: theme.spacing.xs
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: theme.spacing.xs
  },
  statusHeaderText: {
    gap: 2
  },
  statusTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  statusBody: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  submittingRow: {
    marginTop: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  submittingText: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: "rgba(245, 246, 248, 0.84)"
  },
  footerButton: {
    flex: 1
  }
});
