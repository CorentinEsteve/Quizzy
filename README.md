# Quizz App (Clean Edition)

A clean, Apple-like take on a DualQuizz-style experience built with React Native (Expo) and Node.js.
Includes JWT authentication and real-time multiplayer (async) via Socket.io.

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
- Asynchronous duels (play at your pace)
- Live room updates with Socket.io
