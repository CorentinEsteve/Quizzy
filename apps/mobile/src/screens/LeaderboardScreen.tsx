import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { GlassCard } from "../components/GlassCard";
import { BadgesResponse, LeaderboardResponse, StatsResponse } from "../data/types";
import { RewardDefinition } from "../data/rewards";

type Props = {
  locale: Locale;
  global: LeaderboardResponse | null;
  local: LeaderboardResponse | null;
  loading: boolean;
  recapStats: StatsResponse | null;
  badges: BadgesResponse | null;
  badgesLoading: boolean;
  recentReward: RewardDefinition | null;
  onBack: () => void;
};

export function LeaderboardScreen({
  locale,
  global,
  local,
  loading,
  recapStats,
  badges,
  badgesLoading,
  recentReward,
  onBack
}: Props) {
  const insets = useSafeAreaInsets();
  const globalEntries = global?.entries || [];
  const localEntries = local?.entries || [];
  const myLocalRank = local?.me?.rank ?? null;
  const myGlobalRank = global?.me?.rank ?? null;
  const totalDuels = recapStats
    ? recapStats.totals.wins + recapStats.totals.losses + recapStats.totals.ties
    : 0;
  const earnedBadges =
    badges?.badges
      ?.filter((badge) => badge.earnedAt)
      .sort((a, b) => new Date(b.earnedAt || 0).getTime() - new Date(a.earnedAt || 0).getTime()) ||
    [];
  const formatEarnedDate = (value: string) => {
    const localeTag = locale === "fr" ? "fr-FR" : "en-US";
    return new Date(value).toLocaleDateString(localeTag, { month: "short", day: "numeric" });
  };

  return (
    <View style={styles.page}>
      <LinearGradient colors={["#F4F6FB", "#FFFFFF"]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: theme.spacing.lg + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={onBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={t(locale, "back")}
            hitSlop={8}
          >
            <FontAwesome name="arrow-left" size={16} color={theme.colors.ink} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>{t(locale, "leaderboards")}</Text>
            <Text style={styles.title}>{t(locale, "topGlobal")}</Text>
          </View>
        </View>

        <GlassCard style={[styles.sectionCard, styles.recapCard]}>
          <View style={styles.recapHeader}>
            <View style={styles.recapHeaderText}>
              <Text style={styles.sectionTitle}>{t(locale, "recapTitle")}</Text>
              <Text style={styles.sectionSubtitle}>{t(locale, "recapSubtitle")}</Text>
            </View>
            <View style={styles.recapPill}>
              <Text style={styles.recapPillText}>
                {recapStats ? `${totalDuels} ${t(locale, "recapDuels")}` : "-"}
              </Text>
            </View>
          </View>
          <View style={styles.recapRow}>
            <View style={[styles.recapChip, styles.recapChipWin]}>
              <View style={styles.recapStatRow}>
                <FontAwesome name="trophy" size={16} color={theme.colors.success} />
                <Text style={styles.recapValue}>{recapStats?.totals.wins ?? "-"}</Text>
              </View>
              <Text style={styles.recapLabel}>{t(locale, "totalWins")}</Text>
            </View>
            <View style={[styles.recapChip, styles.recapChipLoss]}>
              <View style={styles.recapStatRow}>
                <FontAwesome name="times-circle" size={16} color={theme.colors.danger} />
                <Text style={styles.recapValue}>{recapStats?.totals.losses ?? "-"}</Text>
              </View>
              <Text style={styles.recapLabel}>{t(locale, "totalLosses")}</Text>
            </View>
            <View style={[styles.recapChip, styles.recapChipTie]}>
              <View style={styles.recapStatRow}>
                <FontAwesome name="handshake-o" size={16} color={theme.colors.reward} />
                <Text style={styles.recapValue}>{recapStats?.totals.ties ?? "-"}</Text>
              </View>
              <Text style={styles.recapLabel}>{t(locale, "totalTies")}</Text>
            </View>
          </View>
          {recapStats && recapStats.opponents.length > 0 ? (
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

        <View style={styles.summaryRow}>
          <GlassCard style={[styles.summaryCard, styles.summaryHighlight]}>
            <Text style={styles.summaryTitle}>{t(locale, "globalRank")}</Text>
            <Text style={styles.summaryValue}>{myGlobalRank ? `#${myGlobalRank}` : "-"}</Text>
          </GlassCard>
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{t(locale, "localRank")}</Text>
            <Text style={styles.summaryValue}>{myLocalRank ? `#${myLocalRank}` : "-"}</Text>
          </GlassCard>
        </View>

        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t(locale, "topGlobal")}</Text>
          {loading ? (
            <Text style={styles.sectionMeta}>{t(locale, "pleaseWait")}</Text>
          ) : (
            <>
              <View style={styles.rowHeader}>
                <Text style={styles.rowHeaderText}>{t(locale, "playerLabel")}</Text>
                <Text style={styles.rowHeaderText}>{t(locale, "scoreLabel")}</Text>
              </View>
              {globalEntries.map((entry) => (
                <View
                  key={`g-${entry.userId}`}
                  style={[
                    styles.leaderRow,
                    entry.userId === global?.me?.userId ? styles.leaderRowHighlight : null
                  ]}
                >
                  <View
                    style={[
                      styles.rankBadge,
                      entry.rank <= 3 ? styles.rankBadgeTop : null
                    ]}
                  >
                    <Text style={styles.rowRank}>#{entry.rank}</Text>
                  </View>
                  <View style={styles.rowNameBlock}>
                    <Text style={styles.rowText}>{entry.displayName}</Text>
                    <Text style={styles.rowSubtle}>{entry.country}</Text>
                  </View>
                  <Text style={styles.rowMeta}>{entry.score}</Text>
                </View>
              ))}
            </>
          )}
          {!loading && globalEntries.length === 0 ? (
            <Text style={styles.sectionMeta}>-</Text>
          ) : null}
        </GlassCard>

        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t(locale, "topLocal")}</Text>
          {loading ? (
            <Text style={styles.sectionMeta}>{t(locale, "pleaseWait")}</Text>
          ) : (
            <>
              <View style={styles.rowHeader}>
                <Text style={styles.rowHeaderText}>{t(locale, "playerLabel")}</Text>
                <Text style={styles.rowHeaderText}>{t(locale, "scoreLabel")}</Text>
              </View>
              {localEntries.map((entry) => (
                <View
                  key={`l-${entry.userId}`}
                  style={[
                    styles.leaderRow,
                    entry.userId === local?.me?.userId ? styles.leaderRowHighlight : null
                  ]}
                >
                  <View
                    style={[
                      styles.rankBadge,
                      entry.rank <= 3 ? styles.rankBadgeTop : null
                    ]}
                  >
                    <Text style={styles.rowRank}>#{entry.rank}</Text>
                  </View>
                  <View style={styles.rowNameBlock}>
                    <Text style={styles.rowText}>{entry.displayName}</Text>
                    <Text style={styles.rowSubtle}>{entry.country}</Text>
                  </View>
                  <Text style={styles.rowMeta}>{entry.score}</Text>
                </View>
              ))}
            </>
          )}
          {!loading && localEntries.length === 0 ? (
            <Text style={styles.sectionMeta}>-</Text>
          ) : null}
        </GlassCard>

        <GlassCard style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t(locale, "badges")}</Text>
            <Text style={styles.sectionTag}>{t(locale, "earnedBadges")}</Text>
          </View>
          {badgesLoading ? (
            <Text style={styles.sectionMeta}>{t(locale, "pleaseWait")}</Text>
          ) : earnedBadges.length > 0 ? (
            earnedBadges.map((badge) => (
              <View key={badge.id} style={styles.rewardRow}>
                <Text style={styles.rewardEmoji}>🏅</Text>
                <View style={styles.rewardCopy}>
                  <Text style={styles.rewardTitle}>{badge.title}</Text>
                  <Text style={styles.rewardBody}>{badge.description}</Text>
                </View>
                <Text style={styles.rewardDate}>
                  {badge.earnedAt ? formatEarnedDate(badge.earnedAt) : ""}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.sectionMeta}>{t(locale, "noBadgesYet")}</Text>
          )}
          <View style={styles.rewardDivider} />
          <View style={styles.rewardRow}>
            <Text style={styles.rewardEmoji}>{recentReward?.emoji ?? "✨"}</Text>
            <View style={styles.rewardCopy}>
              <Text style={styles.rewardTitle}>{t(locale, "recentReward")}</Text>
              <Text style={styles.rewardBody}>
                {recentReward ? t(locale, recentReward.titleKey) : t(locale, "noRewardsYet")}
              </Text>
            </View>
          </View>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1
  },
  container: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11, 14, 20, 0.06)"
  },
  headerText: {
    flex: 1
  },
  eyebrow: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  title: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.display,
    fontWeight: "700"
  },
  summaryRow: {
    flexDirection: "row",
    gap: theme.spacing.md
  },
  summaryCard: {
    flex: 1,
    gap: theme.spacing.xs
  },
  summaryHighlight: {
    borderColor: "rgba(94, 124, 255, 0.35)"
  },
  summaryTitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  summaryValue: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  sectionCard: {
    gap: theme.spacing.sm
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm
  },
  sectionTitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    textTransform: "uppercase",
    letterSpacing: 1.1
  },
  sectionMeta: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  sectionSubtitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  sectionTag: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border
  },
  rowHeaderText: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm
  },
  leaderRowHighlight: {
    backgroundColor: "rgba(94, 124, 255, 0.08)",
    borderRadius: theme.radius.md
  },
  rankBadge: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  rankBadgeTop: {
    backgroundColor: "rgba(243, 183, 78, 0.18)"
  },
  rowRank: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    width: 40,
    textAlign: "center"
  },
  rowNameBlock: {
    flex: 1,
    gap: 2
  },
  rowText: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body
  },
  rowMeta: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body
  },
  rowSubtle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  recapCard: {
    backgroundColor: "rgba(94, 124, 255, 0.12)",
    borderColor: "rgba(94, 124, 255, 0.28)",
    shadowColor: "rgba(94, 124, 255, 0.32)",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 6
  },
  recapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm
  },
  recapHeaderText: {
    flex: 1,
    gap: 2
  },
  recapPill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)"
  },
  recapPillText: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  recapRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  recapStatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  recapChip: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    borderLeftWidth: 3,
    gap: 2
  },
  recapChipWin: {
    borderLeftColor: "rgba(43, 158, 102, 0.9)"
  },
  recapChipLoss: {
    borderLeftColor: "rgba(235, 87, 87, 0.9)"
  },
  recapChipTie: {
    borderLeftColor: "rgba(243, 183, 78, 0.9)"
  },
  recapValue: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  recapLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  opponentList: {
    gap: theme.spacing.xs
  },
  recapMetaLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  opponentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  opponentName: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body
  },
  opponentRecord: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  recordItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  recordValue: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  recordValueWin: {
    color: theme.colors.success
  },
  recordValueLoss: {
    color: theme.colors.danger
  },
  recordValueTie: {
    color: theme.colors.reward
  },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs
  },
  rewardEmoji: {
    fontSize: 24
  },
  rewardCopy: {
    flex: 1,
    gap: 2
  },
  rewardTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  rewardBody: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  rewardDate: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  rewardDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    opacity: 0.8,
    marginVertical: theme.spacing.xs
  }
});
