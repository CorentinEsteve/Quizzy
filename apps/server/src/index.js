import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { randomBytes } from "crypto";
import { Server as SocketServer } from "socket.io";
import bcrypt from "bcryptjs";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { supabase } from "./db.js";
import { authMiddleware, signToken, verifyToken } from "./auth.js";
import { quizzes } from "./quizzes.js";
import { computeAnswerStats, computeDailyCounts, computeScore, sanitizeQuiz } from "./quizLogic.js";
import { Resend } from "resend";
import { sendNativePush } from "./push.js";
import {
  buildDailyQuiz,
  buildQuestionFingerprint,
  buildRuleDraftQuestions,
  estimateCostUsd,
  fetchNewsItems,
  rewriteDraftWithLlm,
  summarizeRunForApi,
  summarizeTopics,
  verifyQuestions
} from "./agenticDailyQuiz.js";

const app = express();
const httpServer = createServer(app);
const corsOrigin = process.env.CORS_ORIGIN || "*";
const io = new SocketServer(httpServer, {
  cors: { origin: corsOrigin }
});

const port = process.env.PORT || 3001;
const APP_NAME = process.env.APP_NAME || "Quiz App";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "onboarding@resend.dev";
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${port}`;
const DEFAULT_SUPPORT_URL = `${APP_BASE_URL}/support`;
const SUPPORT_URL = process.env.SUPPORT_URL || DEFAULT_SUPPORT_URL;
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || "";
const EMAIL_FROM = process.env.EMAIL_FROM || SUPPORT_EMAIL;
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM = process.env.RESEND_FROM || EMAIL_FROM;
const resendClient = EMAIL_PROVIDER === "resend" && RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || "";
const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
const PUSH_DEVICE_TABLE = "push_devices";
const MIN_ROOM_PLAYERS_TO_START = 2;
const MIN_MULTIPLAYER_ROOM_CAPACITY = 3;
const configuredMaxRoomPlayers = Number.parseInt(process.env.MAX_ROOM_PLAYERS || "", 10);
const MAX_ROOM_PLAYERS =
  Number.isInteger(configuredMaxRoomPlayers) &&
  configuredMaxRoomPlayers >= MIN_MULTIPLAYER_ROOM_CAPACITY
    ? configuredMaxRoomPlayers
    : 8;
const DAILY_AGENT_RUNS_TABLE = "daily_quiz_agent_runs";
const DAILY_AGENT_MODEL = process.env.DAILY_AGENT_MODEL || "gpt-4.1-mini";
const DAILY_AGENT_OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const DAILY_AGENT_OPENAI_BASE_URL =
  process.env.DAILY_AGENT_OPENAI_BASE_URL || "https://api.openai.com/v1/responses";
const DAILY_AGENT_INPUT_COST_PER_1M = Number(process.env.OPENAI_INPUT_COST_PER_1M || 0.3);
const DAILY_AGENT_OUTPUT_COST_PER_1M = Number(process.env.OPENAI_OUTPUT_COST_PER_1M || 1.2);
const DAILY_AGENT_RUN_HISTORY_LIMIT = 60;

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

const inMemoryAgentRuns = [];
const dailyGenerationLocks = new Map();
const activeAgentRuns = new Map();
let agentRunsTableAvailable = true;

function isRelationMissing(error, relationName) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("relation") &&
    message.includes(String(relationName || "").toLowerCase()) &&
    message.includes("does not exist")
  );
}

function pushAgentRunInMemory(record) {
  inMemoryAgentRuns.unshift(record);
  if (inMemoryAgentRuns.length > DAILY_AGENT_RUN_HISTORY_LIMIT) {
    inMemoryAgentRuns.length = DAILY_AGENT_RUN_HISTORY_LIMIT;
  }
}

function roundMoney(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Number(amount.toFixed(6));
}

function isAgenticAdminUser(req) {
  return String(req?.user?.email || "").trim().toLowerCase() === "nova@me.com";
}

function requireAgenticAdmin(req, res, next) {
  if (!isAgenticAdminUser(req)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
}

const rateBuckets = new Map();
function rateLimit({ windowMs, max }) {
  return (req, res, next) => {
    const key = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const now = Date.now();
    const bucket = rateBuckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }
    bucket.count += 1;
    rateBuckets.set(key, bucket);
    if (bucket.count > max) {
      return res.status(429).json({ error: "Too many requests" });
    }
    return next();
  };
}

function nowIso() {
  return new Date().toISOString();
}

function withTimeout(promise, label, ms = 8000) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout: ${label}`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function isValidEmail(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function normalizeCountry(value) {
  if (typeof value !== "string" || !value.trim()) return "US";
  return value.trim().toUpperCase();
}

function generateCode() {
  const letters = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i += 1) {
    code += letters[Math.floor(Math.random() * letters.length)];
  }
  return code;
}

async function generateUniqueRoomCode() {
  let code = generateCode();
  while (await getRoomByCode(code)) {
    code = generateCode();
  }
  return code;
}

function appleEmailVerified(value) {
  if (value === true) return true;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

function buildAppleDisplayName(fullName, email) {
  if (fullName && typeof fullName === "object") {
    const parts = [
      fullName.givenName,
      fullName.middleName,
      fullName.familyName
    ]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean);
    if (parts.length > 0) return parts.join(" ");
  }
  if (typeof email === "string" && email.includes("@")) {
    return email.split("@")[0] || "Player";
  }
  return "Player";
}

async function verifyAppleIdentityToken(identityToken) {
  if (!APPLE_CLIENT_ID) {
    throw new Error("APPLE_CLIENT_ID not configured");
  }
  const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
    issuer: APPLE_ISSUER,
    audience: APPLE_CLIENT_ID
  });
  return payload;
}

async function getCustomQuiz(quizId) {
  const { data, error } = await supabase
    .from("room_quizzes")
    .select("quiz_json")
    .eq("quiz_id", quizId)
    .maybeSingle();
  if (error || !data) return null;
  if (typeof data.quiz_json === "string") {
    try {
      return JSON.parse(data.quiz_json);
    } catch (_err) {
      return null;
    }
  }
  return data.quiz_json;
}

async function getAllCustomQuizzes() {
  const { data, error } = await supabase.from("room_quizzes").select("quiz_json");
  if (error || !data) return [];
  return data
    .map((row) => {
      if (typeof row.quiz_json === "string") {
        try {
          return JSON.parse(row.quiz_json);
        } catch (_err) {
          return null;
        }
      }
      return row.quiz_json;
    })
    .filter(Boolean);
}

async function getQuiz(quizId) {
  const custom = await getCustomQuiz(quizId);
  return custom || quizzes.find((quiz) => quiz.id === quizId);
}

async function saveCustomQuiz(quiz) {
  await supabase.from("room_quizzes").upsert({
    quiz_id: quiz.id,
    quiz_json: quiz,
    created_at: nowIso()
  });
}

function shuffle(items) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function dateKeyFromOffset(offsetMinutes) {
  const minutes =
    Number.isFinite(offsetMinutes) && Math.abs(offsetMinutes) <= 14 * 60
      ? offsetMinutes
      : 0;
  const localMs = Date.now() - minutes * 60 * 1000;
  return new Date(localMs).toISOString().slice(0, 10);
}

function todayKey(offsetMinutes) {
  return dateKeyFromOffset(offsetMinutes);
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(seed) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(items, seedValue) {
  const list = [...items];
  const random = mulberry32(hashString(seedValue));
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

const answerByQuestionId = new Map(
  quizzes
    .flatMap((quiz) => quiz.questions)
    .map((question) => [question.id, question.answer])
);

function hydrateQuizAnswers(quiz) {
  if (!quiz || typeof quiz !== "object" || !Array.isArray(quiz.questions)) return quiz;
  let patched = false;
  const questions = quiz.questions.map((question) => {
    if (!question || typeof question !== "object") return question;
    if (typeof question.answer === "number") return question;
    const answer = answerByQuestionId.get(question.id);
    if (typeof answer !== "number") return question;
    patched = true;
    return { ...question, answer };
  });
  return patched ? { ...quiz, questions } : quiz;
}

async function getDailyQuiz(dateKey) {
  const result = await ensureDailyQuizGenerated(dateKey);
  return result?.quiz || null;
}

async function readStoredDailyQuiz(dateKey) {
  const { data, error } = await supabase
    .from("daily_quizzes")
    .select("quiz_json, created_at")
    .eq("date", dateKey)
    .maybeSingle();
  if (error) {
    console.warn("[daily] unable to read stored quiz", error);
    return null;
  }
  if (!data?.quiz_json) return null;
  if (typeof data.quiz_json === "string") {
    try {
      return { quiz: hydrateQuizAnswers(JSON.parse(data.quiz_json)), createdAt: data.created_at || null };
    } catch (_err) {
      return null;
    }
  }
  return { quiz: hydrateQuizAnswers(data.quiz_json), createdAt: data.created_at || null };
}

function buildAgenticQuizReview(quiz) {
  if (!quiz || !Array.isArray(quiz.questions)) return [];
  return quiz.questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: question.options,
    answer: typeof question.answer === "number" ? question.answer : null,
    sourceName: question.agentMeta?.sourceName || null,
    sourceUrl: question.agentMeta?.sourceUrl || null,
    sourcePublishedAt: question.agentMeta?.sourcePublishedAt || null,
    topic: question.agentMeta?.topic || null,
    verificationMode: question.agentMeta?.verificationMode || null
  }));
}

async function saveDailyQuizRecord(dateKey, quiz) {
  const payload = {
    date: dateKey,
    quiz_json: quiz,
    created_at: nowIso()
  };
  const { error } = await supabase.from("daily_quizzes").upsert(payload);
  return error || null;
}

async function listRecentDailyQuizFingerprints({ excludeDateKey, limit = 30 } = {}) {
  const { data, error } = await supabase
    .from("daily_quizzes")
    .select("date, quiz_json")
    .order("date", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("[daily-agent] unable to read recent quiz history", error);
    return {
      sourceUrls: new Set(),
      topics: new Set(),
      prompts: new Set(),
      fingerprints: new Set()
    };
  }

  const sourceUrls = new Set();
  const topics = new Set();
  const prompts = new Set();
  const fingerprints = new Set();

  for (const row of data || []) {
    if (row?.date === excludeDateKey) continue;
    try {
      const rawQuiz = typeof row?.quiz_json === "string" ? JSON.parse(row.quiz_json) : row?.quiz_json;
      const quiz = hydrateQuizAnswers(rawQuiz);
      const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];
      for (const question of questions) {
        const sourceUrl = String(question?.agentMeta?.sourceUrl || "").trim().toLowerCase();
        const topic = String(question?.agentMeta?.topic || "").trim().toLowerCase();
        const prompt = String(question?.prompt?.en || "").trim().toLowerCase();
        if (sourceUrl) sourceUrls.add(sourceUrl);
        if (topic) topics.add(topic);
        if (prompt) prompts.add(prompt);
        const fingerprint = buildQuestionFingerprint(question);
        if (fingerprint) fingerprints.add(String(fingerprint).trim().toLowerCase());
      }
    } catch (_error) {
      continue;
    }
  }

  return { sourceUrls, topics, prompts, fingerprints };
}

function createAgentStep(id, agent, inputCount = 0) {
  return {
    id,
    agent,
    status: "running",
    inputCount,
    outputCount: 0,
    model: null,
    estimatedCostUsd: 0,
    startedAt: nowIso(),
    finishedAt: null,
    durationMs: 0,
    notes: ""
  };
}

function completeAgentStep(step, patch = {}) {
  const finishedAt = nowIso();
  const durationMs =
    new Date(finishedAt).getTime() - new Date(step.startedAt).getTime();
  return {
    ...step,
    ...patch,
    finishedAt,
    durationMs: Number.isFinite(durationMs) ? durationMs : 0
  };
}

function buildDraftWithPossibleRewrite(ruleDraft, rewrittenCandidates) {
  if (!Array.isArray(ruleDraft) || ruleDraft.length === 0) return [];
  const byId = new Map(
    (rewrittenCandidates || []).map((item) => [item.id, item])
  );
  return ruleDraft.map((question) => {
    const rewritten = byId.get(question.id);
    if (!rewritten?.prompt?.en) return question;
    return {
      ...question,
      prompt: {
        en: rewritten.prompt.en,
        fr: rewritten.prompt.fr || rewritten.prompt.en
      }
    };
  });
}

function buildRunRecordBase(dateKey, trigger) {
  return {
    runId: `${dateKey}-${randomBytes(6).toString("hex")}`,
    quizDate: dateKey,
    trigger: trigger || "auto",
    status: "running",
    mode: "rules_only",
    startedAt: nowIso(),
    finishedAt: null,
    durationMs: 0,
    createdQuiz: false,
    updatedQuiz: false,
    estimatedCostUsd: 0,
    error: null,
    summary: {
      llmConfigured: Boolean(DAILY_AGENT_OPENAI_KEY),
      llmAttempted: false,
      llmUsed: false,
      llmReturnedQuestions: 0,
      llmFailureReason: null
    },
    steps: []
  };
}

async function runAgenticDailyPipeline(dateKey, trigger = "auto", onProgress) {
  const run = buildRunRecordBase(dateKey, trigger);
  let newsItems = [];
  let feedStats = { feedCount: 0, succeededFeeds: 0, failedFeeds: 0 };
  let ruleDraft = [];
  let draftQuestions = [];
  let verified = { accepted: [], rejected: [] };
  let recentHistory = {
    sourceUrls: new Set(),
    topics: new Set(),
    prompts: new Set(),
    fingerprints: new Set()
  };
  let llmUsed = false;
  let llmFailureReason = null;
  let llmReturnedQuestions = 0;
  const emitProgress = () => {
    if (typeof onProgress === "function") {
      onProgress(summarizeRunForApi(run));
    }
  };

  try {
    emitProgress();
    const scoutStep = createAgentStep("scout", "Scout Agent");
    run.steps.push(scoutStep);
    const scout = await fetchNewsItems({});
    newsItems = scout.items || [];
    feedStats = {
      feedCount: scout.feedCount || 0,
      succeededFeeds: scout.succeededFeeds || 0,
      failedFeeds: scout.failedFeeds || 0
    };
    run.steps[run.steps.length - 1] = completeAgentStep(scoutStep, {
      status: "ok",
      outputCount: newsItems.length,
      notes: `Fetched ${newsItems.length} headlines from ${feedStats.succeededFeeds}/${feedStats.feedCount} feeds`
    });
    emitProgress();

    recentHistory = await listRecentDailyQuizFingerprints({ excludeDateKey: dateKey, limit: 45 });

    const draftStep = createAgentStep("draft", "Draft Agent", newsItems.length);
    run.steps.push(draftStep);
    ruleDraft = buildRuleDraftQuestions({
      dateKey,
      newsItems,
      count: 14,
      excludedSourceUrls: Array.from(recentHistory.sourceUrls),
      excludedTopics: Array.from(recentHistory.topics)
    });
    draftQuestions = ruleDraft;

    if (DAILY_AGENT_OPENAI_KEY && ruleDraft.length > 0) {
      run.summary.llmAttempted = true;
      const rewritten = await rewriteDraftWithLlm({
        draftQuestions: ruleDraft,
        dateKey,
        apiKey: DAILY_AGENT_OPENAI_KEY,
        model: DAILY_AGENT_MODEL,
        endpoint: DAILY_AGENT_OPENAI_BASE_URL
      });
      llmReturnedQuestions = rewritten.questions?.length || 0;
      if (rewritten.questions?.length > 0) {
        llmUsed = true;
        draftQuestions = buildDraftWithPossibleRewrite(ruleDraft, rewritten.questions);
      } else {
        llmFailureReason = rewritten.error || "OpenAI returned no usable prompt rewrites";
      }
      const llmCost = estimateCostUsd(rewritten.usage, {
        inputPer1M: DAILY_AGENT_INPUT_COST_PER_1M,
        outputPer1M: DAILY_AGENT_OUTPUT_COST_PER_1M
      });
      run.steps[run.steps.length - 1] = completeAgentStep(draftStep, {
        status: "ok",
        outputCount: draftQuestions.length,
        model: llmUsed ? DAILY_AGENT_MODEL : null,
        estimatedCostUsd: llmCost,
        notes: llmUsed
          ? "OpenAI rewrite applied to draft prompts"
          : `Rule-based drafting${llmFailureReason ? ` (${llmFailureReason})` : ""}`,
      });
    } else {
      llmFailureReason = DAILY_AGENT_OPENAI_KEY ? "No questions available for rewrite" : "OPENAI_API_KEY not configured on server";
      run.steps[run.steps.length - 1] = completeAgentStep(draftStep, {
        status: "ok",
        outputCount: draftQuestions.length,
        notes: `Rule-based drafting (${llmFailureReason})`
      });
    }
    emitProgress();

    const verifyStep = createAgentStep("verify", "Verifier Agent", draftQuestions.length);
    run.steps.push(verifyStep);
    verified = verifyQuestions({
      questions: draftQuestions,
      newsItems
    });
    verified.accepted = verified.accepted.filter((question) => {
      const sourceUrl = String(question?.agentMeta?.sourceUrl || "").trim().toLowerCase();
      const topic = String(question?.agentMeta?.topic || "").trim().toLowerCase();
      const prompt = String(question?.prompt?.en || "").trim().toLowerCase();
      const fingerprint = String(buildQuestionFingerprint(question) || "").trim().toLowerCase();
      return !(
        recentHistory.sourceUrls.has(sourceUrl) ||
        recentHistory.topics.has(topic) ||
        recentHistory.prompts.has(prompt) ||
        recentHistory.fingerprints.has(fingerprint)
      );
    });
    run.steps[run.steps.length - 1] = completeAgentStep(verifyStep, {
      status: "ok",
      outputCount: verified.accepted.length,
      notes: `${verified.accepted.length} accepted, ${verified.rejected.length} rejected`
    });
    emitProgress();

    const editorStep = createAgentStep("editor", "Editor Agent", verified.accepted.length);
    run.steps.push(editorStep);
    const finalQuestions = verified.accepted.slice(0, 10);
    if (finalQuestions.length === 0) {
      throw new Error("No recent news questions passed verification");
    }
    run.mode = llmUsed ? "llm_assisted" : "rules_only";
    const finalQuiz = buildDailyQuiz({
      dateKey,
      questions: finalQuestions,
      runId: run.runId,
      mode: run.mode,
      generatedAt: nowIso()
    });
    run.steps[run.steps.length - 1] = completeAgentStep(editorStep, {
      status: "ok",
      outputCount: finalQuestions.length,
      notes: `Published ${finalQuestions.length} recent-news questions`
    });
    emitProgress();

    run.status = "ok";
    run.finishedAt = nowIso();
    run.durationMs = new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime();
    run.estimatedCostUsd = roundMoney(
      run.steps.reduce((sum, step) => sum + Number(step.estimatedCostUsd || 0), 0)
    );
    run.summary = {
      ...run.summary,
      feedCount: feedStats.feedCount,
      succeededFeeds: feedStats.succeededFeeds,
      failedFeeds: feedStats.failedFeeds,
      headlinesFetched: newsItems.length,
      eligibleNewsItems: ruleDraft.length,
      draftedQuestions: ruleDraft.length,
      verifiedQuestions: verified.accepted.length,
      fallbackQuestions: 0,
      repeatedStoriesSkipped: recentHistory.sourceUrls.size,
      topics: summarizeTopics(newsItems, 8),
      llmUsed,
      llmReturnedQuestions,
      llmFailureReason
    };
    emitProgress();
    return { run, quiz: finalQuiz };
  } catch (error) {
    run.status = "failed";
    run.error = error instanceof Error ? error.message : "Unknown pipeline error";
    run.finishedAt = nowIso();
    run.durationMs = new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime();
    run.summary = {
      ...run.summary,
      feedCount: feedStats.feedCount,
      succeededFeeds: feedStats.succeededFeeds,
      failedFeeds: feedStats.failedFeeds,
      headlinesFetched: newsItems.length,
      eligibleNewsItems: ruleDraft.length,
      draftedQuestions: ruleDraft.length,
      verifiedQuestions: verified.accepted.length,
      fallbackQuestions: 0,
      repeatedStoriesSkipped: recentHistory.sourceUrls.size,
      topics: summarizeTopics(newsItems, 8),
      llmUsed,
      llmReturnedQuestions,
      llmFailureReason
    };
    emitProgress();
    return { run, quiz: null };
  }
}

function normalizeRunRow(row) {
  const parseJson = (value) => {
    if (!value) return null;
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch (_err) {
        return null;
      }
    }
    return value;
  };
  return summarizeRunForApi({
    runId: row.run_id,
    quizDate: row.quiz_date,
    status: row.status,
    mode: row.mode,
    trigger: row.trigger,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationMs: row.duration_ms,
    createdQuiz: row.created_quiz,
    updatedQuiz: row.updated_quiz,
    estimatedCostUsd: row.estimated_cost_usd,
    error: row.error_text,
    summary: parseJson(row.summary_json) || {},
    steps: parseJson(row.steps_json) || []
  });
}

async function saveAgentRun(run) {
  try {
    const summarized = summarizeRunForApi(run);
    pushAgentRunInMemory(summarized);
    if (!agentRunsTableAvailable) return;
    const payload = {
      run_id: run.runId,
      quiz_date: run.quizDate,
      status: run.status,
      mode: run.mode,
      trigger: run.trigger,
      started_at: run.startedAt,
      finished_at: run.finishedAt,
      duration_ms: run.durationMs,
      created_quiz: Boolean(run.createdQuiz),
      updated_quiz: Boolean(run.updatedQuiz),
      estimated_cost_usd: roundMoney(run.estimatedCostUsd),
      error_text: run.error || null,
      summary_json: run.summary || {},
      steps_json: run.steps || []
    };
    const { error } = await supabase.from(DAILY_AGENT_RUNS_TABLE).insert(payload);
    if (error) {
      if (isRelationMissing(error, DAILY_AGENT_RUNS_TABLE)) {
        agentRunsTableAvailable = false;
        return;
      }
      console.warn("[daily-agent] unable to save run", error);
    }
  } catch (error) {
    console.warn("[daily-agent] saveAgentRun threw unexpectedly", error);
  }
}

async function listAgentRuns(limit = 12) {
  const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), DAILY_AGENT_RUN_HISTORY_LIMIT);
  if (!agentRunsTableAvailable) {
    return inMemoryAgentRuns.slice(0, safeLimit);
  }
  const { data, error } = await supabase
    .from(DAILY_AGENT_RUNS_TABLE)
    .select("*")
    .order("started_at", { ascending: false })
    .limit(safeLimit);
  if (error) {
    if (isRelationMissing(error, DAILY_AGENT_RUNS_TABLE)) {
      agentRunsTableAvailable = false;
      return inMemoryAgentRuns.slice(0, safeLimit);
    }
    console.warn("[daily-agent] unable to read run history", error);
    return inMemoryAgentRuns.slice(0, safeLimit);
  }
  return (data || []).map((row) => normalizeRunRow(row));
}

async function ensureDailyQuizGenerated(dateKey, options = {}) {
  const { force = false, trigger = "auto" } = options;
  const existingLock = dailyGenerationLocks.get(dateKey);
  if (existingLock) return existingLock;

  const task = (async () => {
    if (!force) {
      const existing = await readStoredDailyQuiz(dateKey);
      if (existing?.quiz) {
        return { quiz: existing.quiz, generated: false, run: null };
      }
    }

    const before = await readStoredDailyQuiz(dateKey);
    const pipelineResult = await runAgenticDailyPipeline(dateKey, trigger, (progressRun) => {
      activeAgentRuns.set(dateKey, progressRun);
    });
    const quizToSave = pipelineResult.quiz;
    if (!quizToSave) {
      await saveAgentRun(pipelineResult.run);
      if (before?.quiz) {
        return { quiz: before.quiz, generated: false, run: summarizeRunForApi(pipelineResult.run) };
      }
      return { quiz: null, generated: false, run: summarizeRunForApi(pipelineResult.run) };
    }

    const error = await saveDailyQuizRecord(dateKey, quizToSave);
    if (error) {
      console.warn("[daily-agent] unable to save quiz", error);
      await saveAgentRun(pipelineResult.run);
      return {
        quiz: before?.quiz || null,
        generated: false,
        run: summarizeRunForApi(pipelineResult.run)
      };
    }

    pipelineResult.run.createdQuiz = !before;
    pipelineResult.run.updatedQuiz = Boolean(before);
    await saveAgentRun(pipelineResult.run);

    const result = {
      quiz: hydrateQuizAnswers(quizToSave),
      generated: true,
      run: summarizeRunForApi(pipelineResult.run)
    };
    activeAgentRuns.delete(dateKey);
    return result;
  })().finally(() => {
    dailyGenerationLocks.delete(dateKey);
    activeAgentRuns.delete(dateKey);
  });

  dailyGenerationLocks.set(dateKey, task);
  return task;
}

async function getAgenticDailyStatus(dateKey, limit = 12) {
  const runs = await listAgentRuns(limit);
  const storedQuiz = await readStoredDailyQuiz(dateKey);
  const latestQuiz = storedQuiz?.quiz
    ? {
        id: storedQuiz.quiz.id,
        title: storedQuiz.quiz.title,
        subtitle: storedQuiz.quiz.subtitle,
        rounds: storedQuiz.quiz.rounds,
        generatedAt: storedQuiz.quiz?.meta?.generatedAt || storedQuiz.createdAt || null,
        runId: storedQuiz.quiz?.meta?.runId || null,
        mode: storedQuiz.quiz?.meta?.generationMode || "unknown",
        topics: Array.isArray(storedQuiz.quiz?.meta?.topics) ? storedQuiz.quiz.meta.topics : [],
        sources: Array.isArray(storedQuiz.quiz?.meta?.sources) ? storedQuiz.quiz.meta.sources : [],
        questions: buildAgenticQuizReview(storedQuiz.quiz)
      }
    : null;
  const todayRuns = runs.filter((run) => run.quizDate === dateKey);
  const activeRun = activeAgentRuns.get(dateKey) || null;
  return {
    date: dateKey,
    latestQuiz,
    activeRun,
    runs,
    config: {
      openAiConfigured: Boolean(DAILY_AGENT_OPENAI_KEY),
      model: DAILY_AGENT_MODEL
    },
    totals: {
      runCount: runs.length,
      todayRunCount: todayRuns.length,
      todayEstimatedCostUsd: roundMoney(
        todayRuns.reduce((sum, run) => sum + Number(run.estimatedCostUsd || 0), 0)
      ),
      allEstimatedCostUsd: roundMoney(
        runs.reduce((sum, run) => sum + Number(run.estimatedCostUsd || 0), 0)
      )
    }
  };
}

async function getDailyAnswers(dateKey, userId) {
  const { data } = await supabase
    .from("daily_answers")
    .select("question_id, answer_index")
    .eq("quiz_date", dateKey)
    .eq("user_id", userId);
  return (
    data?.map((row) => ({ questionId: row.question_id, answerIndex: row.answer_index })) ||
    []
  );
}

async function getFriendCandidates(userId, limit = 5) {
  const { data: roomRows } = await supabase
    .from("room_players")
    .select("room_id")
    .eq("user_id", userId);
  const roomIds = roomRows?.map((row) => row.room_id) || [];
  if (roomIds.length === 0) return [];

  const { data: playerRows } = await supabase
    .from("room_players")
    .select("room_id, user_id")
    .in("room_id", roomIds);
  const { data: users } = await supabase
    .from("users")
    .select("id, display_name")
    .in(
      "id",
      Array.from(new Set((playerRows || []).map((row) => row.user_id)))
    );
  const userMap = new Map(users?.map((u) => [u.id, u.display_name]) || []);

  const counts = new Map();
  (playerRows || []).forEach((row) => {
    if (row.user_id === userId) return;
    const current = counts.get(row.user_id) || { matchCount: 0 };
    current.matchCount += 1;
    counts.set(row.user_id, current);
  });

  return Array.from(counts.entries())
    .map(([id, stats]) => ({
      userId: id,
      displayName: userMap.get(id) || "Player",
      matchCount: stats.matchCount
    }))
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, limit);
}

async function buildDailyResults(dateKey, userId) {
  const quiz = await getDailyQuiz(dateKey);
  if (!quiz) return null;
  const totalQuestions = quiz.questions.length;
  if (totalQuestions === 0) return null;

  const myAnswers = await getDailyAnswers(dateKey, userId);
  if (myAnswers.length < totalQuestions) return null;

  const { data: allAnswers } = await supabase
    .from("daily_answers")
    .select("user_id, question_id, answer_index")
    .eq("quiz_date", dateKey);

  const answerKey = new Map(quiz.questions.map((question) => [question.id, question.answer]));
  const statsByUser = new Map();
  (allAnswers || []).forEach((answer) => {
    const stats = statsByUser.get(answer.user_id) || { answered: 0, correct: 0, wrong: 0 };
    stats.answered += 1;
    const correctIndex = answerKey.get(answer.question_id);
    if (answer.answer_index === correctIndex) {
      stats.correct += 1;
    } else {
      stats.wrong += 1;
    }
    statsByUser.set(answer.user_id, stats);
  });

  const participants = statsByUser.size;
  const completedEntries = Array.from(statsByUser.entries()).filter(
    ([, stats]) => stats.answered >= totalQuestions
  );
  const completedPlayers = completedEntries.length;
  const scores = completedEntries.map(([, stats]) => stats.correct);
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  const averageScore = completedPlayers ? Number((totalScore / completedPlayers).toFixed(1)) : 0;
  const averageCorrectPct = completedPlayers
    ? Math.round((totalScore / (completedPlayers * totalQuestions)) * 100)
    : 0;
  const averageWrongPct = completedPlayers ? 100 - averageCorrectPct : 0;

  const myStats = statsByUser.get(userId) || { answered: 0, correct: 0, wrong: 0 };
  const higherCount = scores.filter((score) => score > myStats.correct).length;
  const rank = completedPlayers ? higherCount + 1 : null;
  const percentile = completedPlayers
    ? Math.round(((completedPlayers - higherCount) / completedPlayers) * 100)
    : null;
  const myCorrectPct = Math.round((myStats.correct / totalQuestions) * 100);
  const myWrongPct = Math.round((myStats.wrong / totalQuestions) * 100);

  return {
    date: dateKey,
    totalQuestions,
    participants,
    completedPlayers,
    my: {
      score: myStats.correct,
      correct: myStats.correct,
      wrong: myStats.wrong,
      correctPct: myCorrectPct,
      wrongPct: myWrongPct,
      rank,
      percentile
    },
    global: {
      averageScore,
      correctPct: averageCorrectPct,
      wrongPct: averageWrongPct
    }
  };
}

function getCategoryMeta(categoryId) {
  if (categoryId === "all") {
    return {
      id: "all",
      label: "All Categories",
      accent: "#5E7CFF"
    };
  }
  const quiz = quizzes.find((item) => item.categoryId === categoryId);
  return quiz
    ? { id: quiz.categoryId, label: quiz.categoryLabel, accent: quiz.accent }
    : null;
}

function buildCategoryQuiz(categoryId, questionCount) {
  const pool =
    categoryId === "all"
      ? quizzes.flatMap((quiz) => quiz.questions)
      : quizzes
          .filter((quiz) => quiz.categoryId === categoryId)
          .flatMap((quiz) => quiz.questions);
  if (pool.length === 0) return null;
  if (questionCount > pool.length) return null;

  const meta = getCategoryMeta(categoryId);
  if (!meta) return null;
  const selected = shuffle(pool).slice(0, questionCount);
  return {
    id: `custom_${categoryId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    categoryId: meta.id,
    categoryLabel: meta.label,
    title: meta.label,
    subtitle: `${questionCount} questions`,
    rounds: questionCount,
    accent: meta.accent,
    questions: selected
  };
}

async function getRoomByCode(code) {
  const { data, error } = await supabase.from("rooms").select("*").eq("code", code).maybeSingle();
  if (error) return null;
  return data;
}

const ACTIVE_ROLES = new Set(["host", "guest"]);

async function getRoomPlayers(roomId, options = {}) {
  const { includeInvited = false } = options;
  const { data } = await supabase
    .from("room_players")
    .select("user_id, role, users(display_name)")
    .eq("room_id", roomId);
  const players =
    data?.map((row) => ({
      id: row.user_id,
      displayName: row.users?.display_name ?? "Player",
      role: row.role
    })) || [];
  if (includeInvited) return players;
  return players.filter((player) => player.role !== "invited");
}

async function getRoomInvites(roomId) {
  const players = await getRoomPlayers(roomId, { includeInvited: true });
  return players.filter((player) => player.role === "invited");
}

async function isRoomMember(roomId, userId) {
  const { data } = await supabase
    .from("room_players")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

async function getRoomAnswers(roomId) {
  const { data } = await supabase.from("room_answers").select("*").eq("room_id", roomId);
  return data || [];
}

async function getRoomRematch(roomId) {
  const { data } = await supabase
    .from("room_rematch")
    .select("user_id")
    .eq("room_id", roomId);
  return (data || []).map((row) => ({ userId: row.user_id }));
}

async function startRematchRoom(room, players) {
  const publicCode = room.code;
  const archivedCode = await generateUniqueRoomCode();
  const now = nowIso();
  const participants = players.filter((player) => player.role !== "invited");

  const { data: archivedRows } = await supabase
    .from("rooms")
    .update({ code: archivedCode })
    .eq("id", room.id)
    .eq("code", publicCode)
    .eq("status", "complete")
    .select("id")
    .limit(1);
  if (!archivedRows?.length) {
    return getRoomByCode(publicCode);
  }

  const currentQuiz = await getQuiz(room.quiz_id);
  const nextQuiz = currentQuiz
    ? buildCategoryQuiz(currentQuiz.categoryId || "all", currentQuiz.questions.length)
    : null;
  if (nextQuiz) await saveCustomQuiz(nextQuiz);

  const { data: newRoom, error: createError } = await supabase
    .from("rooms")
    .insert({
      code: publicCode,
      mode: room.mode,
      quiz_id: nextQuiz ? nextQuiz.id : room.quiz_id,
      status: "active",
      host_user_id: room.host_user_id,
      created_at: now,
      started_at: now,
      current_index: 0,
      completed_at: null
    })
    .select("*")
    .single();
  if (createError || !newRoom) {
    await supabase.from("rooms").update({ code: publicCode }).eq("id", room.id);
    return room;
  }

  const roster = participants.map((player) => ({
    room_id: newRoom.id,
    user_id: player.id,
    role:
      player.id === room.host_user_id
        ? "host"
        : ACTIVE_ROLES.has(player.role)
          ? player.role
          : "guest",
    joined_at: now
  }));
  if (!roster.length) {
    await supabase.from("rooms").delete().eq("id", newRoom.id);
    await supabase.from("rooms").update({ code: publicCode }).eq("id", room.id);
    return room;
  }

  const { error: rosterError } = await supabase.from("room_players").insert(roster);
  if (rosterError) {
    await supabase.from("rooms").delete().eq("id", newRoom.id);
    await supabase.from("rooms").update({ code: publicCode }).eq("id", room.id);
    return room;
  }

  await supabase.from("room_rematch").delete().eq("room_id", room.id);
  return newRoom;
}

async function getAllAnswers() {
  const { data } = await supabase.from("room_answers").select("*");
  return data || [];
}

async function getAllUsers() {
  const { data } = await supabase
    .from("users")
    .select("id, display_name, email, country, deleted_at");
  return (data || [])
    .filter((user) => !user.deleted_at)
    .map((user) => ({
      id: user.id,
      displayName: user.display_name,
      email: user.email,
      country: user.country
    }));
}

async function computeLeaderboard(scope, country) {
  const users = (await getAllUsers()).map((user) => ({
    ...user,
    country: user.country || "US",
    score: 0,
    answered: 0
  }));
  const answers = await getAllAnswers();

  const answerMap = new Map();
  const customQuizzes = await getAllCustomQuizzes();
  for (const quiz of [...quizzes, ...customQuizzes]) {
    for (const question of quiz.questions) {
      answerMap.set(question.id, question.answer);
    }
  }

  const scoreByUser = new Map();
  answers.forEach((answer) => {
    const correct = answerMap.get(answer.question_id);
    if (correct === undefined) return;
    const key = answer.user_id;
    const current = scoreByUser.get(key) || { score: 0, answered: 0 };
    current.answered += 1;
    if (answer.answer_index === correct) current.score += 1;
    scoreByUser.set(key, current);
  });

  const enriched = users.map((user) => {
    const stats = scoreByUser.get(user.id) || { score: 0, answered: 0 };
    return { ...user, ...stats };
  });

  const filtered =
    scope === "country"
      ? enriched.filter((user) => user.country === (country || "US"))
      : enriched;

  const sorted = filtered.sort((a, b) => b.score - a.score || b.answered - a.answered);
  const entries = sorted.map((user, index) => ({
    rank: index + 1,
    userId: user.id,
    displayName: user.displayName,
    country: user.country,
    score: user.score
  }));

  return entries;
}

async function getBadges() {
  const { data } = await supabase.from("badges").select("id, title, description");
  return data || [];
}

async function getUserBadges(userId) {
  const { data } = await supabase
    .from("user_badges")
    .select("badge_id, earned_at")
    .eq("user_id", userId);
  return (data || []).map((row) => ({ badgeId: row.badge_id, earnedAt: row.earned_at }));
}

async function awardBadge(userId, badgeId) {
  const { data } = await supabase
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", userId)
    .eq("badge_id", badgeId)
    .maybeSingle();
  if (data) return;
  await supabase.from("user_badges").insert({
    user_id: userId,
    badge_id: badgeId,
    earned_at: nowIso()
  });
}

async function awardBadgesForRoom(roomId) {
  const { data: room } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
  if (!room) return;
  const quiz = await getQuiz(room.quiz_id);
  if (!quiz) return;
  const answers = await getRoomAnswers(roomId);
  const players = await getRoomPlayers(roomId);

  for (const player of players) {
    const score = computeScore(quiz, answers, player.id);
    const answeredCount = answers.filter((item) => item.user_id === player.id).length;
    if (answeredCount > 0) {
      await awardBadge(player.id, "dual_spark");
    }
    if (score >= 3) {
      await awardBadge(player.id, "focus_glow");
    }
  }

  const allAnswers = await getAllAnswers();
  for (const player of players) {
    const totalCorrect = allAnswers
      .filter((item) => item.user_id === player.id)
      .reduce((acc, item) => {
        const correct = quizzes
          .flatMap((quizItem) => quizItem.questions)
          .find((question) => question.id === item.question_id)?.answer;
        return acc + (item.answer_index === correct ? 1 : 0);
      }, 0);
    if (totalCorrect >= 10) {
      await awardBadge(player.id, "calm_streak");
    }
  }
}

async function roomState(room) {
  const quiz = await getQuiz(room.quiz_id);
  const players = await getRoomPlayers(room.id);
  const invites = await getRoomInvites(room.id);
  const answers = await getRoomAnswers(room.id);
  const rematch = await getRoomRematch(room.id);
  const statsByUser = computeAnswerStats(quiz, answers);
  const progress = players.map((player) => {
    const answeredCount = answers.filter((item) => item.user_id === player.id).length;
    return {
      userId: player.id,
      answeredCount,
      correctCount: statsByUser[player.id]?.correctCount ?? 0,
      wrongCount: statsByUser[player.id]?.wrongCount ?? 0
    };
  });

  return {
    code: room.code,
    mode: room.mode,
    status: room.status,
    maxPlayers: MAX_ROOM_PLAYERS,
    currentIndex: room.current_index,
    quiz,
    players,
    invites,
    progress,
    rematchReady: rematch.map((item) => item.userId)
  };
}

async function emitRoomUpdateToMembers(roomOrCode) {
  const room = typeof roomOrCode === "string" ? await getRoomByCode(roomOrCode) : roomOrCode;
  if (!room) return null;
  const state = await roomState(room);
  const members = await getRoomPlayers(room.id, { includeInvited: true });
  members.forEach((member) => {
    io.to(`user:${member.id}`).emit("room:update", state);
  });
  return state;
}

function isPushTableMissing(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("relation") && message.includes("push_devices") && message.includes("does not exist");
}

async function upsertPushDevice(userId, payload) {
  const token = typeof payload?.token === "string" ? payload.token.trim() : "";
  const provider = typeof payload?.provider === "string" ? payload.provider.trim().toLowerCase() : "";
  const platform = typeof payload?.platform === "string" ? payload.platform.trim().toLowerCase() : "";
  if (!token) throw new Error("Missing push token");
  if (!["apns", "fcm"].includes(provider)) throw new Error("Invalid push provider");
  if (!["ios", "android"].includes(platform)) throw new Error("Invalid push platform");

  const { error } = await supabase.from(PUSH_DEVICE_TABLE).upsert(
    {
      user_id: userId,
      provider,
      token,
      platform,
      last_seen_at: nowIso(),
      updated_at: nowIso(),
      disabled_at: null,
      last_error: null
    },
    { onConflict: "provider,token" }
  );
  if (error) throw error;
}

async function removePushDevice(userId, payload) {
  const provider = typeof payload?.provider === "string" ? payload.provider.trim().toLowerCase() : "";
  const token = typeof payload?.token === "string" ? payload.token.trim() : "";
  let query = supabase.from(PUSH_DEVICE_TABLE).delete().eq("user_id", userId);
  if (provider) query = query.eq("provider", provider);
  if (token) query = query.eq("token", token);
  const { error } = await query;
  if (error) throw error;
}

async function listPushDevicesForUsers(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) return [];
  const uniqueIds = Array.from(new Set(userIds.map((id) => Number(id)).filter(Boolean)));
  if (uniqueIds.length === 0) return [];
  const { data, error } = await supabase
    .from(PUSH_DEVICE_TABLE)
    .select("id, user_id, provider, token, platform")
    .in("user_id", uniqueIds)
    .is("disabled_at", null);
  if (error) throw error;
  return data || [];
}

async function getUserCountriesById(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) return new Map();
  const uniqueIds = Array.from(new Set(userIds.map((id) => Number(id)).filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();
  const { data, error } = await supabase.from("users").select("id, country").in("id", uniqueIds);
  if (error) throw error;
  return new Map((data || []).map((row) => [row.id, String(row.country || "US").toUpperCase()]));
}

function resolvePushCopy(eventType, country, fallbackTitle, fallbackBody) {
  const isFrench = String(country || "").toUpperCase() === "FR";
  const copyByEvent = {
    invite_received: {
      en: { title: "New room invite", body: "You have been invited to a Qwizzy room." },
      fr: { title: "Nouvelle invitation", body: "Tu as ete invite dans un salon Qwizzy." }
    },
    host_player_joined: {
      en: { title: "Player joined your room", body: "A player joined your lobby." },
      fr: { title: "Un joueur a rejoint ton salon", body: "Un joueur est arrive dans ton salon." }
    },
    room_started: {
      en: { title: "Match started", body: "Your duel is now live." },
      fr: { title: "Match lance", body: "Ton duel a commence." }
    },
    rematch_requested: {
      en: { title: "Rematch requested", body: "Another player is ready for another round." },
      fr: { title: "Revanche demandee", body: "Un joueur est pret pour une nouvelle manche." }
    },
    your_turn: {
      en: { title: "Your turn", body: "Time to answer in your duel." },
      fr: { title: "A toi de jouer", body: "C'est le moment de repondre dans ton duel." }
    },
    match_complete: {
      en: { title: "Match finished", body: "Results are ready." },
      fr: { title: "Match termine", body: "Les resultats sont prets." }
    }
  };

  const eventCopy = eventType && copyByEvent[eventType] ? copyByEvent[eventType] : null;
  if (!eventCopy) {
    return { title: fallbackTitle, body: fallbackBody };
  }
  return isFrench ? eventCopy.fr : eventCopy.en;
}

async function disablePushDevice(deviceId, errorMessage) {
  if (!deviceId) return;
  await supabase
    .from(PUSH_DEVICE_TABLE)
    .update({
      disabled_at: nowIso(),
      last_error: errorMessage || "Invalid device token",
      updated_at: nowIso()
    })
    .eq("id", deviceId);
}

async function sendPushToUsers(userIds, payload) {
  if (!Array.isArray(userIds) || userIds.length === 0) return;
  try {
    const devices = await listPushDevicesForUsers(userIds);
    if (devices.length === 0) return;
    const countryByUserId = await getUserCountriesById(devices.map((device) => device.user_id));
    await Promise.all(
      devices.map(async (device) => {
        const localized = resolvePushCopy(
          payload?.data?.eventType,
          countryByUserId.get(device.user_id),
          payload.title,
          payload.body
        );
        const result = await sendNativePush(device, { ...payload, ...localized });
        if (result.invalidToken) {
          await disablePushDevice(device.id, result.error);
          return;
        }
        if (!result.ok && result.error) {
          await supabase
            .from(PUSH_DEVICE_TABLE)
            .update({ last_error: result.error, updated_at: nowIso() })
            .eq("id", device.id);
        }
      })
    );
  } catch (error) {
    if (!isPushTableMissing(error)) {
      console.warn("[push] unable to send push notifications", error);
    }
  }
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/health/push", async (req, res) => {
  const apnsConfigured = Boolean(
    process.env.APNS_TEAM_ID &&
      process.env.APNS_KEY_ID &&
      process.env.APNS_PRIVATE_KEY &&
      process.env.APNS_BUNDLE_ID
  );
  const fcmConfigured = Boolean(
    process.env.FCM_PROJECT_ID && process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY
  );

  let pushDevicesTableAvailable = true;
  let pushDevicesCount = 0;
  try {
    const { count, error } = await supabase
      .from(PUSH_DEVICE_TABLE)
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    pushDevicesCount = count || 0;
  } catch (error) {
    pushDevicesTableAvailable = false;
    if (!isPushTableMissing(error)) {
      console.warn("[push-health] unexpected push table check failure", error);
    }
  }

  res.json({
    status: "ok",
    apnsConfigured,
    apnsUseProduction:
      (process.env.APNS_USE_PRODUCTION || "true").toLowerCase() !== "false",
    fcmConfigured,
    pushDevicesTableAvailable,
    pushDevicesCount
  });
});

function renderLegalPage(title, bodyHtml) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title} - ${APP_NAME}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #f5f6f8; color: #111827; }
      main { max-width: 760px; margin: 32px auto; background: #fff; padding: 32px; border-radius: 16px; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08); }
      h1 { margin-top: 0; font-size: 28px; }
      h2 { margin-top: 24px; font-size: 18px; }
      p, li { line-height: 1.6; color: #374151; }
      ul { padding-left: 20px; }
      small { color: #6b7280; }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      ${bodyHtml}
      <p><small>Last updated: ${new Date().toISOString().slice(0, 10)}</small></p>
    </main>
  </body>
</html>`;
}

function renderSimplePage(title, bodyHtml) {
  return renderLegalPage(title, bodyHtml);
}

function createToken() {
  return randomBytes(32).toString("hex");
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function sendEmail({ to, subject, html }) {
  if (!EMAIL_PROVIDER) {
    throw new Error("EMAIL_PROVIDER not configured");
  }
  if (EMAIL_PROVIDER === "resend") {
    if (!resendClient) {
      throw new Error("RESEND_API_KEY not configured");
    }
    return resendClient.emails.send({
      from: RESEND_FROM,
      to,
      subject,
      html
    });
  }
  throw new Error("Unsupported email provider");
}
app.get("/legal/privacy", (req, res) => {
  const supportLine = SUPPORT_URL
    ? `<p>Contact: ${SUPPORT_URL}</p>`
    : `<p>Contact: ${SUPPORT_EMAIL}</p>`;
  const html = renderLegalPage(
    "Privacy Policy",
    `
      <p><strong>Effective date:</strong> ${new Date().getFullYear()}</p>
      <p>${APP_NAME} collects only the information needed to provide the quiz experience, run multiplayer matches, and keep your account secure. We do not sell personal data and we do not use it for advertising.</p>
      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account data:</strong> email address, display name, and profile preferences.</li>
        <li><strong>Gameplay data:</strong> quiz answers, match results, scores, badges, and leaderboards.</li>
        <li><strong>Location (country only):</strong> used for leaderboard filtering.</li>
        <li><strong>Device data:</strong> notification token if you enable notifications.</li>
        <li><strong>Support messages:</strong> content you send us when contacting support.</li>
      </ul>
      <h2>How we use your data</h2>
      <ul>
        <li>Create and secure your account.</li>
        <li>Run multiplayer rooms and show stats, badges, and leaderboards.</li>
        <li>Send verification, password reset, and security emails.</li>
        <li>Send match notifications (only if you enable them).</li>
        <li>Provide customer support and troubleshoot issues.</li>
      </ul>
      <h2>Legal bases</h2>
      <ul>
        <li><strong>Contract:</strong> to provide the core service you requested.</li>
        <li><strong>Legitimate interests:</strong> to keep the service secure and reliable.</li>
        <li><strong>Consent:</strong> for optional notifications.</li>
      </ul>
      <h2>Service providers</h2>
      <ul>
        <li><strong>Supabase</strong> (database, authentication).</li>
        <li><strong>Render</strong> (API hosting).</li>
        <li><strong>Resend</strong> (transactional email delivery).</li>
      </ul>
      <h2>Data retention</h2>
      <ul>
        <li>You can delete your account in the app at any time.</li>
        <li>Account deletion removes profile data and game history from our active systems.</li>
        <li>We may retain limited logs for security and fraud prevention for a short period.</li>
      </ul>
      <h2>Your choices and rights</h2>
      <ul>
        <li>Update your profile in the app.</li>
        <li>Request an export of your data in the app.</li>
        <li>Delete your account in the app.</li>
        <li>For EU/UK users, you have rights of access, correction, deletion, and objection.</li>
      </ul>
      <h2>International transfers</h2>
      <p>Your data may be processed outside your country. We use providers with appropriate safeguards for international transfers.</p>
      <h2>Children</h2>
      <p>${APP_NAME} is not directed to children under 13. If you believe a child has provided personal data, contact us to remove it.</p>
      <h2>Contact</h2>
      ${supportLine}
    `
  );
  res.type("html").send(html);
});

app.get("/support", (req, res) => {
  const html = renderSimplePage(
    "Support",
    `
      <p>Need help with ${APP_NAME}? We are here to help.</p>
      <h2>Contact</h2>
      <ul>
        <li>Email: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></li>
        <li>Support URL: <a href="${SUPPORT_URL}">${SUPPORT_URL}</a></li>
      </ul>
      <h2>Before contacting support</h2>
      <ul>
        <li>Open your profile and verify your email status.</li>
        <li>Make sure you are using the latest app version.</li>
        <li>Try signing out and signing back in if a screen is stuck.</li>
      </ul>
      <h2>Include this in your message</h2>
      <ul>
        <li>Your platform (iOS/Android).</li>
        <li>A short description of the issue.</li>
        <li>Steps to reproduce it.</li>
      </ul>
      <p>You can also review our <a href="${APP_BASE_URL}/legal/privacy">Privacy Policy</a> and <a href="${APP_BASE_URL}/legal/terms">Terms of Service</a>.</p>
    `
  );
  res.type("html").send(html);
});

app.get("/legal/terms", (req, res) => {
  const supportLine = SUPPORT_URL
    ? `<p>Contact: ${SUPPORT_URL}</p>`
    : `<p>Contact: ${SUPPORT_EMAIL}</p>`;
  const html = renderLegalPage(
    "Terms of Service",
    `
      <p>By using ${APP_NAME}, you agree to play fairly and respect other players.</p>
      <h2>Accounts</h2>
      <ul>
        <li>You are responsible for keeping your login credentials secure.</li>
        <li>We may suspend accounts that abuse the service.</li>
        <li>You can deactivate or delete your account in the app.</li>
      </ul>
      <h2>Content</h2>
      <ul>
        <li>Quiz content is provided for entertainment and education.</li>
        <li>You may not copy or redistribute content without permission.</li>
      </ul>
      <h2>Availability</h2>
      <ul>
        <li>We work to keep the service available but do not guarantee uptime.</li>
      </ul>
      <h2>Contact</h2>
      ${supportLine}
    `
  );
  res.type("html").send(html);
});

app.get("/quizzes", (req, res) => {
  res.json(
    quizzes.map(({ questions, ...rest }) => ({
      ...rest,
      questionCount: questions.length
    }))
  );
});

app.get("/daily-quiz", authMiddleware, async (req, res) => {
  const tzOffset = Number(req.query.tzOffset);
  const dateKey = todayKey(tzOffset);
  const quiz = await getDailyQuiz(dateKey);
  if (!quiz) {
    return res.status(500).json({ error: "Unable to load daily quiz" });
  }
  const answers = await getDailyAnswers(dateKey, req.user.id);
  const counts = computeDailyCounts(quiz, answers);
  const totalQuestions = quiz.questions.length;
  const answeredCount = answers.length;
  const completed = totalQuestions > 0 && answeredCount >= totalQuestions;

  res.json({
    date: dateKey,
    quiz,
    answers,
    answeredCount,
    correctCount: counts.correct,
    wrongCount: counts.wrong,
    totalQuestions,
    completed
  });
});

app.post("/daily-quiz/answer", authMiddleware, async (req, res) => {
  const { questionId, answerIndex, tzOffset } = req.body;
  const dateKey = todayKey(Number(tzOffset));
  const quiz = await getDailyQuiz(dateKey);
  if (!quiz) {
    return res.status(500).json({ error: "Unable to load daily quiz" });
  }
  const question = quiz.questions.find((item) => item.id === questionId);
  if (!question) {
    return res.status(400).json({ error: "Invalid question" });
  }
  const maxIndex = question.options?.en?.length ?? 0;
  if (!Number.isInteger(answerIndex) || answerIndex < -1 || answerIndex >= maxIndex) {
    return res.status(400).json({ error: "Invalid answer" });
  }

  await supabase.from("daily_answers").upsert(
    {
      quiz_date: dateKey,
      user_id: req.user.id,
      question_id: questionId,
      answer_index: answerIndex,
      answered_at: nowIso()
    },
    { onConflict: "quiz_date,user_id,question_id" }
  );

  const answers = await getDailyAnswers(dateKey, req.user.id);
  const counts = computeDailyCounts(quiz, answers);
  const totalQuestions = quiz.questions.length;
  const answeredCount = answers.length;
  const completed = totalQuestions > 0 && answeredCount >= totalQuestions;

  res.json({
    date: dateKey,
    answeredCount,
    correctCount: counts.correct,
    wrongCount: counts.wrong,
    totalQuestions,
    completed
  });
});

app.get("/daily-quiz/results", authMiddleware, async (req, res) => {
  const tzOffset = Number(req.query.tzOffset);
  const dateKey = todayKey(tzOffset);
  const baseResults = await buildDailyResults(dateKey, req.user.id);
  if (!baseResults) {
    return res.status(409).json({ error: "Complete the daily quiz first" });
  }

  const quiz = await getDailyQuiz(dateKey);
  const totalQuestions = quiz?.questions.length ?? 0;
  const myAnswers = await getDailyAnswers(dateKey, req.user.id);
  const myAnswerMap = new Map(myAnswers.map((item) => [item.questionId, item.answerIndex]));
  const { data: allAnswers } = await supabase
    .from("daily_answers")
    .select("user_id, question_id, answer_index")
    .eq("quiz_date", dateKey);
  const answerKey = new Map(quiz.questions.map((question) => [question.id, question.answer]));
  const statsByUser = new Map();
  (allAnswers || []).forEach((answer) => {
    const stats = statsByUser.get(answer.user_id) || { answered: 0, correct: 0, wrong: 0 };
    stats.answered += 1;
    const correctIndex = answerKey.get(answer.question_id);
    if (answer.answer_index === correctIndex) {
      stats.correct += 1;
    } else {
      stats.wrong += 1;
    }
    statsByUser.set(answer.user_id, stats);
  });

  const friends = (await getFriendCandidates(req.user.id, 5))
    .map((friend) => {
      const stats = statsByUser.get(friend.userId) || { answered: 0, correct: 0, wrong: 0 };
      const answered = stats.answered;
      const correctPct = answered ? Math.round((stats.correct / answered) * 100) : 0;
      const wrongPct = answered ? Math.round((stats.wrong / answered) * 100) : 0;
      return {
        userId: friend.userId,
        displayName: friend.displayName,
        answered,
        score: stats.correct,
        correct: stats.correct,
        wrong: stats.wrong,
        correctPct,
        wrongPct,
        completed: answered >= totalQuestions
      };
    })
    .filter((friend) => friend.answered > 0);

  const questions = (quiz?.questions || []).map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: question.options,
    answer: typeof question.answer === "number" ? question.answer : null,
    myAnswer:
      typeof myAnswerMap.get(question.id) === "number" ? myAnswerMap.get(question.id) : null
  }));

  res.json({ ...baseResults, friends, questions });
});

app.get("/daily-quiz/history", authMiddleware, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 7, 1), 14);
  const { data: rows } = await supabase
    .from("daily_answers")
    .select("quiz_date, answered_at")
    .eq("user_id", req.user.id)
    .order("quiz_date", { ascending: false })
    .order("answered_at", { ascending: false })
    .limit(limit * 20);

  const uniqueRows = [];
  const seenDates = new Set();
  for (const row of rows || []) {
    if (!row?.quiz_date || seenDates.has(row.quiz_date)) continue;
    seenDates.add(row.quiz_date);
    uniqueRows.push(row);
    if (uniqueRows.length >= limit) break;
  }

  const results = await Promise.all(
    uniqueRows.map((row) => buildDailyResults(row.quiz_date, req.user.id))
  );
  const history = results
    .filter(Boolean)
    .map((entry) => ({
      date: entry.date,
      totalQuestions: entry.totalQuestions,
      participants: entry.participants,
      completedPlayers: entry.completedPlayers,
      score: entry.my.score,
      percentile: entry.my.percentile,
      rank: entry.my.rank
    }));

  res.json({ history });
});

app.get("/daily-quiz/agentic/status", authMiddleware, requireAgenticAdmin, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 30);
    const tzOffset = Number(req.query.tzOffset);
    const dateKey = todayKey(tzOffset);
    const status = await getAgenticDailyStatus(dateKey, limit);
    res.json(status);
  } catch (error) {
    console.error("[daily-agent] status endpoint failed", error);
    res.status(500).json({ error: "Unable to load agentic status" });
  }
});

app.post(
  "/daily-quiz/agentic/run",
  authMiddleware,
  requireAgenticAdmin,
  rateLimit({ windowMs: 60_000, max: 8 }),
  async (req, res) => {
    try {
      const requestedDate = typeof req.body?.date === "string" ? req.body.date.trim() : "";
      const tzOffset = Number(req.body?.tzOffset);
      const dateKey =
        /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : todayKey(tzOffset);
      const force = req.body?.force !== false;

      const generated = await ensureDailyQuizGenerated(dateKey, {
        force,
        trigger: "manual"
      });
      if (!generated?.quiz) {
        return res.status(500).json({ error: "Unable to generate daily quiz" });
      }
      const status = await getAgenticDailyStatus(dateKey, 12);
      res.json({
        date: dateKey,
        generated: generated.generated,
        run: generated.run,
        quiz: generated.quiz,
        status
      });
    } catch (error) {
      console.error("[daily-agent] run endpoint failed", error);
      res.status(500).json({
        error: "Unable to run daily agentic pipeline",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);

app.patch("/daily-quiz/agentic/quiz", authMiddleware, requireAgenticAdmin, async (req, res) => {
  try {
    const requestedDate = typeof req.body?.date === "string" ? req.body.date.trim() : "";
    const dateKey =
      /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : todayKey(Number(req.body?.tzOffset));
    const questions = Array.isArray(req.body?.questions) ? req.body.questions : null;
    if (!questions || questions.length === 0) {
      return res.status(400).json({ error: "Questions are required" });
    }

    const existing = await readStoredDailyQuiz(dateKey);
    if (!existing?.quiz) {
      return res.status(404).json({ error: "Daily quiz not found" });
    }

    const validatedQuestions = questions.map((question, index) => {
      const prompt = {
        en: String(question?.prompt?.en || "").trim(),
        fr: String(question?.prompt?.fr || question?.prompt?.en || "").trim()
      };
      const optionsEn = Array.isArray(question?.options?.en)
        ? question.options.en.map((item) => String(item || "").trim())
        : [];
      const optionsFr = Array.isArray(question?.options?.fr)
        ? question.options.fr.map((item) => String(item || "").trim())
        : optionsEn;
      const answer = Number(question?.answer);
      if (!question?.id || !prompt.en || optionsEn.length !== 4 || !Number.isInteger(answer)) {
        throw new Error(`Invalid question at position ${index + 1}`);
      }
      if (answer < 0 || answer >= 4) {
        throw new Error(`Invalid answer index at position ${index + 1}`);
      }
      return {
        ...question,
        prompt,
        options: {
          en: optionsEn,
          fr: optionsFr.length === 4 ? optionsFr : optionsEn
        },
        answer
      };
    });

    const updatedQuiz = {
      ...existing.quiz,
      rounds: validatedQuestions.length,
      subtitle: `${validatedQuestions.length} verified questions`,
      questions: validatedQuestions,
      meta: {
        ...(existing.quiz.meta || {}),
        reviewedAt: nowIso(),
        reviewedBy: req.user.email || "unknown",
        updatedByAdmin: true
      }
    };

    const error = await saveDailyQuizRecord(dateKey, updatedQuiz);
    if (error) {
      throw error;
    }

    const status = await getAgenticDailyStatus(dateKey, 12);
    res.json({
      ok: true,
      date: dateKey,
      quiz: updatedQuiz,
      status
    });
  } catch (error) {
    console.error("[daily-agent] quiz review update failed", error);
    res.status(500).json({
      error: "Unable to update daily quiz",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

app.post("/auth/register", rateLimit({ windowMs: 60_000, max: 15 }), async (req, res) => {
  const { email, password, displayName, country } = req.body;
  if (!email || !password || !displayName) {
    return res.status(400).json({ error: "Missing fields" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  if (String(displayName).trim().length < 2) {
    return res.status(400).json({ error: "Display name is too short" });
  }
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  const normalizedCountry = (country || "US").toUpperCase();
  const verificationToken = createToken();
  const verificationExpires = addMinutes(new Date(), 60).toISOString();
  const { data: user, error } = await supabase
    .from("users")
    .insert({
      email,
      display_name: displayName,
      password_hash: passwordHash,
      created_at: nowIso(),
      country: normalizedCountry,
      email_verified: false,
      verification_token: verificationToken,
      verification_token_expires: verificationExpires
    })
    .select("id, email, display_name, country, email_verified")
    .single();
  if (error || !user) {
    return res.status(500).json({ error: "Unable to create user" });
  }
  const token = signToken(user);
  try {
    const verifyUrl = `${APP_BASE_URL}/auth/verify?token=${verificationToken}`;
    sendEmail({
      to: email,
      subject: `${APP_NAME} - Verify your email`,
      html: `<p>Verify your email by opening this link:</p><p>${verifyUrl}</p>`
    });
  } catch (err) {
    // If email is not configured, continue without blocking registration.
  }
  res.json({
    token,
    user: {
      id: user.id,
      email,
      displayName: user.display_name,
      country: normalizedCountry,
      emailVerified: user.email_verified === true
    }
  });
});

app.post("/auth/apple", rateLimit({ windowMs: 60_000, max: 20 }), async (req, res) => {
  const { identityToken, fullName, email, country } = req.body || {};
  if (!identityToken || typeof identityToken !== "string") {
    return res.status(400).json({ error: "Missing identity token" });
  }
  if (!APPLE_CLIENT_ID) {
    return res.status(501).json({ error: "Apple sign-in is not configured" });
  }
  let payload;
  try {
    payload = await verifyAppleIdentityToken(identityToken);
  } catch (err) {
    return res.status(401).json({ error: "Invalid Apple token" });
  }

  const appleSub = typeof payload.sub === "string" ? payload.sub : "";
  if (!appleSub) {
    return res.status(401).json({ error: "Invalid Apple token" });
  }
  const tokenEmail = typeof payload.email === "string" ? payload.email : null;
  const suppliedEmail = typeof email === "string" ? email : null;
  const effectiveEmail = tokenEmail || suppliedEmail;
  const emailVerified = appleEmailVerified(payload.email_verified);
  const normalizedCountry = normalizeCountry(country);
  let isNewUser = false;

  let user = null;
  const { data: userByApple, error: userByAppleError } = await supabase
    .from("users")
    .select("id, email, display_name, country, email_verified, deleted_at, apple_sub")
    .eq("apple_sub", appleSub)
    .maybeSingle();
  if (userByAppleError) {
    return res.status(500).json({ error: "Unable to load Apple account" });
  }
  if (userByApple) {
    user = userByApple;
  } else if (effectiveEmail) {
    const { data: userByEmail, error: userByEmailError } = await supabase
      .from("users")
      .select("id, email, display_name, country, email_verified, deleted_at, apple_sub")
      .eq("email", effectiveEmail)
      .maybeSingle();
    if (userByEmailError) {
      return res.status(500).json({ error: "Unable to load account" });
    }
    if (userByEmail) {
      if (userByEmail.apple_sub && userByEmail.apple_sub !== appleSub) {
        return res.status(409).json({ error: "Apple account already linked" });
      }
      user = userByEmail;
    }
  }

  if (!user && !effectiveEmail) {
    return res.status(400).json({ error: "Email not provided by Apple" });
  }

  if (!user) {
    const displayName = buildAppleDisplayName(fullName, effectiveEmail);
    const generatedPasswordHash = bcrypt.hashSync(`apple_${appleSub}_${Date.now()}`, 10);
    const { data: created, error } = await supabase
      .from("users")
      .insert({
        email: effectiveEmail,
        display_name: displayName,
        password_hash: generatedPasswordHash,
        created_at: nowIso(),
        country: normalizedCountry,
        email_verified: emailVerified,
        apple_sub: appleSub
      })
      .select("id, email, display_name, country, email_verified")
      .single();
    if (error || !created) {
      return res.status(500).json({ error: "Unable to create user" });
    }
    user = created;
    isNewUser = true;
  } else {
    const updates = {};
    if (!user.apple_sub) updates.apple_sub = appleSub;
    if (emailVerified && user.email_verified !== true) updates.email_verified = true;
    if (user.deleted_at) updates.deleted_at = null;
    if (Object.keys(updates).length > 0) {
      await supabase.from("users").update(updates).eq("id", user.id);
      user = { ...user, ...updates };
    }
  }

  const token = signToken(user);
  res.json({
    token,
    isNewUser,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      country: user.country || "US",
      emailVerified: user.email_verified === true
    }
  });
});

app.post("/auth/login", rateLimit({ windowMs: 60_000, max: 20 }), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const { data: user } = await supabase
    .from("users")
    .select("id, email, display_name, password_hash, country, email_verified, deleted_at")
    .eq("email", email)
    .maybeSingle();
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  if (user.deleted_at) {
    return res.status(403).json({ error: "Account deactivated" });
  }
  if (!user.password_hash) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = signToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      country: user.country || "US",
      emailVerified: user.email_verified === true
    }
  });
});

app.post("/auth/reactivate", rateLimit({ windowMs: 60_000, max: 10 }), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const { data: user } = await supabase
    .from("users")
    .select("id, email, display_name, password_hash, country, email_verified, deleted_at")
    .eq("email", email)
    .maybeSingle();
  if (!user || !user.deleted_at) {
    return res.status(404).json({ error: "Account not found" });
  }
  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  await supabase.from("users").update({ deleted_at: null }).eq("id", user.id);
  const token = signToken({ ...user, deleted_at: null });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      country: user.country || "US",
      emailVerified: user.email_verified === true
    }
  });
});

app.post("/auth/request-verify", rateLimit({ windowMs: 60_000, max: 5 }), async (req, res) => {
  const { email } = req.body;
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }
  const { data: user } = await supabase
    .from("users")
    .select("id, email_verified")
    .eq("email", email)
    .maybeSingle();
  if (!user) {
    return res.json({ ok: true });
  }
  if (user.email_verified === true) {
    return res.json({ ok: true });
  }
  const verificationToken = createToken();
  const verificationExpires = addMinutes(new Date(), 60).toISOString();
  await supabase
    .from("users")
    .update({
      verification_token: verificationToken,
      verification_token_expires: verificationExpires
    })
    .eq("id", user.id);
  try {
    const verifyUrl = `${APP_BASE_URL}/auth/verify?token=${verificationToken}`;
    sendEmail({
      to: email,
      subject: `${APP_NAME} - Verify your email`,
      html: `<p>Verify your email by opening this link:</p><p>${verifyUrl}</p>`
    });
  } catch (err) {
    return res.status(501).json({ error: "Email provider not configured" });
  }
  return res.json({ ok: true });
});

app.get("/auth/verify", async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    return res.status(400).send("Invalid token");
  }
  const { data: user } = await supabase
    .from("users")
    .select("id, verification_token_expires")
    .eq("verification_token", token)
    .maybeSingle();
  if (!user) {
    return res.status(404).send("Token not found");
  }
  if (user.verification_token_expires) {
    const expires = new Date(user.verification_token_expires);
    if (expires.getTime() < Date.now()) {
      return res.status(410).send("Token expired");
    }
  }
  await supabase
    .from("users")
    .update({
      email_verified: true,
      verification_token: null,
      verification_token_expires: null
    })
    .eq("id", user.id);
  const html = renderSimplePage(
    "Email verified",
    "<p>Your email has been verified. You can return to the app.</p>"
  );
  return res.type("html").send(html);
});

app.post("/auth/password-reset/request", rateLimit({ windowMs: 60_000, max: 5 }), async (req, res) => {
  const { email } = req.body;
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }
  const { data: user } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
  if (!user) {
    return res.json({ ok: true });
  }
  const resetToken = createToken();
  const resetExpires = addMinutes(new Date(), 30).toISOString();
  await supabase
    .from("users")
    .update({
      password_reset_token: resetToken,
      password_reset_expires: resetExpires
    })
    .eq("id", user.id);
  try {
    const resetUrl = `${APP_BASE_URL}/auth/reset?token=${resetToken}`;
    sendEmail({
      to: email,
      subject: `${APP_NAME} - Reset your password`,
      html: `<p>Reset your password by opening this link:</p><p>${resetUrl}</p>`
    });
  } catch (err) {
    return res.status(501).json({ error: "Email provider not configured" });
  }
  return res.json({ ok: true });
});

app.get("/auth/reset", (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    return res.status(400).send("Invalid token");
  }
  const html = renderSimplePage(
    "Reset password",
    `
      <form method="POST" action="/auth/reset">
        <input type="hidden" name="token" value="${token}" />
        <label>New password</label>
        <input type="password" name="newPassword" minlength="8" required />
        <button type="submit">Reset</button>
      </form>
    `
  );
  return res.type("html").send(html);
});

app.post("/auth/reset", express.urlencoded({ extended: true }), async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || String(newPassword).length < 8) {
    return res.status(400).send("Invalid request");
  }
  const { data: user } = await supabase
    .from("users")
    .select("id, password_reset_expires")
    .eq("password_reset_token", token)
    .maybeSingle();
  if (!user) {
    return res.status(404).send("Token not found");
  }
  if (user.password_reset_expires) {
    const expires = new Date(user.password_reset_expires);
    if (expires.getTime() < Date.now()) {
      return res.status(410).send("Token expired");
    }
  }
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  await supabase
    .from("users")
    .update({
      password_hash: passwordHash,
      password_reset_token: null,
      password_reset_expires: null
    })
    .eq("id", user.id);
  const html = renderSimplePage(
    "Password updated",
    "<p>Your password has been updated. You can return to the app.</p>"
  );
  return res.type("html").send(html);
});

app.post("/auth/password-reset/confirm", rateLimit({ windowMs: 60_000, max: 10 }), async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ error: "Invalid request" });
  }
  const { data: user } = await supabase
    .from("users")
    .select("id, password_reset_expires")
    .eq("password_reset_token", token)
    .maybeSingle();
  if (!user) {
    return res.status(404).json({ error: "Token not found" });
  }
  if (user.password_reset_expires) {
    const expires = new Date(user.password_reset_expires);
    if (expires.getTime() < Date.now()) {
      return res.status(410).json({ error: "Token expired" });
    }
  }
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  await supabase
    .from("users")
    .update({
      password_hash: passwordHash,
      password_reset_token: null,
      password_reset_expires: null
    })
    .eq("id", user.id);
  return res.json({ ok: true });
});

app.get("/me", authMiddleware, async (req, res) => {
  const { data: user } = await supabase
    .from("users")
    .select("id, email, display_name, country, email_verified")
    .eq("id", req.user.id)
    .maybeSingle();
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      country: user.country || "US",
      emailVerified: user.email_verified === true
    }
  });
});

app.post(
  "/me/push-devices",
  authMiddleware,
  rateLimit({ windowMs: 60_000, max: 60 }),
  async (req, res) => {
    try {
      await upsertPushDevice(req.user.id, req.body || {});
      return res.json({ ok: true });
    } catch (error) {
      console.warn("[push] register device failed", {
        userId: req.user.id,
        error: error instanceof Error ? error.message : String(error)
      });
      if (isPushTableMissing(error)) {
        return res.status(503).json({ error: "Push devices table is not configured" });
      }
      return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid push device" });
    }
  }
);

app.delete(
  "/me/push-devices",
  authMiddleware,
  rateLimit({ windowMs: 60_000, max: 60 }),
  async (req, res) => {
    try {
      await removePushDevice(req.user.id, req.body || {});
      return res.json({ ok: true });
    } catch (error) {
      console.warn("[push] unregister device failed", {
        userId: req.user.id,
        error: error instanceof Error ? error.message : String(error)
      });
      if (isPushTableMissing(error)) {
        return res.status(503).json({ error: "Push devices table is not configured" });
      }
      return res.status(400).json({ error: error instanceof Error ? error.message : "Unable to remove push device" });
    }
  }
);

app.patch("/me", authMiddleware, rateLimit({ windowMs: 60_000, max: 30 }), async (req, res) => {
  const { displayName, country } = req.body;
  const updates = [];
  const params = [];

  if (typeof displayName === "string" && displayName.trim()) {
    if (displayName.trim().length < 2) {
      return res.status(400).json({ error: "Display name is too short" });
    }
    updates.push("display_name = ?");
    params.push(displayName.trim());
  }
  if (typeof country === "string" && country.trim()) {
    updates.push("country = ?");
    params.push(country.trim().toUpperCase());
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No updates provided" });
  }

  params.push(req.user.id);
  const updatePayload = {};
  updates.forEach((statement, index) => {
    const key = statement.split(" = ")[0];
    updatePayload[key] = params[index];
  });
  await supabase.from("users").update(updatePayload).eq("id", req.user.id);
  const { data: updated } = await supabase
    .from("users")
    .select("id, email, display_name, country, email_verified")
    .eq("id", req.user.id)
    .maybeSingle();
  if (!updated) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({
    user: {
      id: updated.id,
      email: updated.email,
      displayName: updated.display_name,
      country: updated.country || "US",
      emailVerified: updated.email_verified === true
    }
  });
});

app.patch("/me/email", authMiddleware, rateLimit({ windowMs: 60_000, max: 10 }), async (req, res) => {
  const { newEmail, currentPassword } = req.body;
  if (!isValidEmail(newEmail) || !currentPassword) {
    return res.status(400).json({ error: "Invalid email or password" });
  }
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", newEmail.trim())
    .maybeSingle();
  if (existing && existing.id !== req.user.id) {
    return res.status(409).json({ error: "Email already registered" });
  }
  const { data: user } = await supabase
    .from("users")
    .select("id, password_hash")
    .eq("id", req.user.id)
    .maybeSingle();
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  const isValid = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const verificationToken = createToken();
  const verificationExpires = addMinutes(new Date(), 60).toISOString();
  await supabase
    .from("users")
    .update({
      email: newEmail.trim(),
      email_verified: false,
      verification_token: verificationToken,
      verification_token_expires: verificationExpires
    })
    .eq("id", req.user.id);
  try {
    const verifyUrl = `${APP_BASE_URL}/auth/verify?token=${verificationToken}`;
    sendEmail({
      to: newEmail.trim(),
      subject: `${APP_NAME} - Verify your email`,
      html: `<p>Verify your email by opening this link:</p><p>${verifyUrl}</p>`
    });
  } catch (err) {
    // If email is not configured, continue without blocking update.
  }
  res.json({ ok: true, email: newEmail.trim(), emailVerified: false });
});

app.patch("/me/password", authMiddleware, rateLimit({ windowMs: 60_000, max: 10 }), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Missing fields" });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const { data: user } = await supabase
    .from("users")
    .select("id, password_hash")
    .eq("id", req.user.id)
    .maybeSingle();
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  const isValid = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  await supabase.from("users").update({ password_hash: passwordHash }).eq("id", req.user.id);
  res.json({ ok: true });
});

app.get("/me/export", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { data: user } = await supabase
    .from("users")
    .select("id, email, display_name, country, created_at, email_verified, deleted_at")
    .eq("id", userId)
    .maybeSingle();
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  const { data: rooms } = await supabase
    .from("room_players")
    .select("rooms(code, mode, status, quiz_id, created_at, started_at, completed_at)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false, foreignTable: "rooms" });
  const { data: answers } = await supabase
    .from("room_answers")
    .select("question_id, answer_index, answered_at")
    .eq("user_id", userId);
  const { data: dailyAnswers } = await supabase
    .from("daily_answers")
    .select("quiz_date, question_id, answer_index, answered_at")
    .eq("user_id", userId);
  const { data: badges } = await supabase
    .from("user_badges")
    .select("badge_id, earned_at")
    .eq("user_id", userId);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      country: user.country,
      createdAt: user.created_at,
      emailVerified: user.email_verified === true,
      deletedAt: user.deleted_at
    },
    rooms: (rooms || []).map((row) => ({
      code: row.rooms?.code,
      mode: row.rooms?.mode,
      status: row.rooms?.status,
      quizId: row.rooms?.quiz_id,
      createdAt: row.rooms?.created_at,
      startedAt: row.rooms?.started_at,
      completedAt: row.rooms?.completed_at
    })),
    answers: (answers || []).map((row) => ({
      questionId: row.question_id,
      answerIndex: row.answer_index,
      answeredAt: row.answered_at
    })),
    dailyAnswers: (dailyAnswers || []).map((row) => ({
      date: row.quiz_date,
      questionId: row.question_id,
      answerIndex: row.answer_index,
      answeredAt: row.answered_at
    })),
    badges: (badges || []).map((row) => ({ badgeId: row.badge_id, earnedAt: row.earned_at })),
    exportedAt: nowIso()
  });
});

app.delete("/me", authMiddleware, rateLimit({ windowMs: 60_000, max: 5 }), async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: hostedRooms, error: hostedRoomsError } = await supabase
      .from("rooms")
      .select("id")
      .eq("host_user_id", userId);
    if (hostedRoomsError) {
      throw hostedRoomsError;
    }
    const roomIds = hostedRooms?.map((row) => row.id) || [];
    if (roomIds.length > 0) {
      const { error: roomAnswersError } = await supabase.from("room_answers").delete().in("room_id", roomIds);
      if (roomAnswersError) throw roomAnswersError;
      const { error: roomPlayersError } = await supabase.from("room_players").delete().in("room_id", roomIds);
      if (roomPlayersError) throw roomPlayersError;
      const { error: roomRematchError } = await supabase.from("room_rematch").delete().in("room_id", roomIds);
      if (roomRematchError) throw roomRematchError;
      const { error: roomsError } = await supabase.from("rooms").delete().in("id", roomIds);
      if (roomsError) throw roomsError;
    }
    const { error: myRoomAnswersError } = await supabase.from("room_answers").delete().eq("user_id", userId);
    if (myRoomAnswersError) throw myRoomAnswersError;
    const { error: myRoomPlayersError } = await supabase.from("room_players").delete().eq("user_id", userId);
    if (myRoomPlayersError) throw myRoomPlayersError;
    const { error: myRoomRematchError } = await supabase.from("room_rematch").delete().eq("user_id", userId);
    if (myRoomRematchError) throw myRoomRematchError;
    const { error: myDailyAnswersError } = await supabase.from("daily_answers").delete().eq("user_id", userId);
    if (myDailyAnswersError) throw myDailyAnswersError;
    const { error: myUserBadgesError } = await supabase.from("user_badges").delete().eq("user_id", userId);
    if (myUserBadgesError) throw myUserBadgesError;
    const { error: userDeleteError } = await supabase.from("users").delete().eq("id", userId);
    if (userDeleteError) throw userDeleteError;
    res.json({ ok: true });
  } catch (error) {
    console.error("[account-delete] failed", error);
    res.status(500).json({ error: "Unable to delete account" });
  }
});

app.post("/me/deactivate", authMiddleware, rateLimit({ windowMs: 60_000, max: 5 }), async (req, res) => {
  await supabase.from("users").update({ deleted_at: nowIso() }).eq("id", req.user.id);
  res.json({ ok: true });
});

app.get("/leaderboard", authMiddleware, async (req, res) => {
  const scope = req.query.scope === "country" ? "country" : "global";
  const country = typeof req.query.country === "string" ? req.query.country.toUpperCase() : "US";
  const entries = await computeLeaderboard(scope, country);
  const meIndex = entries.findIndex((entry) => entry.userId === req.user.id);
  const me = meIndex >= 0 ? entries[meIndex] : null;
  res.json({ scope, country, entries: entries.slice(0, 10), me });
});

app.get("/badges", authMiddleware, async (req, res) => {
  const badges = await getBadges();
  const earned = await getUserBadges(req.user.id);
  const earnedMap = new Map(earned.map((item) => [item.badgeId, item.earnedAt]));
  const response = badges.map((badge) => ({
    id: badge.id,
    title: badge.title,
    description: badge.description,
    earnedAt: earnedMap.get(badge.id) || null
  }));
  res.json({ badges: response });
});

app.post("/rooms", authMiddleware, async (req, res) => {
  const { quizId, categoryId, questionCount, mode: requestedMode } = req.body;
  let quiz = null;
  if (quizId) {
    quiz = await getQuiz(quizId);
  } else if (categoryId) {
    const count = Number(questionCount);
    if (Number.isInteger(count) && count > 0) {
      quiz = buildCategoryQuiz(categoryId, count);
    }
    if (quiz) await saveCustomQuiz(quiz);
  }
  if (!quiz) return res.status(400).json({ error: "Invalid room configuration" });
  const mode = requestedMode === "sync" ? "sync" : "async";
  const code = await generateUniqueRoomCode();
  const { data: room, error } = await supabase
    .from("rooms")
    .insert({
      code,
      mode,
      quiz_id: quiz.id,
      status: "lobby",
      host_user_id: req.user.id,
      created_at: nowIso()
    })
    .select("*")
    .single();
  if (error || !room) {
    return res.status(500).json({ error: "Unable to create room" });
  }
  await supabase.from("room_players").insert({
    room_id: room.id,
    user_id: req.user.id,
    role: "host",
    joined_at: nowIso()
  });

  res.json(await roomState(room));
});

app.post("/rooms/:code/join", authMiddleware, async (req, res) => {
  const room = await getRoomByCode(req.params.code);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }
  const allPlayers = await getRoomPlayers(room.id, { includeInvited: true });
  const existing = allPlayers.find((player) => player.id === req.user.id);
  const isInvited = existing?.role === "invited";
  const joinedNow = !existing || isInvited;
  if (!existing && room.status !== "lobby") {
    return res.status(409).json({ error: "Room already started" });
  }
  if (isInvited && room.status !== "lobby") {
    return res.status(409).json({ error: "Room already started" });
  }
  if (!existing && allPlayers.length >= MAX_ROOM_PLAYERS) {
    return res.status(409).json({ error: "Room is full" });
  }
  if (!existing) {
    await supabase.from("room_players").insert({
      room_id: room.id,
      user_id: req.user.id,
      role: "guest",
      joined_at: nowIso()
    });
  } else if (isInvited && room.status === "lobby") {
    await supabase
      .from("room_players")
      .update({ role: "guest", joined_at: nowIso() })
      .eq("room_id", room.id)
      .eq("user_id", req.user.id);
  }
  const state = await emitRoomUpdateToMembers(room);
  if (joinedNow && req.user.id !== room.host_user_id) {
    sendPushToUsers([room.host_user_id], {
      title: "Player joined your room",
      body: "A player joined your lobby.",
      data: {
        type: "room",
        roomCode: room.code,
        roomStatus: "lobby",
        eventType: "host_player_joined"
      }
    });
  }
  res.json(state || (await roomState(room)));
});

app.post("/rooms/:code/invite", authMiddleware, async (req, res) => {
  const room = await getRoomByCode(req.params.code);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }
  if (room.host_user_id !== req.user.id) {
    return res.status(403).json({ error: "Only the host can invite" });
  }
  if (room.status !== "lobby") {
    return res.status(409).json({ error: "Room already started" });
  }

  const inviteeId = Number(req.body?.userId);
  if (!Number.isInteger(inviteeId) || inviteeId <= 0) {
    return res.status(400).json({ error: "Invalid invite target" });
  }
  if (inviteeId === req.user.id) {
    return res.status(400).json({ error: "Cannot invite yourself" });
  }

  const { data: invitee } = await supabase
    .from("users")
    .select("id")
    .eq("id", inviteeId)
    .maybeSingle();
  if (!invitee) {
    return res.status(404).json({ error: "User not found" });
  }

  const allPlayers = await getRoomPlayers(room.id, { includeInvited: true });
  const existing = allPlayers.find((player) => player.id === inviteeId);
  const isNewInvite = !existing;

  if (ACTIVE_ROLES.has(existing?.role || "")) {
    return res.status(409).json({ error: "Player already joined" });
  }
  if (allPlayers.length >= MAX_ROOM_PLAYERS && !existing) {
    return res.status(409).json({ error: "Room is full" });
  }
  if (!existing) {
    await supabase.from("room_players").insert({
      room_id: room.id,
      user_id: inviteeId,
      role: "invited",
      joined_at: nowIso()
    });
  }

  const state = await emitRoomUpdateToMembers(room);
  if (isNewInvite) {
    sendPushToUsers([inviteeId], {
      title: "New room invite",
      body: "You have been invited to a Qwizzy room.",
      data: {
        type: "room",
        roomCode: room.code,
        roomStatus: "lobby",
        eventType: "invite_received"
      }
    });
  }
  res.json(state || (await roomState(room)));
});

app.delete("/rooms/:code/invite/:userId", authMiddleware, async (req, res) => {
  const room = await getRoomByCode(req.params.code);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }
  if (room.host_user_id !== req.user.id) {
    return res.status(403).json({ error: "Only the host can cancel invites" });
  }
  if (room.status !== "lobby") {
    return res.status(409).json({ error: "Room already started" });
  }

  const inviteeId = Number(req.params.userId);
  if (!Number.isInteger(inviteeId) || inviteeId <= 0) {
    return res.status(400).json({ error: "Invalid invite target" });
  }

  const allPlayers = await getRoomPlayers(room.id, { includeInvited: true });
  const existing = allPlayers.find((player) => player.id === inviteeId);
  if (!existing) {
    return res.status(404).json({ error: "Invite not found" });
  }
  if (existing.role !== "invited") {
    return res.status(409).json({ error: "Player already joined" });
  }

  await supabase
    .from("room_players")
    .delete()
    .eq("room_id", room.id)
    .eq("user_id", inviteeId)
    .eq("role", "invited");

  const state = await emitRoomUpdateToMembers(room);
  res.json(state || (await roomState(room)));
});

async function closeRoomHandler(req, res) {
  const room = await getRoomByCode(req.params.code);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }
  if (room.host_user_id !== req.user.id) {
    return res.status(403).json({ error: "Only the host can close this room" });
  }
  if (room.status !== "lobby") {
    return res.status(409).json({ error: "Room already started" });
  }

  await supabase.from("room_answers").delete().eq("room_id", room.id);
  await supabase.from("room_rematch").delete().eq("room_id", room.id);
  await supabase.from("room_players").delete().eq("room_id", room.id);
  await supabase.from("rooms").delete().eq("id", room.id);

  res.json({ ok: true, code: room.code });
}

app.post("/rooms/:code/close", authMiddleware, closeRoomHandler);
app.delete("/rooms/:code", authMiddleware, closeRoomHandler);

app.get("/rooms/mine", authMiddleware, async (req, res) => {
  const { data: rows } = await supabase
    .from("room_players")
    .select("rooms(*), role, joined_at")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false, foreignTable: "rooms" });
  const rooms = (rows || []).map((row) => row.rooms).filter(Boolean);
  const membershipByRoomId = new Map(
    (rows || [])
      .map((row) => [
        row.rooms?.id,
        {
          role: row.role,
          invitedAt: row.joined_at || null
        }
      ])
      .filter((item) => item[0])
  );

  const result = await Promise.all(
    rooms.map(async (room) => {
      const quiz = await getQuiz(room.quiz_id);
      const answers = await getRoomAnswers(room.id);
      const players = await getRoomPlayers(room.id);
      const rematch = await getRoomRematch(room.id);
      const progress = answers.reduce((acc, item) => {
        acc[item.user_id] = (acc[item.user_id] || 0) + 1;
        return acc;
      }, {});
      const scores =
        room.status === "complete"
          ? players.reduce((acc, player) => {
              acc[player.id] = computeScore(quiz, answers, player.id);
              return acc;
            }, {})
          : {};
      return {
        code: room.code,
        mode: room.mode,
        status: room.status,
        createdAt: room.created_at,
        updatedAt: room.updated_at,
        invitedAt: membershipByRoomId.get(room.id)?.invitedAt || null,
        quiz: sanitizeQuiz(quiz),
        progress,
        players,
        scores,
        rematchReady: rematch.map((item) => item.userId),
        maxPlayers: MAX_ROOM_PLAYERS,
        myRole: membershipByRoomId.get(room.id)?.role || "guest"
      };
    })
  );

  res.json({ rooms: result });
});

app.get("/rooms/:code", authMiddleware, async (req, res) => {
  const room = await getRoomByCode(req.params.code);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }
  if (!(await isRoomMember(room.id, req.user.id))) {
    return res.status(403).json({ error: "Not a member of this room" });
  }
  res.json(await roomState(room));
});

app.get("/stats", authMiddleware, async (req, res) => {
  const requestId = Math.random().toString(36).slice(2, 8);
  const start = Date.now();
  let roomRows = null;
  try {
    const response = await withTimeout(
      supabase.from("room_players").select("rooms(*)").eq("user_id", req.user.id),
      "stats rooms query",
      8000
    );
    roomRows = response?.data || [];
  } catch (err) {
    console.warn(`[stats:${requestId}] rooms query failed`, err);
    return res.status(504).json({ error: "Stats query timed out" });
  }

  const rooms = (roomRows || []).map((row) => row.rooms).filter(Boolean);

  const perOpponent = {};
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let ongoing = 0;
  let rematchRequested = 0;

  for (const room of rooms) {
    if (!room) continue;
    if (room.status === "active") ongoing += 1;
    let players = [];
    let rematch = [];
    let quiz = null;
    let answers = [];
    try {
      [players, rematch, quiz, answers] = await Promise.all([
        withTimeout(getRoomPlayers(room.id), `stats players ${room.id}`, 8000),
        withTimeout(getRoomRematch(room.id), `stats rematch ${room.id}`, 8000),
        withTimeout(getQuiz(room.quiz_id), `stats quiz ${room.quiz_id}`, 8000),
        withTimeout(getRoomAnswers(room.id), `stats answers ${room.id}`, 8000)
      ]);
    } catch (err) {
      console.warn(`[stats:${requestId}] room ${room.id} skipped`, err);
      continue;
    }

    if (rematch.length > 0) rematchRequested += 1;
    if (!quiz) continue;
    const opponents = players.filter((player) => player.id !== req.user.id);
    if (opponents.length === 0) continue;

    opponents.forEach((opponent) => {
      const key = String(opponent.id);
      if (!perOpponent[key]) {
        perOpponent[key] = {
          opponentId: opponent.id,
          opponentName: opponent.displayName,
          wins: 0,
          losses: 0,
          ties: 0
        };
      }
    });

    if (room.status === "complete") {
      const scoreByUser = new Map(
        players.map((player) => [player.id, computeScore(quiz, answers, player.id)])
      );
      const myScore = scoreByUser.get(req.user.id) ?? 0;
      const opponentScores = opponents.map((opponent) => scoreByUser.get(opponent.id) ?? 0);
      const topScore = Math.max(myScore, ...opponentScores);
      const topCount = [myScore, ...opponentScores].filter((score) => score === topScore).length;

      if (myScore === topScore) {
        if (topCount > 1) {
          ties += 1;
        } else {
          wins += 1;
        }
      } else {
        losses += 1;
      }

      opponents.forEach((opponent) => {
        const key = String(opponent.id);
        const theirScore = scoreByUser.get(opponent.id) ?? 0;
        if (myScore > theirScore) {
          perOpponent[key].wins += 1;
        } else if (myScore < theirScore) {
          perOpponent[key].losses += 1;
        } else {
          perOpponent[key].ties += 1;
        }
      });
    }
  }

  res.json({
    totals: {
      wins,
      losses,
      ties,
      ongoing,
      rematchRequested
    },
    opponents: Object.values(perOpponent)
  });

  const elapsed = Date.now() - start;
  if (elapsed > 3000) {
    console.log(`[stats:${requestId}] completed in ${elapsed}ms`);
  }
});

app.get("/rooms/:code/summary", authMiddleware, async (req, res) => {
  const room = await getRoomByCode(req.params.code);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }
  if (!(await isRoomMember(room.id, req.user.id))) {
    return res.status(403).json({ error: "Not a member of this room" });
  }
  const quiz = await getQuiz(room.quiz_id);
  const players = await getRoomPlayers(room.id);
  const answers = await getRoomAnswers(room.id);
  const scores = players.map((player) => ({
    userId: player.id,
    displayName: player.displayName,
    score: computeScore(quiz, answers, player.id)
  }));
  const playerNames = new Map(players.map((player) => [player.id, player.displayName]));
  const answersByQuestion = new Map();
  answers.forEach((answer) => {
    if (!answersByQuestion.has(answer.question_id)) {
      answersByQuestion.set(answer.question_id, []);
    }
    answersByQuestion.get(answer.question_id).push({
      userId: answer.user_id,
      displayName: playerNames.get(answer.user_id) || "Player",
      answerIndex: answer.answer_index
    });
  });
  const questions = quiz.questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: question.options,
    answer: typeof question.answer === "number" ? question.answer : null,
    responses: answersByQuestion.get(question.id) || []
  }));
  res.json({ scores, total: quiz.questions.length, questions });
});

io.on("connection", (socket) => {
  let user = null;

  socket.on("auth", ({ token }) => {
    try {
      const decoded = verifyToken(token);
      user = { id: decoded.sub, email: decoded.email, displayName: decoded.displayName };
      socket.join(`user:${user.id}`);
      socket.emit("auth:ok", { user });
    } catch (err) {
      socket.emit("auth:error", { error: "Invalid token" });
    }
  });

  socket.on("room:join", async ({ code }) => {
    if (!user) return socket.emit("room:error", { error: "Unauthorized" });
    const room = await getRoomByCode(code);
    if (!room) return socket.emit("room:error", { error: "Room not found" });
    if (!(await isRoomMember(room.id, user.id))) {
      return socket.emit("room:error", { error: "Not a member of this room" });
    }
    socket.join(code);
    await emitRoomUpdateToMembers(room);
  });

  socket.on("room:start", async ({ code }) => {
    if (!user) return socket.emit("room:error", { error: "Unauthorized" });
    const room = await getRoomByCode(code);
    if (!room) return socket.emit("room:error", { error: "Room not found" });
    if (!(await isRoomMember(room.id, user.id))) {
      return socket.emit("room:error", { error: "Not a member of this room" });
    }
    if (room.host_user_id !== user.id) {
      return socket.emit("room:error", { error: "Only the host can start" });
    }
    if (room.status !== "lobby") return;
    const players = await getRoomPlayers(room.id);
    if (players.length < MIN_ROOM_PLAYERS_TO_START) {
      return socket.emit("room:error", {
        error: `At least ${MIN_ROOM_PLAYERS_TO_START} players are required to start`
      });
    }
    await supabase
      .from("rooms")
      .update({ status: "active", current_index: 0, started_at: nowIso() })
      .eq("id", room.id);
    const updated = await getRoomByCode(code);
    await emitRoomUpdateToMembers(updated || code);
    const targetUserIds = players.map((player) => player.id).filter((id) => id !== user.id);
    if (targetUserIds.length > 0) {
      sendPushToUsers(targetUserIds, {
        title: "Match started",
        body: "Your duel is now live.",
        data: {
          type: "room",
          roomCode: room.code,
          roomStatus: "active",
          eventType: "room_started"
        }
      });
    }
  });

  socket.on("room:rematch", async ({ code }) => {
    if (!user) return socket.emit("room:error", { error: "Unauthorized" });
    const room = await getRoomByCode(code);
    if (!room) return socket.emit("room:error", { error: "Room not found" });
    if (!(await isRoomMember(room.id, user.id))) {
      return socket.emit("room:error", { error: "Not a member of this room" });
    }
    if (room.status !== "complete") {
      return socket.emit("room:error", { error: "Room is not complete" });
    }

    await supabase
      .from("room_rematch")
      .upsert(
        { room_id: room.id, user_id: user.id, ready_at: nowIso() },
        { onConflict: "room_id,user_id" }
      );

    const players = await getRoomPlayers(room.id);
    const rematch = await getRoomRematch(room.id);

    if (rematch.length >= players.length) {
      await startRematchRoom(room, players);
    }

    const updated = await getRoomByCode(code);
    await emitRoomUpdateToMembers(updated || code);
    const playersForPush = await getRoomPlayers(room.id);
    const targetUserIds = playersForPush.map((player) => player.id).filter((id) => id !== user.id);
    if (targetUserIds.length > 0) {
      sendPushToUsers(targetUserIds, {
        title: "Rematch requested",
        body: "Another player is ready for another round.",
        data: {
          type: "room",
          roomCode: room.code,
          roomStatus: updated?.status || room.status,
          eventType: "rematch_requested"
        }
      });
    }
  });

  socket.on("room:answer", async ({ code, questionId, answerIndex }) => {
    if (!user) return socket.emit("room:error", { error: "Unauthorized" });
    const room = await getRoomByCode(code);
    if (!room) return socket.emit("room:error", { error: "Room not found" });
    if (!(await isRoomMember(room.id, user.id))) {
      return socket.emit("room:error", { error: "Not a member of this room" });
    }
    if (room.status !== "active") return;

    const { data: existing } = await supabase
      .from("room_answers")
      .select("*")
      .eq("room_id", room.id)
      .eq("user_id", user.id)
      .eq("question_id", questionId)
      .maybeSingle();
    let createdAnswer = false;
    if (!existing) {
      const quiz = await getQuiz(room.quiz_id);
      if (!quiz) return;
      const question = quiz.questions.find((item) => item.id === questionId);
      if (!question) return;
      const maxIndex = question.options?.en?.length ?? 0;
      if (!Number.isInteger(answerIndex) || answerIndex < -1 || answerIndex >= maxIndex) {
        return;
      }
      await supabase.from("room_answers").insert({
        room_id: room.id,
        user_id: user.id,
        question_id: questionId,
        answer_index: answerIndex,
        answered_at: nowIso()
      });
      createdAnswer = true;
    }

    const quiz = await getQuiz(room.quiz_id);
    const answers = await getRoomAnswers(room.id);
    const players = await getRoomPlayers(room.id);

    if (room.mode === "sync") {
      const question = quiz.questions[room.current_index];
      const answeredCount = answers.filter((item) => item.question_id === question.id).length;
      if (answeredCount >= players.length) {
        const nextIndex = room.current_index + 1;
        if (nextIndex >= quiz.questions.length) {
          await supabase
            .from("rooms")
            .update({ status: "complete", completed_at: nowIso() })
            .eq("id", room.id);
          await awardBadgesForRoom(room.id);
        } else {
          await supabase.from("rooms").update({ current_index: nextIndex }).eq("id", room.id);
        }
      }
    } else {
      const completedPlayers = players.filter((player) => {
        const answeredCount = answers.filter((item) => item.user_id === player.id).length;
        return answeredCount >= quiz.questions.length;
      });
      if (completedPlayers.length === players.length) {
        await supabase
          .from("rooms")
          .update({ status: "complete", completed_at: nowIso() })
          .eq("id", room.id);
        await awardBadgesForRoom(room.id);
      }
    }

    const updated = await getRoomByCode(code);
    await emitRoomUpdateToMembers(updated || code);

    if (room.mode === "async" && updated?.status === "active" && createdAnswer) {
      const answeredCountByUser = new Map();
      answers.forEach((item) => {
        answeredCountByUser.set(item.user_id, (answeredCountByUser.get(item.user_id) || 0) + 1);
      });
      const actorCountAfter = answeredCountByUser.get(user.id) || 0;
      const actorCountBefore = Math.max(actorCountAfter - 1, 0);
      const targetUserIds = players
        .map((player) => player.id)
        .filter((id) => {
          if (id === user.id) return false;
          const targetCount = answeredCountByUser.get(id) || 0;
          if (targetCount >= quiz.questions.length) return false;
          // Notify only when this answer newly puts the actor ahead of that target.
          return actorCountAfter > targetCount && actorCountBefore <= targetCount;
        });
      if (targetUserIds.length > 0) {
        sendPushToUsers(targetUserIds, {
          title: "Your turn",
          body: "Time to answer in your duel.",
          data: {
            type: "room",
            roomCode: room.code,
            roomStatus: "active",
            eventType: "your_turn"
          }
        });
      }
    }

    if (updated?.status === "complete" && room.status !== "complete") {
      const targetUserIds = players.map((player) => player.id).filter((id) => id !== user.id);
      if (targetUserIds.length > 0) {
        sendPushToUsers(targetUserIds, {
          title: "Match finished",
          body: "Results are ready.",
          data: {
            type: "room",
            roomCode: room.code,
            roomStatus: "complete",
            eventType: "match_complete"
          }
        });
      }
    }
  });

  socket.on("disconnect", () => {
    user = null;
  });
});

httpServer.listen(port, () => {
  console.log(`Qwizzy API running on port ${port}`);
});
