import { useCallback, useEffect, useRef, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, useColorScheme, View, Image } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  useFonts as useInstrumentSansFonts,
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
} from '@expo-google-fonts/instrument-sans';

import { AuthProvider } from '@/src/auth';
import { setOnUnauthorized } from '@/src/api';
import { useAuthReady } from '@/src/auth';
import { useOutboxSync } from '@/src/storage';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutNav() {
  const { isLoaded, isSignedIn } = useAuth();
  const authReady = useAuthReady();
  const segments = useSegments();
  const router = useRouter();
  const [appIsReady, setAppIsReady] = useState(false);
  const [rootViewLayout, setRootViewLayout] = useState(false);
  const authAlertShown = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    setAppIsReady(true);

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

  useOutboxSync(authReady);

  const onLayoutRootView = useCallback(() => {
    setRootViewLayout(true);
  }, []);

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <Slot />
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [instrumentLoaded] = useInstrumentSansFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
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

  const fontsReady = instrumentLoaded;

  useEffect(() => {
    if (!fontsReady || !minSplashElapsed) return;
    splashOpacity.value = withDelay(200, withTiming(0, { duration: 600 }));
    splashTranslateY.value = withDelay(200, withTiming(-24, { duration: 600 }, () => {
      runOnJS(hideSplash)();
    }));
  }, [fontsReady, minSplashElapsed]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          {fontsReady ? <RootLayoutNav /> : null}
          <StatusBar style="auto" />
          {showSplashOverlay ? (
            <Animated.View style={[styles.splashOverlay, splashStyle]}>
              <Image
                source={require('../assets/images/bluum-logo-v1.png')}
                style={styles.splashLogo}
                resizeMode="contain"
              />
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
    backgroundColor: '#D79637',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  splashLogo: {
    width: 160,
    height: 160,
  },
};
