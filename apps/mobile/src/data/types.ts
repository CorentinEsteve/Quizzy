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
  invites?: { id: number; displayName: string; role: string }[];
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
  createdAt?: string | null;
  updatedAt?: string | null;
  invitedAt?: string | null;
  quiz: Omit<Quiz, "questions"> & { questions: Omit<Question, "answer">[] };
  progress: Record<string, number>;
  players: { id: number; displayName: string; role: string }[];
  scores: Record<string, number>;
  rematchReady: number[];
  myRole?: string;
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

export type DailyQuizStatus = {
  date: string;
  quiz: Quiz;
  answers: { questionId: string; answerIndex: number }[];
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  completed: boolean;
};

export type DailyFriendStat = {
  userId: number;
  displayName: string;
  answered: number;
  score: number;
  correct: number;
  wrong: number;
  correctPct: number;
  wrongPct: number;
  completed: boolean;
};

export type DailyQuizResults = {
  date: string;
  totalQuestions: number;
  participants: number;
  completedPlayers: number;
  my: {
    score: number;
    correct: number;
    wrong: number;
    correctPct: number;
    wrongPct: number;
    rank: number | null;
    percentile: number | null;
  };
  global: {
    averageScore: number;
    correctPct: number;
    wrongPct: number;
  };
  friends: DailyFriendStat[];
  questions?: {
    id: string;
    prompt: LocalizedText;
    options: LocalizedOptions;
    answer: number | null;
    myAnswer: number | null;
  }[];
};

export type DailyQuizHistoryItem = {
  date: string;
  totalQuestions: number;
  participants: number;
  completedPlayers: number;
  score: number;
  percentile: number | null;
  rank: number | null;
};
