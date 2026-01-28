# Perspectiv

A daily reflection app built with Expo (React Native). Take a moment to reflect, every day.

## Features

- Daily prompts for reflection
- Streak tracking
- Clean, premium design
- Cross-platform (iOS, Android, Web)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm)
- Expo Go app on your device (for testing)

### Environment Setup

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key_here
```

You can get your Clerk publishable key from the [Clerk Dashboard](https://dashboard.clerk.com/).

### Installation

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm start
```

### Running the App

After starting the dev server:

- **iOS**: Press `i` to open in iOS Simulator, or scan QR code with Expo Go app
- **Android**: Press `a` to open in Android Emulator, or scan QR code with Expo Go app
- **Web**: Press `w` to open in browser

## Scripts

```bash
pnpm start          # Start Expo development server
pnpm ios            # Start on iOS
pnpm android        # Start on Android
pnpm web            # Start on web
pnpm lint           # Run ESLint
pnpm typecheck      # Run TypeScript type checking
pnpm test           # Run Jest tests
pnpm test:watch     # Run tests in watch mode
```

## Project Structure

```
perspectiv/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Auth screens (welcome, sign-in, sign-up)
│   ├── (main)/            # Main app screens
│   │   ├── (tabs)/        # Tab navigation (home, history)
│   │   ├── reflect.tsx    # Reflection flow
│   │   └── success.tsx    # Success screen
│   └── _layout.tsx        # Root layout
├── src/
│   ├── api/               # API client and schemas
│   ├── auth/              # Clerk auth setup
│   ├── components/        # Shared components
│   ├── hooks/             # Custom hooks
│   ├── state/             # TanStack Query setup
│   └── ui/                # Design system
├── __tests__/             # Test files
└── ...
```

## Authentication

The app uses [Clerk](https://clerk.com/) for authentication:

1. Users see a welcome screen on first launch
2. OAuth sign-in with Google or Apple
3. Clerk manages session tokens
4. Tokens are automatically attached to API requests

### How Token Flow Works

1. Clerk stores session tokens securely (SecureStore on native, localStorage on web)
2. The `AuthProvider` sets up a token getter that retrieves the current session token
3. The API client automatically attaches the bearer token to all requests
4. The backend validates tokens and returns 401 if invalid

### Auth flow (mobile → backend)

- Expo app uses Clerk publishable key (`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`)
- App fetches a Clerk JWT (optionally via a template)
- JWT is sent as `Authorization: Bearer <token>`
- Backend verifies using `CLERK_JWT_KEY`
- Backend optionally restricts `aud/azp` via `CLERK_AUTHORIZED_PARTIES`

### JWT Template + Authorized Parties

If you use a Clerk JWT template for backend verification:

1. Create a JWT template in Clerk and add an `aud` (or `azp`) claim.
2. Set `EXPO_PUBLIC_CLERK_JWT_TEMPLATE` in this app to the template name.
3. Set `CLERK_AUTHORIZED_PARTIES` on the backend to the same `aud`/`azp` value.

Notes:
- If the template name is wrong or hasn’t propagated yet, token fetch can fail and
  the app will appear stuck on “Preparing secure session”.
- After changing any `EXPO_PUBLIC_*` env var, restart Expo with cache clear:
  `npx expo start -c`.

## API Integration

Backend: `https://b-attic.vercel.app`

### Endpoints Used

| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| GET    | /api/bluum/today       | Get today's prompt       |
| POST   | /api/bluum/reflection  | Submit a reflection      |
| GET    | /api/bluum/streaks     | Get user streak stats    |
| GET    | /api/bluum/me          | Get user profile (optional) |

### Response Validation

API responses are validated with Zod schemas. The client is resilient to minor schema changes while still providing type safety.

## Design System

The app uses a minimal design system with:

- **8pt spacing rhythm**: xs(4), sm(8), md(16), lg(24), xl(32), xxl(48)
- **Typography scale**: hero(32), title(24), body(16), small(14), caption(13)
- **Components**: Text, Button, Card, ScreenContainer, TextInput

Light and dark mode are supported automatically based on system preferences.

## Tech Stack

- **Framework**: Expo SDK 54, React Native 0.81
- **Routing**: Expo Router (file-based)
- **Auth**: Clerk (@clerk/clerk-expo)
- **Data Fetching**: TanStack Query (react-query)
- **Validation**: Zod
- **Animations**: react-native-reanimated
- **Icons**: lucide-react-native
- **Testing**: Jest, Testing Library

## License

Private
