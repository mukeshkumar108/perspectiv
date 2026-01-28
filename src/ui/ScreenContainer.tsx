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
}

export function ScreenContainer({
  scroll = false,
  padded = true,
  safeTop = true,
  safeBottom = true,
  refreshControl,
  style,
  children,
  ...props
}: ScreenContainerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const containerStyle = [
    styles.base,
    {
      backgroundColor: theme.background,
      paddingTop: safeTop ? insets.top : 0,
      paddingBottom: safeBottom ? insets.bottom : 0,
      paddingHorizontal: padded ? spacing.lg : 0,
    },
    style,
  ];

  if (scroll) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={[containerStyle, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
        {...props}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={containerStyle} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
});
