import { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSignIn, useOAuth } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Animated from 'react-native-reanimated';

import { ScreenContainer, Text, Button, spacing } from '@/src/ui';
import { motion } from '@/src/ui/motion';
import { useTheme } from '@/src/ui/useTheme';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { isLoaded } = useSignIn();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: 'oauth_apple' });

  const handleOAuthSignIn = useCallback(
    async (provider: 'google' | 'apple') => {
      try {
        const startFlow = provider === 'google' ? startGoogleOAuth : startAppleOAuth;
        const { createdSessionId, setActive } = await startFlow({
          redirectUrl: Linking.createURL('/(main)/(tabs)', { scheme: 'perspectiv' }),
        });

        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
        }
      } catch (err) {
        console.error('OAuth error:', err);
      }
    },
    [startGoogleOAuth, startAppleOAuth]
  );

  const handleSignUp = () => {
    router.push('/(auth)/sign-up' as any);
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <Animated.View entering={motion.itemEnter(60, 'up')}>
          <Text variant="title" center>
            Welcome back
          </Text>
          <Text variant="body" center color={theme.textSecondary} style={styles.subtitle}>
            Sign in to continue
          </Text>
        </Animated.View>

        <Animated.View
          style={styles.buttons}
          entering={motion.itemEnter(120, 'up')}
        >
          <Button
            title="Continue with Google"
            variant="secondary"
            onPress={() => handleOAuthSignIn('google')}
          />
          <Button
            title="Continue with Apple"
            variant="secondary"
            onPress={() => handleOAuthSignIn('apple')}
          />
        </Animated.View>
      </View>

      <Animated.View
        style={styles.footer}
        entering={motion.itemEnter(180, 'up')}
      >
        <Pressable onPress={handleSignUp}>
          <Text variant="small" center color={theme.textSecondary}>
            {"Don't have an account? "}
            <Text variant="small" color={theme.text}>
              Sign up
            </Text>
          </Text>
        </Pressable>
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  subtitle: {
    marginTop: spacing.sm,
  },
  buttons: {
    gap: spacing.md,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
});
