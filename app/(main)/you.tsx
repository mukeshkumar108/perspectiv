import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { ScreenContainer, Text, TextInput, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { useProfile, useUpdateProfile } from '@/src/hooks';

const PRONOUNS = ['she/her', 'he/him', 'they/them'];
const GENDERS = ['Woman', 'Man', 'Non-binary', 'Prefer not to say'];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.chip,
        { borderColor: active ? theme.text : theme.border, backgroundColor: active ? theme.text : 'transparent' },
      ]}
    >
      <Text variant="small" color={active ? theme.background : theme.textSecondary}>
        {label}
      </Text>
    </Pressable>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text variant="small" color={theme.textTertiary} style={styles.fieldLabel}>
        {label.toUpperCase()}
      </Text>
      {children}
      {hint ? (
        <Text variant="caption" color={theme.textTertiary}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export default function YouScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data, isLoading } = useProfile();
  const update = useUpdateProfile();

  const [name, setName] = useState('');
  const [pronouns, setPronouns] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [birthYear, setBirthYear] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!data || loaded) return;
    setName(data.profile.displayName ?? '');
    setPronouns(data.profile.pronouns ?? null);
    setGender(data.profile.gender ?? null);
    setBirthYear(data.profile.birthYear ? String(data.profile.birthYear) : '');
    setLoaded(true);
  }, [data, loaded]);

  const year = birthYear.trim() === '' ? null : Number(birthYear);
  const yearInvalid = year !== null && (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() - 13);
  const nameInvalid = name.trim().length === 0;
  const canSave = loaded && !nameInvalid && !yearInvalid && !update.isPending;

  const save = () => {
    update.mutate(
      { displayName: name.trim(), pronouns, gender, birthYear: year },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <ScreenContainer style={styles.container} ambient={false} scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={16} accessibilityLabel="Back">
            <ArrowLeft size={22} color={theme.text} strokeWidth={1.8} />
          </Pressable>
        </View>

        <Text variant="hero" style={styles.title}>
          A bit about you
        </Text>
        <Text variant="body" color={theme.textTertiary} style={styles.lede}>
          Only what you want to share. It helps Bluum talk to you like a person, and none of it is required beyond a name.
        </Text>

        {isLoading && !loaded ? (
          <Text variant="small" color={theme.textTertiary}>
            Loading
          </Text>
        ) : (
          <>
            <Field label="What should we call you?">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={50}
                error={nameInvalid && loaded}
                style={styles.input}
              />
            </Field>

            <Field label="Pronouns">
              <View style={styles.chips}>
                {PRONOUNS.map((p) => (
                  <Chip key={p} label={p} active={pronouns === p} onPress={() => setPronouns(pronouns === p ? null : p)} />
                ))}
              </View>
            </Field>

            <Field label="Gender">
              <View style={styles.chips}>
                {GENDERS.map((g) => (
                  <Chip key={g} label={g} active={gender === g} onPress={() => setGender(gender === g ? null : g)} />
                ))}
              </View>
            </Field>

            <Field label="Year you were born" hint="We ask for a year rather than a date, and only to understand who this works for.">
              <TextInput
                value={birthYear}
                onChangeText={(t) => setBirthYear(t.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder="For example 1992"
                keyboardType="number-pad"
                maxLength={4}
                error={yearInvalid}
                style={styles.input}
              />
            </Field>

            <Field label="Email" hint="From your account. To change it, use your account settings.">
              <View style={[styles.readonly, { borderColor: theme.border }]}>
                <Text variant="body" color={theme.textTertiary}>
                  {data?.profile.email ?? 'Not set'}
                </Text>
              </View>
            </Field>

            {update.error ? (
              <Text variant="small" color={theme.error}>
                That did not go through. Try again.
              </Text>
            ) : null}

            <Pressable
              onPress={save}
              disabled={!canSave}
              accessibilityRole="button"
              style={[styles.save, { backgroundColor: theme.primary, opacity: canSave ? 1 : 0.35 }]}
            >
              <Text variant="bodyMedium" color={theme.primaryText}>
                {update.isPending ? 'One moment' : 'Done'}
              </Text>
            </Pressable>
          </>
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: spacing.md, marginBottom: spacing.lg },
  title: { marginBottom: spacing.sm },
  lede: { marginBottom: spacing.xl },
  field: { gap: spacing.sm, marginBottom: spacing.xl },
  fieldLabel: { letterSpacing: 1.8 },
  input: { minHeight: 56, textAlignVertical: 'center', paddingVertical: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  readonly: { borderWidth: 1, borderRadius: 12, padding: spacing.md, minHeight: 56, justifyContent: 'center' },
  save: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md + 2, marginTop: spacing.sm, marginBottom: spacing.xxl },
});
