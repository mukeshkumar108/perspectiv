import { useCallback, useEffect, useRef, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, useColorScheme, View } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  useFonts as useInterFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import { AuthProvider, useAuthReady } from '@/src/auth';
import { BluumMark } from '@/src/components/BluumMark';
import { setOnUnauthorized } from '@/src/api';
import { useOutboxSync } from '@/src/storage';
import { useAccountScope } from '@/src/storage/accountScope';
import { SCREENSHOT_MODE, useScreenshotSeed } from '@/src/dev/screenshotMode';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutNav() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const seeded = useScreenshotSeed();
  const scopeReady = useAccountScope(!isLoaded ? undefined : isSignedIn ? (userId ?? null) : null);
  const authReady = useAuthReady();
  const segments = useSegments();
  const router = useRouter();
  const [appIsReady, setAppIsReady] = useState(false);
  const [rootViewLayout, setRootViewLayout] = useState(false);
  const authAlertShown = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    setAppIsReady(true);
    if (SCREENSHOT_MODE) return;

    const inAuthGroup = (segments[0] as string) === '(auth)';

    if (isSignedIn && inAuthGroup) {
      // User is signed in but on auth screen, redirect to main
      router.replace('/(main)/(tabs)' as any);
    } else if (!isSignedIn && !inAuthGroup) {
      // User is not signed in but trying to access main, redirect to auth
      router.replace('/(auth)/welcome' as any);
    }
  }, [isLoaded, isSignedIn, segments, router]);

  useEffect(() => {
    setOnUnauthorized(() => {
      if (!authAlertShown.current) {
        authAlertShown.current = true;
        Alert.alert('Session expired', 'Session expired. Please sign in again.');
      }
      router.replace('/(auth)/welcome' as any);
    });
  }, [router]);

  useEffect(() => {
    if (appIsReady && rootViewLayout) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [appIsReady, rootViewLayout]);

  useOutboxSync(authReady && scopeReady);

  const onLayoutRootView = useCallback(() => {
    setRootViewLayout(true);
  }, []);

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      {scopeReady && seeded ? <Slot /> : null}
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [showSplashOverlay, setShowSplashOverlay] = useState(true);
  const [minSplashElapsed, setMinSplashElapsed] = useState(false);
  const splashOpacity = useSharedValue(1);
  const splashTranslateY = useSharedValue(0);

  const hideSplash = () => {
    setShowSplashOverlay(false);
  };

  const splashStyle = useAnimatedStyle(() => ({
    opacity: splashOpacity.value,
    transform: [{ translateY: splashTranslateY.value }],
  }));

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashElapsed(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const fontsReady = fontsLoaded;

  useEffect(() => {
    if (!fontsReady || !minSplashElapsed) return;
    splashOpacity.value = withDelay(200, withTiming(0, { duration: 600 }));
    splashTranslateY.value = withDelay(200, withTiming(-24, { duration: 600 }, () => {
      runOnJS(hideSplash)();
    }));
  }, [fontsReady, minSplashElapsed, splashOpacity, splashTranslateY]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          {fontsReady ? <RootLayoutNav /> : null}
          <StatusBar style="auto" />
          {showSplashOverlay ? (
            <Animated.View style={[styles.splashOverlay, splashStyle]}>
              <Animated.View entering={ZoomIn.duration(700).springify().damping(13)}>
                <BluumMark size={170} />
              </Animated.View>
            </Animated.View>
          ) : null}
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = {
  splashOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F6F0E8',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  splashLogo: {
    width: 160,
    height: 160,
  },
};
