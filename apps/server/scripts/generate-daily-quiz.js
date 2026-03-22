#!/usr/bin/env node
// Usage:
//   node scripts/generate-daily-quiz.js           → generates for today (UTC)
//   node scripts/generate-daily-quiz.js 2026-03-22 → generates for a specific date

import "dotenv/config";
import { generateDailyQuiz } from "../src/agenticDailyQuiz.js";

const dateArg = process.argv[2];
const dateKey = dateArg || new Date().toISOString().slice(0, 10);

if (dateArg && !/^\d{4}-\d{2}-\d{2}$/.test(dateArg)) {
  console.error("Invalid date format. Use YYYY-MM-DD.");
  process.exit(1);
}

console.log(`Generating daily quiz for ${dateKey}...`);

generateDailyQuiz(dateKey)
  .then(({ questions, logPath }) => {
    console.log(`\nDone. ${questions} questions published.`);
    console.log(`Review log: ${logPath}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Failed:", err.message);
    process.exit(1);
  });
