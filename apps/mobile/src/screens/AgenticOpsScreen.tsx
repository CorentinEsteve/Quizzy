import React, { useEffect, useState } from "react";
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
import { InputField } from "../components/InputField";
import { AgenticStatusResponse } from "../data/types";

type ReviewQuestion = NonNullable<AgenticStatusResponse["latestQuiz"]>["questions"][number];

type Props = {
  locale: Locale;
  status: AgenticStatusResponse | null;
  loading: boolean;
  running: boolean;
  saving: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onRunNow: () => void;
  onSaveQuiz: (questions: ReviewQuestion[]) => void;
};

function formatUsd(value: number) {
  if (!Number.isFinite(value)) return "$0.0000";
  return `$${value.toFixed(4)}`;
}

function formatDateLabel(value: string | null) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString();
}

function formatShortDate(value: string | null) {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString();
}

function cloneQuestions(questions: ReviewQuestion[]) {
  return questions.map((question) => ({
    ...question,
    prompt: { ...question.prompt },
    options: {
      en: [...question.options.en],
      fr: [...question.options.fr]
    }
  }));
}

function modeLabel(locale: Locale, mode: string) {
  if (mode === "llm_assisted") return t(locale, "agenticOpsModeLlm");
  if (mode === "rules_only") return t(locale, "agenticOpsModeRules");
  if (mode === "fallback_only") return t(locale, "agenticOpsModeFallback");
  return mode;
}

export function AgenticOpsScreen({
  locale,
  status,
  loading,
  running,
  saving,
  onBack,
  onRefresh,
  onRunNow,
  onSaveQuiz
}: Props) {
  const insets = useSafeAreaInsets();
  const runs = status?.runs || [];
  const activeRun = status?.activeRun || null;
  const latestRun = activeRun || runs[0] || null;
  const latestRefresh = new Date().toLocaleTimeString();
  const [draftQuestions, setDraftQuestions] = useState<ReviewQuestion[]>([]);
  const latestQuiz = status?.latestQuiz || null;
  const publishedSourceCount = latestQuiz?.sources?.length || 0;
  const publishedTopicCount = latestQuiz?.topics?.length || 0;

  useEffect(() => {
    setDraftQuestions(cloneQuestions(latestQuiz?.questions || []));
  }, [latestQuiz?.runId, latestQuiz?.generatedAt, latestQuiz?.questions]);

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
              <Text style={styles.liveText}>{t(locale, "agenticOpsRunning")}</Text>
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
            disabled={running || saving}
            style={styles.runButton}
          />
          <Text style={styles.refreshText}>{t(locale, "agenticOpsRefreshAt", { time: latestRefresh })}</Text>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>{t(locale, "agenticOpsHowItWorksTitle")}</Text>
          <Text style={styles.bodyText}>{t(locale, "agenticOpsHowItWorksBody")}</Text>
          <View style={styles.ruleList}>
            <Text style={styles.ruleItem}>{`\u2022 ${t(locale, "agenticOpsRuleRecentOnly")}`}</Text>
            <Text style={styles.ruleItem}>{`\u2022 ${t(locale, "agenticOpsRuleNoRepeats")}`}</Text>
            <Text style={styles.ruleItem}>{`\u2022 ${t(locale, "agenticOpsRuleNoBank")}`}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvKey}>{t(locale, "agenticOpsOpenAiConfigured")}</Text>
            <Text style={styles.kvValue}>
              {status?.config.openAiConfigured ? t(locale, "agenticOpsYes") : t(locale, "agenticOpsNo")}
            </Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvKey}>{t(locale, "agenticOpsModelLabel")}</Text>
            <Text style={styles.kvValue}>{status?.config.model ?? "-"}</Text>
          </View>
          <Text style={styles.helperText}>{t(locale, "agenticOpsAfterRunBody")}</Text>
        </GlassCard>

        <GlassCard style={styles.card}>
          <Text style={styles.sectionTitle}>{t(locale, "agenticOpsPublishedSummary")}</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{t(locale, "agenticOpsPublishedCount")}</Text>
              <Text style={styles.metricValue}>{draftQuestions.length}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{t(locale, "agenticOpsSourceCount")}</Text>
              <Text style={styles.metricValue}>{publishedSourceCount}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>{t(locale, "agenticOpsTopicCount")}</Text>
              <Text style={styles.metricValue}>{publishedTopicCount}</Text>
            </View>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvKey}>{t(locale, "agenticOpsPublishedAt")}</Text>
            <Text style={styles.kvValue}>{formatDateLabel(latestQuiz?.generatedAt || null)}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvKey}>{t(locale, "agenticOpsMode")}</Text>
            <Text style={styles.kvValue}>{modeLabel(locale, latestQuiz?.mode || "-")}</Text>
          </View>
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
                <Text style={styles.kvValue}>{modeLabel(locale, latestRun.mode)}</Text>
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
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>{t(locale, "agenticOpsVerifiedQuestions")}</Text>
                <Text style={styles.kvValue}>{latestRun.summary.verifiedQuestions ?? 0}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>{t(locale, "agenticOpsRejectedQuestions")}</Text>
                <Text style={styles.kvValue}>{latestRun.summary.rejectedQuestions ?? 0}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>{t(locale, "agenticOpsEligibleNewsItems")}</Text>
                <Text style={styles.kvValue}>{latestRun.summary.eligibleNewsItems ?? 0}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>{t(locale, "agenticOpsFallbackQuestions")}</Text>
                <Text style={styles.kvValue}>{latestRun.summary.fallbackQuestions ?? 0}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>{t(locale, "agenticOpsRepeatedStoriesSkipped")}</Text>
                <Text style={styles.kvValue}>{latestRun.summary.repeatedStoriesSkipped ?? 0}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>{t(locale, "agenticOpsLlmAttempted")}</Text>
                <Text style={styles.kvValue}>
                  {latestRun.summary.llmAttempted ? t(locale, "agenticOpsYes") : t(locale, "agenticOpsNo")}
                </Text>
              </View>
              {latestRun.summary.llmFailureReason ? (
                <View style={styles.noteBox}>
                  <Text style={styles.noteTitle}>{t(locale, "agenticOpsWhyThisMode")}</Text>
                  <Text style={styles.noteText}>{latestRun.summary.llmFailureReason}</Text>
                </View>
              ) : null}
              {latestRun.summary.rejectedReasons &&
              Object.keys(latestRun.summary.rejectedReasons).length > 0 ? (
                <View style={styles.noteBox}>
                  <Text style={styles.noteTitle}>{t(locale, "agenticOpsRejectedReasons")}</Text>
                  <Text style={styles.noteText}>
                    {Object.entries(latestRun.summary.rejectedReasons)
                      .map(([reason, value]) => `${reason}: ${value}`)
                      .join(" | ")}
                  </Text>
                </View>
              ) : null}
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
                    {step.durationMs ? `${step.durationMs} ms` : t(locale, "agenticOpsInProgress")}
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
          <Text style={styles.sectionTitle}>{t(locale, "agenticOpsPublishedQuiz")}</Text>
          <Text style={styles.helperText}>{t(locale, "agenticOpsPublishedQuizBody")}</Text>
          {latestQuiz?.topics?.length ? (
            <View style={styles.tagWrap}>
              {latestQuiz.topics.slice(0, 6).map((topic) => (
                <View key={topic} style={styles.tagChip}>
                  <Text style={styles.tagText}>{topic}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {draftQuestions.length ? (
            <>
              {draftQuestions.map((question, index) => (
                <View key={question.id} style={styles.questionCard}>
                  <View style={styles.questionHeader}>
                    <Text style={styles.questionTitle}>
                      {t(locale, "agenticOpsQuestionN", { number: index + 1 })}
                    </Text>
                    <Pressable
                      onPress={() => {
                        setDraftQuestions((current) => current.filter((item) => item.id !== question.id));
                      }}
                      style={styles.removeButton}
                    >
                      <FontAwesome name="trash" size={14} color={theme.colors.danger} />
                    </Pressable>
                  </View>
                  <InputField
                    label={t(locale, "agenticOpsPrompt")}
                    value={question.prompt.en}
                    onChangeText={(value) => {
                      setDraftQuestions((current) =>
                        current.map((item) =>
                          item.id === question.id
                            ? { ...item, prompt: { ...item.prompt, en: value, fr: value } }
                            : item
                        )
                      );
                    }}
                  />
                  {question.options.en.map((option, optionIndex) => (
                    <InputField
                      key={`${question.id}-option-${optionIndex}`}
                      label={t(locale, "agenticOpsOptionN", { number: optionIndex + 1 })}
                      value={option}
                      onChangeText={(value) => {
                        setDraftQuestions((current) =>
                          current.map((item) => {
                            if (item.id !== question.id) return item;
                            const nextEn = [...item.options.en];
                            const nextFr = [...item.options.fr];
                            nextEn[optionIndex] = value;
                            nextFr[optionIndex] = value;
                            return {
                              ...item,
                              options: {
                                en: nextEn,
                                fr: nextFr
                              }
                            };
                          })
                        );
                      }}
                    />
                  ))}
                  <View style={styles.answerRow}>
                    {[0, 1, 2, 3].map((answerIndex) => (
                      <Pressable
                        key={`${question.id}-answer-${answerIndex}`}
                        onPress={() => {
                          setDraftQuestions((current) =>
                            current.map((item) =>
                              item.id === question.id ? { ...item, answer: answerIndex } : item
                            )
                          );
                        }}
                        style={[
                          styles.answerChip,
                          question.answer === answerIndex && styles.answerChipActive
                        ]}
                      >
                        <Text
                          style={[
                            styles.answerChipText,
                            question.answer === answerIndex && styles.answerChipTextActive
                          ]}
                        >
                          {t(locale, "agenticOpsCorrectOption", { number: answerIndex + 1 })}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.sourceText}>
                    {question.sourceName || "-"} · {formatShortDate(question.sourcePublishedAt)}
                  </Text>
                  {question.topic ? <Text style={styles.topicText}>{question.topic}</Text> : null}
                  {question.sourceUrl ? <Text style={styles.linkText}>{question.sourceUrl}</Text> : null}
                </View>
              ))}
              <PrimaryButton
                label={saving ? t(locale, "agenticOpsSaving") : t(locale, "agenticOpsSaveQuiz")}
                icon="save"
                iconPosition="right"
                onPress={() => onSaveQuiz(draftQuestions)}
                disabled={saving || running}
                style={styles.runButton}
              />
            </>
          ) : (
            <Text style={styles.muted}>{t(locale, "agenticOpsNoQuestions")}</Text>
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
                    {modeLabel(locale, run.mode)} · {run.durationMs} ms · {formatUsd(run.estimatedCostUsd)}
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
  bodyText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.ink
  },
  ruleList: {
    gap: 4
  },
  ruleItem: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.ink
  },
  helperText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.muted
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
  noteBox: {
    backgroundColor: "rgba(255, 246, 221, 0.9)",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(243, 183, 78, 0.45)",
    padding: theme.spacing.sm
  },
  noteTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.ink
  },
  noteText: {
    marginTop: 4,
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: theme.colors.ink
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
  questionCard: {
    backgroundColor: "rgba(255,255,255,0.66)",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(17, 31, 84, 0.08)",
    padding: theme.spacing.sm,
    gap: theme.spacing.sm
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  questionTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.ink
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(235, 87, 87, 0.08)"
  },
  answerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  answerChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(17,31,84,0.14)",
    backgroundColor: "rgba(255,255,255,0.9)"
  },
  answerChipActive: {
    backgroundColor: "rgba(94,124,255,0.14)",
    borderColor: "rgba(94,124,255,0.34)"
  },
  answerChipText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: theme.colors.ink
  },
  answerChipTextActive: {
    color: theme.colors.primary,
    fontWeight: "700"
  },
  sourceText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    color: theme.colors.muted
  },
  topicText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 12,
    color: theme.colors.ink,
    fontWeight: "600"
  },
  linkText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    color: theme.colors.primary
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(94,124,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(94,124,255,0.22)"
  },
  tagText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: "600"
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
