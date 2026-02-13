import { View, ViewProps, StyleSheet, ScrollView, ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from './tokens';
import { useTheme } from './useTheme';

interface ScreenContainerProps extends ViewProps {
  scroll?: boolean;
  padded?: boolean;
  safeTop?: boolean;
  safeBottom?: boolean;
  refreshControl?: ScrollViewProps['refreshControl'];
  ambient?: boolean;
  ambientIntensity?: number;
}

export function ScreenContainer({
  scroll = false,
  padded = true,
  safeTop = true,
  safeBottom = true,
  refreshControl,
  ambient = false,
  ambientIntensity = 1,
  style,
  children,
  ...props
}: ScreenContainerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const containerStyle = [
    styles.base,
    {
      backgroundColor: ambient ? 'transparent' : theme.background,
      paddingTop: safeTop ? insets.top : 0,
      paddingBottom: safeBottom ? insets.bottom : 0,
      paddingHorizontal: padded ? spacing.lg : 0,
    },
    style,
  ];

  if (scroll) {
    return (
      <View style={[styles.base, { backgroundColor: theme.background }]}>
        <ScrollView
          style={styles.base}
          contentContainerStyle={[containerStyle, { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
          {...props}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.base, { backgroundColor: theme.background }]}>
      <View style={containerStyle} {...props}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
});
