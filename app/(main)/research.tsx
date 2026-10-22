import { useEffect } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { ScreenContainer, Text, Card, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { useRateVoiceMemory, useVoiceResearch } from '@/src/hooks';
import type { MemoryItem } from '@/src/api/schemas';
import { BASELINE_SESSIONS_NEEDED, VOICE_METRICS, displayMetric, formatMetric, voiceDeviation } from '@/src/voice/deviation';

type Rated = { id: string; label: string; basis?: string | null; correct?: boolean | null };

/** An internal id like "style_enjoys_sharing_pe" as readable text, for items whose label we do not have. */
const readableId = (id: string) => id.replace(/^(style|theme|fact|person|thread)_/, '').replace(/_\d{8}$/, '').replace(/_/g, ' ');

function RateRow({ item, reportId }: { item: Rated; reportId?: string }) {
  const theme = useTheme();
  const rate = useRateVoiceMemory();
  const set = (correct: boolean) =>
    rate.mutate({ id: item.id, correct: item.correct === correct ? null : correct, reportId });
  const pill = (active: boolean) => [
    styles.pill,
    { borderColor: active ? theme.text : theme.border, backgroundColor: active ? theme.text : 'transparent' },
  ];
  return (
    <View style={styles.rateRow}>
      <Text variant="small">{item.label}</Text>
      {item.basis ? (
        <Text variant="small" color={theme.textSecondary}>
          {item.basis}
        </Text>
      ) : null}
      <View style={styles.pills}>
        <Pressable onPress={() => set(true)} hitSlop={6} accessibilityLabel="Accurate" style={pill(item.correct === true)}>
          <Text variant="small" color={item.correct === true ? theme.background : theme.textSecondary}>
            Accurate
          </Text>
        </Pressable>
        <Pressable onPress={() => set(false)} hitSlop={6} accessibilityLabel="Inaccurate" style={pill(item.correct === false)}>
          <Text variant="small" color={item.correct === false ? theme.background : theme.textSecondary}>
            Inaccurate
          </Text>
        </Pressable>
      </View>
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

  // The query is gated on auth being ready; if it is idle with nothing loaded, ask once rather than leave the screen empty.
  useEffect(() => {
    if (!data && fetchStatus === 'idle' && !error) void refetch();
  }, [data, fetchStatus, error, refetch]);

  const memory = data?.memory;
  const deviation = voiceDeviation(data?.reports ?? []);
  const labelFor = new Map<string, string>();
  if (memory) {
    for (const p of memory.people) labelFor.set(p.id, `${str(p.name)}${p.relation ? ` (${str(p.relation)})` : ''}`);
    for (const t of memory.themes) labelFor.set(t.id, str(t.label));
    for (const f of memory.facts) {
      const n = typeof f.count === 'number' ? f.count : 1;
      labelFor.set(f.id, `${str(f.fact)}${f.habit ? ` · habit, mentioned ${n} times` : n > 1 ? ` · mentioned ${n} times` : ''}`);
    }
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

        {data && data.reports.length ? (
          <Card style={[styles.card, { borderColor: theme.border, borderWidth: 1 }]}>
            <Text variant="bodyMedium">Voice scores, latest session</Text>
            <Text variant="small" color={theme.textSecondary}>
              Acoustic baseline (calibrating, raw phone signal). Not calibrated for noise or room: only change against this person's own
              earlier sessions is meaningful. {deviation.calibrating
                ? `Building a baseline: ${deviation.priorSessions} of ${BASELINE_SESSIONS_NEEDED} earlier sessions.`
                : `Compared with their last ${deviation.priorSessions} sessions.`}
            </Text>
            <View style={styles.section}>
              <View style={styles.scoreHead}>
                <Text variant="small" color={theme.textSecondary} style={styles.scoreName}>Measure</Text>
                <Text variant="small" color={theme.textSecondary} style={styles.scoreNum}>Latest</Text>
                <Text variant="small" color={theme.textSecondary} style={styles.scoreNum}>Own avg</Text>
                <Text variant="small" color={theme.textSecondary} style={styles.scoreNum}>Change</Text>
              </View>
              {deviation.rows.map((row, i) => {
                const metric = VOICE_METRICS[i];
                return (
                  <View key={row.key} style={styles.scoreHead}>
                    <Text variant="small" style={styles.scoreName}>{row.label} ({row.unit})</Text>
                    <Text variant="small" style={styles.scoreNum}>{formatMetric(metric, row.latest)}</Text>
                    <Text variant="small" style={styles.scoreNum}>{formatMetric(metric, row.baselineMean)}</Text>
                    <Text variant="small" style={styles.scoreNum}>
                      {row.pctChange === null ? 'n/a' : `${row.pctChange >= 0 ? '+' : ''}${row.pctChange.toFixed(0)}%`}
                      {row.z === null ? '' : ` (${row.z >= 0 ? '+' : ''}${row.z.toFixed(1)}σ)`}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
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
                {new Date(r.createdAt).toLocaleString()} · {r.flow ?? 'session'} · {r.durationSeconds ?? '?'}s · ${(r.costUsd ?? 0).toFixed(4)}
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
                <Text variant="small" color={theme.textSecondary}>
                  Voice, raw and uncalibrated ({String(voice.utterances ?? 0)} utterances)
                </Text>
                <Text variant="small">
                  {VOICE_METRICS.filter((m) => displayMetric(m, voice[m.key]) !== null)
                    .map((m) => `${m.label} ${displayMetric(m, voice[m.key])} ${m.unit}`)
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
                      item={{ id: u.id, label: `${u.action}: ${labelFor.get(u.id) ?? readableId(u.id)}`, basis: u.basis, correct: u.correct }}
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
  rateRow: { gap: 2, marginBottom: spacing.xs },
  pills: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  scoreHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  scoreName: { flex: 3 },
  scoreNum: { flex: 2, textAlign: 'right' },
});
