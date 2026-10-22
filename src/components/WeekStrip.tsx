import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Text, brand, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** The last seven days as a row of dots: filled with the accent where something was kept, ringed for today. */
export function WeekStrip({ dates }: { dates: Date[] }) {
  const theme = useTheme();
  const kept = new Set(dates.map(dayKey));
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d;
  });

  return (
    <View style={styles.row}>
      {days.map((d, i) => {
        const has = kept.has(dayKey(d));
        const isToday = i === 6;
        return (
          <View key={dayKey(d)} style={styles.col}>
            <Animated.View
              entering={ZoomIn.delay(80 + i * 60).springify().damping(14)}
              style={[
                styles.dot,
                { backgroundColor: has ? brand.accent : 'transparent', borderColor: has ? brand.accent : isToday ? theme.text : theme.border, borderWidth: isToday && !has ? 1.5 : 1 },
              ]}
            />
            <Text variant="caption" medium={isToday} color={isToday ? theme.text : theme.textTertiary}>
              {LETTERS[d.getDay()]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { alignItems: 'center', gap: spacing.xs + 2 },
  dot: { width: 34, height: 34, borderRadius: 17 },
});
