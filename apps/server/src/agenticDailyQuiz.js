import Anthropic from "@anthropic-ai/sdk";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { supabase } from "./db.js";
import { fetchRecentNews } from "./newsFeeds.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(__dirname, "..", "logs");

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic();
}

function parseJsonArray(text) {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("No JSON array found in response");
  return JSON.parse(match[0]);
}

async function generateCandidates(client, articles) {
  const summaries = articles
    .slice(0, 45)
    .map((a, i) => `[${i + 1}] [${a.category}] ${a.source}: ${a.title}. ${a.description}`.slice(0, 320))
    .join("\n");

  const prompt = `You are a quiz question writer for a general audience news quiz app. \
Based on the following recent news articles, generate 20 multiple-choice quiz questions.

RULES:
- Questions must be broad and educational — avoid overly specific details (exact vote counts, precise dates, minor local names)
- Questions should be answerable by an informed general audience, not just specialists
- Topics must be diverse: cover different categories (world events, science, technology, business, culture, health, sport, environment)
- Each question must have exactly 4 answer options, exactly 1 is correct
- Questions can be about events or facts from 2025–2026
- Both English and French versions required; translations must be natural and accurate
- "source_indices" field: list which article numbers [1], [2]... inspired this question

Return a JSON array of exactly 20 objects. Each object must follow this format exactly:
{
  "id": "c1",
  "prompt": { "en": "...", "fr": "..." },
  "options": { "en": ["A", "B", "C", "D"], "fr": ["A", "B", "C", "D"] },
  "answer": 0,
  "source_indices": [1]
}

NEWS ARTICLES:
${summaries}

Return only the JSON array, no other text.`;

  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }]
  });

  const candidates = parseJsonArray(message.content[0].text.trim());
  if (!Array.isArray(candidates) || candidates.length < 10) {
    throw new Error(`Generation returned too few candidates: ${candidates.length}`);
  }
  return candidates;
}

async function verifyAndFilter(client, candidates) {
  const prompt = `You are a quiz quality reviewer. Review these 20 candidate questions and select the best 10 for a daily news quiz.

SELECTION CRITERIA:
- Remove questions that are too similar to each other (keep the more interesting one)
- Remove questions that are too specific (exact numbers, obscure minor names, highly local events)
- Remove questions where the correct answer could be disputed
- Ensure the final 10 cover diverse topics — no more than 2 questions per broad category
- Ensure French translations are accurate and natural
- Prefer questions that are interesting, surprising, or educational for a broad audience

Return a JSON array of exactly 10 objects. Keep the exact same format (id, prompt, options, answer, source_indices) — do NOT rename the ids.

CANDIDATES:
${JSON.stringify(candidates, null, 2)}

Return only the JSON array, no other text.`;

  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }]
  });

  const questions = parseJsonArray(message.content[0].text.trim());
  if (!Array.isArray(questions) || questions.length < 8) {
    throw new Error(`Verification returned too few questions: ${questions.length}`);
  }
  return questions.slice(0, 10);
}

async function writeLog(dateKey, { articles, candidates, questions }) {
  await mkdir(LOG_DIR, { recursive: true });

  const log = {
    date: dateKey,
    generated_at: new Date().toISOString(),
    articles_fetched: articles.length,
    sources_used: [...new Set(articles.map((a) => a.source))],
    candidates_generated: candidates.length,
    final_questions: questions.map((q, i) => ({
      index: i + 1,
      id: q.id,
      prompt_en: q.prompt?.en ?? "",
      prompt_fr: q.prompt?.fr ?? "",
      options_en: q.options?.en ?? [],
      correct_answer: q.options?.en?.[q.answer] ?? "",
      answer_index: q.answer,
      source_articles: (q.source_indices || [])
        .map((idx) => {
          const a = articles[idx - 1];
          return a ? { source: a.source, title: a.title, link: a.link, category: a.category } : null;
        })
        .filter(Boolean)
    }))
  };

  const logPath = join(LOG_DIR, `quiz-${dateKey}.json`);
  await writeFile(logPath, JSON.stringify(log, null, 2), "utf8");
  console.log(`[agenticDailyQuiz] Log written: ${logPath}`);
  return logPath;
}

async function publishToDb(dateKey, questions) {
  const cleanQuestions = questions.map((q, i) => ({
    id: `news_${dateKey}_${i + 1}`,
    prompt: q.prompt,
    options: q.options,
    answer: q.answer
  }));

  const quiz = {
    id: `daily_${dateKey}`,
    categoryId: "daily",
    categoryLabel: "Daily Quiz",
    title: "Daily Quiz",
    subtitle: `${cleanQuestions.length} questions`,
    rounds: cleanQuestions.length,
    accent: "#F3B74E",
    questions: cleanQuestions
  };

  const { error } = await supabase.from("daily_quizzes").upsert({
    date: dateKey,
    quiz_json: quiz,
    created_at: new Date().toISOString()
  });

  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  return quiz;
}

export async function generateDailyQuiz(dateKey) {
  console.log(`[agenticDailyQuiz] Starting pipeline for ${dateKey}`);
  const client = getClient();

  // Stage 1: fetch news
  const articles = await fetchRecentNews();
  console.log(`[agenticDailyQuiz] Fetched ${articles.length} articles from ${[...new Set(articles.map((a) => a.source))].length} sources`);
  if (articles.length < 10) throw new Error(`Too few articles fetched: ${articles.length}`);

  // Stage 2: generate 20 candidates
  console.log("[agenticDailyQuiz] Generating candidates...");
  const candidates = await generateCandidates(client, articles);
  console.log(`[agenticDailyQuiz] Generated ${candidates.length} candidates`);

  // Stage 3: verify & select best 10
  console.log("[agenticDailyQuiz] Verifying and filtering...");
  const questions = await verifyAndFilter(client, candidates);
  console.log(`[agenticDailyQuiz] Selected ${questions.length} final questions`);

  // Stage 4: write log (before publish so it's saved even if publish fails)
  const logPath = await writeLog(dateKey, { articles, candidates, questions });

  // Stage 5: publish to DB
  await publishToDb(dateKey, questions);
  console.log("[agenticDailyQuiz] Published to database");

  return { questions: questions.length, logPath };
}
