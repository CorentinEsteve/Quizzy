export type QuizSummary = {
  id: string;
  categoryId: string;
  categoryLabel: string;
  title: string;
  subtitle: string;
  rounds: number;
  accent: string;
  questionCount: number;
};

export type LocalizedText = {
  en: string;
  fr: string;
};

export type LocalizedOptions = {
  en: string[];
  fr: string[];
};

export type Quiz = {
  id: string;
  categoryId: string;
  categoryLabel: string;
  title: string;
  subtitle: string;
  rounds: number;
  accent: string;
  questions: Question[];
};

export type Question = {
  id: string;
  prompt: LocalizedText;
  options: LocalizedOptions;
  answer?: number;
};

export type User = {
  id: number;
  email: string;
  displayName: string;
  country: string;
  emailVerified?: boolean;
};

export type RoomState = {
  code: string;
  mode: "sync" | "async";
  status: "lobby" | "active" | "complete";
  currentIndex: number;
  quiz: Quiz;
  players: { id: number; displayName: string; role: string }[];
  progress: { userId: number; answeredCount: number; correctCount?: number; wrongCount?: number }[];
  rematchReady: number[];
};

export type LeaderboardEntry = {
  rank: number;
  userId: number;
  displayName: string;
  country: string;
  score: number;
};

export type LeaderboardResponse = {
  scope: "global" | "country";
  country: string;
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
};

export type ScoreEntry = {
  userId: number;
  displayName: string;
  score: number;
};

export type SummaryAnswer = {
  userId: number;
  displayName: string;
  answerIndex: number;
};

export type SummaryQuestion = {
  id: string;
  prompt: LocalizedText;
  options: LocalizedOptions;
  answer: number | null;
  responses: SummaryAnswer[];
};

export type RoomSummary = {
  scores: ScoreEntry[];
  total: number;
  questions: SummaryQuestion[];
};

export type Badge = {
  id: string;
  title: string;
  description: string;
  earnedAt: string | null;
};

export type BadgesResponse = {
  badges: Badge[];
};

export type RoomListItem = {
  code: string;
  mode: "sync" | "async";
  status: "lobby" | "active" | "complete";
  quiz: Omit<Quiz, "questions"> & { questions: Omit<Question, "answer">[] };
  progress: Record<string, number>;
  players: { id: number; displayName: string; role: string }[];
  scores: Record<string, number>;
  rematchReady: number[];
};

export type RoomsResponse = {
  rooms: RoomListItem[];
};

export type StatsResponse = {
  totals: {
    wins: number;
    losses: number;
    ties: number;
    ongoing: number;
    rematchRequested: number;
  };
  opponents: {
    opponentId: number;
    opponentName: string;
    wins: number;
    losses: number;
    ties: number;
  }[];
};
