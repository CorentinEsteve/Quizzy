import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { GlassCard } from "../components/GlassCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { Pill } from "../components/Pill";
import { RoomState } from "../data/types";

type Props = {
  room: RoomState;
  userId: number;
  selectedAnswers: Record<string, number>;
  onAnswer: (questionId: string, answerIndex: number) => void;
  onExit: () => void;
  locale: Locale;
};

export function PlayScreen({ room, userId, selectedAnswers, onAnswer, onExit, locale }: Props) {
  const insets = useSafeAreaInsets();
  const { quiz } = room;
  const syncSeconds = 20;
  const feedbackDurationMs = 750;
  const [timeLeft, setTimeLeft] = useState(syncSeconds);
  const [feedback, setFeedback] = useState<{
    questionId: string;
    selectedIndex: number;
    isCorrect: boolean | null;
  } | null>(null);
  const sentRef = useRef<Set<string>>(new Set());
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const footerInset = theme.spacing.lg + insets.bottom + 96;
  const containerStyle = [styles.container, { paddingBottom: footerInset }];

  let questionIndex = room.currentIndex;
  if (room.mode === "async") {
    const nextIndex = quiz.questions.findIndex(
      (question) => selectedAnswers[question.id] === undefined
    );
    questionIndex = nextIndex === -1 ? quiz.questions.length - 1 : nextIndex;
  }

  const question = quiz.questions[questionIndex];
  const prompt = question?.prompt?.[locale] ?? question?.prompt?.en ?? "";
  const options = question?.options?.[locale] ?? question?.options?.en ?? [];
  const answeredCount = Object.keys(selectedAnswers).length;
  const progressLabel =
    room.mode === "sync"
      ? `${room.currentIndex + 1} / ${quiz.questions.length}`
      : `${answeredCount} / ${quiz.questions.length}`;
  const myProgress = room.progress.find((item) => item.userId === userId)?.answeredCount ?? 0;
  const opponent = room.players.find((player) => player.id !== userId);
  const opponentName = opponent?.displayName ?? t(locale, "opponentLabel");
  const otherProgress =
    room.progress.find((item) => item.userId !== userId)?.answeredCount ?? 0;
  const hasAnsweredCurrent =
    selectedAnswers[question.id] !== undefined ||
    (room.mode === "sync" && myProgress > room.currentIndex);
  const feedbackActive = feedback?.questionId === question.id;
  const isSyncDone = room.mode === "sync" && myProgress >= quiz.questions.length;
  const isAsyncDone = room.mode === "async" && myProgress >= quiz.questions.length;
  const isAhead = myProgress > otherProgress;
  const isTied = myProgress === otherProgress;
  const isWaitingForOpponent = room.mode === "sync" && hasAnsweredCurrent && isAhead;
  const isWaitingForNext = room.mode === "sync" && hasAnsweredCurrent && isTied;
  const waitingTitle =
    room.mode === "sync"
      ? isWaitingForOpponent
        ? t(locale, "waitingOpponent")
        : isWaitingForNext
          ? t(locale, "waitingNext")
          : t(locale, "yourTurn")
      : t(locale, "asyncNote");
  const waitingSubtitle =
    room.mode === "sync" && hasAnsweredCurrent ? t(locale, "youAnswered") : null;
  const totalQuestions = Math.max(quiz.questions.length, 1);
  const myProgressRatio = Math.min(myProgress / totalQuestions, 1);
  const otherProgressRatio = Math.min(otherProgress / totalQuestions, 1);

  useEffect(() => {
    if (room.mode !== "sync") return;
    setTimeLeft(syncSeconds);
  }, [room.mode, room.currentIndex, syncSeconds]);

  useEffect(() => {
    if (room.mode !== "sync") return;
    if (hasAnsweredCurrent) return;
    if (!question) return;
    if (selectedAnswers[question.id] !== undefined) return;
    if (feedbackActive) return;
    if (timeLeft <= 0) {
      if (!sentRef.current.has(question.id)) {
        sentRef.current.add(question.id);
        const correctIndex =
          typeof question.answer === "number" ? question.answer : null;
        if (correctIndex !== null) {
          setFeedback({
            questionId: question.id,
            selectedIndex: correctIndex,
            isCorrect: false
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          if (feedbackTimeoutRef.current) {
            clearTimeout(feedbackTimeoutRef.current);
          }
          feedbackTimeoutRef.current = setTimeout(() => {
            onAnswer(question.id, -1);
            setFeedback(null);
          }, feedbackDurationMs);
        } else {
          onAnswer(question.id, -1);
        }
      }
      return;
    }
    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [room.mode, question, selectedAnswers, timeLeft, onAnswer, feedbackActive]);

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

  if (isAsyncDone) {
    return (
      <View style={containerStyle}>
        <LinearGradient colors={["#FFFFFF", "#F1F3F8"]} style={StyleSheet.absoluteFill} />
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{quiz.title}</Text>
            <Text style={styles.subtitle}>{t(locale, "asyncDuel")}</Text>
          </View>
          <Pill label={`${quiz.questions.length} / ${quiz.questions.length}`} />
        </View>

        <GlassCard style={styles.statusCard}>
          <Text style={styles.statusTitle}>{t(locale, "asyncDoneTitle")}</Text>
          <Text style={styles.statusBody}>{t(locale, "asyncDoneBody")}</Text>
        </GlassCard>

        <View style={[styles.footer, { paddingBottom: theme.spacing.lg + insets.bottom }]}>
          <PrimaryButton label={t(locale, "backHome")} icon="home" variant="ghost" onPress={onExit} />
        </View>
      </View>
    );
  }

  if (isSyncDone) {
    return (
      <View style={containerStyle}>
        <LinearGradient colors={["#FFFFFF", "#F1F3F8"]} style={StyleSheet.absoluteFill} />
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{quiz.title}</Text>
            <Text style={styles.subtitle}>{t(locale, "syncDuel")}</Text>
          </View>
          <Pill label={`${quiz.questions.length} / ${quiz.questions.length}`} />
        </View>

        <GlassCard style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <View style={styles.statusHeaderText}>
              <Text style={styles.statusTitle}>{waitingTitle}</Text>
              {waitingSubtitle ? <Text style={styles.statusBody}>{waitingSubtitle}</Text> : null}
            </View>
          </View>
          <View style={styles.statusProgressBlock}>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusLabel}>{t(locale, "youLabel")}</Text>
              <Text style={styles.statusValue}>
                {myProgress} / {quiz.questions.length}
              </Text>
            </View>
            <View style={styles.statusTrack}>
              <View
                style={[styles.statusFill, { width: `${myProgressRatio * 100}%` }]}
              />
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, styles.statusDotMuted]} />
              <Text style={styles.statusLabel}>{opponentName}</Text>
              <Text style={styles.statusValue}>
                {otherProgress} / {quiz.questions.length}
              </Text>
            </View>
            <View style={styles.statusTrack}>
              <View
                style={[
                  styles.statusFill,
                  styles.statusFillMuted,
                  { width: `${otherProgressRatio * 100}%` }
                ]}
              />
            </View>
          </View>
        </GlassCard>
        <View style={[styles.footer, { paddingBottom: theme.spacing.lg + insets.bottom }]}>
          <PrimaryButton label={t(locale, "backHome")} icon="home" variant="ghost" onPress={onExit} />
        </View>
      </View>
    );
  }

  if (room.mode === "sync" && hasAnsweredCurrent) {
    return (
      <View style={containerStyle}>
        <LinearGradient colors={["#FFFFFF", "#F1F3F8"]} style={StyleSheet.absoluteFill} />
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{quiz.title}</Text>
            <Text style={styles.subtitle}>{t(locale, "syncDuel")}</Text>
          </View>
          <View style={styles.headerPills}>
            <Pill label={progressLabel} />
            {!hasAnsweredCurrent ? (
              <Pill label={`${t(locale, "timeLeft")} ${timeLeft}s`} />
            ) : null}
          </View>
        </View>

        <GlassCard style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <View style={styles.statusHeaderText}>
              <Text style={styles.statusTitle}>{waitingTitle}</Text>
              {waitingSubtitle ? <Text style={styles.statusBody}>{waitingSubtitle}</Text> : null}
            </View>
          </View>
          <View style={styles.statusProgressBlock}>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusLabel}>{t(locale, "youLabel")}</Text>
              <Text style={styles.statusValue}>
                {myProgress} / {quiz.questions.length}
              </Text>
            </View>
            <View style={styles.statusTrack}>
              <View
                style={[styles.statusFill, { width: `${myProgressRatio * 100}%` }]}
              />
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, styles.statusDotMuted]} />
              <Text style={styles.statusLabel}>{opponentName}</Text>
              <Text style={styles.statusValue}>
                {otherProgress} / {quiz.questions.length}
              </Text>
            </View>
            <View style={styles.statusTrack}>
              <View
                style={[
                  styles.statusFill,
                  styles.statusFillMuted,
                  { width: `${otherProgressRatio * 100}%` }
                ]}
              />
            </View>
          </View>
        </GlassCard>

        <View style={[styles.footer, { paddingBottom: theme.spacing.lg + insets.bottom }]}>
          <PrimaryButton
            label={t(locale, "leave")}
            icon="arrow-left"
            variant="ghost"
            onPress={onExit}
            style={styles.leaveButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <LinearGradient colors={["#FFFFFF", "#F1F3F8"]} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{quiz.title}</Text>
          <Text style={styles.subtitle}>
            {room.mode === "sync" ? t(locale, "syncDuel") : t(locale, "asyncDuel")}
          </Text>
        </View>
        <View style={styles.headerPills}>
          <Pill label={progressLabel} />
          {room.mode === "sync" && !hasAnsweredCurrent ? (
            <Pill label={`${t(locale, "timeLeft")} ${timeLeft}s`} />
          ) : null}
        </View>
      </View>

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
                label={option}
                onPress={() => {
                  if (hasAnsweredCurrent || feedbackActive) return;
                  sentRef.current.add(question.id);
                  Haptics.selectionAsync();
                  const correctIndex =
                    typeof question.answer === "number" ? question.answer : null;
                  const isAnswerCorrect =
                    correctIndex === null ? null : correctIndex === index;
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
                    setFeedback(null);
                  }, feedbackDurationMs);
                }}
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

      <GlassCard style={styles.statusCard}>
        <View style={styles.statusHeader}>
          {room.mode === "sync" ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : null}
          <View style={styles.statusHeaderText}>
            <Text style={styles.statusTitle}>{waitingTitle}</Text>
            {waitingSubtitle ? <Text style={styles.statusBody}>{waitingSubtitle}</Text> : null}
          </View>
        </View>
        <View style={styles.statusProgressBlock}>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusLabel}>{t(locale, "youLabel")}</Text>
            <Text style={styles.statusValue}>
              {myProgress} / {quiz.questions.length}
            </Text>
          </View>
          <View style={styles.statusTrack}>
            <View style={[styles.statusFill, { width: `${myProgressRatio * 100}%` }]} />
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, styles.statusDotMuted]} />
            <Text style={styles.statusLabel}>{opponentName}</Text>
            <Text style={styles.statusValue}>
              {otherProgress} / {quiz.questions.length}
            </Text>
          </View>
          <View style={styles.statusTrack}>
            <View
              style={[
                styles.statusFill,
                styles.statusFillMuted,
                { width: `${otherProgressRatio * 100}%` }
              ]}
            />
          </View>
        </View>
      </GlassCard>

      <View style={[styles.footer, { paddingBottom: theme.spacing.lg + insets.bottom }]}>
        <PrimaryButton
          label={t(locale, "leave")}
          icon="arrow-left"
          variant="ghost"
          onPress={onExit}
          style={styles.leaveButton}
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
  headerPills: {
    alignItems: "flex-end",
    gap: theme.spacing.xs
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
    fontSize: theme.typography.small
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
    backgroundColor: "rgba(245, 246, 248, 0.92)"
  },
  leaveButton: {
    width: "100%"
  },
  statusCard: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  statusHeaderText: {
    flex: 1,
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
  statusProgressBlock: {
    gap: theme.spacing.xs
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary
  },
  statusDotMuted: {
    backgroundColor: theme.colors.border
  },
  statusLabel: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  statusValue: {
    marginLeft: "auto",
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  statusTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(11, 14, 20, 0.08)",
    overflow: "hidden"
  },
  statusFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.primary
  },
  statusFillMuted: {
    backgroundColor: "rgba(11, 14, 20, 0.18)"
  }
});
