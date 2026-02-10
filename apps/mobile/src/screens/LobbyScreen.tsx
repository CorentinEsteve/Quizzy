import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { GlassCard } from "../components/GlassCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { InputField } from "../components/InputField";
import { localizedCategoryLabel } from "../data/categories";
import {
  DailyQuizResults,
  DailyQuizStatus,
  LeaderboardResponse,
  QuizSummary,
  StatsResponse
} from "../data/types";

type Props = {
  quizzes: QuizSummary[];
  onCreateRoom: (categoryId: string, questionCount: number, mode: "sync" | "async") => void;
  onJoinRoom: (code: string) => void;
  onOpenAccount: () => void;
  onOpenPersonalLeaderboard: () => void;
  userName: string;
  locale: Locale;
  userId: number;
  leaderboardGlobal: LeaderboardResponse | null;
  sessions: {
    code: string;
    status: string;
    quiz: {
      title: string;
      subtitle: string;
      categoryId?: string;
      categoryLabel?: string;
      questions?: unknown[];
    };
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
};

const ALL_CATEGORY_ID = "all";
const ACCOUNT_SUN_PALETTE = [
  {
    background: "rgba(255, 188, 66, 0.22)",
    border: "rgba(245, 158, 11, 0.4)",
    core: "#FBBF24",
    ray: "#F59E0B",
    face: "#7C2D12"
  },
  {
    background: "rgba(251, 146, 60, 0.2)",
    border: "rgba(234, 88, 12, 0.36)",
    core: "#FB923C",
    ray: "#F97316",
    face: "#7C2D12"
  },
  {
    background: "rgba(250, 204, 21, 0.22)",
    border: "rgba(234, 179, 8, 0.4)",
    core: "#FACC15",
    ray: "#EAB308",
    face: "#713F12"
  },
  {
    background: "rgba(253, 186, 116, 0.24)",
    border: "rgba(249, 115, 22, 0.34)",
    core: "#FDBA74",
    ray: "#FB923C",
    face: "#7C2D12"
  },
  {
    background: "rgba(255, 215, 128, 0.24)",
    border: "rgba(245, 158, 11, 0.38)",
    core: "#FDE68A",
    ray: "#F59E0B",
    face: "#78350F"
  }
];
const SUN_RAY_COUNT = 10;

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
  leaderboardGlobal,
  sessions,
  onOpenRecap,
  onResumeRoom,
  recapStats: _recapStats,
  dailyQuiz,
  dailyResults,
  dailyLoading,
  onOpenDailyQuiz,
  onOpenDailyResults
}: Props) {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const [code, setCode] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isQrPreviewOpen, setIsQrPreviewOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number | null>(null);
  const [selectedMode, setSelectedMode] = useState<"sync" | "async">("async");
  const [dialogStep, setDialogStep] = useState<"pick" | "join">("pick");
  const [pickStep, setPickStep] = useState<"category" | "count" | "mode">("category");
  const dialogOpacity = useRef(new Animated.Value(0)).current;
  const dialogScale = useRef(new Animated.Value(0.96)).current;
  const continuePulse = useRef(new Animated.Value(0)).current;
  const mascotFloat = useRef(new Animated.Value(0)).current;
  const fabFloat = useRef(new Animated.Value(0)).current;
  const dialogMaxHeight = Math.min(
    height - insets.top - insets.bottom - theme.spacing.xl * 2,
    height * 0.88
  );
  const dialogListMaxHeight = Math.max(240, dialogMaxHeight - 240);
  const qrPreviewSize = Math.min(width - theme.spacing.xl * 2 - 32, 360);
  const accountSunStyle = useMemo(() => {
    const paletteIndex = Math.abs(userId) % ACCOUNT_SUN_PALETTE.length;
    return ACCOUNT_SUN_PALETTE[paletteIndex];
  }, [userId]);

  const categories = useMemo(() => {
    const map = new Map<string, { id: string; label: string; accent: string; questionCount: number }>();
    quizzes.forEach((quiz) => {
      if (!map.has(quiz.categoryId)) {
        map.set(quiz.categoryId, {
          id: quiz.categoryId,
          label: localizedCategoryLabel(locale, quiz.categoryId, quiz.categoryLabel),
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
  const topGlobalEntries = (leaderboardGlobal?.entries ?? []).slice(0, 3);
  const topGlobalPreview = Array.from({ length: 3 }, (_, index) => topGlobalEntries[index] ?? null);
  const myGlobalRank = leaderboardGlobal?.me?.rank ?? null;

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
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(mascotFloat, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(mascotFloat, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [mascotFloat]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(fabFloat, {
          toValue: 1,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(fabFloat, {
          toValue: 0,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [fabFloat]);

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
          category:
            nextSession.quiz.categoryId
              ? localizedCategoryLabel(
                  locale,
                  nextSession.quiz.categoryId,
                  nextSession.quiz.categoryLabel ?? t(locale, "allCategories")
                )
              : t(locale, "allCategories"),
          progress: `Q${Math.min(nextMyProgress, nextTotalQuestions)}/${Math.max(
            nextTotalQuestions,
            1
          )}`,
          status: nextStatus
        }
      : null;
  const mascotBob = mascotFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [4, -4]
  });
  const mascotGlow = mascotFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1]
  });
  const fabLift = fabFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4]
  });
  const fabIdleScale = fabFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.015]
  });

  const openCreateDialog = () => {
    Haptics.selectionAsync();
    setDialogStep("pick");
    setPickStep("category");
    setSelectedQuestionCount(null);
    setIsDialogOpen(true);
  };

  const openJoinDialog = () => {
    Haptics.selectionAsync();
    setDialogStep("join");
    setCode("");
    setIsDialogOpen(true);
  };

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
            <Pressable
              style={({ pressed }) => [
                styles.accountButton,
                {
                  backgroundColor: accountSunStyle.background,
                  borderColor: accountSunStyle.border
                },
                pressed && styles.accountButtonPressed
              ]}
              onPress={onOpenAccount}
              accessibilityRole="button"
              accessibilityLabel={locale === "fr" ? "Profil" : "Profile"}
            >
              <View style={styles.sunAvatar}>
                {Array.from({ length: SUN_RAY_COUNT }).map((_, index) => {
                  const angle = (Math.PI * 2 * index) / SUN_RAY_COUNT;
                  const x = Math.cos(angle) * 11;
                  const y = Math.sin(angle) * 11;
                  return (
                    <View
                      key={`sun-ray-${index}`}
                      style={[
                        styles.sunRay,
                        {
                          backgroundColor: accountSunStyle.ray,
                          transform: [{ translateX: x }, { translateY: y }]
                        }
                      ]}
                    />
                  );
                })}
                <View style={[styles.sunCore, { backgroundColor: accountSunStyle.core }]}>
                  <FontAwesome name="user" size={12} color={accountSunStyle.face} />
                </View>
              </View>
            </Pressable>
          </View>
        </View>

        <GlassCard style={styles.heroCard} accent={theme.colors.secondary}>
          <LinearGradient
            colors={[
              "rgba(78, 104, 255, 0.24)",
              "rgba(72, 207, 193, 0.2)",
              "rgba(255, 201, 128, 0.2)",
              "rgba(255, 255, 255, 0.9)"
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          />
          <View style={[styles.heroSparkle, styles.heroSparkleOne]} />
          <View style={[styles.heroSparkle, styles.heroSparkleTwo]} />
          <View style={[styles.heroSparkle, styles.heroSparkleThree]} />
          <View style={styles.heroTopRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroKicker}>Qwizzy</Text>
              <Text style={styles.heroTitle}>Quiz. Laugh. Rematch.</Text>
              <Text style={styles.heroBody}>{t(locale, "createGuideSubtitle")}</Text>
            </View>
            <Animated.View
              style={[
                styles.mascotWrap,
                {
                  transform: [{ translateY: mascotBob }],
                  opacity: mascotGlow
                }
              ]}
            >
              <View style={styles.mascotGlow} />
              <View style={styles.mascotBody}>
                <View style={styles.mascotForehead} />
                <View style={styles.mascotEyeRow}>
                  <View style={styles.mascotEye} />
                  <View style={styles.mascotEye} />
                </View>
                <View style={styles.mascotMuzzle}>
                  <View style={styles.mascotNose} />
                  <View style={styles.mascotMouthRow}>
                    <View style={[styles.mascotSmile, styles.mascotSmileLeft]} />
                    <View style={[styles.mascotSmile, styles.mascotSmileRight]} />
                  </View>
                </View>
              </View>
              <View style={styles.mascotEarLeft} />
              <View style={styles.mascotEarRight} />
              <View style={[styles.mascotEarInner, styles.mascotEarInnerLeft]} />
              <View style={[styles.mascotEarInner, styles.mascotEarInnerRight]} />
            </Animated.View>
          </View>
          <View style={styles.heroActions}>
            <PrimaryButton
              label={t(locale, "newMatch")}
              icon="bolt"
              iconPosition="right"
              onPress={openCreateDialog}
              style={styles.heroActionPrimary}
            />
            <PrimaryButton
              label={dailyCompleted ? t(locale, "dailyQuizResults") : t(locale, "dailyQuizTitle")}
              variant="ghost"
              icon="calendar"
              iconPosition="right"
              onPress={handleDailyPress}
              disabled={dailyLoading || !dailyQuiz}
              style={styles.heroActionSecondary}
            />
          </View>
        </GlassCard>

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
                  <Text style={styles.recapTitleText}>{t(locale, "topGlobal")}</Text>
                </View>
              </View>
              <View style={styles.recapHeaderAction}>
                <FontAwesome name="chevron-right" size={14} color={theme.colors.muted} />
              </View>
            </View>
            <View style={styles.recapTopList}>
              {topGlobalPreview.map((entry, index) => (
                <View key={entry ? `global-${entry.userId}` : `global-placeholder-${index}`} style={styles.recapTopRow}>
                  <View style={styles.recapTopBadge}>
                    <Text style={styles.recapTopBadgeText}>
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                    </Text>
                  </View>
                  <Text numberOfLines={1} style={styles.recapTopName}>
                    {entry?.displayName ?? (locale === "fr" ? "À venir" : "Coming soon")}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.recapYouRow}>
              <Text style={styles.recapYouLabel}>{locale === "fr" ? "Toi" : "You"}</Text>
              <View style={styles.recapYouPill}>
                <Text style={styles.recapYouRank}>
                  {myGlobalRank ? `#${myGlobalRank}` : "—"}
                </Text>
              </View>
            </View>
          </GlassCard>
        </Pressable>

        {nextSession ? (
          <GlassCard style={[styles.introCard, styles.nextActionCard]}>
            <LinearGradient
              colors={["rgba(94, 124, 255, 0.18)", "rgba(46, 196, 182, 0.1)", "rgba(255, 255, 255, 0.86)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextActionBackdrop}
            />
            <View style={styles.nextActionHeader}>
              <View style={styles.nextActionHeaderLeft}>
                <View style={styles.nextActionMiniAvatar}>
                  <Text style={styles.nextActionMiniAvatarText}>
                    {initials(nextOpponentName)}
                  </Text>
                </View>
                <Text style={styles.nextActionLabel}>{t(locale, "nextAction")}</Text>
              </View>
              <View style={styles.nextActionHeaderBadge}>
                <Text style={styles.nextActionHeaderBadgeText}>🎯</Text>
              </View>
            </View>
            <View style={styles.nextActionHero}>
              <View style={styles.nextActionCopy}>
                <Text style={styles.nextActionTitle}>
                  {t(locale, "continueMatchVs", { name: nextOpponentName })}
                </Text>
                {nextMeta ? (
                  <View style={styles.nextActionMetaRow}>
                    <Text style={styles.nextActionMeta}>{nextMeta.category}</Text>
                    <Text style={styles.nextActionMetaDot}>•</Text>
                    <Text style={styles.nextActionMeta}>{nextMeta.progress}</Text>
                    <View style={styles.nextActionTurnPill}>
                      <Text style={[styles.nextActionMeta, styles.nextActionMetaAhead]}>
                        {nextMeta.status}
                      </Text>
                    </View>
                  </View>
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

        <GlassCard style={styles.shareCard}>
          <LinearGradient
            colors={["rgba(94, 124, 255, 0.16)", "rgba(46, 196, 182, 0.1)", "rgba(255, 255, 255, 0.82)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shareCardBackdrop}
          />
          <View style={styles.shareRow}>
            <View style={styles.shareTextBlock}>
              <Text style={styles.shareTitle}>{t(locale, "shareAppTitle")}</Text>
              <Text style={styles.shareSubtitle}>{t(locale, "shareAppSubtitle")}</Text>
            </View>
            <View style={styles.shareArrowPill}>
              <FontAwesome name="arrow-right" size={13} color={theme.colors.primary} />
            </View>
            <Pressable
              style={styles.qrWrap}
              onPress={() => {
                Haptics.selectionAsync();
                setIsQrPreviewOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={t(locale, "shareAppTitle")}
              accessibilityHint={t(locale, "shareAppSubtitle")}
            >
              <Image source={require("../../assets/qrcode.png")} style={styles.qrImage} />
            </Pressable>
          </View>
        </GlassCard>

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
        ) : null}

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
        <Animated.View
          style={{
            transform: [{ translateY: fabLift }, { scale: fabIdleScale }]
          }}
        >
          <Pressable
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            onPress={openCreateDialog}
          >
            <FontAwesome name="plus" size={14} color={theme.colors.surface} />
            <Text style={styles.fabLabel}>{t(locale, "newMatch")}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
      <Pressable
        style={({ pressed }) => [
          styles.joinFab,
          { bottom: theme.spacing.sm + insets.bottom, right: theme.spacing.lg },
          pressed && styles.joinFabPressed
        ]}
        onPress={openJoinDialog}
        accessibilityRole="button"
        accessibilityLabel={locale === "fr" ? "Rejoindre" : "Join"}
        accessibilityHint={t(locale, "joinInviteHint")}
      >
        <FontAwesome name="bolt" size={16} color={theme.colors.surface} />
        <Text style={styles.joinFabText}>{locale === "fr" ? "Code" : "Join"}</Text>
      </Pressable>

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
            {dialogStep === "pick" ? (
              <>
                <Pressable
                  style={styles.dialogClose}
                  hitSlop={8}
                  onPress={() => {
                    setIsDialogOpen(false);
                  }}
                >
                  <FontAwesome name="times" size={12} color={theme.colors.muted} />
                </Pressable>
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
                          setIsDialogOpen(false);
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
                  }}
                />
                <PrimaryButton
                  label={t(locale, "back")}
                  variant="ghost"
                  icon="arrow-left"
                  onPress={() => {
                    setIsDialogOpen(false);
                  }}
                />
              </>
            )}
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={isQrPreviewOpen}
        animationType="fade"
        onRequestClose={() => setIsQrPreviewOpen(false)}
      >
        <Pressable
          style={styles.qrOverlay}
          onPress={() => {
            Haptics.selectionAsync();
            setIsQrPreviewOpen(false);
          }}
          accessibilityRole="button"
          accessibilityLabel={t(locale, "close")}
        >
          <Pressable onPress={() => {}} style={styles.qrDialogTouch}>
            <View style={styles.qrDialog}>
              <Text style={styles.qrDialogTitle}>{t(locale, "shareAppTitle")}</Text>
              <Text style={styles.qrDialogSubtitle}>{t(locale, "shareAppSubtitle")}</Text>
              <View style={styles.qrDialogFrame}>
                <Image
                  source={require("../../assets/qrcode.png")}
                  style={[styles.qrDialogImage, { width: qrPreviewSize, height: qrPreviewSize }]}
                />
              </View>
            </View>
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.4,
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3
  },
  accountButtonPressed: {
    transform: [{ scale: 0.97 }]
  },
  sunAvatar: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center"
  },
  sunRay: {
    position: "absolute",
    width: 3,
    height: 3,
    left: 13.5,
    top: 13.5,
    borderRadius: 1.5
  },
  sunCore: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)"
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
  heroCard: {
    gap: theme.spacing.md,
    overflow: "hidden",
    borderColor: "rgba(95, 122, 255, 0.26)",
    borderWidth: 1,
    backgroundColor: "rgba(245, 251, 255, 0.98)"
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject
  },
  heroSparkle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.92)"
  },
  heroSparkleOne: {
    width: 10,
    height: 10,
    top: 22,
    right: 120
  },
  heroSparkleTwo: {
    width: 7,
    height: 7,
    top: 58,
    right: 42
  },
  heroSparkleThree: {
    width: 6,
    height: 6,
    top: 24,
    right: 24
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md
  },
  heroCopy: {
    flex: 1,
    gap: 4
  },
  heroKicker: {
    color: "#4E64FF",
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  heroTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 31
  },
  heroBody: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    lineHeight: 19
  },
  mascotWrap: {
    width: 82,
    height: 82,
    alignItems: "center",
    justifyContent: "center"
  },
  mascotGlow: {
    position: "absolute",
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "rgba(94, 124, 255, 0.16)"
  },
  mascotBody: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F38B3D",
    borderWidth: 1,
    borderColor: "rgba(169, 87, 30, 0.5)",
    alignItems: "center",
    justifyContent: "flex-start",
    zIndex: 2
  },
  mascotForehead: {
    position: "absolute",
    top: 6,
    width: 22,
    height: 10,
    borderRadius: 7,
    backgroundColor: "rgba(255, 215, 186, 0.92)"
  },
  mascotEarLeft: {
    position: "absolute",
    top: 14,
    left: 13,
    width: 15,
    height: 15,
    borderRadius: 4,
    transform: [{ rotate: "-34deg" }],
    backgroundColor: "#F38B3D",
    borderWidth: 1,
    borderColor: "rgba(169, 87, 30, 0.6)"
  },
  mascotEarRight: {
    position: "absolute",
    top: 14,
    right: 13,
    width: 15,
    height: 15,
    borderRadius: 4,
    transform: [{ rotate: "34deg" }],
    backgroundColor: "#F38B3D",
    borderWidth: 1,
    borderColor: "rgba(169, 87, 30, 0.6)"
  },
  mascotEarInner: {
    position: "absolute",
    top: 18,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(252, 192, 177, 0.92)",
    zIndex: 3
  },
  mascotEarInnerLeft: {
    left: 17
  },
  mascotEarInnerRight: {
    right: 17
  },
  mascotEyeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginTop: 15
  },
  mascotEye: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.ink
  },
  mascotMuzzle: {
    marginTop: 6,
    width: 26,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    paddingBottom: 2,
    borderRadius: 12,
    backgroundColor: "#FFF7E8"
  },
  mascotNose: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#2F2A29"
  },
  mascotMouthRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 2
  },
  mascotSmile: {
    width: 9,
    height: 6,
    borderBottomWidth: 2,
    borderColor: theme.colors.ink,
    borderRadius: 8
  },
  mascotSmileLeft: {
    transform: [{ rotate: "-8deg" }]
  },
  mascotSmileRight: {
    transform: [{ rotate: "8deg" }]
  },
  heroActions: {
    alignItems: "stretch",
    gap: theme.spacing.sm
  },
  heroActionPrimary: {
    width: "100%",
    minHeight: 46
  },
  heroActionSecondary: {
    width: "100%",
    minHeight: 46
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
  shareCard: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    overflow: "hidden",
    borderColor: "rgba(94, 124, 255, 0.2)",
    borderWidth: 1,
    backgroundColor: "rgba(255, 255, 255, 0.97)"
  },
  shareCardBackdrop: {
    ...StyleSheet.absoluteFillObject
  },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  shareTextBlock: {
    flex: 1,
    paddingVertical: 2,
    justifyContent: "center"
  },
  shareTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "700"
  },
  shareSubtitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    marginTop: 4,
    lineHeight: 19
  },
  shareArrowPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(94, 124, 255, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(94, 124, 255, 0.28)"
  },
  qrWrap: {
    width: 76,
    height: 76,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: "rgba(94, 124, 255, 0.28)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1B1E2B",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },
  qrImage: {
    width: 62,
    height: 62,
    borderRadius: 10
  },
  qrOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 17, 24, 0.6)",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl
  },
  qrDialogTouch: {
    alignSelf: "center"
  },
  qrDialog: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 236, 0.8)",
    padding: theme.spacing.lg,
    alignItems: "center",
    gap: theme.spacing.sm
  },
  qrDialogTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600",
    textAlign: "center"
  },
  qrDialogSubtitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    textAlign: "center"
  },
  qrDialogFrame: {
    marginTop: theme.spacing.sm,
    padding: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  qrDialogImage: {
    borderRadius: 16
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
  recapTitleText: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    textTransform: "uppercase",
    letterSpacing: 1.1
  },
  recapHeaderAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  recapTopList: {
    marginTop: 4,
    flexDirection: "row",
    gap: 6
  },
  recapTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    minWidth: 0,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 5,
    backgroundColor: "rgba(255, 255, 255, 0.58)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.1)"
  },
  recapTopBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)"
  },
  recapTopBadgeText: {
    fontSize: 10
  },
  recapTopName: {
    flex: 1,
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "600"
  },
  recapYouRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.42)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  recapYouLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  recapYouPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(94, 124, 255, 0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(94, 124, 255, 0.28)"
  },
  recapYouRank: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "700"
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
    gap: 6,
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
    padding: theme.spacing.md,
    overflow: "hidden"
  },
  nextActionBackdrop: {
    ...StyleSheet.absoluteFillObject
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
  nextActionHeaderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(94, 124, 255, 0.2)"
  },
  nextActionHeaderBadgeText: {
    fontSize: 12
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
  nextActionMetaRow: {
    marginTop: 2,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6
  },
  nextActionMetaDot: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: 12
  },
  nextActionTurnPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(43, 158, 102, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(43, 158, 102, 0.28)"
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
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(11, 14, 20, 0.1)",
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
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 }
  },
  fabPressed: {
    transform: [{ scale: 0.97 }]
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
  joinFab: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5A53A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.32)",
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
    zIndex: 3,
    overflow: "visible"
  },
  joinFabPressed: {
    transform: [{ scale: 0.97 }]
  },
  joinFabText: {
    marginTop: 1,
    color: theme.colors.surface,
    fontFamily: theme.typography.fontFamily,
    fontSize: 9,
    fontWeight: "700",
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
