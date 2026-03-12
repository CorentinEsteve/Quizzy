import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { Locale, t } from "../i18n";
import { GlassCard } from "../components/GlassCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { AgenticStatusResponse } from "../data/types";

type Props = {
  locale: Locale;
  status: AgenticStatusResponse | null;
  loading: boolean;
  running: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onRunNow: () => void;
};

function formatUsd(value: number) {
  if (!Number.isFinite(value)) return "$0.00";
  return `$${value.toFixed(4)}`;
}

function formatDateLabel(value: string | null) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString();
}

export function AgenticOpsScreen({
  locale,
  status,
  loading,
  running,
  onBack,
  onRefresh,
  onRunNow
}: Props) {
  const insets = useSafeAreaInsets();
  const runs = status?.runs || [];
  const activeRun = status?.activeRun || null;
  const latestRun = activeRun || runs[0] || null;
  const latestRefresh = new Date().toLocaleTimeString();

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: theme.spacing.lg + insets.top,
            paddingBottom: theme.spacing.xl + insets.bottom
          }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor={theme.colors.surface}
          />
        }
      >
        <View style={styles.headerRow}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <FontAwesome name="arrow-left" size={16} color="#EAF1FF" />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{t(locale, "agenticOpsTitle")}</Text>
            <Text style={styles.subtitle}>{t(locale, "agenticOpsSubtitle")}</Text>
          </View>
        </View>

        <GlassCard style={styles.card} accent={theme.colors.reward}>
          {running || activeRun ? (
            <View style={styles.liveRow}>
              <ActivityIndicator size="small" color={theme.colors.reward} />
              <Text style={styles.liveText}>
                {running || activeRun?.status === "running"
                  ? t(locale, "agenticOpsRunning")
                  : activeRun?.status || "running"}
              </Text>
            </View>
          ) : null}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{t(locale, "agenticOpsRunsToday")}</Text>
              <Text style={styles.metricValue}>{status?.totals.todayRunCount ?? 0}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{t(locale, "agenticOpsCostToday")}</Text>
              <Text style={styles.metricValue}>
                {formatUsd(status?.totals.todayEstimatedCostUsd ?? 0)}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{t(locale, "agenticOpsQuizDate")}</Text>
              <Text style={styles.metricValue}>{status?.date ?? "-"}</Text>
            </View>
          </View>
          <PrimaryButton
            label={running ? t(locale, "agenticOpsRunning") : t(locale, "agenticOpsRunNow")}
            icon={running ? "spinner" : "play"}
            iconPosition="right"
            onPress={onRunNow}
            disabled={running}
            style={styles.runButton}
          />
          <Text style={styles.refreshText}>
            Last refresh: {latestRefresh}
          </Text>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>{t(locale, "agenticOpsLatest")}</Text>
          {latestRun ? (
            <>
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>{t(locale, "status")}</Text>
                <Text style={styles.kvValue}>{latestRun.status}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>{t(locale, "agenticOpsMode")}</Text>
                <Text style={styles.kvValue}>{latestRun.mode}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>{t(locale, "agenticOpsStarted")}</Text>
                <Text style={styles.kvValue}>{formatDateLabel(latestRun.startedAt)}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>{t(locale, "agenticOpsDuration")}</Text>
                <Text style={styles.kvValue}>{latestRun.durationMs} ms</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>{t(locale, "agenticOpsEstimatedCost")}</Text>
                <Text style={styles.kvValue}>{formatUsd(latestRun.estimatedCostUsd)}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>{t(locale, "agenticOpsChange")}</Text>
                <Text style={styles.kvValue}>
                  {latestRun.createdQuiz
                    ? t(locale, "agenticOpsCreated")
                    : latestRun.updatedQuiz
                    ? t(locale, "agenticOpsUpdated")
                    : t(locale, "agenticOpsNoChange")}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.muted}>{t(locale, "agenticOpsNoRuns")}</Text>
          )}
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>{t(locale, "agenticOpsTimeline")}</Text>
          {latestRun?.steps?.length ? (
            latestRun.steps.map((step) => (
              <View key={`${latestRun.runId}-${step.id}`} style={styles.stepRow}>
                <View style={styles.stepBullet} />
                <View style={styles.stepCopy}>
                  <Text style={styles.stepTitle}>{step.agent}</Text>
                  <Text style={styles.stepMeta}>
                    {step.status} · in {step.inputCount} · out {step.outputCount} ·{" "}
                    {step.durationMs ? `${step.durationMs} ms` : "in progress"}
                  </Text>
                  {step.notes ? <Text style={styles.stepMeta}>{step.notes}</Text> : null}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>{t(locale, "agenticOpsNoTimeline")}</Text>
          )}
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>{t(locale, "agenticOpsRecentRuns")}</Text>
          {runs.length ? (
            runs.slice(0, 8).map((run) => (
              <View key={run.runId} style={styles.runRow}>
                <View style={styles.runBadge}>
                  <Text style={styles.runBadgeText}>{run.status.toUpperCase()}</Text>
                </View>
                <View style={styles.runCopy}>
                  <Text style={styles.runTitle}>{run.quizDate}</Text>
                  <Text style={styles.runMeta}>
                    {run.mode} · {run.durationMs} ms · {formatUsd(run.estimatedCostUsd)}
                  </Text>
                </View>
              </View>
            ))
          ) : loading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <Text style={styles.muted}>{t(locale, "agenticOpsNoRuns")}</Text>
          )}
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
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)"
  },
  headerCopy: {
    flex: 1
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 24,
    color: theme.colors.surface,
    fontWeight: "700"
  },
  subtitle: {
    marginTop: 2,
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: "rgba(236, 242, 255, 0.84)"
  },
  card: {
    gap: theme.spacing.sm
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: "rgba(255,255,255,0.74)",
    borderColor: "rgba(243,183,78,0.46)",
    borderWidth: 1,
    borderRadius: theme.radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  liveText: {
    fontFamily: theme.typography.fontFamily,
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: "600"
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.sm
  },
  metricItem: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.64)",
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(17, 31, 84, 0.08)"
  },
  metricLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: theme.colors.muted
  },
  metricValue: {
    marginTop: 4,
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    color: theme.colors.ink,
    fontWeight: "700"
  },
  runButton: {
    marginTop: theme.spacing.sm
  },
  refreshText: {
    marginTop: 6,
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    color: theme.colors.muted
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 16,
    color: theme.colors.ink,
    fontWeight: "700"
  },
  muted: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    color: theme.colors.muted
  },
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.md
  },
  kvKey: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    color: theme.colors.muted
  },
  kvValue: {
    flex: 1,
    textAlign: "right",
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    color: theme.colors.ink,
    fontWeight: "600"
  },
  stepRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    alignItems: "flex-start",
    paddingVertical: 6
  },
  stepBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: theme.colors.primary
  },
  stepCopy: {
    flex: 1,
    gap: 2
  },
  stepTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    color: theme.colors.ink,
    fontWeight: "700"
  },
  stepMeta: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: theme.colors.muted
  },
  runRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: 6
  },
  runBadge: {
    minWidth: 54,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(94,124,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(94,124,255,0.3)",
    alignItems: "center"
  },
  runBadgeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: "700"
  },
  runCopy: {
    flex: 1
  },
  runTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    color: theme.colors.ink,
    fontWeight: "600"
  },
  runMeta: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: theme.colors.muted
  }
});
