import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Activity, BarChart3, Bug, FlaskConical, Heart, LogOut, UserRound } from 'lucide-react-native';

import { AccentCard, Overline, PressScale, ScreenContainer, ScreenHeader, Text, brand, sessionAccents, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';

const ICON = { size: 20, strokeWidth: 1.8 } as const;

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { signOut } = useAuth();

  const go = (path: string) => () => router.push(path as any);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/welcome' as any);
  };

  return (
    <ScreenContainer style={styles.container} ambient={false}>
      <ScreenHeader title="Settings" />

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <View style={styles.group}>
          <Overline>You</Overline>
          <AccentCard title="About you" subtitle="Name, pronouns and the rest." accent={sessionAccents.evening} icon={<UserRound color={theme.text} {...ICON} />} onPress={go('/(main)/you')} />
          <AccentCard title="My moments" subtitle="What you have kept." accent={sessionAccents.morning} icon={<Heart color={theme.text} {...ICON} />} onPress={go('/(main)/library')} />
        </View>

        <View style={styles.group}>
          <Overline>Your numbers</Overline>
          <AccentCard title="Progress" subtitle="Game highs and assessments." accent={sessionAccents.daytime} icon={<BarChart3 color={theme.text} {...ICON} />} onPress={go('/(main)/profile')} />
          <AccentCard title="Assessments" subtitle="Short measures you can repeat." accent={sessionAccents.ten_things} icon={<Activity color={theme.text} {...ICON} />} onPress={go('/(main)/assessments')} />
        </View>

        <View style={styles.group}>
          <Overline>Behind the scenes</Overline>
          <AccentCard title="Session research" subtitle="What each session recorded." accent={sessionAccents.onboarding} icon={<FlaskConical color={theme.text} {...ICON} />} onPress={go('/(main)/research')} />
          <AccentCard title="Debug" subtitle="Connection and logs." accent={{ base: brand.greySoft, soft: theme.surface }} icon={<Bug color={theme.text} {...ICON} />} onPress={go('/(main)/debug')} />
        </View>

        <PressScale onPress={handleSignOut} style={[styles.signOut, { borderColor: theme.border }]}>
          <LogOut size={16} color={theme.textSecondary} strokeWidth={1.8} />
          <Text variant="small" color={theme.textSecondary}>
            Sign out
          </Text>
        </PressScale>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { gap: spacing.lg, paddingBottom: spacing.xxl },
  group: { gap: spacing.sm },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingVertical: spacing.md, marginTop: spacing.sm },
});
