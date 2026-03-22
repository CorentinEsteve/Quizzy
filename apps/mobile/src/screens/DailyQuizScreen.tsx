import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
    correctIndex: number | null;
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
        <LinearGradient
          colors={["#FFF9EE", "#FFF4DA", "#FFFAF2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.dailyOrbTop} pointerEvents="none" />
        <View style={styles.dailyOrbBottom} pointerEvents="none" />
        <View style={[styles.container, { paddingTop: theme.spacing.lg + insets.top }]}>
          <GlassCard style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <ActivityIndicator size="small" color={theme.colors.reward} />
            </View>
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
      isCorrect: isAnswerCorrect,
      correctIndex
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
        colors={["#FFF9EE", "#FFF4DA", "#FFFAF2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(243, 183, 78, 0.28)", "rgba(243, 183, 78, 0)"]}
        start={{ x: 0.05, y: 0.0 }}
        end={{ x: 0.85, y: 0.7 }}
        style={styles.dailySweep}
      />
      <View style={styles.dailyOrbTop} pointerEvents="none" />
      <View style={styles.dailyOrbBottom} pointerEvents="none" />
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
                <FontAwesome name="calendar" size={10} color="#9C6514" />
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
                const showFeedback = feedbackActive;
                const isFeedbackSelected = showFeedback && feedback?.selectedIndex === index;
                const isCorrectOption = showFeedback && feedback?.correctIndex === index;
                const isIncorrectSelected =
                  showFeedback && isFeedbackSelected && feedback?.isCorrect === false;
                const letter = String.fromCharCode(65 + index);
                return (
                  <Pressable
                    key={`${question.id}-${index}`}
                    onPress={() => handleSelectAnswer(index)}
                    style={({ pressed }) => [
                      styles.optionRow,
                      isCorrectOption && styles.optionCorrect,
                      isIncorrectSelected && styles.optionIncorrect,
                      pressed && !feedbackActive && styles.optionPressed
                    ]}
                  >
                    <View style={[
                      styles.optionBadge,
                      isCorrectOption && styles.optionBadgeCorrect,
                      isIncorrectSelected && styles.optionBadgeIncorrect
                    ]}>
                      <Text style={[
                        styles.optionBadgeText,
                        isCorrectOption && styles.optionBadgeTextCorrect,
                        isIncorrectSelected && styles.optionBadgeTextIncorrect
                      ]}>{letter}</Text>
                    </View>
                    <Text style={[
                      styles.optionText,
                      isCorrectOption && styles.optionTextCorrect,
                      isIncorrectSelected && styles.optionTextIncorrect
                    ]}>{option}</Text>
                  </Pressable>
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
            <ActivityIndicator size="small" color={theme.colors.reward} />
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
  dailySweep: {
    ...StyleSheet.absoluteFillObject
  },
  dailyOrbTop: {
    position: "absolute",
    top: -220,
    right: -160,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(243, 183, 78, 0.2)"
  },
  dailyOrbBottom: {
    position: "absolute",
    bottom: -230,
    left: -190,
    width: 410,
    height: 410,
    borderRadius: 205,
    backgroundColor: "rgba(223, 154, 31, 0.14)"
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    backgroundColor: "transparent"
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
    backgroundColor: "rgba(243, 183, 78, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(223, 154, 31, 0.38)"
  },
  modeChipText: {
    color: "#9C6514",
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
    backgroundColor: "rgba(255, 248, 231, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(223, 154, 31, 0.28)"
  },
  progressPillText: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700"
  },
  title: {
    color: "#211507",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  subtitle: {
    color: "rgba(65, 42, 16, 0.72)",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    flexShrink: 1
  },
  card: {
    gap: 18,
    backgroundColor: "rgba(255, 252, 244, 0.9)",
    borderColor: "rgba(223, 154, 31, 0.26)"
  },
  prompt: {
    color: "#1F1306",
    fontFamily: theme.typography.fontFamily,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 30
  },
  options: {
    gap: 10
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "rgba(11, 14, 20, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.09)"
  },
  optionPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.985 }]
  },
  optionCorrect: {
    backgroundColor: "rgba(70, 169, 114, 0.14)",
    borderColor: "rgba(43, 158, 102, 0.45)"
  },
  optionIncorrect: {
    backgroundColor: "rgba(235, 87, 87, 0.12)",
    borderColor: "rgba(235, 87, 87, 0.45)"
  },
  optionBadge: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(11, 14, 20, 0.09)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  optionBadgeCorrect: {
    backgroundColor: "rgba(43, 158, 102, 0.2)"
  },
  optionBadgeIncorrect: {
    backgroundColor: "rgba(235, 87, 87, 0.2)"
  },
  optionBadgeText: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700"
  },
  optionBadgeTextCorrect: {
    color: "rgb(22, 115, 72)"
  },
  optionBadgeTextIncorrect: {
    color: "rgb(185, 50, 50)"
  },
  optionText: {
    flex: 1,
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 21,
    paddingRight: 8
  },
  optionTextCorrect: {
    color: "rgb(22, 115, 72)"
  },
  optionTextIncorrect: {
    color: "rgb(185, 50, 50)"
  },
  statusCard: {
    marginTop: theme.spacing.xs,
    backgroundColor: "rgba(255, 252, 244, 0.9)",
    borderColor: "rgba(223, 154, 31, 0.26)"
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
    color: "#211507",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  statusBody: {
    color: "rgba(65, 42, 16, 0.72)",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  submittingRow: {
    marginTop: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center"
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
    borderTopColor: "rgba(223, 154, 31, 0.2)",
    backgroundColor: "rgba(255, 248, 231, 0.86)"
  },
  footerButton: {
    flex: 1
  }
});
