import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { GlassCard } from "../components/GlassCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { InputField } from "../components/InputField";
import { QuizSummary, StatsResponse } from "../data/types";

type Props = {
  quizzes: QuizSummary[];
  onCreateRoom: (quizId: string) => void;
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
};

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
  recapStats
}: Props) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [dialogStep, setDialogStep] = useState<"menu" | "pick" | "join">("menu");
  const [pickStep, setPickStep] = useState<"category" | "deck">("category");
  const dialogOpacity = useRef(new Animated.Value(0)).current;
  const dialogScale = useRef(new Animated.Value(0.96)).current;

  const categories = useMemo(() => {
    const map = new Map<string, { id: string; label: string; accent: string }>();
    quizzes.forEach((quiz) => {
      if (!map.has(quiz.categoryId)) {
        map.set(quiz.categoryId, {
          id: quiz.categoryId,
          label: quiz.categoryLabel,
          accent: quiz.accent
        });
      }
    });
    return Array.from(map.values());
  }, [quizzes]);

  const filteredQuizzes = useMemo(() => {
    if (!selectedCategoryId) return quizzes;
    return quizzes.filter((quiz) => quiz.categoryId === selectedCategoryId);
  }, [quizzes, selectedCategoryId]);

  const selectedQuiz = useMemo(
    () => quizzes.find((quiz) => quiz.id === selectedQuizId) || null,
    [quizzes, selectedQuizId]
  );

  useEffect(() => {
    if (!isDialogOpen) return;
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
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
    if (filteredQuizzes.length === 0) return;
    if (!selectedQuizId || !filteredQuizzes.some((quiz) => quiz.id === selectedQuizId)) {
      setSelectedQuizId(filteredQuizzes[0].id);
    }
  }, [filteredQuizzes, selectedCategoryId, selectedQuizId]);

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
            style={({ pressed }) => [pressed && styles.cardPressed]}
          >
            <GlassCard style={[styles.introCard, styles.recapCard]} accent={theme.colors.primary}>
              <View style={styles.recapHeader}>
                <View style={styles.recapHeaderText}>
                  <Text style={styles.sectionTitle}>{t(locale, "recapTitle")}</Text>
                  <Text style={styles.sectionSubtitle}>{t(locale, "recapSubtitle")}</Text>
                </View>
                <FontAwesome name="chevron-right" size={14} color={theme.colors.muted} />
              </View>
            <View style={styles.recapRow}>
              <View style={[styles.recapChip, styles.recapChipWin]}>
                <View style={styles.recapStatRow}>
                  <FontAwesome name="trophy" size={16} color={theme.colors.success} />
                  <Text style={styles.recapValue}>{recapStats.totals.wins}</Text>
                </View>
                <Text style={styles.recapLabel}>{t(locale, "totalWins")}</Text>
              </View>
              <View style={[styles.recapChip, styles.recapChipLoss]}>
                <View style={styles.recapStatRow}>
                  <FontAwesome name="times-circle" size={16} color={theme.colors.danger} />
                  <Text style={styles.recapValue}>{recapStats.totals.losses}</Text>
                </View>
                <Text style={styles.recapLabel}>{t(locale, "totalLosses")}</Text>
              </View>
              <View style={[styles.recapChip, styles.recapChipTie]}>
                <View style={styles.recapStatRow}>
                  <FontAwesome name="handshake-o" size={16} color={theme.colors.reward} />
                  <Text style={styles.recapValue}>{recapStats.totals.ties}</Text>
                </View>
                <Text style={styles.recapLabel}>{t(locale, "totalTies")}</Text>
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

        {sessions.filter((s) => s.status === "active").length > 0 ? (
          <GlassCard style={styles.introCard}>
            <View style={styles.sectionHeading}>
              <View style={[styles.sectionIcon, styles.sectionIconPrimary]}>
                <FontAwesome name="play-circle" size={18} color={theme.colors.ink} />
              </View>
              <Text style={styles.sectionTitle}>{t(locale, "ongoingMatches")}</Text>
            </View>
            {sessions
              .filter((s) => s.status === "active")
              .slice(0, 3)
              .map((session, index, array) => {
                const opponent = session.players.find((p) => p.id !== userId);
                const totalQuestions = session.quiz.questions?.length ?? 0;
                const myProgress = session.progress?.[String(userId)] ?? 0;
                const opponentProgress = opponent
                  ? session.progress?.[String(opponent.id)] ?? 0
                  : 0;
                const isWaitingForOpponent =
                  session.mode === "sync" &&
                  myProgress > opponentProgress &&
                  myProgress < totalQuestions;
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
                        <View style={[styles.ctaPill, styles.ctaPrimary]}>
                          <Text style={styles.ctaText}>{t(locale, "continueMatch")}</Text>
                          <FontAwesome name="arrow-right" size={12} color={theme.colors.ink} />
                        </View>
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
                      {myScore !== undefined ? (
                        <Text style={styles.sessionMeta}>
                          {myScore} / {totalQuestions}
                        </Text>
                      ) : null}
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
                { opacity: dialogOpacity, transform: [{ scale: dialogScale }] }
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
                <Text style={styles.dialogSubtitle}>{t(locale, "onboardingStep1Body")}</Text>
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
                          if (!selectedCategoryId) return;
                          Haptics.selectionAsync();
                          setPickStep("deck");
                        }}
                        style={!selectedCategoryId ? styles.buttonDisabled : undefined}
                      />
                      <PrimaryButton
                        label={t(locale, "close")}
                        variant="ghost"
                        icon="times"
                        onPress={() => {
                          setIsDialogOpen(false);
                          setDialogStep("menu");
                          setPickStep("category");
                        }}
                      />
                    </View>
                  </View>
                ) : pickStep === "deck" ? (
                  <View style={styles.dialogSection}>
                  <View style={styles.dialogSectionHeader}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>2</Text>
                    </View>
                    <View style={styles.dialogSectionText}>
                      <Text style={styles.dialogSectionTitle}>{t(locale, "chooseDeck")}</Text>
                      <Text style={styles.dialogSectionBody}>{t(locale, "chooseDeckBody")}</Text>
                    </View>
                  </View>
                  <View style={styles.dialogGrid}>
                    {filteredQuizzes.map((quiz) => {
                      const isSelected = selectedQuiz?.id === quiz.id;
                      return (
                        <Pressable
                          key={quiz.id}
                          onPress={() => {
                            Haptics.selectionAsync();
                            setSelectedQuizId(quiz.id);
                          }}
                        >
                          <GlassCard
                            accent={isSelected ? quiz.accent : undefined}
                            style={[styles.card, styles.deckCard, isSelected && styles.cardSelected]}
                          >
                            <View style={styles.cardHeaderRow}>
                              <Text style={styles.deckCardTitle}>{quiz.title}</Text>
                              <View
                                style={[
                                  styles.selectedPill,
                                  !isSelected && styles.selectedPillHidden
                                ]}
                              >
                                {isSelected ? (
                                  <FontAwesome name="check" size={10} color={theme.colors.ink} />
                                ) : null}
                              </View>
                            </View>
                            <Text style={styles.deckCardSubtitle}>{quiz.subtitle}</Text>
                          </GlassCard>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.dialogFooter}>
                    <PrimaryButton
                      label={t(locale, "createRoom")}
                      icon="plus"
                      iconPosition="right"
                      onPress={() => {
                        if (!selectedQuiz) return;
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onCreateRoom(selectedQuiz.id);
                        setIsDialogOpen(false);
                        setDialogStep("menu");
                        setPickStep("category");
                      }}
                      style={!selectedQuiz ? styles.buttonDisabled : undefined}
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
  recapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  recapHeaderText: {
    flex: 1,
    paddingRight: theme.spacing.sm
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
    backgroundColor: "rgba(94, 124, 255, 0.06)",
    borderColor: "rgba(94, 124, 255, 0.18)",
    shadowColor: "rgba(94, 124, 255, 0.3)"
  },
  cardPressed: {
    opacity: 0.9
  },
  recapChip: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.06)"
  },
  recapChipWin: {
    backgroundColor: "rgba(43, 158, 102, 0.08)",
    borderColor: "rgba(43, 158, 102, 0.18)"
  },
  recapChipLoss: {
    backgroundColor: "rgba(235, 87, 87, 0.08)",
    borderColor: "rgba(235, 87, 87, 0.18)"
  },
  recapChipTie: {
    backgroundColor: "rgba(243, 183, 78, 0.1)",
    borderColor: "rgba(243, 183, 78, 0.22)"
  },
  card: {
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.08)"
  },
  cardSelected: {
    borderColor: "rgba(11, 14, 20, 0.35)",
    backgroundColor: "rgba(11, 14, 20, 0.03)"
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm
  },
  selectedPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11, 14, 20, 0.08)"
  },
  selectedPillHidden: {
    opacity: 0
  },
  deckCard: {
    paddingVertical: theme.spacing.md
  },
  deckCardTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  deckCardSubtitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(11, 14, 20, 0.12)",
    backgroundColor: "rgba(255, 255, 255, 0.8)"
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
    color: theme.colors.muted,
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
    borderColor: "rgba(229, 231, 236, 0.7)"
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
  dialogDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs
  },
  dialogSection: {
    gap: theme.spacing.md
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
  dialogGrid: {
    gap: theme.spacing.md
  },
  dialogFooter: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs
  },
  fabWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center"
  }
});
