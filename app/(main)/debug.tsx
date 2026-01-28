import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';

import { ScreenContainer, Text, Button, Card, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { api, ApiError, API_BASE_URL } from '@/src/api';
import { useAuthStatus } from '@/src/auth';
import { getLogs, subscribeLogs } from '@/src/lib/logger';

const CLERK_JWT_TEMPLATE = process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE;
const API_DEBUG = process.env.EXPO_PUBLIC_API_DEBUG;

export default function DebugScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { isLoaded, isSignedIn, userId, signOut } = useAuth();
  const { isAuthReady, lastTokenFetchedAt, lastTokenWasNull, lastTokenLength } =
    useAuthStatus();

  const [logs, setLogs] = useState(getLogs());
  const [lastPing, setLastPing] = useState<string | null>(null);

  useEffect(() => {
    return subscribeLogs(() => {
      setLogs(getLogs());
    });
  }, []);

  const maskedUserId = useMemo(() => {
    if (!userId) return '—';
    if (userId.length <= 8) return userId;
    return `${userId.slice(0, 4)}…${userId.slice(-4)}`;
  }, [userId]);

  const tokenFetchedLabel = useMemo(() => {
    if (!lastTokenFetchedAt) return '—';
    return new Date(lastTokenFetchedAt).toLocaleTimeString();
  }, [lastTokenFetchedAt]);

  const handlePing = async (path: 'today' | 'streaks') => {
    try {
      if (path === 'today') {
        await api.getToday();
      } else {
        await api.getStreaks();
      }
      setLastPing(`${path}: ok`);
    } catch (error) {
      if (error instanceof ApiError) {
        setLastPing(`${path}: ${error.status} ${error.message}`);
        return;
      }
      setLastPing(`${path}: error`);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/welcome' as any);
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Button title="Close" variant="ghost" onPress={() => router.back()} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="title">Debug</Text>
        <Text variant="body" color={theme.textSecondary}>
          Runtime auth + API status
        </Text>

        <Card style={styles.card}>
          <Text variant="bodyMedium">Auth</Text>
          <Text variant="small" color={theme.textSecondary}>
            Clerk loaded: {isLoaded ? 'yes' : 'no'}
          </Text>
          <Text variant="small" color={theme.textSecondary}>
            Signed in: {isSignedIn ? 'yes' : 'no'}
          </Text>
          <Text variant="small" color={theme.textSecondary}>
            User ID: {maskedUserId}
          </Text>
          <Text variant="small" color={theme.textSecondary}>
            Auth ready: {isAuthReady ? 'yes' : 'no'}
          </Text>
          <Text variant="small" color={theme.textSecondary}>
            Last token fetched: {tokenFetchedLabel}
          </Text>
          <Text variant="small" color={theme.textSecondary}>
            Last token length: {lastTokenLength || 0}
          </Text>
          <Text variant="small" color={theme.textSecondary}>
            Last token was null: {lastTokenWasNull ? 'yes' : 'no'}
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text variant="bodyMedium">API</Text>
          <Text variant="small" color={theme.textSecondary}>
            Base URL: {API_BASE_URL}
          </Text>
          <Text variant="small" color={theme.textSecondary}>
            JWT template: {CLERK_JWT_TEMPLATE || '—'}
          </Text>
          <Text variant="small" color={theme.textSecondary}>
            API debug: {API_DEBUG === '1' ? 'on' : 'off'}
          </Text>
        </Card>

        <View style={styles.actions}>
          <Button title="Ping /today" onPress={() => handlePing('today')} />
          <Button
            title="Ping /streaks"
            variant="secondary"
            onPress={() => handlePing('streaks')}
          />
          <Button title="Logout" variant="ghost" onPress={handleLogout} />
        </View>

        {lastPing ? (
          <Text variant="small" color={theme.textSecondary}>
            Last ping: {lastPing}
          </Text>
        ) : null}

        <View style={styles.logs}>
          <Text variant="bodyMedium">Recent API logs</Text>
          {logs.length === 0 ? (
            <Text variant="small" color={theme.textSecondary}>
              No logs yet. Enable EXPO_PUBLIC_API_DEBUG=1 to see logs on device.
            </Text>
          ) : (
            logs
              .slice()
              .reverse()
              .map((entry) => (
                <Text
                  key={entry.id}
                  variant="small"
                  color={theme.textSecondary}
                  style={styles.logLine}
                >
                  {new Date(entry.timestamp).toLocaleTimeString()} [{entry.level}]{' '}
                  {entry.message} {JSON.stringify(entry.data)}
                </Text>
              ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
  },
  logs: {
    gap: spacing.sm,
  },
  logLine: {
    lineHeight: 18,
  },
});
