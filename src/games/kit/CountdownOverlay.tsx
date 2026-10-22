import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { Text } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';

/** 3, 2, 1, Go. Each number lands with a small zoom. */
export function CountdownOverlay({ count, accent, hint }: { count: number; accent: string; hint?: string }) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, styles.wrap]} pointerEvents="none">
      <View style={[styles.disc, { backgroundColor: accent }]}>
        <Animated.View key={count} entering={ZoomIn.springify().damping(12).stiffness(200)}>
          <Text variant="hero" style={styles.num} color={theme.text}>
            {count > 0 ? count : 'Go'}
          </Text>
        </Animated.View>
      </View>
      {hint ? (
        <Text variant="body" color={theme.textSecondary} center style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 20 },
  disc: { width: 148, height: 148, borderRadius: 74, alignItems: 'center', justifyContent: 'center' },
  num: { fontSize: 64, lineHeight: 70 },
  hint: { maxWidth: 260 },
});
