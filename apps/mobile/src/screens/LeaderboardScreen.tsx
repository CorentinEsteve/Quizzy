import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { GlassCard } from "../components/GlassCard";
import { LeaderboardResponse } from "../data/types";
import { rewardDefinitions } from "../data/rewards";

type Props = {
  locale: Locale;
  global: LeaderboardResponse | null;
  local: LeaderboardResponse | null;
  loading: boolean;
  onBack: () => void;
};

export function LeaderboardScreen({ locale, global, local, loading, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const globalEntries = global?.entries || [];
  const localEntries = local?.entries || [];
  const myRank = local?.me?.rank ?? null;

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

        <View style={styles.summaryRow}>
          <GlassCard style={[styles.summaryCard, styles.summaryHighlight]}>
            <Text style={styles.summaryTitle}>{t(locale, "topGlobal")}</Text>
            <Text style={styles.summaryValue}>
              {globalEntries[0] ? `#1 ${globalEntries[0].displayName}` : "-"}
            </Text>
          </GlassCard>
          <GlassCard style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{t(locale, "topLocal")}</Text>
            <Text style={styles.summaryValue}>
              {localEntries[0] ? `#1 ${localEntries[0].displayName}` : "-"}
            </Text>
          </GlassCard>
        </View>

        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t(locale, "topGlobal")}</Text>
          {loading ? (
            <Text style={styles.sectionMeta}>{t(locale, "pleaseWait")}</Text>
          ) : (
            globalEntries.map((entry) => (
              <View key={`g-${entry.userId}`} style={styles.row}>
                <Text style={styles.rowText}>#{entry.rank} {entry.displayName}</Text>
                <Text style={styles.rowMeta}>{entry.score}</Text>
              </View>
            ))
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
            localEntries.map((entry) => (
              <View key={`l-${entry.userId}`} style={styles.row}>
                <Text style={styles.rowText}>#{entry.rank} {entry.displayName}</Text>
                <Text style={styles.rowMeta}>{entry.score}</Text>
              </View>
            ))
          )}
          {!loading && localEntries.length === 0 ? (
            <Text style={styles.sectionMeta}>-</Text>
          ) : null}
          <View style={styles.meRow}>
            <Text style={styles.meLabel}>{t(locale, "yourRank")}</Text>
            <Text style={styles.meValue}>{myRank ? `#${myRank}` : "-"}</Text>
          </View>
        </GlassCard>

        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t(locale, "badges")}</Text>
          <Text style={styles.sectionMeta}>{t(locale, "badgesSubtitle")}</Text>
          {rewardDefinitions.map((reward) => (
            <View key={reward.id} style={styles.rewardRow}>
              <Text style={styles.rewardEmoji}>{reward.emoji}</Text>
              <View style={styles.rewardCopy}>
                <Text style={styles.rewardTitle}>{t(locale, reward.titleKey)}</Text>
                <Text style={styles.rewardBody}>{t(locale, reward.descriptionKey)}</Text>
              </View>
            </View>
          ))}
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
    borderColor: "rgba(243, 183, 78, 0.45)"
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
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
  meRow: {
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  meLabel: {
    color: theme.colors.muted,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.small
  },
  meValue: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body,
    fontWeight: "600"
  }
});
