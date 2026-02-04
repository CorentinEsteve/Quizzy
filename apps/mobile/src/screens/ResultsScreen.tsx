import React, { useEffect, useMemo, useRef } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { GlassCard } from "../components/GlassCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { FontAwesome } from "@expo/vector-icons";
import { ScoreEntry, SummaryQuestion } from "../data/types";
import { getRewardForResults } from "../data/rewards";

type Props = {
  scores: ScoreEntry[];
  total: number;
  onBack: () => void;
  locale: Locale;
  onRematch?: () => void;
  userId?: number;
  rematchReadyCount?: number;
  rematchTotal?: number;
  rematchReady?: number[];
  questions?: SummaryQuestion[];
};

export function ResultsScreen({
  scores,
  total,
  onBack,
  locale,
  onRematch,
  userId,
  rematchReadyCount,
  rematchTotal,
  rematchReady,
  questions
}: Props) {
  const insets = useSafeAreaInsets();
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const myScore = userId ? scores.find((entry) => entry.userId === userId)?.score ?? null : null;
  const topScore = sorted[0]?.score ?? null;
  const topCount = sorted.filter((entry) => entry.score === topScore).length;
  const resultState =
    myScore === null || topScore === null
      ? null
      : myScore === topScore && topCount > 1
        ? "tie"
        : myScore === topScore
          ? "win"
          : "loss";
  const resultLabel =
    resultState === "tie"
      ? t(locale, "youTied")
      : resultState === "win"
        ? t(locale, "youWon")
        : resultState === "loss"
          ? t(locale, "youLost")
          : null;
  const reward = getRewardForResults({ scores, total, userId });
  const hasOtherConfirmed = rematchReady
    ? rematchReady.some((id) => id !== userId)
    : false;
  const hasConfirmed = rematchReady ? rematchReady.includes(userId ?? -1) : false;
  const rematchLabel = hasOtherConfirmed ? t(locale, "rematchConfirm") : t(locale, "rematchLabel");
  const rematchStatus =
    rematchReadyCount && rematchTotal
      ? rematchReadyCount >= rematchTotal
        ? t(locale, "rematchReady")
        : hasConfirmed
          ? t(locale, "rematchWaitingSelf")
          : hasOtherConfirmed
            ? t(locale, "rematchIncoming")
            : t(locale, "rematchWaiting")
      : null;
  const isWaitingForOpponent = rematchStatus === t(locale, "rematchWaitingSelf");
  const waitingChars = useMemo(
    () => (rematchStatus ? rematchStatus.split("") : []),
    [rematchStatus]
  );
  const reviewItems = useMemo(() => {
    if (!questions?.length) return [];
    return questions.map((question) => {
      const prompt = question.prompt?.[locale] ?? question.prompt?.en ?? "";
      const options = question.options?.[locale] ?? question.options?.en ?? [];
      const correctIndex = typeof question.answer === "number" ? question.answer : null;
      const correctText =
        correctIndex !== null
          ? options[correctIndex] ?? t(locale, "noAnswer")
          : t(locale, "noAnswer");
      const wrongResponses = (question.responses ?? []).filter((response) =>
        correctIndex === null ? true : response.answerIndex !== correctIndex
      );
      const wrongLabels = wrongResponses.map((response) => {
        const answerText =
          response.answerIndex === -1
            ? t(locale, "noAnswer")
            : options[response.answerIndex] ?? t(locale, "noAnswer");
        return {
          key: `${question.id}-${response.userId}`,
          label: `${response.displayName} · ${answerText}`
        };
      });
      return {
        id: question.id,
        prompt,
        correctText,
        wrongLabels
      };
    });
  }, [questions, locale]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const lossAnim = useRef(new Animated.Value(0)).current;
  const waitingWaveAnim = useRef(new Animated.Value(0)).current;

  const resultTone = resultState
    ? {
        win: {
          accent: theme.colors.success,
          surface: "rgba(43, 158, 102, 0.12)"
        },
        tie: {
          accent: theme.colors.reward,
          surface: "rgba(243, 183, 78, 0.18)"
        },
        loss: {
          accent: theme.colors.danger,
          surface: "rgba(235, 87, 87, 0.12)"
        }
      }[resultState]
    : null;

  useEffect(() => {
    heroAnim.setValue(0);
    pulseAnim.setValue(0);
    lossAnim.setValue(0);
    waitingWaveAnim.setValue(0);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        speed: 12,
        bounciness: 6,
        useNativeDriver: true
      }),
      Animated.spring(heroAnim, {
        toValue: 1,
        speed: 10,
        bounciness: 10,
        useNativeDriver: true
      }),
      Animated.timing(lossAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true
      })
    ]).start();

    const hapticType =
      resultState === "win"
        ? Haptics.NotificationFeedbackType.Success
        : resultState === "tie"
          ? Haptics.NotificationFeedbackType.Warning
          : resultState === "loss"
            ? Haptics.NotificationFeedbackType.Error
            : null;
    if (hapticType) {
      Haptics.notificationAsync(hapticType);
    }

    let pulseLoop: Animated.CompositeAnimation | null = null;
    let waitingLoop: Animated.CompositeAnimation | null = null;
    if (resultState === "tie" || resultState === "win" || resultState === "loss") {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true
          })
        ])
      );
      pulseLoop.start();
    }
    if (isWaitingForOpponent) {
      waitingLoop = Animated.loop(
        Animated.timing(waitingWaveAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: false
        })
      );
      waitingLoop.start();
    }

    return () => {
      if (pulseLoop) {
        pulseLoop.stop();
      }
      if (waitingLoop) {
        waitingLoop.stop();
      }
    };
  }, [
    fadeAnim,
    scaleAnim,
    heroAnim,
    pulseAnim,
    lossAnim,
    waitingWaveAnim,
    resultState,
    isWaitingForOpponent
  ]);

  const heroScale = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1]
  });
  const heroOpacity = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });
  const sparkleOpacity = heroAnim.interpolate({
    inputRange: [0, 0.35, 0.8, 1],
    outputRange: [0, 1, 1, 0]
  });
  const sparkleScale = heroAnim.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0.4, 1, 0.9]
  });
  const sparkleRise = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, -10]
  });
  const ringScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.25]
  });
  const ringOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0]
  });
  const lossDrop = lossAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 12]
  });
  const lossOpacity = lossAnim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 1, 0]
  });
  const waitingBase = theme.colors.muted;
  const waitingHighlight = "#9AA1AD";

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}
    >
      <LinearGradient colors={["#F4F6FB", "#FFFFFF"]} style={StyleSheet.absoluteFill} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: theme.spacing.lg }]}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{t(locale, "results")}</Text>
              <Text style={styles.subtitle}>{t(locale, "resultsSubtitle")}</Text>
            </View>
            <View style={styles.awardDot} />
          </View>

          {resultLabel ? (
            <GlassCard
              accent={resultTone?.accent}
              style={[styles.resultCard, resultTone ? { backgroundColor: resultTone.surface } : null]}
            >
              <View style={styles.resultHero}>
                <Animated.View
                  style={[
                    styles.heroBadge,
                    {
                      backgroundColor: resultTone?.surface ?? "rgba(94, 124, 255, 0.12)",
                      borderColor: resultTone?.accent ?? theme.colors.primary,
                      opacity: heroOpacity,
                      transform: [{ scale: heroScale }]
                    }
                  ]}
                >
                  <View
                    style={[
                      styles.heroDot,
                      { backgroundColor: resultTone?.accent ?? theme.colors.primary }
                    ]}
                  />
                </Animated.View>

                {resultState === "win" || resultState === "loss" ? (
                  <View style={styles.ringLayer}>
                    <Animated.View
                      style={[
                        styles.ring,
                        styles.ringPulse,
                        {
                          borderColor: resultTone?.accent ?? theme.colors.primary,
                          opacity: ringOpacity,
                          transform: [{ scale: ringScale }]
                        }
                      ]}
                    />
                  </View>
                ) : null}

                {resultState === "win" ? (
                  <View style={styles.sparkleLayer}>
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <Animated.View
                        key={`sparkle-${index}`}
                        style={[
                          styles.sparkle,
                          styles[`sparkle${index}` as keyof typeof styles],
                          {
                            backgroundColor: theme.colors.accent,
                            opacity: sparkleOpacity,
                            transform: [{ translateY: sparkleRise }, { scale: sparkleScale }]
                          }
                        ]}
                      />
                    ))}
                  </View>
                ) : null}

                {resultState === "tie" ? (
                  <View style={styles.ringLayer}>
                    <Animated.View
                      style={[
                        styles.ring,
                        {
                          borderColor: resultTone?.accent ?? theme.colors.secondary,
                          opacity: ringOpacity,
                          transform: [{ scale: ringScale }]
                        }
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.ring,
                        styles.ringInner,
                        {
                          borderColor: resultTone?.accent ?? theme.colors.secondary,
                          opacity: ringOpacity,
                          transform: [{ scale: ringScale }]
                        }
                      ]}
                    />
                  </View>
                ) : null}

                {resultState === "loss" ? (
                  <Animated.View
                    style={[
                      styles.lossDrop,
                      {
                        backgroundColor: resultTone?.accent ?? theme.colors.danger,
                        opacity: lossOpacity,
                        transform: [{ translateY: lossDrop }]
                      }
                    ]}
                  />
                ) : null}
              </View>
              <Text style={styles.resultLabel}>{resultLabel}</Text>
              <Text style={styles.resultMeta}>
                {myScore} / {total}
              </Text>
              <Text style={styles.resultHint}>{t(locale, "rematchHint")}</Text>
              {rematchStatus ? (
                isWaitingForOpponent ? (
                  <Text style={styles.resultHint}>
                    {waitingChars.map((char, index) => {
                      const length = Math.max(waitingChars.length, 1);
                      const position = index / length;
                      const pre = Math.max(position - 0.08, 0);
                      const post = Math.min(position + 0.12, 1);
                      const safePre = pre === position ? Math.max(position - 0.001, 0) : pre;
                      const safePost = post === position ? Math.min(position + 0.001, 1) : post;
                      return (
                        <Animated.Text
                          key={`waiting-char-${index}`}
                          style={{
                            color: waitingWaveAnim.interpolate({
                              inputRange: [0, safePre, position, safePost, 1],
                              outputRange: [
                                waitingBase,
                                waitingBase,
                                waitingHighlight,
                                waitingBase,
                                waitingBase
                              ],
                              extrapolate: "clamp"
                            })
                          }}
                        >
                          {char}
                        </Animated.Text>
                      );
                    })}
                  </Text>
                ) : (
                  <Text style={styles.resultHint}>{rematchStatus}</Text>
                )
              ) : null}
            </GlassCard>
          ) : null}

          {reward ? (
            <LinearGradient colors={["#FFF6E6", "#FFFFFF"]} style={styles.rewardCard}>
              <View style={styles.rewardRow}>
                <Text style={styles.rewardEmoji}>{reward.emoji}</Text>
                <View style={styles.rewardCopy}>
                  <Text style={styles.rewardTitle}>
                    {t(locale, reward.titleKey)}
                  </Text>
                  <Text style={styles.rewardBody}>
                    {t(locale, reward.descriptionKey)}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          ) : null}

          <GlassCard style={styles.card}>
            {sorted.map((entry, index) => {
              const isTop = index === 0;
              const isTie = (topCount ?? 0) > 1 && entry.score === topScore;
              const isSecond = index === 1;
              const badgeLabel = isTie ? t(locale, "tieLabel") : t(locale, "winnerLabel");
              const winnerScale = heroAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.98, 1]
              });
              const rowIsWinner = isTop && !isTie;
              const showBadge = isTie || rowIsWinner;
              return (
                <Animated.View
                  key={entry.userId}
                  style={[
                    styles.rankRow,
                    rowIsWinner ? styles.rankRowWinner : null,
                    isTie ? styles.rankRowTie : null,
                    isSecond ? styles.rankRowRunner : null,
                    showBadge
                      ? {
                          opacity: heroOpacity,
                          transform: [{ scale: winnerScale }]
                        }
                      : null
                  ]}
                >
                  <View style={styles.rankNameGroup}>
                    <Text
                      style={[
                        styles.rankIndex,
                        rowIsWinner ? styles.rankIndexWinner : null,
                        isTie ? styles.rankIndexTie : null
                      ]}
                    >
                      {index + 1}.
                    </Text>
                    <View style={styles.rankNameBlock}>
                      <View style={styles.rankNameLine}>
                        <Text
                          style={[
                            styles.name,
                            rowIsWinner ? styles.nameWinner : null,
                            isTie ? styles.nameTie : null
                          ]}
                        >
                          {entry.displayName}
                        </Text>
                        {showBadge ? (
                          <View style={[styles.rankBadge, isTie ? styles.rankBadgeTie : null]}>
                            <FontAwesome
                              name="trophy"
                              size={12}
                              color={isTie ? theme.colors.primary : theme.colors.success}
                              style={styles.rankBadgeIcon}
                            />
                            <Text
                              style={[
                                styles.rankBadgeText,
                                isTie ? styles.rankBadgeTextTie : null
                              ]}
                            >
                              {badgeLabel}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.score,
                      rowIsWinner ? styles.scoreWinner : null,
                      isTie ? styles.scoreTie : null
                    ]}
                  >
                    {entry.score} / {total}
                  </Text>
                </Animated.View>
              );
            })}
          </GlassCard>

          {reviewItems.length ? (
            <GlassCard style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewTitle}>{t(locale, "answerReviewTitle")}</Text>
                <Text style={styles.reviewSubtitle}>{t(locale, "answerReviewSubtitle")}</Text>
              </View>
              <View style={styles.reviewList}>
                {reviewItems.map((item, index) => (
                  <View key={item.id} style={styles.questionItem}>
                    <View style={styles.questionHeader}>
                      <Text style={styles.questionIndex}>{index + 1}.</Text>
                      <Text style={styles.questionPrompt}>{item.prompt}</Text>
                    </View>
                    <View style={styles.answerRow}>
                      <Text style={styles.answerLabel}>{t(locale, "correctAnswer")}</Text>
                      <View style={styles.correctPill}>
                        <Text style={styles.correctPillText}>{item.correctText}</Text>
                      </View>
                    </View>
                    <View style={styles.answerRow}>
                      <Text style={styles.answerLabel}>{t(locale, "wrongAnswers")}</Text>
                      <View style={styles.wrongWrap}>
                        {item.wrongLabels.length ? (
                          item.wrongLabels.map((wrong) => (
                            <View key={wrong.key} style={styles.wrongPill}>
                              <Text style={styles.wrongPillText}>{wrong.label}</Text>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.answerEmpty}>{t(locale, "noWrongAnswers")}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </GlassCard>
          ) : null}
        </View>
      </ScrollView>
      <View
        style={[
          styles.footer,
          { paddingBottom: theme.spacing.lg + insets.bottom }
        ]}
      >
        {onRematch ? (
          <PrimaryButton
            label={hasConfirmed ? t(locale, "rematchByYou") : rematchLabel}
            variant={hasConfirmed ? "ghost" : "primary"}
            icon="refresh"
            iconPosition="right"
            style={hasConfirmed ? styles.rematchPending : undefined}
            onPress={hasConfirmed ? undefined : onRematch}
          />
        ) : null}
        <PrimaryButton
          label={t(locale, "backHome")}
          icon="home"
          variant="ghost"
          onPress={onBack}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContent: {
    padding: theme.spacing.lg
  },
  content: {
    gap: theme.spacing.lg
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
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
  awardDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.reward,
    shadowColor: theme.colors.reward,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }
  },
  rewardCard: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(243, 183, 78, 0.35)",
    gap: theme.spacing.sm
  },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  rewardEmoji: {
    fontSize: 24
  },
  rewardCopy: {
    flex: 1,
    gap: theme.spacing.xs
  },
  rewardTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: "600"
  },
  rewardBody: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body
  },
  resultCard: {
    gap: theme.spacing.xs
  },
  resultHero: {
    alignSelf: "center",
    width: 76,
    height: 76,
    marginBottom: theme.spacing.xs,
    alignItems: "center",
    justifyContent: "center"
  },
  heroBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2
  },
  heroDot: {
    width: 18,
    height: 18,
    borderRadius: 9
  },
  sparkleLayer: {
    position: "absolute",
    width: 76,
    height: 76
  },
  sparkle: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4
  },
  sparkle0: {
    top: 4,
    left: 8
  },
  sparkle1: {
    top: 10,
    right: 10
  },
  sparkle2: {
    right: 2,
    bottom: 18
  },
  sparkle3: {
    left: 2,
    bottom: 16
  },
  sparkle4: {
    top: 30,
    left: -2
  },
  sparkle5: {
    top: 26,
    right: -2
  },
  ringLayer: {
    position: "absolute",
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1
  },
  ring: {
    position: "absolute",
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2
  },
  ringPulse: {
    width: 64,
    height: 64,
    borderRadius: 32
  },
  ringInner: {
    width: 52,
    height: 52,
    borderRadius: 26
  },
  lossDrop: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    top: 6
  },
  resultLabel: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  resultMeta: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  rematchPending: {
    backgroundColor: "rgba(243, 183, 78, 0.16)",
    borderColor: "rgba(243, 183, 78, 0.4)",
    borderWidth: 1
  },
  resultHint: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  card: {
    gap: theme.spacing.sm
  },
  reviewCard: {
    gap: theme.spacing.md
  },
  reviewHeader: {
    gap: 2
  },
  reviewTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  reviewSubtitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  reviewList: {
    gap: theme.spacing.md
  },
  questionItem: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: "rgba(245, 247, 251, 0.9)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.08)",
    gap: theme.spacing.sm
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm
  },
  questionIndex: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  questionPrompt: {
    flex: 1,
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  answerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm
  },
  answerLabel: {
    width: 110,
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  correctPill: {
    backgroundColor: "rgba(43, 158, 102, 0.14)",
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(43, 158, 102, 0.3)",
    flexShrink: 1
  },
  correctPillText: {
    color: theme.colors.success,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  wrongWrap: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    alignItems: "center"
  },
  wrongPill: {
    backgroundColor: "rgba(235, 87, 87, 0.12)",
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(235, 87, 87, 0.28)"
  },
  wrongPillText: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  answerEmpty: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.06)"
  },
  rankRowWinner: {
    backgroundColor: "rgba(43, 158, 102, 0.12)",
    borderColor: "rgba(43, 158, 102, 0.3)"
  },
  rankRowTie: {
    backgroundColor: "rgba(11, 14, 20, 0.03)",
    borderColor: "rgba(15, 23, 42, 0.12)"
  },
  rankRowRunner: {
    backgroundColor: "rgba(15, 23, 42, 0.03)",
    opacity: 0.9
  },
  rankNameGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    flex: 1
  },
  rankIndex: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  rankIndexWinner: {
    color: theme.colors.success
  },
  rankIndexTie: {
    color: theme.colors.primary
  },
  rankNameBlock: {
    flex: 1,
    gap: 2
  },
  rankNameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    flexWrap: "wrap"
  },
  nameWinner: {
    color: theme.colors.success
  },
  nameTie: {
    color: theme.colors.ink
  },
  rankBadge: {
    backgroundColor: "rgba(43, 158, 102, 0.16)",
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center"
  },
  rankBadgeTie: {
    backgroundColor: "rgba(94, 124, 255, 0.12)"
  },
  rankBadgeText: {
    color: theme.colors.success,
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "600"
  },
  rankBadgeTextTie: {
    color: theme.colors.primary
  },
  rankBadgeIcon: {
    marginRight: 4
  },
  scoreWinner: {
    color: theme.colors.success,
    fontWeight: "600"
  },
  scoreTie: {
    color: theme.colors.primary,
    fontWeight: "600"
  },
  name: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  score: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: "rgba(245, 246, 248, 0.92)"
  }
});
