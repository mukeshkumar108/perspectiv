import { useCallback, useEffect, useRef, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, useColorScheme, View } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts as useGeistFonts, Geist_200ExtraLight, Geist_400Regular } from '@expo-google-fonts/geist';
import {
  useFonts as useRadioCanadaBigFonts,
  RadioCanadaBig_400Regular,
  RadioCanadaBig_600SemiBold,
} from '@expo-google-fonts/radio-canada-big';

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
  const [geistLoaded] = useGeistFonts({
    Geist_200ExtraLight,
    Geist_400Regular,
  });
  const [radioLoaded] = useRadioCanadaBigFonts({
    RadioCanadaBig_400Regular,
    RadioCanadaBig_600SemiBold,
  });

  if (!geistLoaded || !radioLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootLayoutNav />
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
