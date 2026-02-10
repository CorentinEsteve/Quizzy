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
  const recapTotal = totalDuels;
  const earnedBadges =
    badges?.badges
      ?.filter((badge) => badge.earnedAt)
      .sort((a, b) => new Date(b.earnedAt || 0).getTime() - new Date(a.earnedAt || 0).getTime()) ||
    [];
  const formatEarnedDate = (value: string) => {
    const localeTag = locale === "fr" ? "fr-FR" : "en-US";
    return new Date(value).toLocaleDateString(localeTag, { month: "short", day: "numeric" });
  };
  const topGlobalThree = globalEntries.slice(0, 3);

  return (
    <View style={styles.page}>
      <LinearGradient colors={["#EAF2FF", "#F4FBFF", "#FFFDF8"]} style={StyleSheet.absoluteFill} />
      <View style={styles.backgroundOrbTop} pointerEvents="none" />
      <View style={styles.backgroundOrbBottom} pointerEvents="none" />
      <View style={styles.backgroundOrbWarm} pointerEvents="none" />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: theme.spacing.lg + insets.top,
            paddingBottom: theme.spacing.lg + insets.bottom
          }
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
            <Text style={styles.title}>Hall of Fame</Text>
          </View>
        </View>

        <GlassCard style={styles.heroCard}>
          <LinearGradient
            colors={["rgba(94, 124, 255, 0.2)", "rgba(46, 196, 182, 0.14)", "rgba(255, 255, 255, 0.9)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBackdrop}
          />
          <View style={styles.heroHeader}>
            <View style={styles.heroTitleRow}>
              <View style={styles.heroBadge}>
                <FontAwesome name="trophy" size={13} color={theme.colors.reward} />
              </View>
              <Text style={styles.heroTitle}>{t(locale, "topGlobal")}</Text>
            </View>
          </View>
          {topGlobalThree.length > 0 ? (
            <View style={styles.podiumRow}>
              {topGlobalThree.map((entry) => (
                <View key={`podium-${entry.userId}`} style={styles.podiumItem}>
                  <Text style={styles.podiumMedal}>
                    {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                  </Text>
                  <Text numberOfLines={1} style={styles.podiumName}>
                    {entry.displayName}
                  </Text>
                  <Text style={styles.podiumScore}>{entry.score} pts</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.sectionMeta}>{loading ? t(locale, "pleaseWait") : "-"}</Text>
          )}
        </GlassCard>

        <GlassCard style={[styles.sectionCard, styles.recapCard]}>
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
              <Text style={styles.recapPillValue}>{recapStats?.totals.wins ?? "-"}</Text>
              <Text style={styles.recapPillLabel}>{t(locale, "totalWins")}</Text>
            </View>
            <View style={[styles.recapPill, styles.recapPillLoss]}>
              <FontAwesome name="times-circle" size={12} color={theme.colors.danger} />
              <Text style={styles.recapPillValue}>{recapStats?.totals.losses ?? "-"}</Text>
              <Text style={styles.recapPillLabel}>{t(locale, "totalLosses")}</Text>
            </View>
            <View style={[styles.recapPill, styles.recapPillTie]}>
              <FontAwesome name="handshake-o" size={12} color={theme.colors.reward} />
              <Text style={styles.recapPillValue}>{recapStats?.totals.ties ?? "-"}</Text>
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
                    { flex: recapStats?.totals.wins ?? 0 }
                  ]}
                />
                <View
                  style={[
                    styles.recapBarSegment,
                    styles.recapBarLoss,
                    { flex: recapStats?.totals.losses ?? 0 }
                  ]}
                />
                <View
                  style={[
                    styles.recapBarSegment,
                    styles.recapBarTie,
                    { flex: recapStats?.totals.ties ?? 0 }
                  ]}
                />
              </>
            ) : (
              <View style={[styles.recapBarSegment, styles.recapBarEmpty]} />
            )}
          </View>
          <View style={styles.recapStreakRow}>
            <Text style={styles.recapStreakLabel}>{t(locale, "bestStreak")}</Text>
            <Text style={styles.recapStreakValue}>—</Text>
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

        <GlassCard style={[styles.sectionCard, styles.yourRankCard]}>
          <View style={styles.yourRankHeader}>
            <View style={[styles.sectionIconBubble, styles.sectionIconGlobal]}>
              <FontAwesome name="user" size={12} color={theme.colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>{t(locale, "yourRank")}</Text>
          </View>
          <View style={styles.yourRankGrid}>
            <View style={[styles.yourRankPill, styles.summaryHighlight]}>
              <Text style={styles.summaryTitle}>{t(locale, "globalRank")}</Text>
              <Text style={styles.summaryValue}>{myGlobalRank ? `#${myGlobalRank}` : "-"}</Text>
            </View>
            <View style={styles.yourRankPill}>
              <Text style={styles.summaryTitle}>{t(locale, "localRank")}</Text>
              <Text style={styles.summaryValue}>{myLocalRank ? `#${myLocalRank}` : "-"}</Text>
            </View>
          </View>
        </GlassCard>

        <GlassCard style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIconBubble, styles.sectionIconGlobal]}>
                <FontAwesome name="globe" size={12} color={theme.colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>{t(locale, "topGlobal")}</Text>
            </View>
            <Text style={styles.sectionTag}>
              {locale === "fr" ? "Monde" : "World"}
            </Text>
          </View>
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
                    <Text style={styles.rowRank}>
                      {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                    </Text>
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
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIconBubble, styles.sectionIconLocal]}>
                <FontAwesome name="map-marker" size={12} color={theme.colors.secondary} />
              </View>
              <Text style={styles.sectionTitle}>{t(locale, "topLocal")}</Text>
            </View>
            <Text style={styles.sectionTag}>
              {locale === "fr" ? "Pays" : "Country"}
            </Text>
          </View>
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
                    <Text style={styles.rowRank}>
                      {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                    </Text>
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
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIconBubble, styles.sectionIconAccent]}>
                <FontAwesome name="certificate" size={12} color={theme.colors.reward} />
              </View>
              <Text style={styles.sectionTitle}>{t(locale, "badges")}</Text>
            </View>
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
  backgroundOrbTop: {
    position: "absolute",
    top: -220,
    right: -140,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "rgba(94, 124, 255, 0.16)"
  },
  backgroundOrbBottom: {
    position: "absolute",
    bottom: -220,
    left: -160,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "rgba(46, 196, 182, 0.12)"
  },
  backgroundOrbWarm: {
    position: "absolute",
    top: 180,
    right: -120,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255, 204, 135, 0.12)"
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
  heroCard: {
    overflow: "hidden",
    borderColor: "rgba(94, 124, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    gap: 8
  },
  heroBackdrop: {
    ...StyleSheet.absoluteFillObject
  },
  heroHeader: {
    gap: 4
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  heroBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(243, 183, 78, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(243, 183, 78, 0.4)"
  },
  heroTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "700"
  },
  podiumRow: {
    flexDirection: "row",
    gap: 6
  },
  podiumItem: {
    flex: 1,
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 7,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.12)"
  },
  podiumMedal: {
    fontSize: 12
  },
  podiumName: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "600"
  },
  podiumScore: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    fontWeight: "700"
  },
  yourRankCard: {
    gap: 8
  },
  yourRankHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  yourRankGrid: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  yourRankPill: {
    flex: 1,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.12)",
    gap: 2
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
    fontSize: 22,
    fontWeight: "700"
  },
  sectionCard: {
    gap: theme.spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderColor: "rgba(15, 23, 42, 0.08)"
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  sectionIconBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1
  },
  sectionIconGlobal: {
    backgroundColor: "rgba(94, 124, 255, 0.14)",
    borderColor: "rgba(94, 124, 255, 0.3)"
  },
  sectionIconLocal: {
    backgroundColor: "rgba(46, 196, 182, 0.16)",
    borderColor: "rgba(46, 196, 182, 0.34)"
  },
  sectionIconAccent: {
    backgroundColor: "rgba(243, 183, 78, 0.2)",
    borderColor: "rgba(243, 183, 78, 0.35)"
  },
  sectionTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "700"
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
    fontSize: 12,
    fontWeight: "600"
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
    fontSize: 12,
    fontWeight: "600"
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 7,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    marginTop: 6
  },
  leaderRowHighlight: {
    backgroundColor: "rgba(94, 124, 255, 0.12)",
    borderColor: "rgba(94, 124, 255, 0.3)"
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
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "700"
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
    fontSize: 12,
    lineHeight: 16
  },
  recapRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
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
  recapStreakValue: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
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
