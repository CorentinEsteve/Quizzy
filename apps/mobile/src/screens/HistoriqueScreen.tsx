import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { localizedCategoryLabel } from "../data/categories";

const TAB_BAR_HEIGHT = 60;
const ALL_CATEGORY_ID = "all";

type Session = {
  code: string;
  mode: "sync" | "async";
  status: string;
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
};

type Props = {
  sessions: Session[];
  userId: number;
  locale: Locale;
  onOpenRecap: (code: string) => void;
  onResumeRoom: (code: string) => void;
};

export function HistoriqueScreen({ sessions, userId, locale, onOpenRecap, onResumeRoom }: Props) {
  const insets = useSafeAreaInsets();

  const activeSessions = sessions.filter((s) => s.status === "active");
  const completedSessions = sessions.filter((s) => s.status === "complete");

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#08112E", "#0D1B4A", "#142A60"]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + theme.spacing.lg, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + theme.spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <FontAwesome name="history" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>{t(locale, "tabHistory").toUpperCase()}</Text>
            <Text style={styles.title}>{locale === "fr" ? "Mes parties" : "My games"}</Text>
          </View>
        </View>

        {activeSessions.length === 0 && completedSessions.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <FontAwesome name="history" size={36} color={theme.colors.muted} />
            </View>
            <Text style={styles.emptyText}>{t(locale, "noMatches")}</Text>
          </View>
        )}

        {activeSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t(locale, "sectionOngoing")}</Text>
            <View style={styles.card}>
              {activeSessions.map((session, index) => {
                const otherPlayers = session.players.filter((p) => p.id !== userId);
                const opponentsLabel =
                  otherPlayers.length === 0
                    ? "-"
                    : otherPlayers.length === 1
                      ? otherPlayers[0].displayName
                      : `${otherPlayers[0].displayName} +${otherPlayers.length - 1}`;
                const categoryLabel = localizedCategoryLabel(
                  locale,
                  session.quiz.categoryId ?? ALL_CATEGORY_ID,
                  session.quiz.categoryLabel ?? t(locale, "allCategories")
                );
                const totalQuestions = session.quiz.questions?.length ?? 0;
                const myProgress = session.progress?.[String(userId)] ?? 0;
                const otherProgressValues = otherPlayers.map((p) => session.progress?.[String(p.id)] ?? 0);
                const isWaitingForOpponent =
                  (session.mode === "sync" &&
                    myProgress < totalQuestions &&
                    otherProgressValues.some((p) => myProgress > p)) ||
                  (session.mode === "async" &&
                    myProgress >= totalQuestions &&
                    otherProgressValues.some((p) => p < totalQuestions));
                const canContinue =
                  session.mode === "sync"
                    ? !isWaitingForOpponent && myProgress < totalQuestions
                    : myProgress < totalQuestions;
                const isLast = index === activeSessions.length - 1;

                return (
                  <Pressable
                    key={session.code}
                    disabled={!canContinue}
                    onPress={() => canContinue && onResumeRoom(session.code)}
                  >
                    <View style={[styles.sessionCard, isLast && styles.sessionCardLast]}>
                      <View style={styles.sessionHeader}>
                        <View style={styles.sessionHeaderCopy}>
                          <Text style={styles.sessionTitle}>{opponentsLabel}</Text>
                          <Text style={styles.sessionSubtitle}>{categoryLabel}</Text>
                        </View>
                        <View style={[styles.statusChip, isWaitingForOpponent ? styles.chipWait : styles.chipOngoing]}>
                          <FontAwesome
                            name={isWaitingForOpponent ? "clock-o" : "bolt"}
                            size={10}
                            color="#1F327F"
                          />
                          <Text style={styles.statusChipText}>
                            {isWaitingForOpponent ? t(locale, "waitingOpponent") : t(locale, "yourTurn")}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.progressRow}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${Math.min((myProgress / Math.max(totalQuestions, 1)) * 100, 100)}%` }
                            ]}
                          />
                        </View>
                        <Text style={styles.progressText}>{myProgress}/{totalQuestions}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {completedSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t(locale, "sectionRecent")}</Text>
            <View style={styles.card}>
              {completedSessions.map((session, index) => {
                const totalQuestions = session.quiz.questions?.length ?? 0;
                const myScore = session.scores?.[String(userId)];
                const otherPlayers = session.players.filter((p) => p.id !== userId);
                const opponentsLabel =
                  otherPlayers.length === 0
                    ? "-"
                    : otherPlayers.length === 1
                      ? otherPlayers[0].displayName
                      : `${otherPlayers[0].displayName} +${otherPlayers.length - 1}`;
                const allScores = session.players
                  .map((p) => session.scores?.[String(p.id)])
                  .filter((s): s is number => typeof s === "number");
                const rematchByYou = session.rematchReady?.includes(userId);
                const resultLabel =
                  myScore !== undefined && allScores.length > 0
                    ? myScore === Math.max(...allScores)
                      ? allScores.filter((s) => s === myScore).length > 1
                        ? t(locale, "youTied")
                        : t(locale, "wonLabel")
                      : t(locale, "lostLabel")
                    : null;
                const isLast = index === completedSessions.length - 1;
                const resultChipStyle =
                  resultLabel === t(locale, "lostLabel")
                    ? styles.chipLost
                    : resultLabel === t(locale, "wonLabel")
                      ? styles.chipWon
                      : styles.chipWait;
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
                  <Pressable key={session.code} onPress={() => onOpenRecap(session.code)}>
                    <View style={[styles.sessionCard, isLast && styles.sessionCardLast]}>
                      <View style={styles.sessionHeader}>
                        <View style={styles.sessionHeaderCopy}>
                          <Text style={styles.sessionTitle}>{session.quiz.title}</Text>
                          <Text style={styles.sessionSubtitle}>
                            {t(locale, "withOpponent")} {opponentsLabel}
                          </Text>
                          <Text style={styles.sessionMeta}>
                            {session.mode === "sync" ? t(locale, "syncLabel") : t(locale, "asyncLabel")} •{" "}
                            {myScore !== undefined ? `${myScore} / ${totalQuestions}` : `0 / ${totalQuestions}`}{" "}
                            {t(locale, "questionsLabel")}
                          </Text>
                        </View>
                        {resultLabel ? (
                          <View style={styles.badgeRow}>
                            {rematchByYou && (
                              <View style={[styles.statusChip, styles.chipRematch]}>
                                <FontAwesome name="refresh" size={10} color="#1F327F" />
                              </View>
                            )}
                            <View style={[styles.statusChip, resultChipStyle]}>
                              <FontAwesome name={resultIcon} size={10} color={resultIconColor} />
                              <Text style={styles.statusChipText}>{resultLabel}</Text>
                            </View>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.sessionFooterRow}>
                        <Text style={styles.sessionFooterMeta}>{t(locale, "reviewMatch")}</Text>
                        <FontAwesome name="angle-right" size={18} color={theme.colors.muted} />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(94,124,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: "rgba(214,228,255,0.7)",
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  title: {
    color: "#F3F7FF",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.display,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xxl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    color: theme.colors.muted,
  },
  section: {
  },
  sectionLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.muted,
    letterSpacing: 1.2,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  sessionCard: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
    gap: theme.spacing.sm,
  },
  sessionCardLast: {
    borderBottomWidth: 0,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  sessionHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  sessionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600",
    color: theme.colors.ink,
  },
  sessionSubtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: theme.colors.muted,
  },
  sessionMeta: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    color: "#A0A8BC",
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    flexShrink: 0,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusChipText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.ink,
  },
  chipOngoing: {
    backgroundColor: "#D1F5EE",
  },
  chipWait: {
    backgroundColor: "#FFF3D8",
  },
  chipWon: {
    backgroundColor: "#D4F5E9",
  },
  chipLost: {
    backgroundColor: "#FFE5E5",
  },
  chipRematch: {
    backgroundColor: "#D8E4FF",
    paddingHorizontal: 7,
    borderRadius: 20,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.08)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    color: theme.colors.muted,
    minWidth: 30,
    textAlign: "right",
  },
  sessionFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sessionFooterMeta: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: theme.colors.muted,
  },
});
