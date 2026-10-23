import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Compass, Heart, Home, Mic, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

import { PressScale, Text, brand, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';

type Item = { route: string; label: string; Icon: typeof Home };

const LEFT: Item[] = [
  { route: 'index', label: 'Today', Icon: Home },
  { route: 'moments', label: 'Moments', Icon: Heart },
];
const RIGHT: Item[] = [{ route: 'explore', label: 'Explore', Icon: Compass }];

/** A slow ring that leaves the Talk button now and then, so it reads as alive without nagging. */
function TalkButton({ onPress }: { onPress: () => void }) {
  const ring = useSharedValue(0);
  useEffect(() => {
    ring.value = withRepeat(withDelay(1800, withTiming(1, { duration: 1700, easing: Easing.out(Easing.cubic) })), -1);
  }, [ring]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - ring.value), transform: [{ scale: 1 + ring.value * 0.55 }] }));
  const theme = useTheme();
  return (
    <View style={styles.talkSlot}>
      <Animated.View style={[styles.ring, { backgroundColor: brand.accent }, ringStyle]} pointerEvents="none" />
      <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel="Talk to Bluum" scaleTo={0.92} style={[styles.talk, { backgroundColor: brand.accent }]}>
        <Mic size={24} color={theme.text} strokeWidth={2} />
      </PressScale>
    </View>
  );
}

/** Today, Moments, Talk (the big one), Explore, You. Settings and the Lab live behind You. */
export function BluumTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;

  const renderItem = ({ route, label, Icon }: Item) => {
    const active = activeName === route;
    return (
      <PressScale key={route} onPress={() => navigateToTab(state.routes.find((r) => r.name === route)?.key ?? route)} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={label} style={styles.item}>
        <Icon size={22} color={active ? theme.text : theme.textTertiary} strokeWidth={active ? 2 : 1.6} />
        <Text variant="caption" medium={active} color={active ? theme.text : theme.textTertiary}>
          {label}
        </Text>
      </PressScale>
    );
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(10, insets.bottom), backgroundColor: theme.surface }]}>
      <View style={styles.row}>
        {LEFT.map(renderItem)}
        <TalkButton onPress={() => router.push('/(main)/talk' as any)} />
        {RIGHT.map(renderItem)}
        <PressScale onPress={() => router.push('/(main)/account' as any)} accessibilityRole="button" accessibilityLabel="You" style={styles.item}>
          <UserRound size={22} color={theme.textTertiary} strokeWidth={1.6} />
          <Text variant="caption" color={theme.textTertiary}>
            You
          </Text>
        </PressScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 8, borderTopLeftRadius: 28, borderTopRightRadius: 28, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingHorizontal: spacing.sm },
  item: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 6 },
  talkSlot: { width: 80, alignItems: 'center', justifyContent: 'center', marginTop: -24 },
  talk: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: brand.accent, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
  ring: { position: 'absolute', width: 60, height: 60, borderRadius: 30 },
});
