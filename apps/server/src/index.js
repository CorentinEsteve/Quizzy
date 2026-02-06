import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import bcrypt from "bcryptjs";
import { supabase } from "./db.js";
import { authMiddleware, signToken, verifyToken } from "./auth.js";
import { quizzes } from "./quizzes.js";
import { Resend } from "resend";

const app = express();
const httpServer = createServer(app);
const corsOrigin = process.env.CORS_ORIGIN || "*";
const io = new SocketServer(httpServer, {
  cors: { origin: corsOrigin }
});

const port = process.env.PORT || 3001;
const APP_NAME = process.env.APP_NAME || "Quiz App";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "onboarding@resend.dev";
const SUPPORT_URL = process.env.SUPPORT_URL || "";
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${port}`;
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || "";
const EMAIL_FROM = process.env.EMAIL_FROM || SUPPORT_EMAIL;
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM = process.env.RESEND_FROM || EMAIL_FROM;
const resendClient = EMAIL_PROVIDER === "resend" && RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

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

function generateCode() {
  const letters = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i += 1) {
    code += letters[Math.floor(Math.random() * letters.length)];
  }
  return code;
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

async function getDailyQuiz(dateKey) {
  const { data } = await supabase
    .from("daily_quizzes")
    .select("quiz_json")
    .eq("date", dateKey)
    .maybeSingle();
  if (data?.quiz_json) {
    if (typeof data.quiz_json === "string") {
      try {
        return JSON.parse(data.quiz_json);
      } catch (_err) {
        // fall through to recreate
      }
    } else {
      return data.quiz_json;
    }
  }

  const pool = quizzes.flatMap((quiz) => quiz.questions);
  if (pool.length === 0) return null;
  const selected = seededShuffle(pool, dateKey).slice(0, 10);
  const count = selected.length;
  const dailyQuiz = {
    id: `daily_${dateKey}`,
    categoryId: "daily",
    categoryLabel: "Daily Quiz",
    title: "Daily Quiz",
    subtitle: `${count} questions`,
    rounds: count,
    accent: "#F3B74E",
    questions: selected
  };

  await supabase.from("daily_quizzes").upsert({
    date: dateKey,
    quiz_json: dailyQuiz,
    created_at: nowIso()
  });

  return dailyQuiz;
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

function computeDailyCounts(quiz, answers) {
  const answerMap = new Map(answers.map((item) => [item.questionId, item.answerIndex]));
  let correct = 0;
  let wrong = 0;
  quiz.questions.forEach((question) => {
    if (!answerMap.has(question.id)) return;
    const selected = answerMap.get(question.id);
    if (selected === question.answer) {
      correct += 1;
    } else {
      wrong += 1;
    }
  });
  return { correct, wrong };
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

function sanitizeQuiz(quiz) {
  return {
    ...quiz,
    questions: quiz.questions.map(({ answer, ...rest }) => rest)
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
  return players.filter((player) => ACTIVE_ROLES.has(player.role));
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

function computeScore(quiz, answers, userId) {
  return quiz.questions.reduce((acc, question) => {
    const record = answers.find(
      (item) => item.user_id === userId && item.question_id === question.id
    );
    if (!record) return acc;
    return acc + (record.answer_index === question.answer ? 1 : 0);
  }, 0);
}

function computeAnswerStats(quiz, answers) {
  const correctByQuestion = new Map();
  quiz.questions.forEach((question) => {
    correctByQuestion.set(question.id, question.answer);
  });

  return answers.reduce((acc, answer) => {
    const correctIndex = correctByQuestion.get(answer.question_id);
    if (correctIndex === undefined) return acc;
    if (!acc[answer.user_id]) {
      acc[answer.user_id] = { correctCount: 0, wrongCount: 0 };
    }
    if (answer.answer_index === correctIndex) {
      acc[answer.user_id].correctCount += 1;
    } else {
      acc[answer.user_id].wrongCount += 1;
    }
    return acc;
  }, {});
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
    currentIndex: room.current_index,
    quiz,
    players,
    invites,
    progress,
    rematchReady: rematch.map((item) => item.userId)
  };
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
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
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
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
    quiz: sanitizeQuiz(quiz),
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

  res.json({ ...baseResults, friends });
});

app.get("/daily-quiz/history", authMiddleware, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 7, 1), 14);
  const { data: rows } = await supabase
    .from("daily_answers")
    .select("quiz_date")
    .eq("user_id", req.user.id)
    .order("quiz_date", { ascending: false })
    .limit(limit);

  const results = await Promise.all(
    (rows || []).map((row) => buildDailyResults(row.quiz_date, req.user.id))
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
  const userId = req.user.id;
  const { data: hostedRooms } = await supabase
    .from("rooms")
    .select("id")
    .eq("host_user_id", userId);
  const roomIds = hostedRooms?.map((row) => row.id) || [];
  if (roomIds.length > 0) {
    await supabase.from("room_answers").delete().in("room_id", roomIds);
    await supabase.from("room_players").delete().in("room_id", roomIds);
    await supabase.from("room_rematch").delete().in("room_id", roomIds);
    await supabase.from("rooms").delete().in("id", roomIds);
  }
  await supabase.from("room_answers").delete().eq("user_id", userId);
  await supabase.from("room_players").delete().eq("user_id", userId);
  await supabase.from("user_badges").delete().eq("user_id", userId);
  await supabase.from("users").delete().eq("id", userId);
  res.json({ ok: true });
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
  let code = generateCode();
  while (await getRoomByCode(code)) {
    code = generateCode();
  }
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
  const players = allPlayers.filter((player) => ACTIVE_ROLES.has(player.role));
  const existing = allPlayers.find((player) => player.id === req.user.id);
  const isInvited = existing?.role === "invited";
  if (!existing && room.status !== "lobby") {
    return res.status(409).json({ error: "Room already started" });
  }
  if (isInvited && room.status !== "lobby") {
    return res.status(409).json({ error: "Room already started" });
  }
  if (!existing && players.length >= 2) {
    return res.status(409).json({ error: "Room is full" });
  }
  if (isInvited && players.length >= 2) {
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
  res.json(await roomState(room));
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
  const activePlayers = allPlayers.filter((player) => ACTIVE_ROLES.has(player.role));
  const existing = allPlayers.find((player) => player.id === inviteeId);

  if (activePlayers.length >= 2 && !existing) {
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

  res.json(await roomState(room));
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

  res.json(await roomState(room));
});

app.get("/rooms/mine", authMiddleware, async (req, res) => {
  const { data: rows } = await supabase
    .from("room_players")
    .select("rooms(*), role")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false, foreignTable: "rooms" });
  const rooms = (rows || []).map((row) => row.rooms).filter(Boolean);
  const roleByRoomId = new Map(
    (rows || []).map((row) => [row.rooms?.id, row.role]).filter((item) => item[0])
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
        quiz: sanitizeQuiz(quiz),
        progress,
        players,
        scores,
        rematchReady: rematch.map((item) => item.userId),
        myRole: roleByRoomId.get(room.id) || "guest"
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
    const opponent = players.find((player) => player.id !== req.user.id);
    if (!opponent || !quiz) continue;

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

    if (room.status === "complete") {
      const myScore = computeScore(quiz, answers, req.user.id);
      const theirScore = computeScore(quiz, answers, opponent.id);
      if (myScore > theirScore) {
        wins += 1;
        perOpponent[key].wins += 1;
      } else if (myScore < theirScore) {
        losses += 1;
        perOpponent[key].losses += 1;
      } else {
        ties += 1;
        perOpponent[key].ties += 1;
      }
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
    io.to(code).emit("room:update", await roomState(room));
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
    await supabase
      .from("rooms")
      .update({ status: "active", current_index: 0, started_at: nowIso() })
      .eq("id", room.id);
    const updated = await getRoomByCode(code);
    io.to(code).emit("room:update", await roomState(updated));
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
      const currentQuiz = await getQuiz(room.quiz_id);
      const nextQuiz = currentQuiz
        ? buildCategoryQuiz(currentQuiz.categoryId || "all", currentQuiz.questions.length)
        : null;
      if (nextQuiz) await saveCustomQuiz(nextQuiz);
      await supabase.from("room_answers").delete().eq("room_id", room.id);
      await supabase.from("room_rematch").delete().eq("room_id", room.id);
      await supabase
        .from("rooms")
        .update({
          status: "active",
          current_index: 0,
          started_at: nowIso(),
          completed_at: null,
          quiz_id: nextQuiz ? nextQuiz.id : room.quiz_id
        })
        .eq("id", room.id);
    }

    const updated = await getRoomByCode(code);
    io.to(code).emit("room:update", await roomState(updated));
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
    io.to(code).emit("room:update", await roomState(updated));
  });

  socket.on("disconnect", () => {
    user = null;
  });
});

httpServer.listen(port, () => {
  console.log(`Qwizzy API running on port ${port}`);
});
