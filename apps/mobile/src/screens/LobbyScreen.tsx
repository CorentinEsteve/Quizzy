import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { GlassCard } from "../components/GlassCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { InputField } from "../components/InputField";
import { DailyQuizResults, DailyQuizStatus, QuizSummary, StatsResponse } from "../data/types";

type Props = {
  quizzes: QuizSummary[];
  onCreateRoom: (categoryId: string, questionCount: number, mode: "sync" | "async") => void;
  onJoinRoom: (code: string) => void;
  onOpenAccount: () => void;
  onOpenPersonalLeaderboard: () => void;
  userName: string;
  locale: Locale;
  userId: number;
  sessions: {
    code: string;
    status: string;
    quiz: { title: string; subtitle: string };
    players: { id: number; displayName: string }[];
    scores: Record<string, number>;
    progress: Record<string, number>;
    rematchReady: number[];
  }[];
  onOpenRecap: (code: string) => void;
  onResumeRoom: (code: string) => void;
  recapStats: StatsResponse | null;
  dailyQuiz: DailyQuizStatus | null;
  dailyResults: DailyQuizResults | null;
  dailyLoading: boolean;
  onOpenDailyQuiz: () => void;
  onOpenDailyResults: () => void;
  dailyBestStreak: number;
};

const ALL_CATEGORY_ID = "all";
const DID_YOU_KNOW_KEY = "dq_did_you_know_tip";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("");
}

export function LobbyScreen({
  quizzes,
  onCreateRoom,
  onJoinRoom,
  onOpenAccount,
  onOpenPersonalLeaderboard,
  userName,
  locale,
  userId,
  sessions,
  onOpenRecap,
  onResumeRoom,
  recapStats,
  dailyQuiz,
  dailyResults,
  dailyLoading,
  onOpenDailyQuiz,
  onOpenDailyResults,
  dailyBestStreak
}: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [code, setCode] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number | null>(null);
  const [selectedMode, setSelectedMode] = useState<"sync" | "async">("async");
  const [tipIndex, setTipIndex] = useState(0);
  const [dialogStep, setDialogStep] = useState<"menu" | "pick" | "join">("menu");
  const [pickStep, setPickStep] = useState<"category" | "count" | "mode">("category");
  const dialogOpacity = useRef(new Animated.Value(0)).current;
  const dialogScale = useRef(new Animated.Value(0.96)).current;
  const continuePulse = useRef(new Animated.Value(0)).current;
  const dialogMaxHeight = Math.min(
    height - insets.top - insets.bottom - theme.spacing.xl * 2,
    height * 0.88
  );
  const dialogListMaxHeight = Math.max(240, dialogMaxHeight - 240);

  const categories = useMemo(() => {
    const map = new Map<string, { id: string; label: string; accent: string; questionCount: number }>();
    quizzes.forEach((quiz) => {
      if (!map.has(quiz.categoryId)) {
        map.set(quiz.categoryId, {
          id: quiz.categoryId,
          label: quiz.categoryLabel,
          accent: quiz.accent,
          questionCount: quiz.questionCount ?? quiz.rounds ?? 0
        });
      } else {
        const existing = map.get(quiz.categoryId);
        if (existing) {
          existing.questionCount += quiz.questionCount ?? quiz.rounds ?? 0;
        }
      }
    });
    const totalQuestions = Array.from(map.values()).reduce(
      (sum, category) => sum + category.questionCount,
      0
    );
    return [
      {
        id: ALL_CATEGORY_ID,
        label: t(locale, "allCategories"),
        accent: theme.colors.primary,
        questionCount: totalQuestions
      },
      ...Array.from(map.values())
    ];
  }, [locale, quizzes]);

  const tips = useMemo(
    () => [
      t(locale, "didYouKnow1"),
      t(locale, "didYouKnow2"),
      t(locale, "didYouKnow3"),
      t(locale, "didYouKnow4"),
      t(locale, "didYouKnow5"),
      t(locale, "didYouKnow6"),
      t(locale, "didYouKnow7"),
      t(locale, "didYouKnow8"),
      t(locale, "didYouKnow9"),
      t(locale, "didYouKnow10"),
      t(locale, "didYouKnow11"),
      t(locale, "didYouKnow12"),
      t(locale, "didYouKnow13"),
      t(locale, "didYouKnow14"),
      t(locale, "didYouKnow15"),
      t(locale, "didYouKnow16"),
      t(locale, "didYouKnow17"),
      t(locale, "didYouKnow18"),
      t(locale, "didYouKnow19"),
      t(locale, "didYouKnow20")
    ],
    [locale]
  );

  const activeSessions = useMemo(
    () => sessions.filter((session) => session.status === "active"),
    [sessions]
  );
  const actionableSessions = useMemo(
    () =>
      activeSessions.filter((session) => {
        const totalQuestions = session.quiz.questions?.length ?? 0;
        const myProgress = session.progress?.[String(userId)] ?? 0;
        const opponent = session.players.find((player) => player.id !== userId);
        const opponentProgress = opponent ? session.progress?.[String(opponent.id)] ?? 0 : 0;
        const isAsyncDual = session.mode === "async" && session.players.length > 1;
        const isWaitingForOpponent =
          (session.mode === "sync" &&
            myProgress > opponentProgress &&
            myProgress < totalQuestions) ||
          (isAsyncDual && myProgress >= totalQuestions && opponentProgress < totalQuestions);
        return session.mode === "sync"
          ? !isWaitingForOpponent && myProgress < totalQuestions
          : myProgress < totalQuestions;
      }),
    [activeSessions, userId]
  );
  const nextSession = actionableSessions.length ? actionableSessions[0] : null;
  const remainingSessions = nextSession
    ? activeSessions.filter((session) => session.code !== nextSession.code)
    : activeSessions;
  const dailyAnswered = dailyQuiz?.answeredCount ?? 0;
  const dailyTotal = dailyQuiz?.totalQuestions ?? 10;
  const dailyCompleted = dailyQuiz?.completed ?? false;
  const dailyPercentile = dailyResults?.my.percentile ?? null;
  const dailyActionLabel = dailyCompleted
    ? t(locale, "dailyQuizResults")
    : dailyAnswered > 0
      ? t(locale, "dailyQuizContinue")
      : t(locale, "dailyQuizPlay");
  const dailyProgressLabel = t(locale, "dailyQuizProgress", {
    count: dailyAnswered,
    total: dailyTotal
  });
  const showDailyCard = Boolean(dailyQuiz) || dailyLoading;
  const handleDailyPress = dailyCompleted ? onOpenDailyResults : onOpenDailyQuiz;
  const dailyProgressRatio = Math.min(dailyAnswered / Math.max(dailyTotal, 1), 1);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  );
  const poolCount = selectedCategory?.questionCount ?? 0;
  const lengthOptions = useMemo(() => {
    const base = [
      {
        key: "quick",
        count: 10,
        label: t(locale, "matchQuick"),
        description: t(locale, "matchQuickBody")
      },
      {
        key: "standard",
        count: 20,
        label: t(locale, "matchStandard"),
        description: t(locale, "matchStandardBody")
      },
      {
        key: "deep",
        count: 30,
        label: t(locale, "matchDeep"),
        description: t(locale, "matchDeepBody")
      }
    ];
    const available = base
      .map((option) => ({ ...option, count: Math.min(option.count, poolCount) }))
      .filter((option) => option.count > 0);
    if (available.length === 0) return [];
    const unique = new Map(available.map((option) => [option.count, option]));
    return Array.from(unique.values());
  }, [locale, poolCount]);

  useEffect(() => {
    if (!isDialogOpen) return;
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(ALL_CATEGORY_ID);
    }
    setSelectedQuestionCount(null);
    setSelectedMode("async");
    dialogOpacity.setValue(0);
    dialogScale.setValue(0.96);
    Animated.parallel([
      Animated.timing(dialogOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(dialogScale, {
        toValue: 1,
        speed: 16,
        bounciness: 6,
        useNativeDriver: true
      })
    ]).start();
  }, [isDialogOpen, dialogOpacity, dialogScale]);

  useEffect(() => {
    if (!selectedCategoryId) return;
    if (lengthOptions.length === 0) return;
    if (!selectedQuestionCount || !lengthOptions.some((item) => item.count === selectedQuestionCount)) {
      setSelectedQuestionCount(lengthOptions[0].count);
    }
  }, [lengthOptions, selectedCategoryId, selectedQuestionCount]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(continuePulse, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true
        }),
        Animated.delay(400),
        Animated.timing(continuePulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true
        })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [continuePulse]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(DID_YOU_KNOW_KEY)
      .then((value) => {
        if (!active) return;
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
          setTipIndex(parsed);
        }
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!tips.length) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") return;
      setTipIndex((prev) => {
        const next = (prev + 1) % tips.length;
        AsyncStorage.setItem(DID_YOU_KNOW_KEY, String(next)).catch(() => null);
        return prev;
      });
    });
    return () => subscription.remove();
  }, [tips.length]);

  const nextOpponent = nextSession?.players.find((player) => player.id !== userId);
  const nextOpponentName = nextOpponent?.displayName ?? t(locale, "opponentLabel");
  const nextTotalQuestions = nextSession?.quiz.questions?.length ?? 0;
  const nextMyProgress = nextSession ? nextSession.progress?.[String(userId)] ?? 0 : 0;
  const nextOpponentProgress =
    nextSession && nextOpponent ? nextSession.progress?.[String(nextOpponent.id)] ?? 0 : 0;
  const nextDelta = nextOpponentProgress - nextMyProgress;
  const nextStatus = t(locale, "yourTurn");
  const nextMeta =
    nextSession && nextTotalQuestions
      ? {
          category: nextSession.quiz.categoryLabel ?? t(locale, "allCategories"),
          progress: `Q${Math.min(nextMyProgress, nextTotalQuestions)}/${Math.max(
            nextTotalQuestions,
            1
          )}`,
          status: nextStatus
        }
      : null;
  const recapTotal = recapStats
    ? recapStats.totals.wins + recapStats.totals.losses + recapStats.totals.ties
    : 0;

  return (
    <View style={styles.page}>
      <LinearGradient
        colors={["#F4F6FA", "#F9FAFE", "#FFFFFF"]}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["rgba(94, 124, 255, 0.12)", "rgba(94, 124, 255, 0)"]}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.7, y: 0.7 }}
        style={styles.backgroundSweep}
      />
      <View style={styles.backgroundOrb} pointerEvents="none" />
      <View style={styles.backgroundOrbAccent} pointerEvents="none" />
      <View style={styles.backgroundGlow} pointerEvents="none" />
      <View style={styles.backgroundGlass} pointerEvents="none" />
      <LinearGradient
        colors={["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.7)", "rgba(255, 255, 255, 0.88)"]}
        style={[styles.bottomFade, { paddingBottom: insets.bottom }]}
        pointerEvents="none"
      />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: theme.spacing.lg + insets.top, paddingBottom: theme.spacing.lg + 64 + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              {t(locale, "hello")}, {userName}
            </Text>
            <Text style={styles.subtitle}>{t(locale, "lobbySubtitle")}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.accountButton} onPress={onOpenAccount}>
              <Text style={styles.accountInitials}>{initials(userName || "Player")}</Text>
            </Pressable>
          </View>
        </View>

        {recapStats ? (
          <Pressable
            onPress={onOpenPersonalLeaderboard}
            accessibilityRole="button"
            accessibilityLabel={t(locale, "openPersonalLeaderboard")}
            hitSlop={6}
          >
            <GlassCard style={[styles.introCard, styles.recapCard]} accent={theme.colors.primary}>
              <View style={styles.recapHeader}>
                <View style={styles.recapHeaderText}>
                  <View style={styles.recapTitleRow}>
                    <FontAwesome name="trophy" size={12} color={theme.colors.reward} />
                    <Text style={styles.sectionTitle}>{t(locale, "recapTitle")}</Text>
                  </View>
                  <Text style={styles.sectionSubtitle}>{t(locale, "recapSubtitle")}</Text>
                </View>
                <View style={styles.recapHeaderAction}>
                  <Text style={styles.recapHeaderActionText}>{t(locale, "seeRecap")}</Text>
                  <FontAwesome name="chevron-right" size={12} color={theme.colors.muted} />
                </View>
              </View>
            <View style={styles.recapRow}>
              <View style={[styles.recapPill, styles.recapPillWin]}>
                <FontAwesome name="trophy" size={12} color={theme.colors.success} />
                <Text style={styles.recapPillValue}>{recapStats.totals.wins}</Text>
                <Text style={styles.recapPillLabel}>{t(locale, "totalWins")}</Text>
              </View>
              <View style={[styles.recapPill, styles.recapPillLoss]}>
                <FontAwesome name="times-circle" size={12} color={theme.colors.danger} />
                <Text style={styles.recapPillValue}>{recapStats.totals.losses}</Text>
                <Text style={styles.recapPillLabel}>{t(locale, "totalLosses")}</Text>
              </View>
              <View style={[styles.recapPill, styles.recapPillTie]}>
                <FontAwesome name="handshake-o" size={12} color={theme.colors.reward} />
                <Text style={styles.recapPillValue}>{recapStats.totals.ties}</Text>
                <Text style={styles.recapPillLabel}>{t(locale, "totalTies")}</Text>
              </View>
            </View>
            <View style={styles.recapBar}>
              {recapTotal > 0 ? (
                <>
                  <View
                    style={[
                      styles.recapBarSegment,
                      styles.recapBarWin,
                      { flex: recapStats.totals.wins }
                    ]}
                  />
                  <View
                    style={[
                      styles.recapBarSegment,
                      styles.recapBarLoss,
                      { flex: recapStats.totals.losses }
                    ]}
                  />
                  <View
                    style={[
                      styles.recapBarSegment,
                      styles.recapBarTie,
                      { flex: recapStats.totals.ties }
                    ]}
                  />
                </>
              ) : (
                <View style={[styles.recapBarSegment, styles.recapBarEmpty]} />
              )}
            </View>
          <View style={styles.recapStreakRow}>
            <Text style={styles.recapStreakLabel}>{t(locale, "bestDailyStreak")}</Text>
            <View style={styles.recapStreakPill}>
              <Text style={styles.recapStreakPillText}>
                {dailyBestStreak > 0 ? dailyBestStreak : "—"}
              </Text>
            </View>
          </View>
            {recapStats.opponents.length > 0 ? (
              <View style={styles.opponentList}>
                <Text style={styles.recapMetaLabel}>{t(locale, "topRivals")}</Text>
                {recapStats.opponents.slice(0, 2).map((opponent) => (
                  <View key={opponent.opponentId} style={styles.opponentRow}>
                    <Text style={styles.opponentName}>
                      {t(locale, "vsLabel")} {opponent.opponentName}
                    </Text>
                    <View style={styles.opponentRecord}>
                      <View style={styles.recordItem}>
                        <FontAwesome name="trophy" size={12} color={theme.colors.success} />
                        <Text style={[styles.recordValue, styles.recordValueWin]}>
                          {opponent.wins}
                        </Text>
                      </View>
                      <View style={styles.recordItem}>
                        <FontAwesome name="times-circle" size={12} color={theme.colors.danger} />
                        <Text style={[styles.recordValue, styles.recordValueLoss]}>
                          {opponent.losses}
                        </Text>
                      </View>
                      <View style={styles.recordItem}>
                        <FontAwesome name="handshake-o" size={12} color={theme.colors.reward} />
                        <Text style={[styles.recordValue, styles.recordValueTie]}>
                          {opponent.ties}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
            </GlassCard>
          </Pressable>
        ) : null}

        {nextSession ? (
          <GlassCard style={[styles.introCard, styles.nextActionCard]}>
            <View style={styles.nextActionHeader}>
              <View style={styles.nextActionHeaderLeft}>
                <View style={styles.nextActionMiniAvatar}>
                  <Text style={styles.nextActionMiniAvatarText}>
                    {initials(nextOpponentName)}
                  </Text>
                </View>
                <Text style={styles.nextActionLabel}>{t(locale, "nextAction")}</Text>
              </View>
            </View>
            <View style={styles.nextActionHero}>
              <View style={styles.nextActionCopy}>
                <Text style={styles.nextActionTitle}>
                  {t(locale, "continueMatchVs", { name: nextOpponentName })}
                </Text>
                {nextMeta ? (
                  <Text style={styles.nextActionMeta}>
                    {nextMeta.category} · {nextMeta.progress} ·{" "}
                    <Text style={[styles.nextActionMeta, styles.nextActionMetaAhead]}>
                      {nextMeta.status}
                    </Text>
                  </Text>
                ) : null}
              </View>
            </View>
            {nextTotalQuestions ? (
              <View style={styles.nextActionProgress}>
                <View
                  style={[
                    styles.nextActionProgressFill,
                    { width: `${Math.min((nextMyProgress / Math.max(nextTotalQuestions, 1)) * 100, 100)}%` }
                  ]}
                />
              </View>
            ) : null}
            <View style={styles.nextActionButtons}>
              <PrimaryButton
                label={t(locale, "continueMatch")}
                icon="arrow-right"
                iconPosition="right"
                onPress={() => onResumeRoom(nextSession.code)}
                style={styles.nextActionPrimary}
              />
            </View>
          </GlassCard>
        ) : null}

        {showDailyCard ? (
          <GlassCard
            accent={theme.colors.reward}
            style={[styles.introCard, styles.dailyQuizCard, dailyCompleted && styles.dailyQuizCardCompact]}
          >
            <View style={styles.dailyQuizHeader}>
              <View style={styles.dailyQuizHeaderLeft}>
                <View style={styles.dailyQuizBadge}>
                  <FontAwesome name="calendar" size={12} color={theme.colors.reward} />
                </View>
                <Text style={styles.dailyQuizLabel}>{t(locale, "dailyQuizTitle")}</Text>
              </View>
              {!dailyCompleted ? (
                <Text style={styles.dailyQuizNew}>{t(locale, "dailyQuizNew")}</Text>
              ) : null}
            </View>

            {dailyCompleted ? (
              <View style={styles.dailyQuizCompactRow}>
                <View style={styles.dailyQuizCompactCopy}>
                  <Text style={styles.dailyQuizTitleCompact}>
                    {t(locale, "dailyQuizCompleted")}
                  </Text>
                  <Text style={styles.dailyQuizMetaCompact}>
                    {dailyPercentile !== null
                      ? t(locale, "dailyQuizPercentile", { percent: dailyPercentile })
                      : t(locale, "dailyQuizParticipants", { count: dailyResults?.participants ?? 0 })}
                  </Text>
                </View>
                <View style={styles.dailyQuizCompactAction}>
                  <Pressable
                    onPress={onOpenDailyResults}
                    style={({ pressed }) => [
                      styles.dailyQuizMiniButton,
                      pressed && styles.dailyQuizMiniButtonPressed,
                      (dailyLoading || !dailyResults) && styles.dailyQuizMiniButtonDisabled
                    ]}
                    disabled={dailyLoading || !dailyResults}
                  >
                    <Text style={styles.dailyQuizMiniButtonText}>
                      {t(locale, "dailyQuizResultsShort")}
                    </Text>
                    <FontAwesome name="chevron-right" size={12} color={theme.colors.reward} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.dailyQuizHero}>
                  <Text style={styles.nextActionTitle}>{t(locale, "dailyQuizSubtitle")}</Text>
                  <Text style={styles.dailyQuizMeta}>{dailyProgressLabel}</Text>
                </View>
                <View style={styles.dailyQuizProgress}>
                  <View
                    style={[
                      styles.dailyQuizProgressFill,
                      { width: `${Math.min(dailyProgressRatio * 100, 100)}%` }
                    ]}
                  />
                </View>
                <View style={styles.dailyQuizButtons}>
                  <PrimaryButton
                    label={dailyActionLabel}
                    icon="arrow-right"
                    iconPosition="right"
                    onPress={handleDailyPress}
                    style={styles.dailyQuizPrimary}
                    disabled={dailyLoading || !dailyQuiz}
                  />
                </View>
              </>
            )}
          </GlassCard>
        ) : null}

        {remainingSessions.length > 0 ? (
          <GlassCard style={styles.introCard}>
            <View style={styles.sectionHeading}>
              <View style={[styles.sectionIcon, styles.sectionIconPrimary]}>
                <FontAwesome name="play-circle" size={18} color={theme.colors.ink} />
              </View>
              <Text style={styles.sectionTitle}>{t(locale, "ongoingMatches")}</Text>
            </View>
            {remainingSessions
              .slice(0, 3)
              .map((session, index, array) => {
                const opponent = session.players.find((p) => p.id !== userId);
                const totalQuestions = session.quiz.questions?.length ?? 0;
                const myProgress = session.progress?.[String(userId)] ?? 0;
                const opponentProgress = opponent
                  ? session.progress?.[String(opponent.id)] ?? 0
                  : 0;
                const isAsyncDual = session.mode === "async" && session.players.length > 1;
                const isWaitingForOpponent =
                  (session.mode === "sync" &&
                    myProgress > opponentProgress &&
                    myProgress < totalQuestions) ||
                  (isAsyncDual &&
                    myProgress >= totalQuestions &&
                    opponentProgress < totalQuestions);
                const canContinue =
                  session.mode === "sync"
                    ? !isWaitingForOpponent && myProgress < totalQuestions
                    : myProgress < totalQuestions;
                const isLast = index === array.length - 1;
                return (
                  <Pressable
                    key={session.code}
                    onPress={() => {
                      onResumeRoom(session.code);
                    }}
                  >
                  <View
                    style={[
                      styles.sessionCard,
                      !canContinue && styles.sessionCardDisabled,
                      isLast && styles.sessionCardLast
                    ]}
                  >
                    <View style={styles.sessionHeader}>
                      <View>
                        <Text style={styles.sessionTitle}>{session.quiz.title}</Text>
                        <Text style={styles.sessionSubtitle}>
                          {t(locale, "withOpponent")} {opponent?.displayName ?? "-"}
                        </Text>
                        <Text style={styles.sessionMetaSubtle}>
                          {session.mode === "sync" ? t(locale, "syncLabel") : t(locale, "asyncLabel")} •{" "}
                          {totalQuestions} {t(locale, "questionsLabel")}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.sessionFooter}>
                      {isWaitingForOpponent ? (
                        <View style={styles.sessionMetaRow}>
                          <Text style={styles.sessionMeta}>{t(locale, "waitingOpponent")}</Text>
                          <FontAwesome name="angle-right" size={12} color={theme.colors.muted} />
                        </View>
                      ) : (
                        <Text style={styles.sessionMeta}>
                          {myProgress} {t(locale, "questionsLabel")} / {totalQuestions}
                        </Text>
                      )}
                      {canContinue ? (
                        <Animated.View
                          style={[
                            styles.ctaPill,
                            styles.ctaPrimary,
                            {
                              transform: [
                                {
                                  scale: continuePulse.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, 1.03]
                                  })
                                }
                              ],
                              opacity: continuePulse.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 0.92]
                              })
                            }
                          ]}
                        >
                          <Text style={styles.ctaText}>{t(locale, "continueMatch")}</Text>
                          <FontAwesome name="arrow-right" size={12} color={theme.colors.ink} />
                        </Animated.View>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
                );
              })}
          </GlassCard>
        ) : null}

        {sessions.filter((s) => s.status === "complete" && s.rematchReady?.length && !s.rematchReady?.includes(userId)).length > 0 ? (
          <GlassCard style={styles.introCard}>
            <View style={styles.sectionHeading}>
              <View style={[styles.sectionIcon, styles.sectionIconAccent]}>
                <FontAwesome name="refresh" size={18} color={theme.colors.ink} />
              </View>
              <Text style={styles.sectionTitle}>{t(locale, "rematchRequested")}</Text>
            </View>
            {sessions
              .filter((s) => s.status === "complete" && s.rematchReady?.length && !s.rematchReady?.includes(userId))
              .slice(0, 3)
              .map((session, index, array) => {
                const isLast = index === array.length - 1;
                const rematchByYou = session.rematchReady?.includes(userId);
                const rematchByOpponent = !rematchByYou;
                const opponent = session.players.find((p) => p.id !== userId);
                return (
                  <Pressable
                    key={session.code}
                    onPress={() => onOpenRecap(session.code)}
                  >
                    <View style={[styles.sessionCard, isLast && styles.sessionCardLast]}>
                      <View style={styles.sessionHeader}>
                        <View>
                          <Text style={styles.sessionTitle}>{session.quiz.title}</Text>
                          <Text style={styles.sessionSubtitle}>
                            {t(locale, "withOpponent")} {opponent?.displayName ?? "-"}
                          </Text>
                        </View>
                        <View style={[styles.ctaPill, styles.ctaPrimary]}>
                          <Text style={styles.ctaText}>{t(locale, "replayLabel")}</Text>
                          <FontAwesome name="play" size={12} color={theme.colors.ink} />
                        </View>
                      </View>
                      <View style={styles.sessionFooter}>
                        <Text style={styles.rematchNote}>
                          {rematchByOpponent ? t(locale, "rematchByOpponent") : t(locale, "rematchByYou")}
                        </Text>
                        <FontAwesome name="angle-right" size={18} color={theme.colors.muted} />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
          </GlassCard>
        ) : null}

        {tips.length ? (
          <View style={styles.didYouKnow}>
            <Text style={styles.didYouKnowEmoji}>🦊</Text>
            <Text style={styles.didYouKnowText}>
              {t(locale, "didYouKnowLabel")} {tips[tipIndex % tips.length]}
            </Text>
          </View>
        ) : null}

        <GlassCard style={styles.shareCard}>
          <View style={styles.shareRow}>
            <View style={styles.shareTextBlock}>
              <Text style={styles.shareTitle}>Share the app!</Text>
              <Text style={styles.shareSubtitle}>Scan to download and play together.</Text>
            </View>
            <View style={styles.shareArrowWrap}>
              <FontAwesome name="long-arrow-right" size={20} color={theme.colors.muted} />
            </View>
            <View style={styles.qrWrap}>
              <Image source={require("../../assets/qrcode.png")} style={styles.qrImage} />
            </View>
          </View>
        </GlassCard>

        {sessions.filter((s) => s.status === "complete").length > 0 ? (
          <GlassCard style={styles.introCard}>
            <View style={styles.sectionHeading}>
              <View style={[styles.sectionIcon, styles.sectionIconMuted]}>
                <FontAwesome name="history" size={18} color={theme.colors.ink} />
              </View>
              <Text style={styles.sectionTitle}>{t(locale, "recentMatches")}</Text>
            </View>
            {sessions
              .filter((s) => s.status === "complete")
              .slice(0, 5)
              .map((session, index, array) => {
                const totalQuestions = session.quiz.questions?.length ?? 0;
                const myScore = session.scores?.[String(userId)];
                const opponent = session.players.find((p) => p.id !== userId);
                const opponentScore = opponent ? session.scores?.[String(opponent.id)] : undefined;
                const rematchByYou = session.rematchReady?.includes(userId);
                const resultLabel =
                  myScore !== undefined && opponentScore !== undefined
                    ? myScore > opponentScore
                      ? t(locale, "wonLabel")
                      : myScore < opponentScore
                        ? t(locale, "lostLabel")
                        : t(locale, "youTied")
                    : null;
                const isLast = index === array.length - 1;
                const resultStyle =
                  resultLabel === t(locale, "lostLabel")
                    ? styles.statusChipLost
                    : resultLabel === t(locale, "wonLabel")
                      ? styles.statusChipComplete
                      : styles.statusChipWait;
                const resultIcon =
                  resultLabel === t(locale, "lostLabel")
                    ? "times-circle"
                    : resultLabel === t(locale, "wonLabel")
                      ? "trophy"
                      : "handshake-o";
                const resultIconColor =
                  resultLabel === t(locale, "lostLabel")
                    ? theme.colors.danger
                    : resultLabel === t(locale, "wonLabel")
                      ? theme.colors.success
                      : theme.colors.reward;
                return (
                  <Pressable
                    key={session.code}
                    onPress={() => onOpenRecap(session.code)}
                  >
                    <View style={[styles.sessionCard, isLast && styles.sessionCardLast]}>
                      <View style={styles.sessionHeader}>
                        <View>
                          <Text style={styles.sessionTitle}>{session.quiz.title}</Text>
                          <Text style={styles.sessionSubtitle}>
                            {t(locale, "withOpponent")} {opponent?.displayName ?? "-"}
                          </Text>
                          <Text style={styles.sessionMetaSubtle}>
                            {session.mode === "sync" ? t(locale, "syncLabel") : t(locale, "asyncLabel")} •{" "}
                            {myScore !== undefined ? `${myScore} / ${totalQuestions}` : `0 / ${totalQuestions}`}{" "}
                            {t(locale, "questionsLabel")}
                          </Text>
                        </View>
                        {resultLabel ? (
                          <View style={styles.badgeRow}>
                            {rematchByYou ? (
                              <View style={[styles.statusChip, styles.statusChipRematch, styles.statusChipRound]}>
                                <FontAwesome name="refresh" size={10} color={theme.colors.ink} />
                              </View>
                            ) : null}
                            <View style={[styles.statusChip, resultStyle]}>
                              <FontAwesome name={resultIcon} size={10} color={resultIconColor} />
                              <Text style={styles.statusChipText}>{resultLabel}</Text>
                            </View>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.sessionFooter}>
                        <Text style={styles.sessionMeta}>{t(locale, "reviewMatch")}</Text>
                        <FontAwesome name="angle-right" size={18} color={theme.colors.muted} />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
          </GlassCard>
        ) : (
          <GlassCard style={styles.introCard}>
            <View style={styles.sectionHeading}>
              <View style={[styles.sectionIcon, styles.sectionIconMuted]}>
                <FontAwesome name="history" size={18} color={theme.colors.ink} />
              </View>
              <Text style={styles.sectionTitle}>{t(locale, "recentMatches")}</Text>
            </View>
            <Text style={styles.sectionSubtitle}>{t(locale, "noMatches")}</Text>
          </GlassCard>
        )}

      </ScrollView>

      <Animated.View style={[styles.fabWrap, { bottom: theme.spacing.sm + insets.bottom }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.fabPulse,
            {
              transform: [
                { translateX: -90 },
                { translateY: -32 },
                {
                  scale: continuePulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1.2]
                  })
                }
              ],
              opacity: continuePulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 0]
              })
            }
          ]}
        />
        <Pressable
          style={styles.fab}
          onPress={() => {
            Haptics.selectionAsync();
            setIsDialogOpen(true);
          }}
        >
          <FontAwesome name="plus" size={14} color={theme.colors.surface} />
          <Text style={styles.fabLabel}>{t(locale, "newMatch")}</Text>
        </Pressable>
      </Animated.View>

      <Modal
        transparent
        visible={isDialogOpen}
        animationType="fade"
        onRequestClose={() => setIsDialogOpen(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => {
            setIsDialogOpen(false);
            setDialogStep("menu");
            setPickStep("category");
          }}
        >
          <Pressable onPress={() => {}} style={styles.dialogTouch}>
            <Animated.View
              onStartShouldSetResponder={() => true}
              style={[
                styles.dialog,
                styles.dialogGlow,
                {
                  opacity: dialogOpacity,
                  transform: [{ scale: dialogScale }],
                  maxHeight: dialogMaxHeight
                }
              ]}
            >
            {dialogStep === "menu" ? (
              <>
                <Pressable
                  style={styles.dialogClose}
                  hitSlop={8}
                  onPress={() => {
                    setIsDialogOpen(false);
                    setDialogStep("menu");
                    setPickStep("category");
                  }}
                >
                  <FontAwesome name="times" size={12} color={theme.colors.muted} />
                </Pressable>
                <Text style={styles.dialogTitle}>{t(locale, "createAction")}</Text>
                <Text style={styles.dialogSubtitle}>{t(locale, "createGuideSubtitle")}</Text>
                <PrimaryButton
                  label={t(locale, "newMatch")}
                  icon="plus"
                  iconPosition="right"
                  onPress={() => {
                    Haptics.selectionAsync();
                    setDialogStep("pick");
                    setPickStep("category");
                  }}
                />
                <PrimaryButton
                  label={t(locale, "joinWithInvite")}
                  icon="ticket"
                  iconPosition="right"
                  style={styles.joinButton}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setDialogStep("join");
                  }}
                />
                <Text style={styles.joinHint}>{t(locale, "joinInviteHint")}</Text>
              </>
            ) : dialogStep === "pick" ? (
              <>
                <View style={styles.dialogHeaderCentered}>
                  <Text style={styles.dialogTitle}>{t(locale, "newMatch")}</Text>
                </View>
                {pickStep === "category" ? (
                  <View style={styles.dialogSection}>
                    <View style={styles.dialogSectionHeader}>
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>1</Text>
                      </View>
                      <View style={styles.dialogSectionText}>
                        <Text style={styles.dialogSectionTitle}>{t(locale, "chooseCategory")}</Text>
                        <Text style={styles.dialogSectionBody}>
                          {t(locale, "chooseCategoryBody")}
                        </Text>
                      </View>
                    </View>
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      style={[styles.dialogScroll, { maxHeight: dialogListMaxHeight }]}
                      contentContainerStyle={styles.dialogScrollContent}
                    >
                      <View style={styles.categoryGrid}>
                        {categories.map((category) => {
                          const isSelected = selectedCategoryId === category.id;
                          return (
                            <Pressable
                              key={category.id}
                              onPress={() => {
                                Haptics.selectionAsync();
                                setSelectedCategoryId(category.id);
                              }}
                            >
                              <View
                                style={[
                                  styles.categoryChip,
                                  isSelected && styles.categoryChipSelected
                                ]}
                              >
                                <View
                                  style={[
                                    styles.categoryDot,
                                    { backgroundColor: category.accent }
                                  ]}
                                />
                                <Text
                                  style={[
                                    styles.categoryLabel,
                                    isSelected && styles.categoryLabelSelected
                                  ]}
                                >
                                  {category.label}
                                </Text>
                                <View style={styles.categoryChevron}>
                                  <FontAwesome
                                    name="angle-right"
                                    size={14}
                                    color={theme.colors.muted}
                                  />
                                </View>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollView>
                    <View style={styles.dialogFooter}>
                      <PrimaryButton
                        label={t(locale, "continue")}
                        icon="arrow-right"
                        iconPosition="right"
                        onPress={() => {
                          if (!selectedCategoryId) return;
                          Haptics.selectionAsync();
                          setPickStep("count");
                        }}
                        style={!selectedCategoryId ? styles.buttonDisabled : undefined}
                      />
                      <PrimaryButton
                        label={t(locale, "back")}
                        variant="ghost"
                        icon="arrow-left"
                        onPress={() => {
                          Haptics.selectionAsync();
                          setDialogStep("menu");
                          setPickStep("category");
                        }}
                      />
                    </View>
                  </View>
                ) : pickStep === "count" ? (
                  <View style={styles.dialogSection}>
                  <View style={styles.dialogSectionHeader}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>2</Text>
                    </View>
                    <View style={styles.dialogSectionText}>
                      <Text style={styles.dialogSectionTitle}>
                        {t(locale, "chooseMatchLength")}
                      </Text>
                      <Text style={styles.dialogSectionBody}>
                        {t(locale, "chooseMatchLengthBody")}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.lengthGrid}>
                    {lengthOptions.map((option) => {
                      const isSelected = selectedQuestionCount === option.count;
                      return (
                        <Pressable
                          key={option.key}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setSelectedQuestionCount(option.count);
                          }}
                        >
                          <View
                            style={[
                              styles.lengthCard,
                              isSelected && styles.choiceCardSelected
                            ]}
                          >
                            <View style={styles.lengthHeader}>
                              <Text
                                style={[
                                  styles.lengthTitle,
                                  isSelected && styles.lengthTitleSelected
                                ]}
                              >
                                {option.label}
                              </Text>
                              <View
                                style={[
                                  styles.selectedPill,
                                  isSelected && styles.selectedPillActive,
                                  !isSelected && styles.selectedPillHidden
                                ]}
                              >
                                {isSelected ? (
                                  <FontAwesome
                                    name="check"
                                    size={10}
                                    color={theme.colors.ink}
                                  />
                                ) : null}
                              </View>
                            </View>
                            <Text style={styles.lengthBody}>{option.description}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.dialogFooter}>
                    <PrimaryButton
                      label={t(locale, "continue")}
                      icon="arrow-right"
                      iconPosition="right"
                      onPress={() => {
                        if (!selectedCategoryId || !selectedQuestionCount) return;
                        Haptics.selectionAsync();
                        setPickStep("mode");
                      }}
                      style={
                        !selectedCategoryId || !selectedQuestionCount
                          ? styles.buttonDisabled
                          : undefined
                      }
                    />
                    <PrimaryButton
                      label={t(locale, "back")}
                      variant="ghost"
                      icon="arrow-left"
                      onPress={() => {
                        Haptics.selectionAsync();
                        setPickStep("category");
                      }}
                    />
                  </View>
                </View>
                ) : pickStep === "mode" ? (
                  <View style={styles.dialogSection}>
                    <View style={styles.dialogSectionHeader}>
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>3</Text>
                      </View>
                      <View style={styles.dialogSectionText}>
                        <Text style={styles.dialogSectionTitle}>{t(locale, "duelFormat")}</Text>
                        <Text style={styles.dialogSectionBody}>{t(locale, "duelFormatBody")}</Text>
                      </View>
                    </View>
                    <View style={styles.modeGrid}>
                      <Pressable
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSelectedMode("async");
                        }}
                      >
                          <View
                            style={[
                              styles.modeCard,
                              selectedMode === "async" && styles.choiceCardSelected
                            ]}
                          >
                          <View style={styles.modeHeader}>
                            <Text style={styles.modeTitle}>{t(locale, "asyncDuel")}</Text>
                            <View
                              style={[
                                styles.selectedPill,
                                selectedMode === "async" && styles.selectedPillActive,
                                selectedMode !== "async" && styles.selectedPillHidden
                              ]}
                            >
                              {selectedMode === "async" ? (
                                <FontAwesome name="check" size={10} color={theme.colors.ink} />
                              ) : null}
                            </View>
                          </View>
                          <Text style={styles.modeBody}>{t(locale, "asyncDuelBody")}</Text>
                        </View>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSelectedMode("sync");
                        }}
                      >
                          <View
                            style={[
                              styles.modeCard,
                              selectedMode === "sync" && styles.choiceCardSelected
                            ]}
                          >
                          <View style={styles.modeHeader}>
                            <Text style={styles.modeTitle}>{t(locale, "syncDuel")}</Text>
                            <View
                              style={[
                                styles.selectedPill,
                                selectedMode === "sync" && styles.selectedPillActive,
                                selectedMode !== "sync" && styles.selectedPillHidden
                              ]}
                            >
                              {selectedMode === "sync" ? (
                                <FontAwesome name="check" size={10} color={theme.colors.ink} />
                              ) : null}
                            </View>
                          </View>
                          <Text style={styles.modeBody}>{t(locale, "syncDuelBody")}</Text>
                        </View>
                      </Pressable>
                    </View>
                    <View style={styles.dialogFooter}>
                      <PrimaryButton
                        label={t(locale, "createRoom")}
                        icon="plus"
                        iconPosition="right"
                        onPress={() => {
                          if (!selectedCategoryId || !selectedQuestionCount) return;
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          onCreateRoom(selectedCategoryId, selectedQuestionCount, selectedMode);
                          setIsDialogOpen(false);
                          setDialogStep("menu");
                          setPickStep("category");
                        }}
                        style={
                          !selectedCategoryId || !selectedQuestionCount
                            ? styles.buttonDisabled
                            : undefined
                        }
                      />
                      <PrimaryButton
                        label={t(locale, "back")}
                        variant="ghost"
                        icon="arrow-left"
                        onPress={() => {
                          Haptics.selectionAsync();
                          setPickStep("count");
                        }}
                      />
                    </View>
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <Pressable
                  style={styles.dialogClose}
                  hitSlop={8}
                  onPress={() => {
                    setIsDialogOpen(false);
                    setDialogStep("menu");
                    setPickStep("category");
                  }}
                >
                  <FontAwesome name="times" size={12} color={theme.colors.muted} />
                </Pressable>
                <View style={styles.dialogHeader}>
                  <Text style={styles.dialogTitle}>{t(locale, "joinAction")}</Text>
                </View>
                <InputField
                  label={t(locale, "roomCode")}
                  value={code}
                  onChangeText={(value) => setCode(value.toUpperCase())}
                  placeholder="ABCDE"
                  autoCapitalize="characters"
                />
                <PrimaryButton
                  label={t(locale, "joinRoomShort")}
                  icon="ticket"
                  iconPosition="right"
                  style={styles.joinButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onJoinRoom(code);
                    setIsDialogOpen(false);
                    setDialogStep("menu");
                  }}
                />
                <PrimaryButton
                  label={t(locale, "back")}
                  variant="ghost"
                  icon="arrow-left"
                  onPress={() => {
                    Haptics.selectionAsync();
                    setDialogStep("menu");
                  }}
                />
              </>
            )}
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1
  },
  backgroundOrb: {
    position: "absolute",
    top: -220,
    right: -160,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(94, 124, 255, 0.08)"
  },
  backgroundOrbAccent: {
    position: "absolute",
    bottom: -220,
    left: -160,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(46, 196, 182, 0.08)"
  },
  backgroundGlow: {
    position: "absolute",
    top: "38%",
    alignSelf: "center",
    width: 440,
    height: 440,
    borderRadius: 220,
    backgroundColor: "rgba(255, 255, 255, 0.55)"
  },
  backgroundSweep: {
    ...StyleSheet.absoluteFillObject
  },
  backgroundGlass: {
    position: "absolute",
    top: 120,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
    transform: [{ rotate: "12deg" }],
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)"
  },
  container: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  accountButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(11, 14, 20, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.08)"
  },
  accountInitials: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "700"
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
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
  introCard: {
    gap: theme.spacing.sm
  },
  sectionTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.08)"
  },
  sectionIconPrimary: {
    backgroundColor: "rgba(94, 124, 255, 0.12)"
  },
  sectionIconAccent: {
    backgroundColor: "rgba(243, 183, 78, 0.18)"
  },
  sectionIconMuted: {
    backgroundColor: "rgba(11, 14, 20, 0.06)"
  },
  sectionSubtitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  didYouKnow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.08)"
  },
  didYouKnowEmoji: {
    fontSize: 18
  },
  didYouKnowText: {
    flex: 1,
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    lineHeight: 18
  },
  shareCard: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg
  },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md
  },
  shareTextBlock: {
    flex: 1
  },
  shareTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  shareSubtitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    marginTop: theme.spacing.xs
  },
  shareArrowWrap: {
    paddingHorizontal: theme.spacing.xs
  },
  qrWrap: {
    width: 76,
    height: 76,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  qrImage: {
    width: 64,
    height: 64,
    borderRadius: 12
  },
  recapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  recapHeaderText: {
    flex: 1,
    paddingRight: theme.spacing.sm
  },
  recapTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  recapHeaderAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  recapHeaderActionText: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    lineHeight: 16
  },
  recapRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  recapStatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  recapCard: {
    backgroundColor: "rgba(94, 124, 255, 0.12)",
    borderColor: "rgba(94, 124, 255, 0.28)",
    shadowColor: "rgba(94, 124, 255, 0.32)",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 6
  },
  nextActionCard: {
    borderColor: "rgba(94, 124, 255, 0.18)",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    padding: theme.spacing.md
  },
  nextActionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  nextActionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  nextActionLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    textTransform: "uppercase",
    letterSpacing: 1.1
  },
  nextActionMiniAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(94, 124, 255, 0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(94, 124, 255, 0.25)"
  },
  nextActionMiniAvatarText: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 10,
    fontWeight: "700"
  },
  nextActionHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  nextActionCopy: {
    flex: 1,
    gap: 4
  },
  nextActionTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: "600"
  },
  nextActionMeta: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    lineHeight: 16
  },
  nextActionMetaAhead: {
    color: theme.colors.success,
    fontWeight: "600"
  },
  nextActionMetaBehind: {
    color: theme.colors.danger,
    fontWeight: "600"
  },
  nextActionMetaTied: {
    color: theme.colors.reward,
    fontWeight: "600"
  },
  nextActionProgress: {
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(11, 14, 20, 0.08)",
    overflow: "hidden",
    marginTop: theme.spacing.xs
  },
  nextActionProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.primary
  },
  nextActionButtons: {
    marginTop: theme.spacing.xs,
    gap: theme.spacing.sm
  },
  nextActionPrimary: {
    width: "100%",
    paddingVertical: 12,
    minHeight: 40
  },
  nextActionSecondary: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs
  },
  nextActionSecondaryPressed: {
    opacity: 0.7
  },
  nextActionSecondaryText: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  dailyQuizCard: {
    borderColor: "rgba(243, 183, 78, 0.22)",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    padding: theme.spacing.md,
    gap: theme.spacing.xs
  },
  dailyQuizCardCompact: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md
  },
  dailyQuizHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  dailyQuizHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  dailyQuizBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(243, 183, 78, 0.2)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(243, 183, 78, 0.35)"
  },
  dailyQuizLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    textTransform: "uppercase",
    letterSpacing: 1.1
  },
  dailyQuizNew: {
    color: theme.colors.reward,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  dailyQuizHero: {
    marginTop: theme.spacing.xs,
    gap: 4
  },
  dailyQuizTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  dailyQuizMeta: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  dailyQuizProgress: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(11, 14, 20, 0.08)",
    overflow: "hidden",
    marginTop: theme.spacing.xs
  },
  dailyQuizProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.reward
  },
  dailyQuizCompleted: {
    marginTop: theme.spacing.xs,
    color: theme.colors.success,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  dailyQuizButtons: {
    marginTop: theme.spacing.xs
  },
  dailyQuizPrimary: {
    width: "100%",
    backgroundColor: theme.colors.reward
  },
  dailyQuizCompactRow: {
    marginTop: theme.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm
  },
  dailyQuizCompactCopy: {
    flex: 1,
    paddingRight: theme.spacing.sm
  },
  dailyQuizCompactAction: {
    alignItems: "flex-end",
    justifyContent: "center"
  },
  dailyQuizTitleCompact: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  dailyQuizMetaCompact: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  dailyQuizMiniButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(243, 183, 78, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(243, 183, 78, 0.4)",
    minWidth: 96,
    justifyContent: "center"
  },
  dailyQuizMiniButtonText: {
    color: theme.colors.reward,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  dailyQuizMiniButtonPressed: {
    opacity: 0.7
  },
  dailyQuizMiniButtonDisabled: {
    opacity: 0.5
  },
  recapPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)"
  },
  recapPillWin: {
    borderColor: "rgba(43, 158, 102, 0.3)"
  },
  recapPillLoss: {
    borderColor: "rgba(235, 87, 87, 0.3)"
  },
  recapPillTie: {
    borderColor: "rgba(243, 183, 78, 0.3)"
  },
  recapPillValue: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "700"
  },
  recapPillLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: 12
  },
  recapBar: {
    flexDirection: "row",
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(11, 14, 20, 0.08)",
    overflow: "hidden",
    marginTop: theme.spacing.xs
  },
  recapBarSegment: {
    height: "100%"
  },
  recapBarWin: {
    backgroundColor: "rgba(43, 158, 102, 0.5)"
  },
  recapBarLoss: {
    backgroundColor: "rgba(235, 87, 87, 0.5)"
  },
  recapBarTie: {
    backgroundColor: "rgba(243, 183, 78, 0.5)"
  },
  recapBarEmpty: {
    backgroundColor: "rgba(11, 14, 20, 0.08)",
    flex: 1
  },
  recapStreakRow: {
    marginTop: theme.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  recapStreakLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  recapStreakPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(243, 183, 78, 0.24)",
    borderWidth: 1,
    borderColor: "rgba(243, 183, 78, 0.55)"
  },
  recapStreakPillText: {
    color: "#7A5A1F",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  categoryGrid: {
    gap: theme.spacing.sm
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    width: "100%",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.12)",
    backgroundColor: "rgba(255, 255, 255, 0.9)"
  },
  categoryChipSelected: {
    borderColor: "rgba(11, 14, 20, 0.35)",
    backgroundColor: "rgba(11, 14, 20, 0.03)"
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 999
  },
  categoryLabel: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  categoryLabelSelected: {
    color: theme.colors.ink
  },
  selectedPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11, 14, 20, 0.08)",
    marginLeft: "auto",
    marginRight: 6
  },
  selectedPillActive: {
    backgroundColor: "rgba(94, 124, 255, 0.18)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(94, 124, 255, 0.35)"
  },
  selectedPillHidden: {
    opacity: 0
  },
  categoryChevron: {
    marginLeft: "auto"
  },
  lengthGrid: {
    gap: theme.spacing.sm
  },
  lengthCard: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    width: "100%",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.12)",
    backgroundColor: "rgba(255, 255, 255, 0.9)"
  },
  lengthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  lengthTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  lengthBody: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    marginTop: 4
  },
  lengthTitleSelected: {
    color: theme.colors.ink
  },
  modeGrid: {
    gap: theme.spacing.sm
  },
  modeCard: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    width: "100%",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.12)",
    backgroundColor: "rgba(255, 255, 255, 0.9)"
  },
  choiceCardSelected: {
    borderColor: "rgba(94, 124, 255, 0.4)",
    backgroundColor: "rgba(94, 124, 255, 0.08)",
    shadowColor: "rgba(94, 124, 255, 0.25)",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  modeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  modeTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  modeBody: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    marginTop: 4
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
  joinButton: {
    backgroundColor: theme.colors.secondary
  },
  buttonDisabled: {
    opacity: 0.6
  },
  sessionTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  sessionSubtitle: {
    color: "rgba(11, 14, 20, 0.58)",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  sessionStatus: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  recapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  recapItem: {
    minWidth: 92,
    backgroundColor: "rgba(11, 14, 20, 0.04)",
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.08)"
  },
  recapValue: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 24,
    fontWeight: "600"
  },
  recapLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  opponentList: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs
  },
  recapMetaLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  opponentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  opponentName: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  opponentRecord: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  recordItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  recordValue: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  recordValueWin: {
    color: theme.colors.success,
    fontWeight: "600"
  },
  recordValueLoss: {
    color: theme.colors.danger,
    fontWeight: "600"
  },
  recordValueTie: {
    color: theme.colors.reward,
    fontWeight: "600"
  },
  sessionCard: {
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15, 23, 42, 0.12)"
  },
  sessionCardLast: {
    borderBottomWidth: 0
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  sessionBadge: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 26,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.12)",
    backgroundColor: "rgba(11, 14, 20, 0.05)"
  },
  statusChipText: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  statusChipOngoing: {
    backgroundColor: "rgba(94, 124, 255, 0.12)",
    borderColor: "rgba(94, 124, 255, 0.35)"
  },
  statusChipTurn: {
    backgroundColor: "rgba(46, 196, 182, 0.16)",
    borderColor: "rgba(46, 196, 182, 0.4)"
  },
  statusChipWait: {
    backgroundColor: "rgba(11, 14, 20, 0.04)",
    borderColor: "rgba(11, 14, 20, 0.12)"
  },
  statusChipComplete: {
    backgroundColor: "rgba(43, 158, 102, 0.14)",
    borderColor: "rgba(43, 158, 102, 0.35)"
  },
  statusChipLost: {
    backgroundColor: "rgba(235, 87, 87, 0.14)",
    borderColor: "rgba(235, 87, 87, 0.35)"
  },
  statusChipRematch: {
    backgroundColor: "rgba(243, 183, 78, 0.18)",
    borderColor: "rgba(243, 183, 78, 0.45)"
  },
  statusChipRound: {
    width: 26,
    height: 26,
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: "center"
  },
  ctaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(11, 14, 20, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.12)"
  },
  ctaPrimary: {
    backgroundColor: "rgba(61, 79, 219, 0.14)",
    borderColor: "rgba(61, 79, 219, 0.4)"
  },
  ctaDisabled: {
    backgroundColor: "rgba(11, 14, 20, 0.04)",
    borderColor: "rgba(11, 14, 20, 0.08)"
  },
  ctaText: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  rematchNote: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  sessionFooter: {
    marginTop: theme.spacing.xs,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sessionMeta: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  sessionMetaSubtle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    opacity: 0.85,
    marginTop: 2
  },
  sessionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  sessionCardDisabled: {
    opacity: 0.6
  },
  fab: {
    minWidth: 160,
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 26,
    backgroundColor: theme.colors.cta,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 }
  },
  fabPulse: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 180,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(94, 124, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(94, 124, 255, 0.32)"
  },
  fabLabel: {
    color: theme.colors.surface,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.medium,
    fontWeight: "600",
    letterSpacing: 0.2
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 17, 24, 0.35)",
    justifyContent: "center",
    padding: theme.spacing.xl
  },
  dialogTouch: {
    alignSelf: "stretch"
  },
  dialog: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 236, 0.7)",
    width: "100%"
  },
  dialogClose: {
    position: "absolute",
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11, 14, 20, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.08)"
  },
  dialogGlow: {
    shadowColor: theme.colors.champagneDeep,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 }
  },
  dialogTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  dialogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  dialogHeaderCentered: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.sm
  },
  dialogBack: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(11, 14, 20, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.08)"
  },
  dialogBackText: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  dialogSubtitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  joinHint: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    textAlign: "center",
    marginTop: -4
  },
  dialogDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs
  },
  dialogSection: {
    gap: theme.spacing.md,
    flexShrink: 1
  },
  dialogSectionHeader: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    alignItems: "center"
  },
  dialogSectionText: {
    flex: 1,
    minWidth: 0
  },
  dialogSectionTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600",
    flexShrink: 1
  },
  dialogSectionBody: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    lineHeight: 18,
    flexShrink: 1
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11, 14, 20, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.12)"
  },
  stepBadgeText: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  dialogScroll: {
    flexGrow: 0
  },
  dialogScrollContent: {
    paddingBottom: theme.spacing.xs
  },
  dialogFooter: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs
  },
  fabWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2
  },
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    zIndex: 1
  }
});
