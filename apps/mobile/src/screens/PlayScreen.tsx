import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  const questionTimeMs = 20000;
  const feedbackDurationMs = 750;
  const [feedback, setFeedback] = useState<{
    questionId: string;
    selectedIndex: number;
    isCorrect: boolean | null;
    mode: "answer" | "reveal";
  } | null>(null);
  const [timerWidth, setTimerWidth] = useState(0);
  const [timerStartAt, setTimerStartAt] = useState<number | null>(null);
  const sentRef = useRef<Set<string>>(new Set());
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerProgress = useRef(new Animated.Value(1)).current;
  const footerInset = theme.spacing.lg + insets.bottom + 96;
  const containerStyle = [
    styles.container,
    { paddingTop: theme.spacing.lg + insets.top, paddingBottom: footerInset }
  ];
  const myProgress = room.progress.find((item) => item.userId === userId)?.answeredCount ?? 0;
  const myCorrect = room.progress.find((item) => item.userId === userId)?.correctCount ?? 0;
  const myWrong = room.progress.find((item) => item.userId === userId)?.wrongCount ?? 0;
  const totalQuestions = Math.max(quiz.questions.length, 1);
  const safeMyProgress = Math.max(0, Math.min(myProgress, quiz.questions.length));

  let questionIndex = room.currentIndex;
  if (room.mode === "async") {
    questionIndex = Math.min(safeMyProgress, quiz.questions.length - 1);
  } else {
    questionIndex = Math.min(Math.max(room.currentIndex, 0), quiz.questions.length - 1);
  }

  const question = quiz.questions[questionIndex];
  if (!question) {
    return (
      <View style={styles.screen}>
        <View style={containerStyle}>
          <GlassCard style={styles.statusCard}>
            <Text style={styles.statusTitle}>{t(locale, "pleaseWait")}</Text>
          </GlassCard>
        </View>
      </View>
    );
  }
  const prompt = question?.prompt?.[locale] ?? question?.prompt?.en ?? "";
  const options = question?.options?.[locale] ?? question?.options?.en ?? [];
  const progressLabel =
    room.mode === "sync"
      ? `${Math.min(room.currentIndex + 1, quiz.questions.length)} / ${quiz.questions.length}`
      : `${safeMyProgress} / ${quiz.questions.length}`;
  const opponent = room.players.find((player) => player.id !== userId);
  const opponentName = opponent?.displayName ?? t(locale, "opponentLabel");
  const opponentProgressItem = room.progress.find((item) => item.userId !== userId);
  const otherProgress = opponentProgressItem?.answeredCount ?? 0;
  const otherCorrect = opponentProgressItem?.correctCount ?? 0;
  const otherWrong = opponentProgressItem?.wrongCount ?? 0;
  const hasAnsweredCurrent =
    selectedAnswers[question.id] !== undefined ||
    myProgress > questionIndex;
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
  const showQuestionBlock = !(room.mode === "sync" && hasAnsweredCurrent && !feedbackActive);
  const myProgressRatio = Math.min(myProgress / totalQuestions, 1);
  const otherProgressRatio = Math.min(otherProgress / totalQuestions, 1);
  const progressBlock = (
    <View style={styles.statusProgressBlock}>
      <View style={styles.statusRow}>
        <View style={styles.statusDot} />
        <Text style={styles.statusLabel}>{t(locale, "youLabel")}</Text>
        <View style={styles.statusValueGroup}>
          <View style={styles.statusScore}>
            <View style={styles.scoreBadge}>
              <FontAwesome name="check" size={9} color={theme.colors.success} />
              <Text style={[styles.scoreValue, styles.scoreCorrect]}>{myCorrect}</Text>
            </View>
            <Text style={styles.scoreDivider}>·</Text>
            <View style={styles.scoreBadge}>
              <FontAwesome name="times" size={9} color={theme.colors.danger} />
              <Text style={[styles.scoreValue, styles.scoreWrong]}>{myWrong}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.statusTrack}>
        <View style={[styles.statusFill, { width: `${myProgressRatio * 100}%` }]} />
      </View>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, styles.statusDotMuted]} />
        <Text style={styles.statusLabel}>{opponentName}</Text>
        <View style={styles.statusValueGroup}>
          <View style={styles.statusScore}>
            <View style={styles.scoreBadge}>
              <FontAwesome name="check" size={9} color={theme.colors.success} />
              <Text style={[styles.scoreValue, styles.scoreCorrect]}>{otherCorrect}</Text>
            </View>
            <Text style={styles.scoreDivider}>·</Text>
            <View style={styles.scoreBadge}>
              <FontAwesome name="times" size={9} color={theme.colors.danger} />
              <Text style={[styles.scoreValue, styles.scoreWrong]}>{otherWrong}</Text>
            </View>
          </View>
        </View>
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
  );

  const timerKeyForQuestion = (questionId: string) =>
    `dq_timer:${room.code}:${userId}:${questionId}`;

  const clearTimerForQuestion = (questionId: string) => {
    AsyncStorage.removeItem(timerKeyForQuestion(questionId)).catch(() => null);
  };

  useEffect(() => {
    let active = true;
    async function initTimer() {
      if (!question || hasAnsweredCurrent || feedbackActive) {
        setTimerStartAt(null);
        return;
      }
      const key = timerKeyForQuestion(question.id);
      const stored = await AsyncStorage.getItem(key);
      const now = Date.now();
      let start = stored ? Number(stored) : now;
      if (!stored || Number.isNaN(start)) {
        start = now;
        await AsyncStorage.setItem(key, String(start));
      }
      if (active) setTimerStartAt(start);
    }
    initTimer();
    return () => {
      active = false;
    };
  }, [question?.id, hasAnsweredCurrent, feedbackActive, room.code, userId]);

  useEffect(() => {
    if (!question || hasAnsweredCurrent || feedbackActive || timerStartAt === null) {
      timerProgress.stopAnimation();
      if (timerTimeoutRef.current) {
        clearTimeout(timerTimeoutRef.current);
        timerTimeoutRef.current = null;
      }
      return;
    }

    const elapsed = Date.now() - timerStartAt;
    const remaining = Math.max(questionTimeMs - elapsed, 0);
    const startRatio = remaining / questionTimeMs;

    timerProgress.setValue(startRatio);
    Animated.timing(timerProgress, {
      toValue: 0,
      duration: remaining,
      useNativeDriver: false
    }).start();

    if (timerTimeoutRef.current) {
      clearTimeout(timerTimeoutRef.current);
      timerTimeoutRef.current = null;
    }

    if (remaining <= 0) {
      if (!sentRef.current.has(question.id)) {
        sentRef.current.add(question.id);
        clearTimerForQuestion(question.id);
        const correctIndex = typeof question.answer === "number" ? question.answer : null;
        if (correctIndex !== null) {
          setFeedback({
            questionId: question.id,
            selectedIndex: correctIndex,
            isCorrect: null,
            mode: "reveal"
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          if (feedbackTimeoutRef.current) {
            clearTimeout(feedbackTimeoutRef.current);
          }
          feedbackTimeoutRef.current = setTimeout(() => {
            onAnswer(question.id, -1);
          }, feedbackDurationMs);
        } else {
          onAnswer(question.id, -1);
        }
      }
      return;
    }

    timerTimeoutRef.current = setTimeout(() => {
      if (sentRef.current.has(question.id)) return;
      sentRef.current.add(question.id);
      clearTimerForQuestion(question.id);
      const correctIndex = typeof question.answer === "number" ? question.answer : null;
      if (correctIndex !== null) {
        setFeedback({
          questionId: question.id,
          selectedIndex: correctIndex,
          isCorrect: null,
          mode: "reveal"
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        if (feedbackTimeoutRef.current) {
          clearTimeout(feedbackTimeoutRef.current);
        }
        feedbackTimeoutRef.current = setTimeout(() => {
          onAnswer(question.id, -1);
        }, feedbackDurationMs);
      } else {
        onAnswer(question.id, -1);
      }
    }, remaining);

    return () => {
      if (timerTimeoutRef.current) {
        clearTimeout(timerTimeoutRef.current);
        timerTimeoutRef.current = null;
      }
    };
  }, [
    question,
    hasAnsweredCurrent,
    feedbackActive,
    timerStartAt,
    questionTimeMs,
    onAnswer,
    timerProgress
  ]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = null;
      }
      if (timerTimeoutRef.current) {
        clearTimeout(timerTimeoutRef.current);
        timerTimeoutRef.current = null;
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

  useEffect(() => {
    if (question?.id && hasAnsweredCurrent) {
      clearTimerForQuestion(question.id);
    }
  }, [question?.id, hasAnsweredCurrent]);


  if (isAsyncDone) {
    return (
      <View style={containerStyle}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{quiz.title}</Text>
            <Text style={styles.subtitle}>{t(locale, "asyncDuel")}</Text>
          </View>
          <Pill label={`${quiz.questions.length} / ${quiz.questions.length}`} />
        </View>

        <GlassCard style={styles.statusCard}>
          <View style={styles.statusMessageBlock}>
            <Text style={styles.statusTitle}>{t(locale, "sessionWaiting")}</Text>
            <Text style={styles.statusBody}>{t(locale, "asyncDoneBody")}</Text>
          </View>
          {progressBlock}
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
          {progressBlock}
        </GlassCard>
        <View style={[styles.footer, { paddingBottom: theme.spacing.lg + insets.bottom }]}>
          <PrimaryButton label={t(locale, "backHome")} icon="home" variant="ghost" onPress={onExit} />
        </View>
      </View>
    );
  }


  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={containerStyle}
        contentInsetAdjustmentBehavior="never"
      >
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={styles.title}>{quiz.title}</Text>
          <View style={styles.headerMetaRow}>
            <View style={styles.modeChip}>
              <FontAwesome
                name={room.mode === "sync" ? "bolt" : "clock-o"}
                size={10}
                color={theme.colors.primary}
              />
              <Text style={styles.modeChipText}>
                {room.mode === "sync" ? t(locale, "syncDuel") : t(locale, "asyncDuel")}
              </Text>
            </View>
            <Text numberOfLines={1} style={styles.subtitle}>
              vs {opponentName}
            </Text>
          </View>
        </View>
        <View style={styles.headerPills}>
          <View style={styles.progressPill}>
            <Text style={styles.progressPillText}>{progressLabel}</Text>
          </View>
        </View>
      </View>

      {showQuestionBlock ? (
        <>
          <View style={[styles.timerShell, !hasAnsweredCurrent && !feedbackActive ? null : styles.timerShellInactive]}>
            <View style={styles.timerIconBubble}>
              <FontAwesome name="bolt" size={10} color={theme.colors.primary} />
            </View>
            <View
              style={[
                styles.timerTrack,
                !hasAnsweredCurrent && !feedbackActive ? null : styles.timerTrackInactive
              ]}
              onLayout={(event) => setTimerWidth(event.nativeEvent.layout.width)}
            >
              {!hasAnsweredCurrent && !feedbackActive ? (
                <Animated.View
                  style={[
                    styles.timerFill,
                    {
                      width:
                        timerWidth > 0
                          ? timerProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, timerWidth]
                            })
                          : "100%",
                      backgroundColor: timerProgress.interpolate({
                        inputRange: [0, 0.2, 0.45, 1],
                        outputRange: [
                          "rgba(235, 87, 87, 0.9)",
                          "rgba(243, 183, 78, 0.9)",
                          "rgba(118, 214, 174, 0.92)",
                          "rgba(118, 214, 174, 0.92)"
                        ]
                      })
                    }
                  ]}
                />
              ) : null}
            </View>
          </View>

          <GlassCard accent={quiz.accent} style={styles.card}>
            <Text style={styles.prompt}>{prompt}</Text>
            <View style={styles.options}>
              {options.map((option, index) => {
                const isFeedbackSelected = feedbackActive && feedback?.selectedIndex === index;
                const showFeedback = feedbackActive && isFeedbackSelected;
                const isReveal = showFeedback && feedback?.mode === "reveal";
                const isCorrect = showFeedback ? feedback?.isCorrect === true : false;
                const isIncorrect = showFeedback ? feedback?.isCorrect === false : false;
                return (
                  <PrimaryButton
                    key={`${question.id}-${index}`}
                    label={`${String.fromCharCode(65 + index)}. ${option}`}
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
                        isCorrect: isAnswerCorrect,
                        mode: "answer"
                      });
                      clearTimerForQuestion(question.id);
                      if (feedbackTimeoutRef.current) {
                        clearTimeout(feedbackTimeoutRef.current);
                      }
                      feedbackTimeoutRef.current = setTimeout(() => {
                        onAnswer(question.id, index);
                      }, feedbackDurationMs);
                    }}
                    variant="ghost"
                    style={[
                      styles.optionButton,
                      showFeedback && styles.optionFeedback,
                      showFeedback && isReveal && styles.optionReveal,
                      showFeedback && isCorrect && styles.optionCorrect,
                      showFeedback && isIncorrect && styles.optionIncorrect
                    ]}
                  />
                );
              })}
            </View>
          </GlassCard>
        </>
      ) : null}

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
        {progressBlock}
      </GlassCard>
      </ScrollView>

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
  screen: {
    flex: 1
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    backgroundColor: "transparent"
  },
  timerShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(94, 124, 255, 0.18)",
    marginBottom: theme.spacing.md
  },
  timerShellInactive: {
    opacity: 0.62
  },
  timerIconBubble: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(94, 124, 255, 0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(94, 124, 255, 0.3)"
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
  timerTrack: {
    flex: 1,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(11, 14, 20, 0.1)",
    overflow: "hidden",
    marginBottom: 0
  },
  timerTrackInactive: {
    opacity: 0.35
  },
  timerFill: {
    height: "100%",
    borderRadius: 999
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
  optionReveal: {
    backgroundColor: "rgba(94, 124, 255, 0.12)",
    borderColor: "rgba(94, 124, 255, 0.35)"
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
  leaveButton: {
    width: "100%"
  },
  statusCard: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.md
  },
  statusMessageBlock: {
    gap: theme.spacing.xs
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  statusHeaderText: {
    flex: 1,
    gap: 4
  },
  statusTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  statusBody: {
    color: "rgba(47, 56, 70, 0.82)",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    lineHeight: 22,
    flexShrink: 1
  },
  statusProgressBlock: {
    gap: theme.spacing.sm
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
    fontWeight: "600",
    flexShrink: 1
  },
  statusValueGroup: {
    marginLeft: "auto",
    alignItems: "flex-end",
    gap: 2
  },
  statusScore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  scoreValue: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "600"
  },
  scoreCorrect: {
    color: theme.colors.success
  },
  scoreWrong: {
    color: theme.colors.danger
  },
  scoreDivider: {
    color: theme.colors.border,
    fontSize: 12
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
