# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Qwizzy** is a multiplayer quiz app with:
- **Mobile:** React Native (Expo 54) + TypeScript
- **Backend:** Node.js Express (ES modules, no TypeScript)
- **Database:** Supabase (PostgreSQL + RLS)
- **Real-time:** Socket.io for multiplayer rooms
- **AI:** Anthropic Claude API for daily quiz generation via news feeds

Two independent apps under `apps/` — no monorepo tooling (no Turborepo/Nx).

## Commands

### Server (`apps/server`)
```bash
npm run dev          # node --watch src/index.js (auto-reload)
npm run start        # production
npm test             # Node.js native test runner
npm run test:watch   # watch mode
node --test test/quizLogic.test.js  # single test file
node scripts/generate-daily-quiz.js              # generate today's daily quiz via AI
node scripts/generate-daily-quiz.js 2026-03-22   # specific date
```

### Mobile (`apps/mobile`)
```bash
npm run start    # expo start
npm run ios      # expo start --ios
npm run android  # expo start --android
```

## Architecture

### Server (`apps/server/src/`)
- **`index.js`** (~2700 lines) — monolithic Express app: all routes, Socket.io handlers, rate limiting, auth middleware
- **`agenticDailyQuiz.js`** — AI daily quiz generation: fetches RSS news → Claude Opus generates 20 candidates → filters to 10 best → stores in DB. Runs via `node-cron` at 02:00 UTC daily; also triggerable via `POST /admin/generate-daily-quiz` (requires `ADMIN_SECRET` header)
- **`quizzes.js`** — static quiz library (2400+ lines, all questions bilingual EN/FR)
- **`quizLogic.js`** — score/stats computation (the only server logic covered by tests)
- **`push.js`** — FCM (Android) + APNs (iOS) push notification delivery
- **`db.js`** — Supabase client singleton
- **`auth.js`** — JWT helpers + Apple Sign-In JWKS verification

### Mobile (`apps/mobile/src/`)
- **`App.tsx`** — large (~68KB) root component managing navigation state, Socket.io connection, auth state
- **`screens/`** — 13 screen components; screens handle their own data fetching via `api.ts`
- **`api.ts`** — typed HTTP client (all server calls go here)
- **`config.ts`** — `EXPO_PUBLIC_API_BASE_URL` and feature flags
- **`theme.ts`** — design tokens (colors, spacing, typography)
- **`i18n.ts`** — EN/FR localization via expo-localization

### Database
- Supabase PostgreSQL; migrations in `supabase/migrations/`
- RLS enabled on `daily_answers` and `push_devices`
- Key tables: `users`, `daily_quizzes`, `daily_answers`, `rooms`, `push_devices`

### Multiplayer Flow
Rooms use a 5-character alphanumeric code (no I/O/L). Socket.io handles real-time sync for both synchronous duels (shared question index) and asynchronous duels (each player plays at own pace). Max 8 players per room.

### Auth
- Email/password → JWT (7-day expiry), sent as `Authorization: Bearer <token>`
- Apple Sign-In via remote JWKS verification
- Rate limiting (IP-based token bucket) on auth and sensitive endpoints

### Testing
- Node.js native `node:test` + `node:assert/strict` — no Jest/Vitest
- Tests only exist for `quizLogic.js` (scoring/stats)
- CI runs on push/PR via `.github/workflows/server-tests.yml` (Node 20)

## Key Environment Variables

**Server (`apps/server/.env`):** `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `ADMIN_SECRET`, `RESEND_API_KEY`, FCM/APNs credentials

**Mobile (`apps/mobile/.env`):** `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_SUPPORT_EMAIL`, `EXPO_PUBLIC_SUPPORT_URL`
