import { StyleSheet, View } from 'react-native';
import { Overline } from './Overline';
import { Text } from './Text';
import { brand, layout } from './tokens';
import { useTheme } from './useTheme';

/**
 * How every screen opens: a small coloured label, one headline, an optional line under it, then a hairline.
 * Nothing else on the screen is allowed to be bigger than the headline.
 */
export function ScreenIntro({ eyebrow, title, sub, rule = true }: { eyebrow?: string; title: string; sub?: string; rule?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      {eyebrow ? <Overline color={brand.accentDeep}>{eyebrow}</Overline> : null}
      <Text variant="hero" style={styles.title}>
        {title}
      </Text>
      {sub ? (
        <Text variant="body" color={theme.textSecondary} style={styles.sub}>
          {sub}
        </Text>
      ) : null}
      {rule ? <View style={[styles.rule, { backgroundColor: theme.border }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  title: { maxWidth: 340 },
  sub: { marginTop: 2 },
  rule: { height: StyleSheet.hairlineWidth * 2, marginTop: layout.gap - 4 },
});
