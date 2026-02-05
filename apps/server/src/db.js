import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.resolve("data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "dualquizz.db");
export const db = new Database(dbPath);

export function migrate() {
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      mode TEXT NOT NULL,
      quiz_id TEXT NOT NULL,
      status TEXT NOT NULL,
      host_user_id INTEGER NOT NULL,
      current_index INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      FOREIGN KEY(host_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS room_players (
      room_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      PRIMARY KEY (room_id, user_id),
      FOREIGN KEY(room_id) REFERENCES rooms(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS room_answers (
      room_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      question_id TEXT NOT NULL,
      answer_index INTEGER NOT NULL,
      answered_at TEXT NOT NULL,
      PRIMARY KEY (room_id, user_id, question_id),
      FOREIGN KEY(room_id) REFERENCES rooms(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS room_rematch (
      room_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      ready_at TEXT NOT NULL,
      PRIMARY KEY (room_id, user_id),
      FOREIGN KEY(room_id) REFERENCES rooms(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS room_quizzes (
      quiz_id TEXT PRIMARY KEY,
      quiz_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      user_id INTEGER NOT NULL,
      badge_id TEXT NOT NULL,
      earned_at TEXT NOT NULL,
      PRIMARY KEY (user_id, badge_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(badge_id) REFERENCES badges(id)
    );
  `);

  const userColumns = db.prepare("PRAGMA table_info(users)").all();
  const hasCountry = userColumns.some((column) => column.name === "country");
  if (!hasCountry) {
    db.exec("ALTER TABLE users ADD COLUMN country TEXT");
    db.exec("UPDATE users SET country = 'US' WHERE country IS NULL");
  }

  const hasEmailVerified = userColumns.some((column) => column.name === "email_verified");
  if (!hasEmailVerified) {
    db.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0");
  }

  const hasVerificationToken = userColumns.some((column) => column.name === "verification_token");
  if (!hasVerificationToken) {
    db.exec("ALTER TABLE users ADD COLUMN verification_token TEXT");
  }

  const hasVerificationExpires = userColumns.some(
    (column) => column.name === "verification_token_expires"
  );
  if (!hasVerificationExpires) {
    db.exec("ALTER TABLE users ADD COLUMN verification_token_expires TEXT");
  }

  const hasResetToken = userColumns.some((column) => column.name === "password_reset_token");
  if (!hasResetToken) {
    db.exec("ALTER TABLE users ADD COLUMN password_reset_token TEXT");
  }

  const hasResetExpires = userColumns.some(
    (column) => column.name === "password_reset_expires"
  );
  if (!hasResetExpires) {
    db.exec("ALTER TABLE users ADD COLUMN password_reset_expires TEXT");
  }

  const hasDeletedAt = userColumns.some((column) => column.name === "deleted_at");
  if (!hasDeletedAt) {
    db.exec("ALTER TABLE users ADD COLUMN deleted_at TEXT");
  }

  const badgeCount = db.prepare("SELECT COUNT(*) as count FROM badges").get();
  if (badgeCount.count === 0) {
    const insert = db.prepare("INSERT INTO badges (id, title, description) VALUES (?, ?, ?)");
    insert.run("focus_glow", "Focus glow", "Score 3+ correct answers in a single duel.");
    insert.run("calm_streak", "Calm streak", "Reach 10 correct answers overall.");
    insert.run("dual_spark", "Dual spark", "Complete your first duel.");
  }
}
