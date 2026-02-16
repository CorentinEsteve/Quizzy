export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? "onboarding@resend.dev";
export const SUPPORT_URL = process.env.EXPO_PUBLIC_SUPPORT_URL ?? `${API_BASE_URL}/support`;
export const APP_DOWNLOAD_URL = process.env.EXPO_PUBLIC_APP_DOWNLOAD_URL ?? "";
