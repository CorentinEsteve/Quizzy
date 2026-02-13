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
import { resolveMaxRoomPlayers } from "../roomConfig";
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
    mode: "sync" | "async";
    status: string;
    maxPlayers?: number;
    createdAt?: string | null;
    updatedAt?: string | null;
    invitedAt?: string | null;
    quiz: {
      title: string;
      subtitle: string;
      categoryId?: string;
      categoryLabel?: string;
      questions?: unknown[];
    };
    players: { id: number; displayName: string; role?: string }[];
    scores: Record<string, number>;
    progress: Record<string, number>;
    rematchReady: number[];
    myRole?: string;
  }[];
  onOpenRecap: (code: string) => void;
  onResumeRoom: (code: string) => void;
  onCloseHostedRoom: (code: string) => void;
  recapStats: StatsResponse | null;
  dailyQuiz: DailyQuizStatus | null;
  dailyResults: DailyQuizResults | null;
  dailyLoading: boolean;
  onOpenDailyQuiz: () => void;
  onOpenDailyResults: () => void;
};

const ALL_CATEGORY_ID = "all";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("");
}

function parseInviteTimestamp(value?: string | null) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function formatInviteRelative(locale: Locale, fromMs: number, nowMs: number) {
  const deltaSec = Math.max(0, Math.floor((nowMs - fromMs) / 1000));
  if (deltaSec < 5) return locale === "fr" ? "à l'instant" : "just now";
  if (deltaSec < 60) return locale === "fr" ? `il y a ${deltaSec} s` : `${deltaSec}s ago`;
  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) return locale === "fr" ? `il y a ${deltaMin} min` : `${deltaMin}m ago`;
  const deltaHours = Math.floor(deltaMin / 60);
  return locale === "fr" ? `il y a ${deltaHours} h` : `${deltaHours}h ago`;
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
  onCloseHostedRoom,
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
  const invitePulse = useRef(new Animated.Value(0)).current;
  const inviteFirstSeenRef = useRef<Map<string, number>>(new Map());
  const [inviteNowMs, setInviteNowMs] = useState(() => Date.now());
  const dialogMaxHeight = Math.min(
    height - insets.top - insets.bottom - theme.spacing.xl * 2,
    height * 0.88
  );
  const dialogListMaxHeight = Math.max(240, dialogMaxHeight - 240);
  const qrPreviewSize = Math.min(width - theme.spacing.xl * 2 - 32, 360);
  const pickStepOrder: Array<"category" | "count" | "mode"> = ["category", "count", "mode"];
  const pickStepIndex = Math.max(0, pickStepOrder.indexOf(pickStep));
  const pickProgress = pickStepIndex + 1;
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
        const otherProgressValues = session.players
          .filter((player) => player.id !== userId)
          .map((player) => session.progress?.[String(player.id)] ?? 0);
        const isWaitingForOpponent =
          (session.mode === "sync" &&
            myProgress < totalQuestions &&
            otherProgressValues.some((progress) => myProgress > progress)) ||
          (session.mode === "async" &&
            myProgress >= totalQuestions &&
            otherProgressValues.some((progress) => progress < totalQuestions));
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
  const lobbyMemberSessions = useMemo(
    () =>
      sessions.filter(
        (session) =>
          session.status === "lobby" &&
          (session.myRole === "invited" || session.myRole === "guest")
      ),
    [sessions]
  );
  const hostedLobbySessions = useMemo(
    () => sessions.filter((session) => session.status === "lobby" && session.myRole === "host"),
    [sessions]
  );
  useEffect(() => {
    lobbyMemberSessions.forEach((session) => {
      if (!inviteFirstSeenRef.current.has(session.code)) {
        inviteFirstSeenRef.current.set(session.code, Date.now());
      }
    });
  }, [lobbyMemberSessions]);
  useEffect(() => {
    hostedLobbySessions.forEach((session) => {
      if (!inviteFirstSeenRef.current.has(session.code)) {
        inviteFirstSeenRef.current.set(session.code, Date.now());
      }
    });
  }, [hostedLobbySessions]);
  const invitedCards = useMemo(() => {
    const fallbackHostName = locale === "fr" ? "un joueur" : "a player";
    return lobbyMemberSessions
      .map((session) => {
        const isInvite = session.myRole === "invited";
        const amParticipant =
          session.myRole === "guest" ||
          session.myRole === "host" ||
          session.players.some((player) => player.id === userId);
        const isAtCapacity = session.players.length >= resolveMaxRoomPlayers(session);
        if (!amParticipant && isAtCapacity) return null;

        const sentAtMs = isInvite
          ? parseInviteTimestamp(session.invitedAt)
          : parseInviteTimestamp(session.invitedAt) ??
            parseInviteTimestamp(session.createdAt) ??
            inviteFirstSeenRef.current.get(session.code) ??
            null;
        const expiresAtMs = sentAtMs ? sentAtMs + 24 * 60 * 60 * 1000 : null;
        const isExpired = expiresAtMs ? inviteNowMs >= expiresAtMs : false;
        if (isExpired) return null;
        const hostName =
          session.players.find((player) => player.role === "host")?.displayName ||
          session.players.find((player) => player.id !== userId)?.displayName ||
          fallbackHostName;
        const sentAgoLabel = sentAtMs
          ? formatInviteRelative(locale, sentAtMs, inviteNowMs)
          : locale === "fr"
            ? "nouveau"
            : "new";
        const badgeLabel = isInvite
          ? t(locale, "notificationInviteTitle")
          : locale === "fr"
            ? "SALON REJOINT"
            : "ROOM JOINED";
        const title = isInvite
          ? t(locale, "homeInviteTitle", { name: hostName })
          : locale === "fr"
            ? `Salon avec ${hostName}`
            : `Room with ${hostName}`;
        const body = isInvite
          ? t(locale, "homeInviteBody")
          : locale === "fr"
            ? "Tu as rejoint ce duel. Rouvre le salon pour continuer."
            : "You joined this duel. Reopen the room to continue.";
        const actionLabel = isInvite
          ? t(locale, "homeInviteAction")
          : locale === "fr"
            ? "Ouvrir"
            : "Open room";
        return { session, hostName, sentAgoLabel, sentAtMs: sentAtMs ?? 0, badgeLabel, title, body, actionLabel, isInvite };
      })
      .filter(
        (
          item
        ): item is {
          session: Props["sessions"][number];
          hostName: string;
          sentAgoLabel: string;
          sentAtMs: number;
          badgeLabel: string;
          title: string;
          body: string;
          actionLabel: string;
          isInvite: boolean;
        } => Boolean(item)
      )
      .sort((a, b) => b.sentAtMs - a.sentAtMs);
  }, [lobbyMemberSessions, inviteNowMs, locale, userId, t]);
  const showInvitedCard = invitedCards.length > 0;
  const hostedLobbyCards = useMemo(
    () =>
      hostedLobbySessions
        .map((session) => {
          const sentAtMs =
            parseInviteTimestamp(session.updatedAt) ??
            parseInviteTimestamp(session.createdAt) ??
            inviteFirstSeenRef.current.get(session.code) ??
            null;
          const expiresAtMs = sentAtMs ? sentAtMs + 24 * 60 * 60 * 1000 : null;
          const isExpired = expiresAtMs ? inviteNowMs >= expiresAtMs : false;
          if (isExpired) return null;
          return { session, sentAtMs: sentAtMs ?? 0 };
        })
        .filter(
          (item): item is { session: Props["sessions"][number]; sentAtMs: number } =>
            Boolean(item)
        )
        .sort((a, b) => b.sentAtMs - a.sentAtMs),
    [hostedLobbySessions, inviteNowMs]
  );
  const dailyAnswered = dailyQuiz?.answeredCount ?? 0;
  const dailyTotal = dailyQuiz?.totalQuestions ?? 10;
  const dailyCompleted = dailyQuiz?.completed ?? false;
  const dailyPercentile = dailyResults?.my.percentile ?? null;
  const dailyActionLabel = dailyCompleted
    ? t(locale, "dailyQuizResults")
    : dailyAnswered > 0
      ? t(locale, "dailyQuizContinue")
      : t(locale, "dailyQuizPlay");
  const showDailyCard = Boolean(dailyQuiz) || dailyLoading;
  const handleDailyPress = dailyCompleted ? onOpenDailyResults : onOpenDailyQuiz;
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

  useEffect(() => {
    const timer = setInterval(() => {
      setInviteNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!showInvitedCard) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(invitePulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(invitePulse, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [invitePulse, showInvitedCard]);

  const nextOpponents = nextSession?.players.filter((player) => player.id !== userId) ?? [];
  const nextOpponentName =
    nextOpponents.length === 0
      ? t(locale, "opponentLabel")
      : nextOpponents.length === 1
        ? nextOpponents[0].displayName
        : `${nextOpponents[0].displayName} +${nextOpponents.length - 1}`;
  const nextTotalQuestions = nextSession?.quiz.questions?.length ?? 0;
  const nextMyProgress = nextSession ? nextSession.progress?.[String(userId)] ?? 0 : 0;
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
  const inviteNudge = invitePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2]
  });
  const inviteGlow = invitePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02]
  });
  const invitePingScale = invitePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.8]
  });
  const invitePingOpacity = invitePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0]
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
        colors={["#F3F6FF", "#FFF3EE", "#FFF8EF"]}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={["rgba(47, 70, 212, 0.34)", "rgba(47, 70, 212, 0)"]}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.7, y: 0.7 }}
        style={styles.backgroundSweep}
      />
      <LinearGradient
        colors={["rgba(227, 92, 76, 0.2)", "rgba(227, 92, 76, 0)"]}
        start={{ x: 0.95, y: 0.05 }}
        end={{ x: 0.25, y: 0.65 }}
        style={styles.backgroundWarmSweep}
      />
      <View style={styles.backgroundOrb} pointerEvents="none" />
      <View style={styles.backgroundOrbAccent} pointerEvents="none" />
      <View style={styles.backgroundOrbWarm} pointerEvents="none" />
      <View style={styles.backgroundRibbon} pointerEvents="none" />
      <View style={styles.backgroundGlow} pointerEvents="none" />
      <View style={styles.backgroundGlass} pointerEvents="none" />
      <LinearGradient
        colors={["rgba(255, 255, 255, 0)", "rgba(248, 251, 255, 0.92)", "rgba(248, 251, 255, 0.98)"]}
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
                pressed && styles.accountButtonPressed
              ]}
              onPress={onOpenAccount}
              accessibilityRole="button"
              accessibilityLabel={locale === "fr" ? "Profil" : "Profile"}
            >
              <View style={styles.accountAvatar}>
                <Text style={styles.accountAvatarText}>{initials(userName || "Player")}</Text>
              </View>
            </Pressable>
          </View>
        </View>

        <GlassCard style={styles.heroCard}>
          <LinearGradient
            colors={[
              "#F3F7FF",
              "#DEE6FF",
              "#FFDCCE",
              "#FFDCA5"
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
                <View style={styles.mascotFaceMask} />
                <View style={styles.mascotHeadShine} />
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

        {showInvitedCard
          ? invitedCards.map((inviteCard) => (
              <Pressable
                key={`invite-${inviteCard.session.code}`}
                onPress={() => onResumeRoom(inviteCard.session.code)}
                accessibilityRole="button"
                accessibilityLabel={t(locale, "homeInviteA11y")}
                hitSlop={6}
              >
                <Animated.View style={{ transform: [{ translateY: inviteNudge }, { scale: inviteGlow }] }}>
                  <GlassCard style={[styles.introCard, styles.homeInviteCard]} accent={theme.colors.secondary}>
                    <LinearGradient
                      colors={["rgba(63, 84, 220, 0.2)", "rgba(224, 97, 80, 0.13)", "rgba(255, 255, 255, 0.98)"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.homeInviteBackdrop}
                    />
                    <View style={styles.homeInviteHeader}>
                      <View style={styles.homeInviteBadge}>
                        <View style={styles.homeInvitePingWrap}>
                          <Animated.View
                            style={[
                              styles.homeInvitePing,
                              !inviteCard.isInvite && styles.homeInvitePingJoined,
                              {
                                opacity: invitePingOpacity,
                                transform: [{ scale: invitePingScale }]
                              }
                            ]}
                          />
                          <View style={[styles.homeInvitePingDot, !inviteCard.isInvite && styles.homeInvitePingDotJoined]} />
                        </View>
                        <Text style={styles.homeInviteBadgeText}>{inviteCard.badgeLabel}</Text>
                      </View>
                      <View style={styles.homeInviteAgePill}>
                        <FontAwesome name="clock-o" size={10} color={theme.colors.muted} />
                        <Text style={styles.homeInviteAgeText}>{inviteCard.sentAgoLabel}</Text>
                      </View>
                    </View>
                    <Text style={styles.homeInviteTitle}>{inviteCard.title}</Text>
                    <Text style={styles.homeInviteBody}>{inviteCard.body}</Text>
                    <View style={styles.homeInviteCtaRow}>
                      <View style={styles.homeInviteCodePill}>
                        <FontAwesome name="hashtag" size={11} color={theme.colors.primary} />
                        <Text style={styles.homeInviteCodeText}>{inviteCard.session.code}</Text>
                      </View>
                      <View style={styles.homeInviteActionPill}>
                        <Text style={styles.homeInviteActionText}>{inviteCard.actionLabel}</Text>
                        <FontAwesome name="chevron-right" size={11} color={theme.colors.primary} />
                      </View>
                    </View>
                  </GlassCard>
                </Animated.View>
              </Pressable>
            ))
          : null}
        {hostedLobbyCards.map((hostedCard) => (
          <Pressable
            key={`host-${hostedCard.session.code}`}
            onPress={() => onResumeRoom(hostedCard.session.code)}
            accessibilityRole="button"
            accessibilityLabel={locale === "fr" ? "Rouvrir le salon" : "Reopen room"}
            hitSlop={6}
          >
            <GlassCard style={[styles.introCard, styles.homeInviteCard, styles.homeHostCard]} accent={theme.colors.primary}>
              <LinearGradient
                colors={["rgba(63, 84, 220, 0.14)", "rgba(242, 166, 67, 0.11)", "rgba(255, 255, 255, 0.98)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.homeInviteBackdrop}
              />
              <View style={[styles.homeInviteHeader, styles.homeHostHeader]}>
                <View style={[styles.homeInviteBadge, styles.homeHostBadge]}>
                  <View style={styles.homeHostBadgeDot} />
                  <Text style={styles.homeInviteBadgeText}>
                    {locale === "fr" ? "SALON OUVERT" : "ROOM OPEN"}
                  </Text>
                </View>
                <Pressable
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.homeInviteCloseButton,
                    styles.homeHostCloseButton,
                    pressed && styles.homeInviteCloseButtonPressed
                  ]}
                  onPress={(event) => {
                    event.stopPropagation();
                    Haptics.selectionAsync();
                    onCloseHostedRoom(hostedCard.session.code);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={locale === "fr" ? "Fermer ce salon" : "Close this room"}
                >
                  <Text style={styles.homeInviteCloseLabel}>
                    {locale === "fr" ? "Fermer le salon" : "Close room"}
                  </Text>
                  <FontAwesome name="times" size={10} color={theme.colors.muted} />
                </Pressable>
              </View>
              <Text style={[styles.homeInviteTitle, styles.homeHostTitle]}>
                {locale === "fr" ? "Ton duel attend un joueur" : "Your duel is waiting for a player"}
              </Text>
              <Text style={[styles.homeInviteBody, styles.homeHostBody]}>
                {locale === "fr"
                  ? "En attente d'un joueur..."
                  : "Waiting for a player..."}
              </Text>
              <View style={[styles.homeInviteCtaRow, styles.homeHostCtaRow]}>
                <View style={styles.homeInviteCodePill}>
                  <FontAwesome name="hashtag" size={11} color={theme.colors.primary} />
                  <Text style={styles.homeInviteCodeText}>{hostedCard.session.code}</Text>
                </View>
                <View style={styles.homeInviteActionPill}>
                  <Text style={styles.homeInviteActionText}>{locale === "fr" ? "Ouvrir" : "Open room"}</Text>
                  <FontAwesome name="chevron-right" size={11} color={theme.colors.primary} />
                </View>
              </View>
            </GlassCard>
          </Pressable>
        ))}

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
              colors={["rgba(63, 84, 220, 0.18)", "rgba(224, 97, 80, 0.1)", "rgba(255, 255, 255, 0.98)"]}
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
                const otherPlayers = session.players.filter((player) => player.id !== userId);
                const opponentsLabel =
                  otherPlayers.length === 0
                    ? "-"
                    : otherPlayers.length === 1
                      ? otherPlayers[0].displayName
                      : `${otherPlayers[0].displayName} +${otherPlayers.length - 1}`;
                const totalQuestions = session.quiz.questions?.length ?? 0;
                const myProgress = session.progress?.[String(userId)] ?? 0;
                const otherProgressValues = otherPlayers.map(
                  (player) => session.progress?.[String(player.id)] ?? 0
                );
                const isWaitingForOpponent =
                  (session.mode === "sync" &&
                    myProgress < totalQuestions &&
                    otherProgressValues.some((progress) => myProgress > progress)) ||
                  (session.mode === "async" &&
                    myProgress >= totalQuestions &&
                    otherProgressValues.some((progress) => progress < totalQuestions));
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
                          {t(locale, "withOpponent")} {opponentsLabel}
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
                const otherPlayers = session.players.filter((player) => player.id !== userId);
                const opponentsLabel =
                  otherPlayers.length === 0
                    ? "-"
                    : otherPlayers.length === 1
                      ? otherPlayers[0].displayName
                      : `${otherPlayers[0].displayName} +${otherPlayers.length - 1}`;
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
                            {t(locale, "withOpponent")} {opponentsLabel}
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
            colors={["rgba(63, 84, 220, 0.08)", "rgba(245, 138, 43, 0.06)", "rgba(255, 255, 255, 0.98)"]}
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
              <FontAwesome name="arrow-right" size={11} color="rgba(71, 85, 105, 0.72)" />
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
                const otherPlayers = session.players.filter((player) => player.id !== userId);
                const opponentsLabel =
                  otherPlayers.length === 0
                    ? "-"
                    : otherPlayers.length === 1
                      ? otherPlayers[0].displayName
                      : `${otherPlayers[0].displayName} +${otherPlayers.length - 1}`;
                const allScores = session.players
                  .map((player) => session.scores?.[String(player.id)])
                  .filter((score): score is number => typeof score === "number");
                const rematchByYou = session.rematchReady?.includes(userId);
                const resultLabel =
                  myScore !== undefined && allScores.length > 0
                    ? myScore === Math.max(...allScores)
                      ? allScores.filter((score) => score === myScore).length > 1
                        ? t(locale, "youTied")
                        : t(locale, "wonLabel")
                      : t(locale, "lostLabel")
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
                            {t(locale, "withOpponent")} {opponentsLabel}
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
            <FontAwesome name="bolt" size={14} color={theme.colors.surface} />
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
        <FontAwesome name="plus" size={16} color={theme.colors.surface} />
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
                  <View style={styles.dialogProgressRow}>
                    <View style={styles.dialogProgressTrack}>
                      {pickStepOrder.map((step, index) => {
                        const isActive = index <= pickStepIndex;
                        return (
                          <View
                            key={step}
                            style={[
                              styles.dialogProgressSegment,
                              isActive && styles.dialogProgressSegmentActive
                            ]}
                          />
                        );
                      })}
                    </View>
                    <Text style={styles.dialogProgressMeta}>
                      {locale === "fr" ? `Etape ${pickProgress}/3` : `Step ${pickProgress}/3`}
                    </Text>
                  </View>
                </View>
                {pickStep === "category" ? (
                  <View style={styles.dialogSection}>
                    <View style={styles.dialogSectionHeader}>
                      <View style={[styles.dialogSectionIcon, styles.dialogSectionIconCategory]}>
                        <FontAwesome name="th-large" size={12} color="#2F46C9" />
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
                    <View style={[styles.dialogSectionIcon, styles.dialogSectionIconLength]}>
                      <FontAwesome name="clock-o" size={12} color="#A85D00" />
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
                      <View style={[styles.dialogSectionIcon, styles.dialogSectionIconMode]}>
                        <FontAwesome name="exchange" size={12} color="#A33F6E" />
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
    backgroundColor: "rgba(56, 78, 214, 0.26)"
  },
  backgroundOrbAccent: {
    position: "absolute",
    bottom: -220,
    left: -160,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(224, 102, 86, 0.18)"
  },
  backgroundOrbWarm: {
    position: "absolute",
    top: 120,
    right: -120,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(245, 138, 43, 0.2)"
  },
  backgroundRibbon: {
    position: "absolute",
    top: 220,
    left: -90,
    width: 280,
    height: 160,
    borderRadius: 44,
    transform: [{ rotate: "-16deg" }],
    backgroundColor: "rgba(220, 110, 82, 0.14)"
  },
  backgroundGlow: {
    position: "absolute",
    top: "38%",
    alignSelf: "center",
    width: 440,
    height: 440,
    borderRadius: 220,
    backgroundColor: "rgba(255, 255, 255, 0.6)"
  },
  backgroundSweep: {
    ...StyleSheet.absoluteFillObject
  },
  backgroundWarmSweep: {
    ...StyleSheet.absoluteFillObject
  },
  backgroundGlass: {
    position: "absolute",
    top: 120,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 60,
    backgroundColor: "rgba(255, 242, 235, 0.62)",
    transform: [{ rotate: "12deg" }],
    borderWidth: 1,
    borderColor: "rgba(255, 228, 216, 0.95)"
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
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0
  },
  accountButtonPressed: {
    transform: [{ scale: 0.97 }]
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(94, 124, 255, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(94, 124, 255, 0.25)"
  },
  accountAvatarText: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    fontWeight: "700"
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  title: {
    color: "#12193D",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  subtitle: {
    color: "rgba(45, 55, 101, 0.8)",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  heroCard: {
    gap: theme.spacing.md,
    overflow: "hidden",
    borderColor: "rgba(90, 102, 201, 0.42)",
    borderWidth: 1,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    backgroundColor: "rgba(250, 251, 255, 0.98)",
    shadowColor: "rgba(48, 68, 151, 0.3)",
    shadowOpacity: 0.24,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 9
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject
  },
  heroSparkle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255, 235, 190, 0.9)"
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
    color: "#AD6500",
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  heroTitle: {
    color: "#111C48",
    fontFamily: theme.typography.fontFamily,
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 31
  },
  heroBody: {
    color: "rgba(47, 60, 103, 0.88)",
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
    backgroundColor: "rgba(82, 106, 213, 0.22)"
  },
  mascotBody: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EE9647",
    borderWidth: 1,
    borderColor: "rgba(169, 87, 30, 0.42)",
    alignItems: "center",
    justifyContent: "flex-start",
    zIndex: 2
  },
  mascotFaceMask: {
    position: "absolute",
    top: 8,
    width: 30,
    height: 18,
    borderRadius: 10,
    backgroundColor: "rgba(255, 230, 204, 0.94)"
  },
  mascotHeadShine: {
    position: "absolute",
    top: 7,
    right: 13,
    width: 9,
    height: 6,
    borderRadius: 4,
    backgroundColor: "rgba(255, 248, 238, 0.92)"
  },
  mascotEarLeft: {
    position: "absolute",
    top: 14,
    left: 13,
    width: 15,
    height: 15,
    borderRadius: 4,
    transform: [{ rotate: "-34deg" }],
    backgroundColor: "#EE9647",
    borderWidth: 1,
    borderColor: "rgba(169, 87, 30, 0.5)"
  },
  mascotEarRight: {
    position: "absolute",
    top: 14,
    right: 13,
    width: 15,
    height: 15,
    borderRadius: 4,
    transform: [{ rotate: "34deg" }],
    backgroundColor: "#EE9647",
    borderWidth: 1,
    borderColor: "rgba(169, 87, 30, 0.5)"
  },
  mascotEarInner: {
    position: "absolute",
    top: 18,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(253, 204, 189, 0.95)",
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
    gap: 10,
    marginTop: 17
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
    backgroundColor: "#FFF9ED"
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
    minHeight: 46,
    backgroundColor: "#3149D8",
    shadowColor: "rgba(53, 73, 194, 0.46)",
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5
  },
  heroActionSecondary: {
    width: "100%",
    minHeight: 46,
    backgroundColor: "rgba(255, 249, 236, 0.72)",
    borderColor: "rgba(225, 140, 40, 0.36)",
    borderWidth: 1
  },
  introCard: {
    gap: theme.spacing.sm,
    backgroundColor: "rgba(252, 254, 255, 0.98)",
    borderWidth: 1,
    borderColor: "rgba(90, 98, 206, 0.18)",
    shadowColor: "rgba(47, 45, 119, 0.2)",
    shadowOpacity: 0.14,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5
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
    backgroundColor: "rgba(72, 95, 224, 0.16)"
  },
  sectionIconAccent: {
    backgroundColor: "rgba(242, 166, 67, 0.26)"
  },
  sectionIconMuted: {
    backgroundColor: "rgba(86, 109, 202, 0.12)"
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
    borderColor: "rgba(95, 104, 178, 0.18)",
    borderWidth: 1,
    backgroundColor: "rgba(253, 254, 255, 0.99)",
    shadowColor: "rgba(50, 58, 110, 0.14)",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3
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
    color: "#182045",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "700"
  },
  shareSubtitle: {
    color: "rgba(56, 63, 98, 0.74)",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    marginTop: 4,
    lineHeight: 19
  },
  shareArrowPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(243, 245, 252, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(95, 104, 178, 0.18)"
  },
  qrWrap: {
    width: 76,
    height: 76,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderWidth: 1,
    borderColor: "rgba(95, 104, 178, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(50, 58, 110, 0.16)",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
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
    color: "rgba(44, 52, 93, 0.8)",
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
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(65, 72, 127, 0.16)"
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
    backgroundColor: "rgba(255, 255, 255, 0.62)",
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
    backgroundColor: "rgba(71, 83, 202, 0.16)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(71, 83, 202, 0.32)"
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
    backgroundColor: "rgba(104, 128, 216, 0.25)",
    borderColor: "rgba(88, 108, 203, 0.32)",
    shadowColor: "rgba(46, 68, 145, 0.28)",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7
  },
  homeInviteCard: {
    overflow: "hidden",
    gap: 6,
    borderColor: "rgba(92, 109, 201, 0.26)",
    backgroundColor: "rgba(252, 254, 255, 0.98)"
  },
  homeHostCard: {
    gap: 4
  },
  homeInviteBackdrop: {
    ...StyleSheet.absoluteFillObject
  },
  homeInviteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  homeHostHeader: {
    marginBottom: 2
  },
  homeInviteBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(74, 79, 169, 0.26)"
  },
  homeHostBadge: {
    paddingVertical: 4
  },
  homeInvitePingWrap: {
    width: 10,
    height: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  homeInvitePing: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(34, 197, 94, 0.45)"
  },
  homeInvitePingJoined: {
    backgroundColor: "rgba(63, 84, 220, 0.42)"
  },
  homeInvitePingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(34, 197, 94, 0.98)"
  },
  homeInvitePingDotJoined: {
    backgroundColor: "rgba(63, 84, 220, 0.98)"
  },
  homeHostBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(242, 166, 67, 0.98)"
  },
  homeInviteBadgeText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  homeInviteAgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.76)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.12)"
  },
  homeInviteAgeText: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "600"
  },
  homeInviteCloseButton: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 8,
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.16)"
  },
  homeHostCloseButton: {
    backgroundColor: "transparent",
    borderColor: "rgba(15, 23, 42, 0.12)",
    paddingHorizontal: 6,
    gap: 4
  },
  homeInviteCloseLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2
  },
  homeInviteCloseButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9
  },
  homeInviteTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24
  },
  homeHostTitle: {
    fontSize: 18,
    lineHeight: 22,
    marginTop: 2
  },
  homeInviteBody: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    lineHeight: 18
  },
  homeHostBody: {
    lineHeight: 16
  },
  homeInviteCtaRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm
  },
  homeHostCtaRow: {
    marginTop: 6
  },
  homeInviteCodePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(74, 79, 169, 0.3)"
  },
  homeInviteCodeText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6
  },
  homeInviteActionPill: {
    minHeight: 32,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(80, 87, 189, 0.16)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(80, 87, 189, 0.34)"
  },
  homeInviteActionText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700"
  },
  nextActionCard: {
    borderColor: "rgba(90, 109, 201, 0.24)",
    backgroundColor: "rgba(252, 254, 255, 0.98)",
    padding: theme.spacing.md,
    overflow: "hidden",
    shadowColor: "rgba(48, 67, 138, 0.2)",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 6
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
    borderColor: "rgba(80, 87, 189, 0.24)"
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
    backgroundColor: "rgba(80, 87, 189, 0.16)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(80, 87, 189, 0.28)"
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
    borderColor: "rgba(224, 137, 43, 0.34)",
    backgroundColor: "rgba(255, 248, 236, 0.92)",
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    shadowColor: "rgba(163, 93, 36, 0.24)",
    shadowOpacity: 0.15,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5
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
    backgroundColor: "rgba(245, 138, 43, 0.22)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(224, 137, 43, 0.4)"
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
    backgroundColor: "rgba(186, 140, 58, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(186, 140, 58, 0.42)",
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
    borderColor: "rgba(186, 140, 58, 0.34)"
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
    borderColor: "rgba(107, 113, 191, 0.22)",
    backgroundColor: "rgba(249, 250, 255, 0.95)"
  },
  categoryChipSelected: {
    borderColor: "rgba(66, 84, 205, 0.48)",
    backgroundColor: "rgba(232, 237, 255, 0.92)",
    shadowColor: "rgba(73, 82, 182, 0.3)",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  categoryDot: {
    width: 10,
    height: 10,
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
    backgroundColor: "rgba(222, 227, 248, 0.82)",
    marginLeft: "auto",
    marginRight: 6
  },
  selectedPillActive: {
    backgroundColor: "rgba(70, 87, 207, 0.22)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(70, 87, 207, 0.5)"
  },
  selectedPillHidden: {
    opacity: 0
  },
  categoryChevron: {
    marginLeft: "auto",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(236, 239, 255, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(106, 112, 202, 0.26)"
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
    borderColor: "rgba(107, 113, 191, 0.22)",
    backgroundColor: "rgba(249, 250, 255, 0.95)"
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
    borderColor: "rgba(107, 113, 191, 0.22)",
    backgroundColor: "rgba(249, 250, 255, 0.95)"
  },
  choiceCardSelected: {
    borderColor: "rgba(66, 84, 205, 0.5)",
    backgroundColor: "rgba(232, 237, 255, 0.92)",
    shadowColor: "rgba(73, 82, 182, 0.32)",
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
    backgroundColor: "#16BFA8"
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
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    shadowColor: "rgba(15, 23, 42, 0.18)",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  sessionCardLast: {
    marginBottom: 0
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
    backgroundColor: "rgba(35, 61, 118, 0.14)",
    borderColor: "rgba(35, 61, 118, 0.34)"
  },
  statusChipTurn: {
    backgroundColor: "rgba(33, 98, 93, 0.16)",
    borderColor: "rgba(33, 98, 93, 0.34)"
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
    backgroundColor: "rgba(186, 140, 58, 0.2)",
    borderColor: "rgba(186, 140, 58, 0.4)"
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
    backgroundColor: "rgba(35, 61, 118, 0.16)",
    borderColor: "rgba(35, 61, 118, 0.36)"
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
    backgroundColor: "rgba(35, 61, 118, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(35, 61, 118, 0.34)"
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
    backgroundColor: theme.colors.secondary,
    borderWidth: 1,
    borderColor: "rgba(46, 196, 182, 0.38)",
    shadowColor: "rgba(15, 118, 110, 0.5)",
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
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg
  },
  dialogTouch: {
    alignSelf: "stretch"
  },
  dialog: {
    backgroundColor: "rgba(250, 251, 255, 0.96)",
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: "rgba(106, 112, 210, 0.28)",
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
    backgroundColor: "rgba(236, 239, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(93, 101, 192, 0.26)"
  },
  dialogGlow: {
    shadowColor: "rgba(64, 61, 170, 0.34)",
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 }
  },
  dialogTitle: {
    color: "#121A3D",
    fontFamily: theme.typography.fontFamily,
    fontSize: 22,
    fontWeight: "700"
  },
  dialogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  dialogHeaderCentered: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.xs
  },
  dialogProgressRow: {
    marginTop: 8,
    width: "78%",
    alignItems: "center",
    gap: 6
  },
  dialogProgressTrack: {
    width: "100%",
    flexDirection: "row",
    gap: 6
  },
  dialogProgressSegment: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(157, 166, 201, 0.26)"
  },
  dialogProgressSegmentActive: {
    backgroundColor: "rgba(64, 83, 199, 0.62)"
  },
  dialogProgressMeta: {
    color: "rgba(64, 72, 116, 0.74)",
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase"
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
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(238, 241, 255, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(113, 117, 211, 0.16)"
  },
  dialogSectionText: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  dialogSectionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1
  },
  dialogSectionIconCategory: {
    backgroundColor: "rgba(68, 96, 214, 0.14)",
    borderColor: "rgba(68, 96, 214, 0.28)"
  },
  dialogSectionIconLength: {
    backgroundColor: "rgba(236, 163, 68, 0.18)",
    borderColor: "rgba(214, 143, 52, 0.34)"
  },
  dialogSectionIconMode: {
    backgroundColor: "rgba(204, 73, 132, 0.16)",
    borderColor: "rgba(177, 61, 113, 0.3)"
  },
  dialogSectionTitle: {
    color: "#151F47",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600",
    flexShrink: 1
  },
  dialogSectionBody: {
    color: "rgba(53, 60, 99, 0.86)",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    lineHeight: 18,
    flexShrink: 1
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
