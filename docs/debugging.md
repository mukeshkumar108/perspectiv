# Debugging runbook

## Enable API debug logs

Set `EXPO_PUBLIC_API_DEBUG=1` in your `.env` and restart Expo.
If you change any `EXPO_PUBLIC_*` env vars, run `npx expo start -c` to clear cache.

Example:

```
EXPO_PUBLIC_API_DEBUG=1
```

Logs are always enabled in dev builds. Production builds only log when this flag is set.

## What to look for

- `hasAuthHeader: true` and `tokenLength > 0` on initial requests
- `status: 401` with `Session expired` redirect if the token is invalid
- Repeated `request` logs without responses indicate a network issue
- If `authReady` stays `no`, the token fetch is failing. This can happen if a JWT template
  is misnamed or not yet available in Clerk. In dev, the app falls back to the default
  token if the template fetch fails.
- See the README “Auth flow (mobile → backend)” section for a quick auth overview.

## Debug screen

Open the History tab and tap **Debug**.

You can verify:
- Auth state (Clerk loaded/signed in)
- Token fetch status (last fetch time, length, null)
- API base URL
- Recent API logs (last 20 entries)

Use the **Ping /today** or **Ping /streaks** buttons to confirm a successful authenticated request. Expect log lines like:

```
[api] request { hasAuthHeader: true, tokenLength: 123, ... }
[api] response { status: 200, ok: true, ... }
```

## Clerk JWT template notes

- If you use `EXPO_PUBLIC_CLERK_JWT_TEMPLATE`, make sure the template exists in Clerk
  and has propagated before testing.
- The backend expects `CLERK_AUTHORIZED_PARTIES` (production) to match `aud`/`azp`
  from the Clerk JWT template.
