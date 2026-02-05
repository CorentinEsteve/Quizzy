import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import bcrypt from "bcryptjs";
import { db, migrate } from "./db.js";
import { authMiddleware, signToken, verifyToken } from "./auth.js";
import { quizzes } from "./quizzes.js";
import { Resend } from "resend";

migrate();

const app = express();
const httpServer = createServer(app);
const corsOrigin = process.env.CORS_ORIGIN || "*";
const io = new SocketServer(httpServer, {
  cors: { origin: corsOrigin }
});

const port = process.env.PORT || 3001;
const APP_NAME = process.env.APP_NAME || "Quiz App";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@example.com";
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

function getCustomQuiz(quizId) {
  const row = db
    .prepare("SELECT quiz_json FROM room_quizzes WHERE quiz_id = ?")
    .get(quizId);
  if (!row) return null;
  try {
    return JSON.parse(row.quiz_json);
  } catch (_err) {
    return null;
  }
}

function getAllCustomQuizzes() {
  const rows = db.prepare("SELECT quiz_json FROM room_quizzes").all();
  return rows
    .map((row) => {
      try {
        return JSON.parse(row.quiz_json);
      } catch (_err) {
        return null;
      }
    })
    .filter(Boolean);
}

function getQuiz(quizId) {
  return getCustomQuiz(quizId) || quizzes.find((quiz) => quiz.id === quizId);
}

function saveCustomQuiz(quiz) {
  db.prepare(
    "INSERT INTO room_quizzes (quiz_id, quiz_json, created_at) VALUES (?, ?, ?)"
  ).run(quiz.id, JSON.stringify(quiz), nowIso());
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

function getDailyQuiz(dateKey) {
  const row = db.prepare("SELECT quiz_json FROM daily_quizzes WHERE date = ?").get(dateKey);
  if (row) {
    try {
      return JSON.parse(row.quiz_json);
    } catch (_err) {
      // fall through to recreate
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

  db.prepare(
    "INSERT OR REPLACE INTO daily_quizzes (date, quiz_json, created_at) VALUES (?, ?, ?)"
  ).run(dateKey, JSON.stringify(dailyQuiz), nowIso());

  return dailyQuiz;
}

function getDailyAnswers(dateKey, userId) {
  return db
    .prepare(
      `SELECT question_id as questionId, answer_index as answerIndex
       FROM daily_answers WHERE quiz_date = ? AND user_id = ?`
    )
    .all(dateKey, userId);
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

function getFriendCandidates(userId, limit = 5) {
  return db
    .prepare(
      `SELECT rp2.user_id as userId,
              users.display_name as displayName,
              COUNT(*) as matchCount,
              MAX(rooms.created_at) as lastMatch
       FROM room_players rp1
       JOIN room_players rp2
         ON rp1.room_id = rp2.room_id AND rp2.user_id != rp1.user_id
       JOIN rooms ON rooms.id = rp1.room_id
       JOIN users ON users.id = rp2.user_id
       WHERE rp1.user_id = ?
       GROUP BY rp2.user_id
       ORDER BY matchCount DESC, lastMatch DESC
       LIMIT ?`
    )
    .all(userId, limit);
}

function buildDailyResults(dateKey, userId) {
  const quiz = getDailyQuiz(dateKey);
  if (!quiz) return null;
  const totalQuestions = quiz.questions.length;
  if (totalQuestions === 0) return null;

  const myAnswers = getDailyAnswers(dateKey, userId);
  if (myAnswers.length < totalQuestions) return null;

  const allAnswers = db
    .prepare(
      `SELECT user_id as userId, question_id as questionId, answer_index as answerIndex
       FROM daily_answers WHERE quiz_date = ?`
    )
    .all(dateKey);

  const answerKey = new Map(quiz.questions.map((question) => [question.id, question.answer]));
  const statsByUser = new Map();
  allAnswers.forEach((answer) => {
    const stats = statsByUser.get(answer.userId) || { answered: 0, correct: 0, wrong: 0 };
    stats.answered += 1;
    const correctIndex = answerKey.get(answer.questionId);
    if (answer.answerIndex === correctIndex) {
      stats.correct += 1;
    } else {
      stats.wrong += 1;
    }
    statsByUser.set(answer.userId, stats);
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

function getRoomByCode(code) {
  return db.prepare("SELECT * FROM rooms WHERE code = ?").get(code);
}

function getRoomPlayers(roomId) {
  return db
    .prepare(
      `SELECT users.id, users.display_name as displayName, room_players.role
       FROM room_players
       JOIN users ON users.id = room_players.user_id
       WHERE room_players.room_id = ?`
    )
    .all(roomId);
}

function isRoomMember(roomId, userId) {
  const row = db
    .prepare(
      `SELECT 1 FROM room_players WHERE room_id = ? AND user_id = ? LIMIT 1`
    )
    .get(roomId, userId);
  return Boolean(row);
}

function getRoomAnswers(roomId) {
  return db
    .prepare("SELECT * FROM room_answers WHERE room_id = ?")
    .all(roomId);
}

function getRoomRematch(roomId) {
  return db
    .prepare("SELECT user_id as userId FROM room_rematch WHERE room_id = ?")
    .all(roomId);
}

function getAllAnswers() {
  return db.prepare("SELECT * FROM room_answers").all();
}

function getAllUsers() {
  return db
    .prepare("SELECT id, display_name as displayName, email, country FROM users")
    .all();
}

function computeLeaderboard(scope, country) {
  const users = getAllUsers().map((user) => ({
    ...user,
    country: user.country || "US",
    score: 0,
    answered: 0
  }));
  const answers = getAllAnswers();

  const answerMap = new Map();
  for (const quiz of [...quizzes, ...getAllCustomQuizzes()]) {
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

function getBadges() {
  return db.prepare("SELECT id, title, description FROM badges").all();
}

function getUserBadges(userId) {
  return db
    .prepare("SELECT badge_id as badgeId, earned_at as earnedAt FROM user_badges WHERE user_id = ?")
    .all(userId);
}

function awardBadge(userId, badgeId) {
  const existing = db
    .prepare("SELECT badge_id FROM user_badges WHERE user_id = ? AND badge_id = ?")
    .get(userId, badgeId);
  if (existing) return;
  db.prepare(
    "INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES (?, ?, ?)"
  ).run(userId, badgeId, nowIso());
}

function awardBadgesForRoom(roomId) {
  const room = db.prepare("SELECT * FROM rooms WHERE id = ?").get(roomId);
  if (!room) return;
  const quiz = getQuiz(room.quiz_id);
  if (!quiz) return;
  const answers = getRoomAnswers(roomId);
  const players = getRoomPlayers(roomId);

  players.forEach((player) => {
    const score = computeScore(quiz, answers, player.id);
    const answeredCount = answers.filter((item) => item.user_id === player.id).length;
    if (answeredCount > 0) {
      awardBadge(player.id, "dual_spark");
    }
    if (score >= 3) {
      awardBadge(player.id, "focus_glow");
    }
  });

  players.forEach((player) => {
    const totalCorrect = getAllAnswers()
      .filter((item) => item.user_id === player.id)
      .reduce((acc, item) => {
        const correct = quizzes
          .flatMap((quizItem) => quizItem.questions)
          .find((question) => question.id === item.question_id)?.answer;
        return acc + (item.answer_index === correct ? 1 : 0);
      }, 0);
    if (totalCorrect >= 10) {
      awardBadge(player.id, "calm_streak");
    }
  });
}

function roomState(room) {
  const quiz = getQuiz(room.quiz_id);
  const players = getRoomPlayers(room.id);
  const answers = getRoomAnswers(room.id);
  const rematch = getRoomRematch(room.id);
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
      <p>${APP_NAME} collects the minimum information needed to create your account and run multiplayer matches.</p>
      <h2>Information we collect</h2>
      <ul>
        <li>Email address and display name</li>
        <li>Country (for leaderboard filtering)</li>
        <li>Gameplay data such as quiz answers and match results</li>
        <li>Device notification token if you enable notifications</li>
      </ul>
      <h2>How we use data</h2>
      <ul>
        <li>Authenticate your account and secure multiplayer rooms</li>
        <li>Show stats, badges, and leaderboards</li>
        <li>Send verification and password reset emails</li>
        <li>Send match notifications (optional)</li>
      </ul>
      <h2>Third-party services</h2>
      <ul>
        <li>Email delivery: Resend</li>
        <li>Crash reporting: if enabled, we may collect crash diagnostics</li>
      </ul>
      <h2>Data retention</h2>
      <ul>
        <li>You can delete your account at any time in the app</li>
        <li>Deactivated accounts can be reactivated on sign-in</li>
        <li>Account deletion removes profile data and game history</li>
      </ul>
      <h2>Your choices</h2>
      <ul>
        <li>You can update your profile from the app</li>
        <li>You can request account deletion from the app</li>
        <li>You can export your account data from the app</li>
      </ul>
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

app.get("/daily-quiz", authMiddleware, (req, res) => {
  const tzOffset = Number(req.query.tzOffset);
  const dateKey = todayKey(tzOffset);
  const quiz = getDailyQuiz(dateKey);
  if (!quiz) {
    return res.status(500).json({ error: "Unable to load daily quiz" });
  }
  const answers = getDailyAnswers(dateKey, req.user.id);
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

app.post("/daily-quiz/answer", authMiddleware, (req, res) => {
  const { questionId, answerIndex, tzOffset } = req.body;
  const dateKey = todayKey(Number(tzOffset));
  const quiz = getDailyQuiz(dateKey);
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

  db.prepare(
    `INSERT OR IGNORE INTO daily_answers (quiz_date, user_id, question_id, answer_index, answered_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(dateKey, req.user.id, questionId, answerIndex, nowIso());

  const answers = getDailyAnswers(dateKey, req.user.id);
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

app.get("/daily-quiz/results", authMiddleware, (req, res) => {
  const tzOffset = Number(req.query.tzOffset);
  const dateKey = todayKey(tzOffset);
  const baseResults = buildDailyResults(dateKey, req.user.id);
  if (!baseResults) {
    return res.status(409).json({ error: "Complete the daily quiz first" });
  }

  const quiz = getDailyQuiz(dateKey);
  const totalQuestions = quiz?.questions.length ?? 0;
  const allAnswers = db
    .prepare(
      `SELECT user_id as userId, question_id as questionId, answer_index as answerIndex
       FROM daily_answers WHERE quiz_date = ?`
    )
    .all(dateKey);
  const answerKey = new Map(quiz.questions.map((question) => [question.id, question.answer]));
  const statsByUser = new Map();
  allAnswers.forEach((answer) => {
    const stats = statsByUser.get(answer.userId) || { answered: 0, correct: 0, wrong: 0 };
    stats.answered += 1;
    const correctIndex = answerKey.get(answer.questionId);
    if (answer.answerIndex === correctIndex) {
      stats.correct += 1;
    } else {
      stats.wrong += 1;
    }
    statsByUser.set(answer.userId, stats);
  });

  const friends = getFriendCandidates(req.user.id, 5)
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

app.get("/daily-quiz/history", authMiddleware, (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 7, 1), 14);
  const rows = db
    .prepare(
      `SELECT DISTINCT quiz_date as date
       FROM daily_answers
       WHERE user_id = ?
       ORDER BY quiz_date DESC
       LIMIT ?`
    )
    .all(req.user.id, limit);

  const history = rows
    .map((row) => buildDailyResults(row.date, req.user.id))
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

app.post("/auth/register", rateLimit({ windowMs: 60_000, max: 15 }), (req, res) => {
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
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  const normalizedCountry = (country || "US").toUpperCase();
  const verificationToken = createToken();
  const verificationExpires = addMinutes(new Date(), 60).toISOString();
  const result = db
    .prepare(
      "INSERT INTO users (email, display_name, password_hash, created_at, country, email_verified, verification_token, verification_token_expires) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      email,
      displayName,
      passwordHash,
      nowIso(),
      normalizedCountry,
      0,
      verificationToken,
      verificationExpires
    );
  const user = {
    id: result.lastInsertRowid,
    email,
    display_name: displayName,
    country: normalizedCountry,
    email_verified: 0
  };
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
      displayName,
      country: normalizedCountry,
      emailVerified: false
    }
  });
});

app.post("/auth/login", rateLimit({ windowMs: 60_000, max: 20 }), (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const user = db
    .prepare(
      "SELECT id, email, display_name, password_hash, country, email_verified, deleted_at FROM users WHERE email = ?"
    )
    .get(email);
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
      emailVerified: user.email_verified === 1
    }
  });
});

app.post("/auth/reactivate", rateLimit({ windowMs: 60_000, max: 10 }), (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const user = db
    .prepare(
      "SELECT id, email, display_name, password_hash, country, email_verified, deleted_at FROM users WHERE email = ?"
    )
    .get(email);
  if (!user || !user.deleted_at) {
    return res.status(404).json({ error: "Account not found" });
  }
  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  db.prepare("UPDATE users SET deleted_at = NULL WHERE id = ?").run(user.id);
  const token = signToken({ ...user, deleted_at: null });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      country: user.country || "US",
      emailVerified: user.email_verified === 1
    }
  });
});

app.post("/auth/request-verify", rateLimit({ windowMs: 60_000, max: 5 }), (req, res) => {
  const { email } = req.body;
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }
  const user = db
    .prepare("SELECT id, email_verified FROM users WHERE email = ?")
    .get(email);
  if (!user) {
    return res.json({ ok: true });
  }
  if (user.email_verified === 1) {
    return res.json({ ok: true });
  }
  const verificationToken = createToken();
  const verificationExpires = addMinutes(new Date(), 60).toISOString();
  db.prepare(
    "UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?"
  ).run(verificationToken, verificationExpires, user.id);
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

app.get("/auth/verify", (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    return res.status(400).send("Invalid token");
  }
  const user = db
    .prepare(
      "SELECT id, verification_token_expires FROM users WHERE verification_token = ?"
    )
    .get(token);
  if (!user) {
    return res.status(404).send("Token not found");
  }
  if (user.verification_token_expires) {
    const expires = new Date(user.verification_token_expires);
    if (expires.getTime() < Date.now()) {
      return res.status(410).send("Token expired");
    }
  }
  db.prepare(
    "UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE id = ?"
  ).run(user.id);
  const html = renderSimplePage(
    "Email verified",
    "<p>Your email has been verified. You can return to the app.</p>"
  );
  return res.type("html").send(html);
});

app.post("/auth/password-reset/request", rateLimit({ windowMs: 60_000, max: 5 }), (req, res) => {
  const { email } = req.body;
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (!user) {
    return res.json({ ok: true });
  }
  const resetToken = createToken();
  const resetExpires = addMinutes(new Date(), 30).toISOString();
  db.prepare(
    "UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?"
  ).run(resetToken, resetExpires, user.id);
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

app.post("/auth/reset", express.urlencoded({ extended: true }), (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || String(newPassword).length < 8) {
    return res.status(400).send("Invalid request");
  }
  const user = db
    .prepare(
      "SELECT id, password_reset_expires FROM users WHERE password_reset_token = ?"
    )
    .get(token);
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
  db.prepare(
    "UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?"
  ).run(passwordHash, user.id);
  const html = renderSimplePage(
    "Password updated",
    "<p>Your password has been updated. You can return to the app.</p>"
  );
  return res.type("html").send(html);
});

app.post("/auth/password-reset/confirm", rateLimit({ windowMs: 60_000, max: 10 }), (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || String(newPassword).length < 8) {
    return res.status(400).json({ error: "Invalid request" });
  }
  const user = db
    .prepare(
      "SELECT id, password_reset_expires FROM users WHERE password_reset_token = ?"
    )
    .get(token);
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
  db.prepare(
    "UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?"
  ).run(passwordHash, user.id);
  return res.json({ ok: true });
});

app.get("/me", authMiddleware, (req, res) => {
  const user = db
    .prepare(
      "SELECT id, email, display_name as displayName, country, email_verified as emailVerified FROM users WHERE id = ?"
    )
    .get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({ user: { ...user, country: user.country || "US", emailVerified: user.emailVerified === 1 } });
});

app.patch("/me", authMiddleware, rateLimit({ windowMs: 60_000, max: 30 }), (req, res) => {
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
  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  const updated = db
    .prepare("SELECT id, email, display_name, country FROM users WHERE id = ?")
    .get(req.user.id);
  res.json({
    user: {
      id: updated.id,
      email: updated.email,
      displayName: updated.display_name,
      country: updated.country || "US",
      emailVerified: updated.email_verified === 1
    }
  });
});

app.patch("/me/email", authMiddleware, rateLimit({ windowMs: 60_000, max: 10 }), (req, res) => {
  const { newEmail, currentPassword } = req.body;
  if (!isValidEmail(newEmail) || !currentPassword) {
    return res.status(400).json({ error: "Invalid email or password" });
  }
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(newEmail.trim());
  if (existing && existing.id !== req.user.id) {
    return res.status(409).json({ error: "Email already registered" });
  }
  const user = db
    .prepare("SELECT id, password_hash FROM users WHERE id = ?")
    .get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  const isValid = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const verificationToken = createToken();
  const verificationExpires = addMinutes(new Date(), 60).toISOString();
  db.prepare(
    "UPDATE users SET email = ?, email_verified = 0, verification_token = ?, verification_token_expires = ? WHERE id = ?"
  ).run(newEmail.trim(), verificationToken, verificationExpires, req.user.id);
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

app.patch("/me/password", authMiddleware, rateLimit({ windowMs: 60_000, max: 10 }), (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Missing fields" });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const user = db
    .prepare("SELECT id, password_hash FROM users WHERE id = ?")
    .get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  const isValid = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, req.user.id);
  res.json({ ok: true });
});

app.get("/me/export", authMiddleware, (req, res) => {
  const userId = req.user.id;
  const user = db
    .prepare(
      "SELECT id, email, display_name as displayName, country, created_at as createdAt, email_verified as emailVerified, deleted_at as deletedAt FROM users WHERE id = ?"
    )
    .get(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  const rooms = db
    .prepare(
      `SELECT rooms.* FROM rooms
       JOIN room_players ON room_players.room_id = rooms.id
       WHERE room_players.user_id = ?
       ORDER BY rooms.created_at DESC`
    )
    .all(userId)
    .map((room) => ({
      code: room.code,
      mode: room.mode,
      status: room.status,
      quizId: room.quiz_id,
      createdAt: room.created_at,
      startedAt: room.started_at,
      completedAt: room.completed_at
    }));
  const answers = db
    .prepare(
      `SELECT question_id as questionId, answer_index as answerIndex, answered_at as answeredAt
       FROM room_answers WHERE user_id = ?`
    )
    .all(userId);
  const dailyAnswers = db
    .prepare(
      `SELECT quiz_date as date, question_id as questionId, answer_index as answerIndex, answered_at as answeredAt
       FROM daily_answers WHERE user_id = ?`
    )
    .all(userId);
  const badges = db
    .prepare(
      `SELECT badge_id as badgeId, earned_at as earnedAt FROM user_badges WHERE user_id = ?`
    )
    .all(userId);

  res.json({
    user,
    rooms,
    answers,
    dailyAnswers,
    badges,
    exportedAt: nowIso()
  });
});

app.delete("/me", authMiddleware, rateLimit({ windowMs: 60_000, max: 5 }), (req, res) => {
  const userId = req.user.id;
  const hostedRooms = db
    .prepare("SELECT id FROM rooms WHERE host_user_id = ?")
    .all(userId)
    .map((row) => row.id);

  const deleteRoomData = db.transaction(() => {
    if (hostedRooms.length > 0) {
      const ids = hostedRooms.map(() => "?").join(", ");
      db.prepare(`DELETE FROM room_answers WHERE room_id IN (${ids})`).run(...hostedRooms);
      db.prepare(`DELETE FROM room_players WHERE room_id IN (${ids})`).run(...hostedRooms);
      db.prepare(`DELETE FROM room_rematch WHERE room_id IN (${ids})`).run(...hostedRooms);
      db.prepare(`DELETE FROM rooms WHERE id IN (${ids})`).run(...hostedRooms);
    }

    db.prepare("DELETE FROM room_answers WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM room_players WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM user_badges WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  });

  deleteRoomData();
  res.json({ ok: true });
});

app.post("/me/deactivate", authMiddleware, rateLimit({ windowMs: 60_000, max: 5 }), (req, res) => {
  db.prepare("UPDATE users SET deleted_at = ? WHERE id = ?").run(nowIso(), req.user.id);
  res.json({ ok: true });
});

app.get("/leaderboard", authMiddleware, (req, res) => {
  const scope = req.query.scope === "country" ? "country" : "global";
  const country = typeof req.query.country === "string" ? req.query.country.toUpperCase() : "US";
  const entries = computeLeaderboard(scope, country);
  const meIndex = entries.findIndex((entry) => entry.userId === req.user.id);
  const me = meIndex >= 0 ? entries[meIndex] : null;
  res.json({ scope, country, entries: entries.slice(0, 10), me });
});

app.get("/badges", authMiddleware, (req, res) => {
  const badges = getBadges();
  const earned = getUserBadges(req.user.id);
  const earnedMap = new Map(earned.map((item) => [item.badgeId, item.earnedAt]));
  const response = badges.map((badge) => ({
    id: badge.id,
    title: badge.title,
    description: badge.description,
    earnedAt: earnedMap.get(badge.id) || null
  }));
  res.json({ badges: response });
});

app.post("/rooms", authMiddleware, (req, res) => {
  const { quizId, categoryId, questionCount, mode: requestedMode } = req.body;
  let quiz = null;
  if (quizId) {
    quiz = getQuiz(quizId);
  } else if (categoryId) {
    const count = Number(questionCount);
    if (Number.isInteger(count) && count > 0) {
      quiz = buildCategoryQuiz(categoryId, count);
    }
    if (quiz) saveCustomQuiz(quiz);
  }
  if (!quiz) return res.status(400).json({ error: "Invalid room configuration" });
  const mode = requestedMode === "sync" ? "sync" : "async";
  let code = generateCode();
  while (getRoomByCode(code)) {
    code = generateCode();
  }
  const result = db
    .prepare(
      `INSERT INTO rooms (code, mode, quiz_id, status, host_user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(code, mode, quiz.id, "lobby", req.user.id, nowIso());
  db.prepare(
    `INSERT INTO room_players (room_id, user_id, role, joined_at)
     VALUES (?, ?, ?, ?)`
  ).run(result.lastInsertRowid, req.user.id, "host", nowIso());

  const room = getRoomByCode(code);
  res.json(roomState(room));
});

app.post("/rooms/:code/join", authMiddleware, (req, res) => {
  const room = getRoomByCode(req.params.code);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }
  const players = getRoomPlayers(room.id);
  const exists = players.find((player) => player.id === req.user.id);
  if (!exists && room.status !== "lobby") {
    return res.status(409).json({ error: "Room already started" });
  }
  if (!exists && players.length >= 2) {
    return res.status(409).json({ error: "Room is full" });
  }
  if (!exists) {
    db.prepare(
      `INSERT INTO room_players (room_id, user_id, role, joined_at)
       VALUES (?, ?, ?, ?)`
    ).run(room.id, req.user.id, "guest", nowIso());
  }
  res.json(roomState(room));
});

app.get("/rooms/mine", authMiddleware, (req, res) => {
  const rooms = db
    .prepare(
      `SELECT rooms.* FROM rooms
       JOIN room_players ON room_players.room_id = rooms.id
       WHERE room_players.user_id = ?
       ORDER BY rooms.created_at DESC`
    )
    .all(req.user.id);

  const result = rooms.map((room) => {
    const quiz = getQuiz(room.quiz_id);
    const answers = getRoomAnswers(room.id);
    const players = getRoomPlayers(room.id);
    const rematch = getRoomRematch(room.id);
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
      rematchReady: rematch.map((item) => item.userId)
    };
  });

  res.json({ rooms: result });
});

app.get("/rooms/:code", authMiddleware, (req, res) => {
  const room = getRoomByCode(req.params.code);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }
  if (!isRoomMember(room.id, req.user.id)) {
    return res.status(403).json({ error: "Not a member of this room" });
  }
  res.json(roomState(room));
});

app.get("/stats", authMiddleware, (req, res) => {
  const rooms = db
    .prepare(
      `SELECT rooms.* FROM rooms
       JOIN room_players ON room_players.room_id = rooms.id
       WHERE room_players.user_id = ?`
    )
    .all(req.user.id);

  const perOpponent = {};
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let ongoing = 0;
  let rematchRequested = 0;

  rooms.forEach((room) => {
    if (room.status === "active") ongoing += 1;
    const players = getRoomPlayers(room.id);
    const opponent = players.find((player) => player.id !== req.user.id);
    const rematch = getRoomRematch(room.id);
    if (rematch.length > 0) rematchRequested += 1;
    if (!opponent) return;

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
      const quiz = getQuiz(room.quiz_id);
      const answers = getRoomAnswers(room.id);
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
  });

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
});

app.get("/rooms/:code/summary", authMiddleware, (req, res) => {
  const room = getRoomByCode(req.params.code);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }
  if (!isRoomMember(room.id, req.user.id)) {
    return res.status(403).json({ error: "Not a member of this room" });
  }
  const quiz = getQuiz(room.quiz_id);
  const players = getRoomPlayers(room.id);
  const answers = getRoomAnswers(room.id);
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

  socket.on("room:join", ({ code }) => {
    if (!user) return socket.emit("room:error", { error: "Unauthorized" });
    const room = getRoomByCode(code);
    if (!room) return socket.emit("room:error", { error: "Room not found" });
    if (!isRoomMember(room.id, user.id)) {
      return socket.emit("room:error", { error: "Not a member of this room" });
    }
    socket.join(code);
    io.to(code).emit("room:update", roomState(room));
  });

  socket.on("room:start", ({ code }) => {
    if (!user) return socket.emit("room:error", { error: "Unauthorized" });
    const room = getRoomByCode(code);
    if (!room) return socket.emit("room:error", { error: "Room not found" });
    if (!isRoomMember(room.id, user.id)) {
      return socket.emit("room:error", { error: "Not a member of this room" });
    }
    if (room.host_user_id !== user.id) {
      return socket.emit("room:error", { error: "Only the host can start" });
    }
    if (room.status !== "lobby") return;
    db.prepare(
      "UPDATE rooms SET status = ?, current_index = 0, started_at = ? WHERE id = ?"
    ).run("active", nowIso(), room.id);
    const updated = getRoomByCode(code);
    io.to(code).emit("room:update", roomState(updated));
  });

  socket.on("room:rematch", ({ code }) => {
    if (!user) return socket.emit("room:error", { error: "Unauthorized" });
    const room = getRoomByCode(code);
    if (!room) return socket.emit("room:error", { error: "Room not found" });
    if (!isRoomMember(room.id, user.id)) {
      return socket.emit("room:error", { error: "Not a member of this room" });
    }
    if (room.status !== "complete") {
      return socket.emit("room:error", { error: "Room is not complete" });
    }

    db.prepare(
      "INSERT OR IGNORE INTO room_rematch (room_id, user_id, ready_at) VALUES (?, ?, ?)"
    ).run(room.id, user.id, nowIso());

    const players = getRoomPlayers(room.id);
    const rematch = getRoomRematch(room.id);

    if (rematch.length >= players.length) {
      const currentQuiz = getQuiz(room.quiz_id);
      const nextQuiz = currentQuiz
        ? buildCategoryQuiz(currentQuiz.categoryId || "all", currentQuiz.questions.length)
        : null;
      if (nextQuiz) saveCustomQuiz(nextQuiz);
      db.prepare("DELETE FROM room_answers WHERE room_id = ?").run(room.id);
      db.prepare("DELETE FROM room_rematch WHERE room_id = ?").run(room.id);
      db.prepare(
        "UPDATE rooms SET status = ?, current_index = 0, started_at = ?, completed_at = NULL, quiz_id = ? WHERE id = ?"
      ).run("active", nowIso(), nextQuiz ? nextQuiz.id : room.quiz_id, room.id);
    }

    const updated = getRoomByCode(code);
    io.to(code).emit("room:update", roomState(updated));
  });

  socket.on("room:answer", ({ code, questionId, answerIndex }) => {
    if (!user) return socket.emit("room:error", { error: "Unauthorized" });
    const room = getRoomByCode(code);
    if (!room) return socket.emit("room:error", { error: "Room not found" });
    if (!isRoomMember(room.id, user.id)) {
      return socket.emit("room:error", { error: "Not a member of this room" });
    }
    if (room.status !== "active") return;

    const existing = db
      .prepare(
        `SELECT * FROM room_answers WHERE room_id = ? AND user_id = ? AND question_id = ?`
      )
      .get(room.id, user.id, questionId);
    if (!existing) {
      const quiz = getQuiz(room.quiz_id);
      if (!quiz) return;
      const question = quiz.questions.find((item) => item.id === questionId);
      if (!question) return;
      const maxIndex = question.options?.en?.length ?? 0;
      if (!Number.isInteger(answerIndex) || answerIndex < -1 || answerIndex >= maxIndex) {
        return;
      }
      db.prepare(
        `INSERT INTO room_answers (room_id, user_id, question_id, answer_index, answered_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(room.id, user.id, questionId, answerIndex, nowIso());
    }

    const quiz = getQuiz(room.quiz_id);
    const answers = getRoomAnswers(room.id);
    const players = getRoomPlayers(room.id);

    if (room.mode === "sync") {
      const question = quiz.questions[room.current_index];
      const answeredCount = answers.filter((item) => item.question_id === question.id).length;
      if (answeredCount >= players.length) {
        const nextIndex = room.current_index + 1;
        if (nextIndex >= quiz.questions.length) {
          db.prepare("UPDATE rooms SET status = ?, completed_at = ? WHERE id = ?").run(
            "complete",
            nowIso(),
            room.id
          );
          awardBadgesForRoom(room.id);
        } else {
          db.prepare("UPDATE rooms SET current_index = ? WHERE id = ?").run(nextIndex, room.id);
        }
      }
    } else {
      const completedPlayers = players.filter((player) => {
        const answeredCount = answers.filter((item) => item.user_id === player.id).length;
        return answeredCount >= quiz.questions.length;
      });
      if (completedPlayers.length === players.length) {
        db.prepare("UPDATE rooms SET status = ?, completed_at = ? WHERE id = ?").run(
          "complete",
          nowIso(),
          room.id
        );
        awardBadgesForRoom(room.id);
      }
    }

    const updated = getRoomByCode(code);
    io.to(code).emit("room:update", roomState(updated));
  });

  socket.on("disconnect", () => {
    user = null;
  });
});

httpServer.listen(port, () => {
  console.log(`Qwizzy API running on port ${port}`);
});
