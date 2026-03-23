import React, { useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import { theme } from "../theme";
import { Locale, t } from "../i18n";

const TAB_BAR_HEIGHT = 60;

const AVATAR_PALETTE = [
  { bg: "rgba(94,124,255,0.18)", text: "#5E7CFF" },
  { bg: "rgba(46,196,182,0.18)", text: "#2EC4B6" },
  { bg: "rgba(243,183,78,0.20)", text: "#D49A20" },
  { bg: "rgba(235,87,87,0.15)", text: "#EB5757" },
  { bg: "rgba(155,89,182,0.18)", text: "#9B59B6" },
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

type Session = {
  code: string;
  status: string;
  quiz: { title: string; subtitle: string };
  players: { id: number; displayName: string }[];
  scores: Record<string, number>;
  rematchReady: number[];
};

type Props = {
  sessions: Session[];
  userId: number;
  locale: Locale;
  onOpenRecap: (code: string) => void;
  onChallenge?: () => void;
};

export function SocialScreen({ sessions, userId, locale, onOpenRecap, onChallenge }: Props) {
  const insets = useSafeAreaInsets();

  const rematchSessions = useMemo(
    () =>
      sessions.filter(
        (s) =>
          s.status === "complete" &&
          (s.rematchReady?.length ?? 0) > 0 &&
          !s.rematchReady?.includes(userId)
      ),
    [sessions, userId]
  );

  const recentOpponents = useMemo(() => {
    const map = new Map<number, { id: number; name: string; wins: number; losses: number; ties: number }>();
    sessions
      .filter((s) => s.status === "complete")
      .forEach((s) => {
        const myScore = s.scores?.[String(userId)];
        const allScores = s.players
          .map((p) => s.scores?.[String(p.id)])
          .filter((v): v is number => typeof v === "number");
        const top = allScores.length ? Math.max(...allScores) : undefined;
        const result =
          myScore === undefined || top === undefined
            ? null
            : allScores.filter((v) => v === top).length > 1 && myScore === top
            ? "tie"
            : myScore === top
            ? "win"
            : "loss";
        s.players
          .filter((p) => p.id !== userId)
          .forEach((p) => {
            const prev = map.get(p.id) ?? { id: p.id, name: p.displayName, wins: 0, losses: 0, ties: 0 };
            if (result === "win") prev.wins += 1;
            else if (result === "loss") prev.losses += 1;
            else if (result === "tie") prev.ties += 1;
            map.set(p.id, { ...prev, name: p.displayName });
          });
      });
    return Array.from(map.values());
  }, [sessions, userId]);

  const isEmpty = rematchSessions.length === 0 && recentOpponents.length === 0;
  const wSuffix = locale === "fr" ? "V" : "W";
  const lSuffix = locale === "fr" ? "D" : "L";
  const tSuffix = locale === "fr" ? "N" : "T";

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
            <FontAwesome name="users" size={18} color={theme.colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>{t(locale, "tabSocial").toUpperCase()}</Text>
            <Text style={styles.title}>{locale === "fr" ? "Tes adversaires" : "Rivals & Challenges"}</Text>
          </View>
        </View>

        {isEmpty ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <FontAwesome name="users" size={36} color={theme.colors.muted} />
            </View>
            <Text style={styles.emptyTitle}>
              {locale === "fr" ? "Aucune activité" : "No activity yet"}
            </Text>
            <Text style={styles.emptyText}>{t(locale, "socialNoActivity")}</Text>
          </View>
        ) : (
          <>
            {/* Section 1: Rematch requests */}
            <View style={styles.section}>
              <View style={styles.sectionLabelRow}>
                <Text style={styles.sectionLabel}>{t(locale, "socialRematches").toUpperCase()}</Text>
                {rematchSessions.length > 0 && (
                  <View style={styles.badgeDot}>
                    <Text style={styles.badgeDotText}>{rematchSessions.length}</Text>
                  </View>
                )}
              </View>
              <View style={styles.card}>
                {rematchSessions.length === 0 ? (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyRowText}>{t(locale, "socialRematchesEmpty")}</Text>
                  </View>
                ) : (
                  rematchSessions.map((session, index) => {
                    const otherPlayers = session.players.filter((p) => p.id !== userId);
                    const opponentsLabel =
                      otherPlayers.length === 0
                        ? "-"
                        : otherPlayers.length === 1
                        ? otherPlayers[0].displayName
                        : `${otherPlayers[0].displayName} +${otherPlayers.length - 1}`;
                    const myScore = session.scores?.[String(userId)];
                    const allScores = session.players
                      .map((p) => session.scores?.[String(p.id)])
                      .filter((v): v is number => typeof v === "number");
                    const top = allScores.length ? Math.max(...allScores) : undefined;
                    const resultLabel =
                      myScore !== undefined && top !== undefined
                        ? allScores.filter((v) => v === top).length > 1 && myScore === top
                          ? t(locale, "youTied")
                          : myScore === top
                          ? t(locale, "wonLabel")
                          : t(locale, "lostLabel")
                        : null;
                    const chipStyle =
                      resultLabel === t(locale, "lostLabel")
                        ? styles.chipLost
                        : resultLabel === t(locale, "wonLabel")
                        ? styles.chipWon
                        : styles.chipWait;
                    const chipIcon =
                      resultLabel === t(locale, "lostLabel")
                        ? "times-circle"
                        : resultLabel === t(locale, "wonLabel")
                        ? "trophy"
                        : "handshake-o";
                    const chipIconColor =
                      resultLabel === t(locale, "lostLabel")
                        ? theme.colors.danger
                        : resultLabel === t(locale, "wonLabel")
                        ? theme.colors.success
                        : theme.colors.reward;
                    const isLast = index === rematchSessions.length - 1;
                    return (
                      <Pressable
                        key={session.code}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          onOpenRecap(session.code);
                        }}
                        style={({ pressed }) => pressed && styles.rowPressed}
                      >
                        <View style={[styles.rematchRow, isLast && styles.rowLast]}>
                          <View style={styles.rematchIconWrap}>
                            <Text style={styles.rematchEmoji}>🔥</Text>
                          </View>
                          <View style={styles.rowCopy}>
                            <Text style={styles.rowTitle}>{session.quiz.title}</Text>
                            <Text style={styles.rowSubtitle}>{t(locale, "withOpponent")} {opponentsLabel}</Text>
                          </View>
                          <View style={styles.rowRight}>
                            {resultLabel ? (
                              <View style={[styles.chip, chipStyle]}>
                                <FontAwesome name={chipIcon} size={10} color={chipIconColor} />
                                <Text style={styles.chipText}>{resultLabel}</Text>
                              </View>
                            ) : null}
                            <FontAwesome name="angle-right" size={18} color="#C0944A" />
                          </View>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            </View>

            {/* Section 2: Recent opponents */}
            <View style={styles.section}>
              <View style={styles.sectionLabelRow}>
                <Text style={styles.sectionLabel}>{t(locale, "socialAdversaries").toUpperCase()}</Text>
              </View>
              <View style={styles.card}>
                {recentOpponents.length === 0 ? (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyRowText}>{t(locale, "socialAdversariesEmpty")}</Text>
                  </View>
                ) : (
                  recentOpponents.map((opp, index) => {
                    const isLast = index === recentOpponents.length - 1;
                    const color = avatarColor(opp.name);
                    const total = opp.wins + opp.losses + opp.ties;
                    const winRate = total > 0 ? opp.wins / total : null;
                    return (
                      <View key={opp.id} style={[styles.row, isLast && styles.rowLast]}>
                        <View style={[styles.avatar, { backgroundColor: color.bg }]}>
                          <Text style={[styles.avatarText, { color: color.text }]}>{initials(opp.name)}</Text>
                        </View>
                        <View style={styles.rowCopy}>
                          <View style={styles.nameRow}>
                            <Text style={styles.rowTitle}>{opp.name}</Text>
                            {winRate !== null && winRate >= 0.6 && (
                              <View style={styles.streakBadge}>
                                <Text style={styles.streakText}>🏆</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.statsRow}>
                            <Text style={styles.statWin}>{opp.wins}{wSuffix}</Text>
                            <Text style={styles.statSep}> · </Text>
                            <Text style={styles.statLoss}>{opp.losses}{lSuffix}</Text>
                            <Text style={styles.statSep}> · </Text>
                            <Text style={styles.statTie}>{opp.ties}{tSuffix}</Text>
                          </View>
                        </View>
                        {onChallenge ? (
                          <Pressable
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              onChallenge();
                            }}
                            style={({ pressed }) => [styles.challengePill, pressed && styles.challengePillPressed]}
                          >
                            <FontAwesome name="bolt" size={11} color="#FFFFFF" style={styles.challengeIcon} />
                            <Text style={styles.challengeText}>{t(locale, "socialChallenge")}</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          </>
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  emptyTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    color: theme.colors.muted,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 20,
  },
  section: {
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  sectionLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.muted,
    letterSpacing: 1.2,
  },
  badgeDot: {
    backgroundColor: theme.colors.reward,
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeDotText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
    gap: theme.spacing.sm,
  },
  rematchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(243,183,78,0.2)",
    gap: theme.spacing.sm,
    backgroundColor: "rgba(243,183,78,0.05)",
  },
  rowPressed: {
    opacity: 0.75,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rematchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(243,183,78,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rematchEmoji: {
    fontSize: 20,
  },
  rowCopy: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  rowTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600",
    color: theme.colors.ink,
  },
  rowSubtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: theme.colors.muted,
  },
  rowHint: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    color: "#C0944A",
    fontWeight: "600",
    marginTop: 1,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  chipText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.ink,
  },
  chipWon: { backgroundColor: "#D4F5E9" },
  chipLost: { backgroundColor: "#FFE5E5" },
  chipWait: { backgroundColor: "#FFF3D8" },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  statWin: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.success,
  },
  statLoss: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.danger,
  },
  statTie: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.muted,
  },
  statSep: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: "rgba(0,0,0,0.2)",
  },
  streakBadge: {
    backgroundColor: "rgba(43,158,102,0.1)",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  streakText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.success,
  },
  challengePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    flexShrink: 0,
  },
  challengePillPressed: {
    opacity: 0.7,
  },
  challengeIcon: {
    marginRight: 1,
  },
  challengeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyRow: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  emptyRowText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    color: theme.colors.muted,
  },
});
