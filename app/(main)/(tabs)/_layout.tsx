import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Home, Clock, Plus, Captions, Wind } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/src/ui/useTheme';
import { Text } from '@/src/ui';
import { motionTokens } from '@/src/ui/motion';

export default function TabLayout() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [quickOpen, setQuickOpen] = useState(false);
  const openProgress = useSharedValue(0);
  const fabScale = useSharedValue(1);

  useEffect(() => {
    openProgress.value = withTiming(quickOpen ? 1 : 0, {
      duration: motionTokens.duration.fast,
    });
    fabScale.value = withSpring(quickOpen ? 1.08 : 1, {
      damping: motionTokens.spring.snappy.damping,
      stiffness: motionTokens.spring.snappy.stiffness,
    });
  }, [fabScale, openProgress, quickOpen]);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: fabScale.value },
      { rotate: `${interpolate(openProgress.value, [0, 1], [0, 42])}deg` },
    ],
  }));

  const quickMenuStyle = useAnimatedStyle(() => ({
    opacity: openProgress.value,
    transform: [
      { translateY: interpolate(openProgress.value, [0, 1], [16, 0]) },
      { scale: interpolate(openProgress.value, [0, 1], [0.985, 1]) },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(openProgress.value, [0, 1], [0, 1]),
  }));

  const closeQuickMenu = () => setQuickOpen(false);
  const openCapture = () => {
    closeQuickMenu();
    setTimeout(() => {
      router.push('/(main)/capture' as any);
    }, 140);
  };
  const openGuides = () => {
    closeQuickMenu();
    setTimeout(() => {
      router.push('/(main)/guides' as any);
    }, 140);
  };

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.text,
          tabBarInactiveTintColor: theme.textTertiary,
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopWidth: 0,
            paddingTop: 10,
            paddingBottom: Math.max(12, insets.bottom),
            height: 72 + Math.max(12, insets.bottom),
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 0,
            shadowOpacity: 0,
            elevation: 0,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 6,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Home size={size} color={color} strokeWidth={1.5} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color, size }) => (
              <Clock size={size} color={color} strokeWidth={1.5} />
            ),
          }}
        />
      </Tabs>

      <Animated.View style={[styles.fabWrap, { bottom: Math.max(24, insets.bottom + 20) }, fabStyle]}>
        <Pressable
          style={[styles.fab, { backgroundColor: '#FF7DAF' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setQuickOpen((prev) => !prev);
          }}
        >
          <Plus size={26} color="#231E15" strokeWidth={2.25} />
        </Pressable>
      </Animated.View>

      <Animated.View
        pointerEvents={quickOpen ? 'auto' : 'none'}
        style={[styles.backdrop, backdropStyle]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeQuickMenu} />
      </Animated.View>

      <Animated.View
        pointerEvents={quickOpen ? 'auto' : 'none'}
        style={[styles.quickMenu, quickMenuStyle]}
      >
        <Pressable
          style={[styles.quickItem, { backgroundColor: theme.surface }]}
          onPress={openGuides}
        >
          <Wind size={16} color={theme.text} strokeWidth={2} />
          <Text variant="small" color={theme.text}>Guided sessions</Text>
        </Pressable>
        <Pressable
          style={[styles.quickItem, { backgroundColor: theme.surface }]}
          onPress={openCapture}
        >
          <Captions size={16} color={theme.text} strokeWidth={2} />
          <Text variant="small" color={theme.text}>Quick capture</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabWrap: {
    position: 'absolute',
    left: '50%',
    marginLeft: -29,
    zIndex: 30,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  quickMenu: {
    position: 'absolute',
    bottom: 126,
    alignSelf: 'center',
    zIndex: 20,
    gap: 10,
  },
  quickItem: {
    minWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
});
