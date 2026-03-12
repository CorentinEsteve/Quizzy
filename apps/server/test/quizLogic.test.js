import test from "node:test";
import assert from "node:assert/strict";
import {
  computeAnswerStats,
  computeDailyCounts,
  computeScore,
  sanitizeQuiz
} from "../src/quizLogic.js";

test("sanitizeQuiz removes answer keys and keeps question content", () => {
  const quiz = {
    id: "quiz_1",
    title: "General Knowledge",
    questions: [
      { id: "q1", prompt: "2 + 2", options: ["3", "4"], answer: 1 },
      { id: "q2", prompt: "Sky color", options: ["Blue", "Green"], answer: 0 }
    ]
  };

  const sanitized = sanitizeQuiz(quiz);

  assert.equal(sanitized.questions[0].answer, undefined);
  assert.equal(sanitized.questions[1].answer, undefined);
  assert.deepEqual(sanitized.questions[0], {
    id: "q1",
    prompt: "2 + 2",
    options: ["3", "4"]
  });
  assert.equal(quiz.questions[0].answer, 1);
});

test("computeDailyCounts counts only answered questions and splits correct/wrong", () => {
  const quiz = {
    questions: [
      { id: "q1", answer: 1 },
      { id: "q2", answer: 0 },
      { id: "q3", answer: 2 }
    ]
  };
  const answers = [
    { questionId: "q1", answerIndex: 1 },
    { questionId: "q2", answerIndex: 2 }
  ];

  assert.deepEqual(computeDailyCounts(quiz, answers), { correct: 1, wrong: 1 });
});

test("computeScore returns user score based on matching quiz answers", () => {
  const quiz = {
    questions: [
      { id: "q1", answer: 1 },
      { id: "q2", answer: 0 }
    ]
  };
  const answers = [
    { user_id: "u1", question_id: "q1", answer_index: 1 },
    { user_id: "u1", question_id: "q2", answer_index: 2 },
    { user_id: "u2", question_id: "q1", answer_index: 0 }
  ];

  assert.equal(computeScore(quiz, answers, "u1"), 1);
  assert.equal(computeScore(quiz, answers, "u2"), 0);
});

test("computeAnswerStats aggregates correct and wrong answers per user", () => {
  const quiz = {
    questions: [
      { id: "q1", answer: 0 },
      { id: "q2", answer: 2 }
    ]
  };
  const answers = [
    { user_id: "u1", question_id: "q1", answer_index: 0 },
    { user_id: "u1", question_id: "q2", answer_index: 1 },
    { user_id: "u2", question_id: "q2", answer_index: 2 },
    { user_id: "u3", question_id: "unknown", answer_index: 1 }
  ];

  assert.deepEqual(computeAnswerStats(quiz, answers), {
    u1: { correctCount: 1, wrongCount: 1 },
    u2: { correctCount: 1, wrongCount: 0 }
  });
});
