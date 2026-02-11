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

export type AuthResponse = { token: string; user: User; isNewUser?: boolean };

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export function isAuthError(error: unknown): error is AuthError {
  if (error instanceof AuthError) return true;
  if (!error || typeof error !== "object") return false;
  return "name" in error && (error as { name?: string }).name === "AuthError";
}

async function ensureOk(
  response: Response,
  fallbackMessage: string,
  options?: { authRequired?: boolean }
) {
  if (response.ok) return;
  const message = await response.json().catch(() => ({}));
  const isAuth = response.status === 401 || response.status === 403;
  if (options?.authRequired && isAuth) {
    throw new AuthError(message.error || "Unauthorized");
  }
  throw new Error(message.error || fallbackMessage);
}

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
  await ensureOk(response, "Unable to register");
  return response.json();
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  await ensureOk(response, "Unable to login");
  return response.json();
}

export async function loginWithApple(payload: {
  identityToken: string;
  email?: string | null;
  fullName?: {
    givenName?: string | null;
    middleName?: string | null;
    familyName?: string | null;
    nickname?: string | null;
    namePrefix?: string | null;
    nameSuffix?: string | null;
  } | null;
  country?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/auth/apple`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  await ensureOk(response, "Unable to login with Apple");
  return response.json() as Promise<AuthResponse>;
}

export async function requestEmailVerification(email: string) {
  const response = await fetch(`${API_BASE_URL}/auth/request-verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  await ensureOk(response, "Unable to send verification");
  return response.json();
}

export async function requestPasswordReset(email: string) {
  const response = await fetch(`${API_BASE_URL}/auth/password-reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  await ensureOk(response, "Unable to request reset");
  return response.json();
}

export async function confirmPasswordReset(payload: { token: string; newPassword: string }) {
  const response = await fetch(`${API_BASE_URL}/auth/password-reset/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  await ensureOk(response, "Unable to reset password");
  return response.json();
}

export async function fetchQuizzes(): Promise<QuizSummary[]> {
  const response = await fetch(`${API_BASE_URL}/quizzes`);
  await ensureOk(response, "Unable to load quizzes");
  return response.json();
}

export async function fetchDailyQuiz(token: string): Promise<DailyQuizStatus> {
  const tzOffset = new Date().getTimezoneOffset();
  const response = await fetch(`${API_BASE_URL}/daily-quiz?tzOffset=${tzOffset}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await ensureOk(response, "Unable to load daily quiz", { authRequired: true });
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
  await ensureOk(response, "Unable to submit answer", { authRequired: true });
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
  await ensureOk(response, "Unable to load daily results", { authRequired: true });
  return response.json();
}

export async function fetchDailyHistory(token: string, limit = 7) {
  const response = await fetch(`${API_BASE_URL}/daily-quiz/history?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await ensureOk(response, "Unable to load daily history", { authRequired: true });
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
  await ensureOk(response, "Unable to create room", { authRequired: true });
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
  await ensureOk(response, "Unable to join room", { authRequired: true });
  return response.json() as Promise<RoomState>;
}

export async function inviteToRoom(token: string, code: string, userId: number) {
  const response = await fetch(`${API_BASE_URL}/rooms/${code}/invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ userId })
  });
  await ensureOk(response, "Unable to send invite", { authRequired: true });
  return response.json() as Promise<RoomState>;
}

export async function cancelRoomInvite(token: string, code: string, userId: number) {
  const response = await fetch(`${API_BASE_URL}/rooms/${code}/invite/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  await ensureOk(response, "Unable to cancel invite", { authRequired: true });
  return response.json() as Promise<RoomState>;
}

export async function closeRoom(token: string, code: string) {
  const postResponse = await fetch(`${API_BASE_URL}/rooms/${code}/close`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (postResponse.ok) {
    return postResponse.json() as Promise<{ ok: boolean; code: string }>;
  }

  const deleteResponse = await fetch(`${API_BASE_URL}/rooms/${code}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  await ensureOk(deleteResponse, "Unable to close room", { authRequired: true });
  return deleteResponse.json() as Promise<{ ok: boolean; code: string }>;
}

export async function fetchRoom(token: string, code: string) {
  const response = await fetch(`${API_BASE_URL}/rooms/${code}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await ensureOk(response, "Unable to load room", { authRequired: true });
  return response.json() as Promise<RoomState>;
}

export async function fetchSummary(token: string, code: string): Promise<RoomSummary> {
  const response = await fetch(`${API_BASE_URL}/rooms/${code}/summary`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await ensureOk(response, "Unable to load summary", { authRequired: true });
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
  await ensureOk(response, "Unable to load leaderboard", { authRequired: true });
  return response.json() as Promise<LeaderboardResponse>;
}

export async function fetchBadges(token: string) {
  const response = await fetch(`${API_BASE_URL}/badges`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await ensureOk(response, "Unable to load badges", { authRequired: true });
  return response.json() as Promise<BadgesResponse>;
}

export async function fetchMe(token: string) {
  const response = await fetch(`${API_BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await ensureOk(response, "Unable to load profile", { authRequired: true });
  return response.json() as Promise<{ user: User }>;
}

export async function registerPushDevice(
  token: string,
  payload: { provider: "apns" | "fcm"; token: string; platform: "ios" | "android" }
) {
  const response = await fetch(`${API_BASE_URL}/me/push-devices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  await ensureOk(response, "Unable to register push device", { authRequired: true });
  return response.json() as Promise<{ ok: boolean }>;
}

export async function unregisterPushDevice(
  token: string,
  payload?: { provider?: "apns" | "fcm"; token?: string }
) {
  const response = await fetch(`${API_BASE_URL}/me/push-devices`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload || {})
  });
  await ensureOk(response, "Unable to unregister push device", { authRequired: true });
  return response.json() as Promise<{ ok: boolean }>;
}

export async function fetchMyRooms(token: string) {
  const response = await fetch(`${API_BASE_URL}/rooms/mine`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await ensureOk(response, "Unable to load rooms", { authRequired: true });
  return response.json() as Promise<RoomsResponse>;
}

export async function fetchStats(token: string) {
  const response = await fetch(`${API_BASE_URL}/stats`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await ensureOk(response, "Unable to load stats", { authRequired: true });
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
  await ensureOk(response, "Unable to update profile", { authRequired: true });
  return response.json();
}

export async function deleteAccount(token: string) {
  const response = await fetch(`${API_BASE_URL}/me`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  await ensureOk(response, "Unable to delete account", { authRequired: true });
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
  await ensureOk(response, "Unable to update password", { authRequired: true });
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
  await ensureOk(response, "Unable to update email", { authRequired: true });
  return response.json();
}

export async function exportAccountData(token: string) {
  const response = await fetch(`${API_BASE_URL}/me/export`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  await ensureOk(response, "Unable to export data", { authRequired: true });
  return response.json();
}

export async function deactivateAccount(token: string) {
  const response = await fetch(`${API_BASE_URL}/me/deactivate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  await ensureOk(response, "Unable to deactivate account", { authRequired: true });
  return response.json();
}
