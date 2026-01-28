import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { tokenCache } from './tokenCache';
import { queryClient } from '../state';
import { setTokenClearer, setTokenGetter } from '../api';

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const CLERK_JWT_TEMPLATE = process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE;

if (!CLERK_PUBLISHABLE_KEY) {
  console.warn(
    'Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Auth will not work properly.'
  );
}

/**
 * Sets up the API client token getter using Clerk's getToken
 */
type AuthStatus = {
  isAuthReady: boolean;
  lastTokenFetchedAt: number | null;
  lastTokenWasNull: boolean;
  lastTokenLength: number;
};

function TokenSetup({ children }: PropsWithChildren) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [tokenGetterReady, setTokenGetterReady] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);
  const [hasFetchedTokenOnce, setHasFetchedTokenOnce] = useState(false);
  const [lastTokenFetchedAt, setLastTokenFetchedAt] = useState<number | null>(
    null
  );
  const [lastTokenWasNull, setLastTokenWasNull] = useState(false);
  const [lastTokenLength, setLastTokenLength] = useState(0);
  const cachedTokenRef = useRef<string | null>(null);
  const getTokenRef = useRef(getToken);
  const didFetchTokenRef = useRef(false);
  const didLogTokenRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getTokenWithTemplate = async () => {
    if (CLERK_JWT_TEMPLATE) {
      try {
        const templated = await getTokenRef.current({
          template: CLERK_JWT_TEMPLATE,
        });
        if (templated) {
          return templated;
        }
        if (__DEV__) {
          console.warn('[auth] token template returned null, falling back', {
            template: CLERK_JWT_TEMPLATE,
          });
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[auth] token template failed, falling back', {
            template: CLERK_JWT_TEMPLATE,
            error,
          });
        }
      }
    }
    return getTokenRef.current();
  };

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    setTokenGetter(async () => {
      try {
        if (cachedTokenRef.current) {
          return cachedTokenRef.current;
        }
        const token = await getTokenWithTemplate();
        if (token) {
          cachedTokenRef.current = token;
        }
        return token;
      } catch {
        return null;
      }
    });
    setTokenGetterReady(true);
  }, []);

  useEffect(() => {
    setTokenClearer(() => {
      cachedTokenRef.current = null;
      setTokenReady(false);
      setHasFetchedTokenOnce(false);
      setLastTokenWasNull(true);
      setLastTokenLength(0);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isLoaded || !isSignedIn) return;
    if (didFetchTokenRef.current) return;
    didFetchTokenRef.current = true;

    getTokenWithTemplate()
      .then((token) => {
        if (cancelled) return;
        const fetchedAt = Date.now();
        setLastTokenFetchedAt(fetchedAt);
        setLastTokenWasNull(!token);
        setLastTokenLength(token ? token.length : 0);
        setHasFetchedTokenOnce(true);
        if (token) {
          cachedTokenRef.current = token;
          setTokenReady(true);
        } else {
          setTokenReady(false);
          if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
          }
          retryTimerRef.current = setTimeout(() => {
            didFetchTokenRef.current = false;
          }, 1500);
        }
        if (__DEV__ && !didLogTokenRef.current) {
          didLogTokenRef.current = true;
          console.log('[auth] token fetched', {
            tokenLength: token ? token.length : 0,
            wasNull: !token,
            fetchedAt,
            template: CLERK_JWT_TEMPLATE || null,
          });
        }
      })
      .catch((error) => {
        if (cancelled) return;
        if (__DEV__) {
          console.warn('[auth] token fetch failed', { error });
        }
        setLastTokenFetchedAt(Date.now());
        setLastTokenWasNull(true);
        setLastTokenLength(0);
        setHasFetchedTokenOnce(true);
        setTokenReady(false);
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
        }
        retryTimerRef.current = setTimeout(() => {
          didFetchTokenRef.current = false;
        }, 1500);
      });

    return () => {
      cancelled = true;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (isSignedIn) return;
    cachedTokenRef.current = null;
    setTokenReady(false);
    setHasFetchedTokenOnce(false);
    setLastTokenFetchedAt(null);
    setLastTokenWasNull(true);
    setLastTokenLength(0);
    didFetchTokenRef.current = false;
    didLogTokenRef.current = false;
  }, [isSignedIn]);

  const isAuthReady = useMemo(
    () => isLoaded && tokenGetterReady && (hasFetchedTokenOnce || tokenReady),
    [isLoaded, tokenGetterReady, hasFetchedTokenOnce, tokenReady]
  );

  return (
    <AuthStatusContext.Provider
      value={{
        isAuthReady,
        lastTokenFetchedAt,
        lastTokenWasNull,
        lastTokenLength,
      }}
    >
      {children}
    </AuthStatusContext.Provider>
  );
}

const AuthStatusContext = createContext<AuthStatus>({
  isAuthReady: false,
  lastTokenFetchedAt: null,
  lastTokenWasNull: true,
  lastTokenLength: 0,
});

export function useAuthReady() {
  return useContext(AuthStatusContext).isAuthReady;
}

export function useAuthStatus() {
  return useContext(AuthStatusContext);
}

export function AuthProvider({ children }: PropsWithChildren) {
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY || ''}
      tokenCache={tokenCache}
    >
      <QueryClientProvider client={queryClient}>
        <TokenSetup>{children}</TokenSetup>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
