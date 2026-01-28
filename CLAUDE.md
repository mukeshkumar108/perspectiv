# Perspectiv (Expo / React Native) — AI Contributor Guide (Claude)

## Purpose
Perspectiv is a premium, minimalist mobile app for daily mood awareness, reflection, and capturing good moments.
It is intentionally NOT a “safe SaaS” or “therapy-coded” product. It should feel alive, confident, and modern.
We want love/hate, not bland.

## Repo Context
- Mobile app repo: `perspectiv` (Expo + expo-router)
- Backend repo: `b_attic` (Next.js App Router, Vercel)
- Backend is a STABLE contract. Treat it as production-ready.

## Non-negotiables (DO NOT TOUCH)
Do not modify these unless explicitly instructed:
- Clerk auth wiring and token retrieval (`src/auth/AuthProvider.tsx`, `src/auth/tokenCache.ts`)
- API client auth header behavior (`src/api/client.ts` always attaches Bearer when token exists)
- Base API client transport patterns (do not invent new fetch wrappers)
- Data schemas unless backend contract changed intentionally (`src/api/schemas.ts`)
- Debug tooling: `EXPO_PUBLIC_API_DEBUG` + Debug screen must remain (`app/(main)/debug.tsx`)

If you think something needs changing here, STOP and ask.

## Auth flow (mobile → backend)
- Expo app uses Clerk publishable key (`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`)
- App fetches a Clerk JWT (optionally via template)
- JWT is sent as `Authorization: Bearer <token>`
- Backend verifies using `CLERK_JWT_KEY`
- Backend optionally restricts `aud/azp` via `CLERK_AUTHORIZED_PARTIES`

## Backend auth middleware (authoritative)
Primary helper: `requireUser()` in `requireUser.ts`
- Bearer-first: `resolveClerkUserId()` checks `Authorization: Bearer <token>` via `getBearerTokenFromHeaders()`, then falls back to Clerk session cookies (`auth()`).
- Production-only requirements: if `NODE_ENV === "production"` and `CLERK_JWT_KEY` or `CLERK_AUTHORIZED_PARTIES` is missing/empty → 401.
- Token verification: `verifyToken(bearerToken, { jwtKey, authorizedParties })` from `@clerk/backend`; requires `payload.sub`.
- Env vars: `CLERK_JWT_KEY`, `CLERK_AUTHORIZED_PARTIES`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.

## Mobile auth + token wiring (stable)
Files:
- `src/auth/AuthProvider.tsx` — sets token getter and `useAuthReady()`.
- `src/auth/tokenCache.ts` — SecureStore token cache (native) / localStorage (web).
- `src/hooks/useToday.ts` and `src/hooks/useStreaks.ts` — queries are gated by `useAuthReady()`.

JWT template fallback logic:
- If `EXPO_PUBLIC_CLERK_JWT_TEMPLATE` is set, the app attempts `getToken({ template })`.
- If template fetch throws or returns null, it falls back to default `getToken()`.
- If token fetch fails, it retries (prevents “authReady stuck”).

## API client (stable)
Files:
- `src/api/client.ts` — single API transport, attaches `Authorization: Bearer <token>` when available.
- `src/api/schemas.ts` — Zod schemas for responses.
- `src/hooks/useReflection.ts` — mutation + cache invalidations.

Base URL:
- Currently hardcoded in `src/api/client.ts` as `https://b-attic.vercel.app`.
- There is no `EXPO_PUBLIC_API_BASE_URL` yet. Do not document otherwise unless you add it.

Query keys:
- `queryKeys.today`, `queryKeys.streaks`, `queryKeys.me` in `src/state/queryClient.ts`

## Debug tooling (must remain)
- Debug screen: `app/(main)/debug.tsx`
- Log toggle: `EXPO_PUBLIC_API_DEBUG=1`
- Runbook: `docs/debugging.md`

## Current screen flow
Auth:
- `app/(auth)/welcome.tsx`
- `app/(auth)/sign-in.tsx`
- `app/(auth)/sign-up.tsx`

Main:
- `app/(main)/(tabs)/index.tsx` (Home)
- `app/(main)/reflect.tsx` (Reflection flow)
- `app/(main)/success.tsx` (Success)
- `app/(main)/account.tsx` (Account)
- `app/(main)/debug.tsx` (Debug)
- `app/(main)/capture.tsx` (Capture — stubbed)

## Backend API (authoritative contract)
All routes require auth via `requireUser()`.

GET `/api/bluum/today`
- File: `route.ts` → `export async function GET`
- Query: `dateLocal? (YYYY-MM-DD)`
- Response:
  - `dateLocal`, `onboardingCompleted`, `hasReflected`, `hasMood`
  - `prompt { id, text }`, `didSwapPrompt`, `primaryCta`
- Errors: 400 invalid dateLocal, 401

GET `/api/bluum/me`
- File: `route.ts` → `GET`
- Response:
  - `user { id, displayName, timezone, onboardingCompleted, reflectionReminderEnabled, reflectionReminderTimeLocal }`
- Errors: 401, 500

POST `/api/bluum/onboarding`
- File: `route.ts` → `POST`
- Body:
  - `displayName (1..50)`
  - `timezone (IANA, optional)`
  - `reflectionReminderEnabled`
  - `reflectionReminderTimeLocal (required if reminders enabled)`
- Response: same shape as `/me`
- Errors: 400 invalid timezone / missing reminder time, 401

POST `/api/bluum/mood`
- File: `route.ts` → `POST`
- Body:
  - `dateLocal?`, `rating (1..5)`, `tags? (max 5)`, `note? (<=200)`
- Response: `{ saved: true }`
- Errors: 400 invalid dateLocal, 401

POST `/api/bluum/reflection`
- File: `route.ts` → `POST`
- Body: `{ dateLocal?, responseText (1..2000) }`
- Response (normal):
  - `{ saved: true, safetyFlagged: false, coach { type, text }, successMessage }`
- Response (safety flagged):
  - `{ saved: true, safetyFlagged: true, safeResponse { message, resources[] }, coach: null, successMessage: null }`
- Errors: 409 if already exists, 400 invalid input, 401

POST `/api/bluum/reflection/addendum`
- File: `route.ts` → `POST`
- Body: `{ dateLocal?, text (1..400) }`
- Response: `{ saved: true }`
- Errors: 400 if not today / missing reflection, 409 if addendum exists, 401

POST `/api/bluum/prompt/swap`
- File: `route.ts` → `POST`
- Body: `{ dateLocal? }`
- Response: `{ prompt { id, text }, didSwapPrompt: true }`
- Errors: 400 if no daily status, 409 if swapped already or reflection submitted, 401

GET `/api/bluum/streaks`
- File: `route.ts` → `GET`
- Query: `dateLocal?`
- Response: `{ dateLocal, currentStreak, longestStreak, totalReflections }`
- Errors: 400 invalid dateLocal, 401

GET `/api/bluum/summaries`
- File: `route.ts` → `GET`
- Query: `type?=weekly|monthly`, `limit? (1..50)`
- Response: `{ items: [{ id, periodType, periodStartLocal, periodEndLocal, summaryText, createdAt }] }`
- Errors: 400 invalid type, 401

POST `/api/bluum/moment`
- File: `route.ts` → `POST`
- Body: `{ text? (<=280), imageUrl? }` (one required)
- Response: `{ saved: true, id }`
- Errors: 400 if both missing, 401

GET `/api/bluum/moments`
- File: `route.ts` → `GET`
- Query: `limit? (1..100)`, `cursor?`, `q?`
- Response: `{ items: [...], nextCursor }`
- Errors: 401

POST `/api/bluum/moment/upload-url`
- File: `route.ts` → `POST`
- Response: `{ uploadUrl, publicUrl }`
- Errors: 401
- Status: stubbed; real client upload flow is TODO.

## Special constraints
- One reflection per day (409 if already exists).
- Addendum is same-day only and max once.
- Prompt swap only once per day and only before reflection.

## UX intent (guardrails)
- No SaaS tone (“Saved”, “Entry recorded”, etc.)
- No therapy tone (“You showed up”, “That counts”, etc.)
- Avoid emojis and exclamation marks by default.
- Prefer big typography, whitespace, chat-like input patterns.
- Mood + moments are lightweight and repeatable; reflection is once/day and needs a stronger completion beat.

## Engineering rules
- Do not call `fetch()` directly from screens. Use the API client + hooks.
- Queries must be gated by `useAuthReady()` (`enabled: authReady`).
- After mutations, invalidate relevant queries (`queryKeys.today`, `queryKeys.streaks`, etc.).
- If unsure about endpoint shapes, query keys, or auth gating, STOP and ask.

## Build/dev notes
- Expo env changes require cache clear: `npx expo start -c`
- Debug mode: `EXPO_PUBLIC_API_DEBUG=1`
