import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../theme";
import { PrimaryButton } from "../components/PrimaryButton";
import { GlassCard } from "../components/GlassCard";
import { Pill } from "../components/Pill";
import { Locale } from "../i18n";
import { Question, Quiz } from "../data/types";

type Props = {
  quiz: Quiz;
  questionIndex: number;
  selectedIndex: number | null;
  onSelectAnswer: (index: number) => void;
  onNext: () => void;
  onExit: () => void;
  locale?: Locale;
};

export function QuizScreen({
  quiz,
  questionIndex,
  selectedIndex,
  onSelectAnswer,
  onNext,
  onExit,
  locale = "en"
}: Props) {
  const insets = useSafeAreaInsets();
  const question: Question = quiz.questions[questionIndex];
  const progress = `${questionIndex + 1} / ${quiz.questions.length}`;
  const isLast = questionIndex === quiz.questions.length - 1;
  const prompt = question.prompt[locale] ?? question.prompt.en;
  const options = question.options[locale] ?? question.options.en;

  return (
    <View style={[styles.container, { paddingBottom: theme.spacing.lg + insets.bottom }]}>
      <LinearGradient
        colors={["#FFFFFF", "#F1F3F8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{quiz.title}</Text>
          <Text style={styles.subtitle}>{quiz.subtitle}</Text>
        </View>
        <Pill label={progress} />
      </View>

      <GlassCard accent={quiz.accent} style={styles.card}>
        <Text style={styles.prompt}>{prompt}</Text>
        <View style={styles.options}>
          {options.map((option, index) => {
            const isSelected = selectedIndex === index;
            return (
              <PrimaryButton
                key={`${question.id}-${index}`}
                label={option}
                onPress={() => onSelectAnswer(index)}
                variant={isSelected ? "primary" : "ghost"}
                style={styles.optionButton}
              />
            );
          })}
        </View>
      </GlassCard>

      <View style={styles.footer}>
        <PrimaryButton label="Exit" icon="times" variant="ghost" onPress={onExit} />
        <PrimaryButton
          label={isLast ? "See results" : "Next"}
          icon={isLast ? "trophy" : "arrow-right"}
          iconPosition="right"
          onPress={onNext}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg
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
  card: {
    gap: theme.spacing.lg
  },
  prompt: {
    color: theme.colors.ink,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title,
    fontWeight: "600"
  },
  options: {
    gap: theme.spacing.sm
  },
  optionButton: {
    width: "100%"
  },
  footer: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.md
  }
});
