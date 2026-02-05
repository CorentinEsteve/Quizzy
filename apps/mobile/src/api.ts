import { API_BASE_URL } from "./config";
import {
  BadgesResponse,
  DailyQuizResults,
  DailyQuizStatus,
  DailyQuizHistoryItem,
  LeaderboardResponse,
  QuizSummary,
  RoomState,
  RoomSummary,
  RoomsResponse,
  StatsResponse,
  User
} from "./data/types";

export type AuthResponse = { token: string; user: User };

export async function registerUser(
  email: string,
  password: string,
  displayName: string,
  country: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, displayName, country })
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to register");
  }
  return response.json();
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to login");
  }
  return response.json();
}

export async function requestEmailVerification(email: string) {
  const response = await fetch(`${API_BASE_URL}/auth/request-verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to send verification");
  }
  return response.json();
}

export async function requestPasswordReset(email: string) {
  const response = await fetch(`${API_BASE_URL}/auth/password-reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to request reset");
  }
  return response.json();
}

export async function confirmPasswordReset(payload: { token: string; newPassword: string }) {
  const response = await fetch(`${API_BASE_URL}/auth/password-reset/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to reset password");
  }
  return response.json();
}

export async function fetchQuizzes(): Promise<QuizSummary[]> {
  const response = await fetch(`${API_BASE_URL}/quizzes`);
  if (!response.ok) throw new Error("Unable to load quizzes");
  return response.json();
}

export async function fetchDailyQuiz(token: string): Promise<DailyQuizStatus> {
  const tzOffset = new Date().getTimezoneOffset();
  const response = await fetch(`${API_BASE_URL}/daily-quiz?tzOffset=${tzOffset}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to load daily quiz");
  }
  return response.json();
}

export async function submitDailyAnswer(
  token: string,
  payload: { questionId: string; answerIndex: number }
) {
  const tzOffset = new Date().getTimezoneOffset();
  const response = await fetch(`${API_BASE_URL}/daily-quiz/answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ ...payload, tzOffset })
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to submit answer");
  }
  return response.json() as Promise<{
    date: string;
    answeredCount: number;
    correctCount: number;
    wrongCount: number;
    totalQuestions: number;
    completed: boolean;
  }>;
}

export async function fetchDailyResults(token: string): Promise<DailyQuizResults> {
  const tzOffset = new Date().getTimezoneOffset();
  const response = await fetch(`${API_BASE_URL}/daily-quiz/results?tzOffset=${tzOffset}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to load daily results");
  }
  return response.json();
}

export async function fetchDailyHistory(token: string, limit = 7) {
  const response = await fetch(`${API_BASE_URL}/daily-quiz/history?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to load daily history");
  }
  return response.json() as Promise<{ history: DailyQuizHistoryItem[] }>;
}

export async function createRoom(
  token: string,
  payload: {
    quizId?: string;
    categoryId?: string;
    questionCount?: number;
    mode?: "sync" | "async";
  }
) {
  const response = await fetch(`${API_BASE_URL}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to create room");
  }
  return response.json() as Promise<RoomState>;
}

export async function joinRoom(token: string, code: string) {
  const response = await fetch(`${API_BASE_URL}/rooms/${code}/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to join room");
  }
  return response.json() as Promise<RoomState>;
}

export async function fetchRoom(token: string, code: string) {
  const response = await fetch(`${API_BASE_URL}/rooms/${code}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to load room");
  }
  return response.json() as Promise<RoomState>;
}

export async function fetchSummary(token: string, code: string): Promise<RoomSummary> {
  const response = await fetch(`${API_BASE_URL}/rooms/${code}/summary`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to load summary");
  }
  return response.json();
}

export async function fetchLeaderboard(
  token: string,
  scope: "global" | "country",
  country?: string
) {
  const params = new URLSearchParams({ scope });
  if (country) params.set("country", country);
  const response = await fetch(`${API_BASE_URL}/leaderboard?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to load leaderboard");
  }
  return response.json() as Promise<LeaderboardResponse>;
}

export async function fetchBadges(token: string) {
  const response = await fetch(`${API_BASE_URL}/badges`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to load badges");
  }
  return response.json() as Promise<BadgesResponse>;
}

export async function fetchMe(token: string) {
  const response = await fetch(`${API_BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to load profile");
  }
  return response.json() as Promise<{ user: User }>;
}

export async function fetchMyRooms(token: string) {
  const response = await fetch(`${API_BASE_URL}/rooms/mine`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to load rooms");
  }
  return response.json() as Promise<RoomsResponse>;
}

export async function fetchStats(token: string) {
  const response = await fetch(`${API_BASE_URL}/stats`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to load stats");
  }
  return response.json() as Promise<StatsResponse>;
}

export async function updateProfile(
  token: string,
  payload: { displayName?: string; country?: string }
) {
  const response = await fetch(`${API_BASE_URL}/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to update profile");
  }
  return response.json();
}

export async function deleteAccount(token: string) {
  const response = await fetch(`${API_BASE_URL}/me`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to delete account");
  }
  return response.json();
}

export async function updatePassword(
  token: string,
  payload: { currentPassword: string; newPassword: string }
) {
  const response = await fetch(`${API_BASE_URL}/me/password`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to update password");
  }
  return response.json();
}

export async function updateEmail(
  token: string,
  payload: { newEmail: string; currentPassword: string }
) {
  const response = await fetch(`${API_BASE_URL}/me/email`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to update email");
  }
  return response.json();
}

export async function exportAccountData(token: string) {
  const response = await fetch(`${API_BASE_URL}/me/export`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to export data");
  }
  return response.json();
}

export async function deactivateAccount(token: string) {
  const response = await fetch(`${API_BASE_URL}/me/deactivate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || "Unable to deactivate account");
  }
  return response.json();
}
