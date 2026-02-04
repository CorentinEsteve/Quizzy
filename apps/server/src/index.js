import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import bcrypt from "bcryptjs";
import { db, migrate } from "./db.js";
import { authMiddleware, signToken, verifyToken } from "./auth.js";
import { quizzes } from "./quizzes.js";

migrate();

const app = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: { origin: "*" }
});

const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function nowIso() {
  return new Date().toISOString();
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

app.get("/quizzes", (req, res) => {
  res.json(
    quizzes.map(({ questions, ...rest }) => ({
      ...rest,
      questionCount: questions.length
    }))
  );
});

app.post("/auth/register", (req, res) => {
  const { email, password, displayName, country } = req.body;
  if (!email || !password || !displayName) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  const normalizedCountry = (country || "US").toUpperCase();
  const result = db
    .prepare(
      "INSERT INTO users (email, display_name, password_hash, created_at, country) VALUES (?, ?, ?, ?, ?)"
    )
    .run(email, displayName, passwordHash, nowIso(), normalizedCountry);
  const user = {
    id: result.lastInsertRowid,
    email,
    display_name: displayName,
    country: normalizedCountry
  };
  const token = signToken(user);
  res.json({ token, user: { id: user.id, email, displayName, country: normalizedCountry } });
});

app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const user = db
    .prepare("SELECT id, email, display_name, password_hash, country FROM users WHERE email = ?")
    .get(email);
  if (!user) {
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
      country: user.country || "US"
    }
  });
});

app.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.patch("/me", authMiddleware, (req, res) => {
  const { displayName, country } = req.body;
  const updates = [];
  const params = [];

  if (typeof displayName === "string" && displayName.trim()) {
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
      country: updated.country || "US"
    }
  });
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
    socket.join(code);
    io.to(code).emit("room:update", roomState(room));
  });

  socket.on("room:start", ({ code }) => {
    if (!user) return socket.emit("room:error", { error: "Unauthorized" });
    const room = getRoomByCode(code);
    if (!room) return socket.emit("room:error", { error: "Room not found" });
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
    if (room.status !== "active") return;

    const existing = db
      .prepare(
        `SELECT * FROM room_answers WHERE room_id = ? AND user_id = ? AND question_id = ?`
      )
      .get(room.id, user.id, questionId);
    if (!existing) {
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
  console.log(`DualQuizz API running on port ${port}`);
});
