import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDailyQuiz,
  buildRuleDraftQuestions,
  verifyQuestions
} from "../src/agenticDailyQuiz.js";

test("buildRuleDraftQuestions creates 4-option questions tied to feed items", () => {
  const newsItems = [
    {
      title: "Alpha summit opens in Geneva",
      link: "https://news/a",
      description: "A",
      publishedAt: "2026-03-12T06:00:00Z",
      source: "Feed A"
    },
    {
      title: "Beta markets close higher",
      link: "https://news/b",
      description: "B",
      publishedAt: "2026-03-12T05:00:00Z",
      source: "Feed B"
    },
    {
      title: "Gamma mission launches",
      link: "https://news/c",
      description: "C",
      publishedAt: "2026-03-12T04:00:00Z",
      source: "Feed C"
    },
    {
      title: "Delta election heads to runoff",
      link: "https://news/d",
      description: "D",
      publishedAt: "2026-03-12T03:00:00Z",
      source: "Feed D"
    }
  ];

  const draft = buildRuleDraftQuestions({ dateKey: "2026-03-12", newsItems, count: 2 });
  assert.equal(draft.length, 2);
  assert.equal(draft[0].options.en.length, 4);
  assert.ok(Number.isInteger(draft[0].answer));
  assert.ok(draft[0].agentMeta.sourceUrl.startsWith("https://"));
});

test("verifyQuestions accepts correctly grounded questions and rejects tampered answers", () => {
  const newsItems = [
    {
      title: "Alpha summit opens in Geneva",
      link: "https://news/a",
      description: "A",
      publishedAt: "2026-03-12T06:00:00Z",
      source: "Feed A"
    },
    {
      title: "Beta markets close higher",
      link: "https://news/b",
      description: "B",
      publishedAt: "2026-03-12T05:00:00Z",
      source: "Feed B"
    },
    {
      title: "Gamma mission launches",
      link: "https://news/c",
      description: "C",
      publishedAt: "2026-03-12T04:00:00Z",
      source: "Feed C"
    },
    {
      title: "Delta election heads to runoff",
      link: "https://news/d",
      description: "D",
      publishedAt: "2026-03-12T03:00:00Z",
      source: "Feed D"
    }
  ];

  const [good] = buildRuleDraftQuestions({ dateKey: "2026-03-12", newsItems, count: 1 });
  const bad = {
    ...good,
    options: {
      en: [...good.options.en],
      fr: [...good.options.fr]
    },
    answer: 0
  };
  bad.options.en[0] = "Tampered answer";

  const result = verifyQuestions({ questions: [good, bad], newsItems });
  assert.equal(result.accepted.length, 1);
  assert.equal(result.rejected.length, 1);
});

test("buildDailyQuiz creates a complete recent-news daily payload", () => {
  const [question] = buildRuleDraftQuestions({
    dateKey: "2026-03-12",
    newsItems: [
      {
        title: "Alpha summit opens in Geneva",
        link: "https://news/a",
        description: "Leaders meet in Geneva for a new summit.",
        publishedAt: "2026-03-12T06:00:00Z",
        source: "Feed A"
      },
      {
        title: "Beta markets close higher",
        link: "https://news/b",
        description: "Stocks finish the day higher.",
        publishedAt: "2026-03-12T05:00:00Z",
        source: "Feed B"
      },
      {
        title: "Gamma mission launches",
        link: "https://news/c",
        description: "A space mission launches successfully.",
        publishedAt: "2026-03-12T04:00:00Z",
        source: "Feed C"
      },
      {
        title: "Delta election heads to runoff",
        link: "https://news/d",
        description: "The election will go to a runoff vote.",
        publishedAt: "2026-03-12T03:00:00Z",
        source: "Feed D"
      }
    ],
    count: 1
  });

  const quiz = buildDailyQuiz({
    dateKey: "2026-03-12",
    questions: [question],
    runId: "run_1",
    mode: "rules_only",
    generatedAt: "2026-03-12T08:00:00Z"
  });

  assert.equal(quiz.id, "daily_2026-03-12");
  assert.equal(quiz.questions.length, 1);
  assert.equal(quiz.meta.runId, "run_1");
  assert.equal(quiz.subtitle, "1 recent news questions");
});
