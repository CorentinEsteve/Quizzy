import { API_BASE_URL } from "./config";
import {
  BadgesResponse,
  LeaderboardResponse,
  QuizSummary,
  RoomState,
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

export async function fetchQuizzes(): Promise<QuizSummary[]> {
  const response = await fetch(`${API_BASE_URL}/quizzes`);
  if (!response.ok) throw new Error("Unable to load quizzes");
  return response.json();
}

export async function createRoom(token: string, quizId: string) {
  const response = await fetch(`${API_BASE_URL}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ quizId })
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

export async function fetchSummary(token: string, code: string) {
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
