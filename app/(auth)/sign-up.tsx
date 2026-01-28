import { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSignUp, useOAuth } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { ScreenContainer, Text, Button, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { isLoaded } = useSignUp();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: 'oauth_apple' });

  const handleOAuthSignUp = useCallback(
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

  const handleSignIn = () => {
    router.back();
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <Animated.View entering={FadeInUp.duration(600).delay(100)}>
          <Text variant="title" center>
            Create account
          </Text>
          <Text variant="body" center color={theme.textSecondary} style={styles.subtitle}>
            Start your reflection journey
          </Text>
        </Animated.View>

        <Animated.View
          style={styles.buttons}
          entering={FadeInUp.duration(600).delay(200)}
        >
          <Button
            title="Continue with Google"
            variant="secondary"
            onPress={() => handleOAuthSignUp('google')}
          />
          <Button
            title="Continue with Apple"
            variant="secondary"
            onPress={() => handleOAuthSignUp('apple')}
          />
        </Animated.View>
      </View>

      <Animated.View
        style={styles.footer}
        entering={FadeInUp.duration(600).delay(300)}
      >
        <Pressable onPress={handleSignIn}>
          <Text variant="small" center color={theme.textSecondary}>
            Already have an account?{' '}
            <Text variant="small" color={theme.text}>
              Sign in
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
