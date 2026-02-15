import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { GlassCard } from "../components/GlassCard";
import { DailyQuizHistoryItem, DailyQuizResults } from "../data/types";

type Props = {
  results: DailyQuizResults;
  history: DailyQuizHistoryItem[];
  streakCount: number;
  onBack: () => void;
  locale: Locale;
};

export function DailyResultsScreen({ results, history, streakCount, onBack, locale }: Props) {
  const insets = useSafeAreaInsets();
  const localeTag = locale === "fr" ? "fr-FR" : "en-US";
  const dateLabel = new Date(`${results.date}T00:00:00Z`).toLocaleDateString(localeTag, {
    month: "short",
    day: "numeric"
  });
  const percentile = results.my.percentile ?? 0;
  const historyRows = history.filter((item) => item.date !== results.date).slice(0, 5);
  const reviewItems = useMemo(() => {
    if (!results.questions?.length) return [];
    return results.questions.map((question) => {
      const prompt = question.prompt?.[locale] ?? question.prompt?.en ?? "";
      const options = question.options?.[locale] ?? question.options?.en ?? [];
      const correctText =
        typeof question.answer === "number"
          ? options[question.answer] ?? t(locale, "noAnswer")
          : t(locale, "noAnswer");
      return {
        id: question.id,
        prompt,
        correctText
      };
    });
  }, [results.questions, locale]);

  return (
    <View style={styles.page}>
      <LinearGradient colors={["#FFF5DE", "#FFFAF0", "#FFFFFF"]} style={StyleSheet.absoluteFill} />
      <View style={styles.backgroundOrbTop} pointerEvents="none" />
      <View style={styles.backgroundOrbBottom} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: theme.spacing.lg + insets.top,
            paddingBottom: theme.spacing.lg + insets.bottom
          }
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
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
            <Text style={styles.eyebrow}>{t(locale, "dailyQuizResultsTitle")}</Text>
            <Text style={styles.title}>{dateLabel}</Text>
          </View>
        </View>

        <GlassCard style={[styles.sectionCard, styles.heroCard]} accent={theme.colors.reward}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroScoreBlock}>
              <Text style={styles.heroLabel}>{t(locale, "dailyQuizResultsSubtitle")}</Text>
              <Text style={styles.heroScore}>
                {results.my.score} / {results.totalQuestions}
              </Text>
            </View>
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeLabel}>{t(locale, "dailyQuizRankLabel")}</Text>
              <Text style={styles.rankBadgeValue}>{results.my.rank ? `#${results.my.rank}` : "-"}</Text>
            </View>
          </View>

          <View style={styles.heroPillsRow}>
            {streakCount > 0 ? (
              <View style={styles.streakPill}>
                <FontAwesome name="fire" size={12} color="#7A5412" />
                <Text style={styles.streakPillText}>{t(locale, "streakDays", { count: streakCount })}</Text>
              </View>
            ) : null}
            <View style={styles.percentilePill}>
              <Text style={styles.percentilePillText}>
                {t(locale, "dailyQuizPercentile", { percent: percentile })}
              </Text>
            </View>
          </View>

          <Text style={styles.heroMeta}>{t(locale, "dailyQuizParticipants", { count: results.participants })}</Text>
        </GlassCard>

        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t(locale, "dailyQuizAccuracy")}</Text>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>{t(locale, "dailyQuizAverageScore")}</Text>
            <Text style={styles.metricValue}>{results.global.averageScore}</Text>
          </View>
          <View style={styles.bar}>
            <View
              style={[
                styles.barSegment,
                styles.barCorrect,
                { flex: Math.max(results.global.correctPct, 1) }
              ]}
            />
            <View
              style={[
                styles.barSegment,
                styles.barWrong,
                { flex: Math.max(results.global.wrongPct, 1) }
              ]}
            />
          </View>
          <View style={styles.legendList}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendCorrect]} />
              <Text style={styles.legendLabel}>
                {t(locale, "dailyQuizCorrect")} {results.global.correctPct}%
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendWrong]} />
              <Text style={styles.legendLabel}>
                {t(locale, "dailyQuizWrong")} {results.global.wrongPct}%
              </Text>
            </View>
          </View>
        </GlassCard>

        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t(locale, "dailyQuizFriendsTitle")}</Text>
          {results.friends.length === 0 ? (
            <Text style={styles.sectionMeta}>{t(locale, "dailyQuizNoFriends")}</Text>
          ) : (
            results.friends.map((friend) => (
              <View key={friend.userId} style={styles.friendRow}>
                <View style={styles.friendHeader}>
                  <Text style={styles.friendName} numberOfLines={1}>
                    {friend.displayName}
                  </Text>
                  <Text style={styles.friendScore}>
                    {friend.score}/{results.totalQuestions}
                  </Text>
                </View>
                <Text style={styles.friendMeta}>
                  {t(locale, "dailyQuizCorrect")} {friend.correctPct}% · {t(locale, "dailyQuizWrong")}{" "}
                  {friend.wrongPct}%
                </Text>
              </View>
            ))
          )}
        </GlassCard>

        {historyRows.length > 0 ? (
          <GlassCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t(locale, "dailyQuizHistoryTitle")}</Text>
            <Text style={styles.sectionMeta}>{t(locale, "dailyQuizHistorySubtitle")}</Text>
            {historyRows.map((item) => {
              const dateText = new Date(`${item.date}T00:00:00Z`).toLocaleDateString(localeTag, {
                month: "short",
                day: "numeric"
              });
              return (
                <View key={item.date} style={styles.historyRow}>
                  <View style={styles.historyDateBadge}>
                    <Text style={styles.historyDateText}>{dateText}</Text>
                  </View>
                  <View style={styles.historyMeta}>
                    <Text style={styles.historyHeadline} numberOfLines={2}>
                      {t(locale, "dailyQuizBetterThan", { percent: item.percentile ?? 0 })}
                    </Text>
                    <Text style={styles.historySub}>
                      {t(locale, "dailyQuizScoreLabel", {
                        score: item.score,
                        total: item.totalQuestions
                      })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </GlassCard>
        ) : null}

        {reviewItems.length > 0 ? (
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
                </View>
              ))}
            </View>
          </GlassCard>
        ) : null}
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
    right: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(243, 183, 78, 0.16)"
  },
  backgroundOrbBottom: {
    position: "absolute",
    bottom: -240,
    left: -170,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(223, 154, 31, 0.1)"
  },
  container: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.lg
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(223, 154, 31, 0.28)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 248, 231, 0.92)"
  },
  headerText: {
    flex: 1,
    minWidth: 0
  },
  eyebrow: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    textTransform: "uppercase",
    letterSpacing: 1.1
  },
  title: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "700"
  },
  sectionCard: {
    gap: theme.spacing.sm,
    backgroundColor: "rgba(255, 253, 248, 0.9)",
    borderColor: "rgba(223, 154, 31, 0.18)"
  },
  heroCard: {
    backgroundColor: "rgba(243, 183, 78, 0.16)",
    borderColor: "rgba(243, 183, 78, 0.34)",
    gap: theme.spacing.md
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.md
  },
  heroScoreBlock: {
    flex: 1,
    minWidth: 0
  },
  heroLabel: {
    color: "#8F6A2B",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  heroScore: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.display,
    lineHeight: 40,
    fontWeight: "700"
  },
  rankBadge: {
    minWidth: 82,
    alignItems: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radius.md,
    backgroundColor: "rgba(255, 248, 231, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(223, 154, 31, 0.33)"
  },
  rankBadgeLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: 11
  },
  rankBadgeValue: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "700"
  },
  heroPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(243, 183, 78, 0.26)",
    borderWidth: 1,
    borderColor: "rgba(223, 154, 31, 0.55)"
  },
  streakPillText: {
    color: "#7A5412",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  percentilePill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255, 248, 231, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(223, 154, 31, 0.32)"
  },
  percentilePillText: {
    color: "#8B6318",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  heroMeta: {
    color: "#8F6A2B",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  sectionTitle: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  sectionMeta: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  metricLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  metricValue: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    lineHeight: 28,
    fontWeight: "700"
  },
  bar: {
    flexDirection: "row",
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(11, 14, 20, 0.08)"
  },
  barSegment: {
    height: "100%"
  },
  barCorrect: {
    backgroundColor: theme.colors.reward
  },
  barWrong: {
    backgroundColor: theme.colors.danger
  },
  legendList: {
    gap: theme.spacing.xs
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  legendCorrect: {
    backgroundColor: theme.colors.reward
  },
  legendWrong: {
    backgroundColor: theme.colors.danger
  },
  legendLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    flexShrink: 1
  },
  friendRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(15, 23, 42, 0.06)",
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    gap: 4
  },
  friendHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm
  },
  friendName: {
    flex: 1,
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  friendScore: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "700"
  },
  friendMeta: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(15, 23, 42, 0.06)",
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.xs
  },
  historyDateBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(243, 183, 78, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(243, 183, 78, 0.4)"
  },
  historyDateText: {
    color: theme.colors.reward,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  historyMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  historyHeadline: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  historySub: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  reviewCard: {
    gap: theme.spacing.md,
    backgroundColor: "rgba(255, 252, 244, 0.9)",
    borderColor: "rgba(223, 154, 31, 0.24)"
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
    alignItems: "center",
    gap: theme.spacing.sm
  },
  answerLabel: {
    width: 110,
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    lineHeight: 18
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
  }
});
