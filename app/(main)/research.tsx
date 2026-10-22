import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { ScreenContainer, Text, Card, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { useRateVoiceMemory, useVoiceResearch } from '@/src/hooks';
import type { MemoryItem } from '@/src/api/schemas';

type Rated = { id: string; label: string; basis?: string | null; correct?: boolean | null };

const VOICE_KEYS: [string, string][] = [
  ['f0_mean_hz', 'pitch Hz'],
  ['f0_sd_st', 'pitch variation st'],
  ['articulation_rate_syl_s', 'syllables/s'],
  ['pause_ratio', 'pauses'],
  ['loudness_sd_db', 'loudness var dB'],
  ['jitter_local', 'jitter'],
  ['shimmer_local', 'shimmer'],
  ['hnr_db', 'HNR dB'],
];

function RateRow({ item, reportId }: { item: Rated; reportId?: string }) {
  const theme = useTheme();
  const rate = useRateVoiceMemory();
  const set = (correct: boolean) =>
    rate.mutate({ id: item.id, correct: item.correct === correct ? null : correct, reportId });
  return (
    <View style={styles.rateRow}>
      <View style={styles.rateText}>
        <Text variant="small">{item.label}</Text>
        {item.basis ? (
          <Text variant="small" color={theme.textSecondary}>
            {item.basis}
          </Text>
        ) : null}
      </View>
      <Pressable onPress={() => set(true)} hitSlop={8} accessibilityLabel="Right">
        <Text variant="bodyMedium" color={item.correct === true ? theme.text : theme.textSecondary}>
          {item.correct === true ? 'Right' : 'Right?'}
        </Text>
      </Pressable>
      <Pressable onPress={() => set(false)} hitSlop={8} accessibilityLabel="Wrong">
        <Text variant="bodyMedium" color={item.correct === false ? theme.text : theme.textSecondary}>
          {item.correct === false ? 'Wrong' : 'Wrong?'}
        </Text>
      </Pressable>
    </View>
  );
}

const asRated = (items: MemoryItem[], label: (i: MemoryItem) => string): Rated[] =>
  items.map((i) => ({ id: i.id, label: label(i), basis: i.basis, correct: i.correct }));

const str = (v: unknown) => (typeof v === 'string' ? v : '');

export default function ResearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { data, isLoading, error, status, fetchStatus, refetch } = useVoiceResearch();

  const memory = data?.memory;
  const labelFor = new Map<string, string>();
  if (memory) {
    for (const p of memory.people) labelFor.set(p.id, `${str(p.name)}${p.relation ? ` (${str(p.relation)})` : ''}`);
    for (const t of memory.themes) labelFor.set(t.id, str(t.label));
    for (const f of memory.facts) labelFor.set(f.id, str(f.fact));
    for (const t of memory.openThreads) labelFor.set(t.id, `${str(t.topic)} [${str(t.status)}]`);
  }

  return (
    <ScreenContainer style={styles.container} ambient={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={16}>
          <ArrowLeft size={22} color={theme.text} strokeWidth={1.8} />
        </Pressable>
        <Text variant="bodyMedium">Session research</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Text variant="small" color={theme.textSecondary}>
          Working assumptions, not findings. Everything below is a guess we are testing. No transcripts are kept or shown.
        </Text>

        {!data ? (
          <View style={styles.section}>
            <Text variant="small" color={theme.textSecondary}>
              {isLoading ? 'Loading' : error ? `Could not load the reports: ${error.message}` : 'Not loaded yet'}
            </Text>
            <Text variant="small" color={theme.textSecondary}>
              state: {status} / {fetchStatus}
            </Text>
            <Pressable onPress={() => void refetch()} hitSlop={12}>
              <Text variant="bodyMedium">Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {memory ? (
          <Card style={[styles.card, { borderColor: theme.border, borderWidth: 1 }]}>
            <Text variant="bodyMedium">What we remember</Text>
            {([
              ['People', asRated(memory.people, (i) => labelFor.get(i.id) ?? i.id)],
              ['What matters', asRated(memory.themes, (i) => labelFor.get(i.id) ?? i.id)],
              ['Facts', asRated(memory.facts, (i) => labelFor.get(i.id) ?? i.id)],
              ['Open threads', asRated(memory.openThreads, (i) => labelFor.get(i.id) ?? i.id)],
            ] as [string, Rated[]][]).map(([title, rows]) =>
              rows.length ? (
                <View key={title} style={styles.section}>
                  <Text variant="small" color={theme.textSecondary}>{title}</Text>
                  {rows.map((r) => (
                    <RateRow key={r.id} item={r} />
                  ))}
                </View>
              ) : null,
            )}
            {memory.style.notes.length ? (
              <View style={styles.section}>
                <Text variant="small" color={theme.textSecondary}>How they talk</Text>
                {memory.style.notes.map((n) => (
                  <Text key={n} variant="small">{n}</Text>
                ))}
              </View>
            ) : null}
            {!memory.people.length && !memory.themes.length && !memory.facts.length && !memory.openThreads.length ? (
              <Text variant="small" color={theme.textSecondary}>Nothing yet.</Text>
            ) : null}
          </Card>
        ) : null}

        {(data?.reports ?? []).map((r) => {
          const profile = r.profile ?? {};
          const voice = r.voiceFeatures ?? {};
          const directive = Array.isArray((r.models as { directive?: unknown } | null | undefined)?.directive)
            ? ((r.models as { directive: string[] }).directive).join(', ')
            : 'none';
          return (
            <Card key={r.id} style={[styles.card, { borderColor: theme.border, borderWidth: 1 }]}>
              <Text variant="small" color={theme.textSecondary}>
                {new Date(r.createdAt).toLocaleString()} · {r.durationSeconds ?? '?'}s · ${(r.costUsd ?? 0).toFixed(4)}
              </Text>
              {r.card?.headline ? <Text variant="bodyMedium" style={styles.gap}>{r.card.headline}</Text> : null}
              {r.card?.moment ? <Text variant="body">{r.card.moment}</Text> : null}

              <View style={styles.section}>
                <Text variant="small" color={theme.textSecondary}>How they reflected (a description, not a grade)</Text>
                <Text variant="small">
                  {Object.entries(profile)
                    .filter(([k]) => k !== 'reading')
                    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${String(v)}`)
                    .join('  ·  ')}
                </Text>
                {profile.reading ? <Text variant="small" color={theme.textSecondary}>{String(profile.reading)}</Text> : null}
              </View>

              <View style={styles.section}>
                <Text variant="small" color={theme.textSecondary}>Voice (raw, {String(voice.utterances ?? 0)} utterances)</Text>
                <Text variant="small">
                  {VOICE_KEYS.filter(([k]) => voice[k] !== undefined)
                    .map(([k, label]) => `${label} ${String(voice[k])}`)
                    .join('  ·  ') || 'none captured'}
                </Text>
              </View>

              {r.memoryUpdates?.length ? (
                <View style={styles.section}>
                  <Text variant="small" color={theme.textSecondary}>Memory this session ({r.memoryUpdates.length})</Text>
                  {r.memoryUpdates.map((u) => (
                    <RateRow
                      key={`${u.id}-${u.action}`}
                      reportId={r.id}
                      item={{ id: u.id, label: `${u.action}: ${labelFor.get(u.id) ?? u.id}`, basis: u.basis, correct: u.correct }}
                    />
                  ))}
                </View>
              ) : null}

              <Text variant="small" color={theme.textSecondary} style={styles.gap}>
                prompt {r.promptVersion ?? '?'} · rules {r.ruleVersion ?? 'none'} · applied: {directive}
              </Text>
            </Card>
          );
        })}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginBottom: spacing.sm,
  },
  spacer: { width: 22 },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  card: {},
  gap: { marginTop: spacing.xs },
  section: { marginTop: spacing.sm, gap: spacing.xs },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rateText: { flex: 1 },
});
