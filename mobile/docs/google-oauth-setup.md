# Google sign-in (mobile) — setup

The mobile Google flow mirrors the website: obtain a Google **id_token** on the
device, POST it to `POST /api/v1/auth/google`, which verifies the token's
audience against the backend's allowed client IDs and returns a session.

Code:
- `src/auth/useGoogleAuth.ts` — runs the OAuth flow (`expo-auth-session/providers/google`) and returns the id_token.
- `src/auth/AuthContext.tsx` — `googleLogin(idToken)` POSTs to `/auth/google` and stores the session (same as email/password login).
- `src/components/GoogleButton.tsx` — the button; real flow when configured, honest "not configured" placeholder otherwise.

Until the steps below are done, the button shows the placeholder — it never
silently fails.

## 1. Create OAuth client IDs (Google Cloud Console → APIs & Services → Credentials)

Use the **same Google Cloud project** as the website. Create OAuth 2.0 Client IDs:

- **iOS** — bundle ID `ae.queryandbuy.app`
- **Android** — package `ae.queryandbuy.app` + your signing SHA-1
- **Web** — (for Expo web / dev). Authorised redirect URIs should include the
  Expo dev redirect (e.g. `https://auth.expo.io/@your-account/query-and-buy`)
  and, for local web, `http://localhost:8082`.

## 2. Set the client IDs as env vars (bundled via `EXPO_PUBLIC_*`)

In the mobile app's environment (e.g. `mobile/.env` or your build profile):

```
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxx.apps.googleusercontent.com
```

## 3. Allow those client IDs on the backend

The API verifies the id_token audience against `AUTH_GOOGLE_ID` (web) plus
`GOOGLE_MOBILE_CLIENT_IDS` (comma-separated). Add the **mobile** client IDs you
ship:

```
GOOGLE_MOBILE_CLIENT_IDS=<ios-client-id>,<android-client-id>
```

(`lib/api/idTokens.ts` reads these.)

## 4. Native redirect scheme

`expo-auth-session`'s Google provider uses `ae.queryandbuy.app:/oauthredirect`
as the native redirect. This works in a dev/standalone build; it does **not**
work in Expo Go. Build a dev client (`expo run:ios` / `expo run:android`) to
test on device.

## Notes
- No client secret is needed — installed apps use the auth-code flow and
  auto-exchange for the id_token.
- Nothing to change on the backend beyond `GOOGLE_MOBILE_CLIENT_IDS`; the
  `/auth/google` route and user resolution are already shared with the website.
