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
      <LinearGradient colors={["#FFF4DA", "#FFF9EF", "#FFFFFF"]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(243, 183, 78, 0.24)", "rgba(243, 183, 78, 0)"]}
        start={{ x: 0.1, y: 0.0 }}
        end={{ x: 0.8, y: 0.7 }}
        style={styles.backgroundSweep}
      />
      <View style={styles.backgroundOrbTop} pointerEvents="none" />
      <View style={styles.backgroundOrbBottom} pointerEvents="none" />
      <View style={styles.backgroundGlow} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: theme.spacing.lg + insets.top, paddingBottom: theme.spacing.lg + insets.bottom }
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
            <Text style={styles.subtitle}>{t(locale, "dailyQuizResultsSubtitle")}</Text>
          </View>
          <View style={styles.awardDot}>
            <Text style={styles.awardDotEmoji}>✨</Text>
          </View>
        </View>

        <GlassCard style={[styles.sectionCard, styles.heroCard]} accent={theme.colors.reward}>
          <Text style={styles.heroLabel}>{t(locale, "dailyQuizResultsSubtitle")}</Text>
          <Text style={styles.heroScore}>
            {results.my.score} / {results.totalQuestions}
          </Text>
          {streakCount > 0 ? (
            <View style={styles.streakPill}>
              <FontAwesome name="fire" size={12} color={theme.colors.reward} />
              <Text style={styles.streakPillText}>
                {t(locale, "streakDays", { count: streakCount })}
              </Text>
            </View>
          ) : null}
          <View style={styles.heroAccuracyRow}>
            <Text style={styles.heroAccuracyText}>
              {t(locale, "dailyQuizCorrect")} {results.my.correctPct}%
            </Text>
            <Text style={styles.heroAccuracyText}>
              {t(locale, "dailyQuizWrong")} {results.my.wrongPct}%
            </Text>
          </View>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>{t(locale, "dailyQuizRankLabel")}</Text>
              <Text style={styles.heroStatValue}>
                {results.my.rank ? `#${results.my.rank}` : "-"}
              </Text>
            </View>
          </View>
          <Text style={styles.heroSubMeta}>
            {t(locale, "dailyQuizParticipants", { count: results.participants })}
          </Text>
          <Text style={styles.heroMeta}>
            {t(locale, "dailyQuizPercentile", { percent: percentile })}
          </Text>
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
          <View style={styles.legendRow}>
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
                  <Text style={styles.friendName}>{friend.displayName}</Text>
                  <Text style={styles.friendScore}>
                    {friend.score}/{results.totalQuestions}
                  </Text>
                </View>
                <View style={styles.friendMetaRow}>
                  <Text style={styles.friendMeta}>
                    {t(locale, "dailyQuizCorrect")} {friend.correctPct}%
                  </Text>
                  <Text style={styles.friendMeta}>
                    {t(locale, "dailyQuizWrong")} {friend.wrongPct}%
                  </Text>
                </View>
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
                    <Text style={styles.historyHeadline}>
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
  backgroundSweep: {
    ...StyleSheet.absoluteFillObject
  },
  backgroundOrbTop: {
    position: "absolute",
    top: -200,
    right: -140,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "rgba(243, 183, 78, 0.2)"
  },
  backgroundOrbBottom: {
    position: "absolute",
    bottom: -220,
    left: -170,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(223, 154, 31, 0.14)"
  },
  backgroundGlow: {
    position: "absolute",
    top: "34%",
    alignSelf: "center",
    width: 450,
    height: 450,
    borderRadius: 225,
    backgroundColor: "rgba(255, 255, 255, 0.52)"
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
    flex: 1
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
    fontSize: theme.typography.display,
    fontWeight: "700"
  },
  subtitle: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body
  },
  awardDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(243, 183, 78, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(243, 183, 78, 0.42)",
    alignItems: "center",
    justifyContent: "center"
  },
  awardDotEmoji: {
    fontSize: 13
  },
  sectionCard: {
    gap: theme.spacing.sm,
    backgroundColor: "rgba(255, 252, 244, 0.9)",
    borderColor: "rgba(223, 154, 31, 0.22)"
  },
  heroCard: {
    backgroundColor: "rgba(243, 183, 78, 0.2)",
    borderColor: "rgba(243, 183, 78, 0.42)"
  },
  heroLabel: {
    color: "#9A6A1C",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  heroScore: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.display,
    fontWeight: "700"
  },
  streakPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(243, 183, 78, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(243, 183, 78, 0.4)"
  },
  streakPillText: {
    color: theme.colors.reward,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  heroAccuracyRow: {
    flexDirection: "row",
    gap: theme.spacing.lg
  },
  heroAccuracyText: {
    color: "#8F6A2B",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: theme.spacing.lg
  },
  heroStat: {
    flex: 1
  },
  heroStatLabel: {
    color: "#8F6A2B",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  heroStatValue: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  heroSubMeta: {
    color: "#9A6A1C",
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  heroMeta: {
    color: theme.colors.reward,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
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
    fontSize: theme.typography.small
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
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  bar: {
    flexDirection: "row",
    height: 8,
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
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
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
    fontSize: theme.typography.small
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
    justifyContent: "space-between"
  },
  friendName: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  },
  friendScore: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small,
    fontWeight: "600"
  },
  friendMetaRow: {
    flexDirection: "row",
    gap: theme.spacing.lg
  },
  friendMeta: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
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
