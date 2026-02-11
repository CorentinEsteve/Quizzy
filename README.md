# Qwizzy

A clean, Apple-like take on a duel quiz experience built with React Native (Expo) and Node.js.
Includes JWT authentication and real-time multiplayer (sync + async) via Socket.io.

## Structure
- `apps/mobile` – React Native (Expo) app
- `apps/server` – Node.js API (Express)

## Quick Start

### Server
```bash
cd apps/server
npm install
npm run dev
```

For native push notifications (APNs/FCM), create the device table:
```bash
psql "$SUPABASE_DB_URL" -f ../../docs/push-devices.sql
```

Set required server env vars:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `APP_BASE_URL`

And set push/email provider env vars only if you use these features:
- `FCM_PROJECT_ID`
- `FCM_CLIENT_EMAIL`
- `FCM_PRIVATE_KEY` (use `\n` escaped line breaks)
- `APNS_TEAM_ID`
- `APNS_KEY_ID`
- `APNS_PRIVATE_KEY` (use `\n` escaped line breaks)
- `APNS_BUNDLE_ID`
- `APNS_USE_PRODUCTION` (`true` for App Store/TestFlight, `false` for sandbox)

### Mobile
```bash
cd apps/mobile
npm install
npm run start
```

The mobile app expects the API at `http://localhost:3001` by default. Update `apps/mobile/src/config.ts` if needed.

## Features
- JWT auth (register/login)
- Create/join rooms with short codes
- Synchronous duels (shared question index)
- Asynchronous duels (play at your pace)
- Live room updates with Socket.io
