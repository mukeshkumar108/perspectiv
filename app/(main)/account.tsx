import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';

import { ScreenContainer, Text, Button, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';

export default function AccountScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/welcome' as any);
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Button title="Close" variant="ghost" onPress={() => router.back()} />
      </View>

      <View style={styles.content}>
        <Text variant="title">Account</Text>
        <Text variant="body" color={theme.textSecondary}>
          Manage your session.
        </Text>
      </View>

      <Button title="Sign out" variant="secondary" onPress={handleSignOut} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
  },
  content: {
    flex: 1,
    gap: spacing.sm,
  },
});
