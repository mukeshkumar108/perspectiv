import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LabeledValue, Overline, Pill, ScreenContainer, ScreenHeader, Text, sessionAccents, spacing } from '@/src/ui';
import { useTheme } from '@/src/ui/useTheme';
import { useRateVoiceMemory, useVoiceResearch } from '@/src/hooks';
import type { MemoryItem } from '@/src/api/schemas';
import { BASELINE_SESSIONS_NEEDED, VOICE_METRICS, displayMetric, formatMetric, voiceDeviation } from '@/src/voice/deviation';

type Rated = { id: string; label: string; basis?: string | null; correct?: boolean | null };

/** An internal id like "style_enjoys_sharing_pe" as readable text, for items whose label we do not have. */
const readableId = (id: string) => id.replace(/^(style|theme|fact|person|thread)_/, '').replace(/_\d{8}$/, '').replace(/_/g, ' ');
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const asRated = (items: MemoryItem[], label: (i: MemoryItem) => string): Rated[] =>
  items.map((i) => ({ id: i.id, label: label(i), basis: i.basis, correct: i.correct }));

const FLOW_LABEL: Record<string, string> = {
  morning: 'Morning',
  daytime: 'Drop-in',
  evening: 'Evening',
  ten_things: 'Ten things',
  onboarding: 'Welcome',
  first_reflection_core: 'Evening',
  first_reflection_day0: 'Welcome',
  voice_demo: 'Demo',
};
const FLOW_ACCENT: Record<string, keyof typeof sessionAccents> = {
  first_reflection_core: 'evening',
  first_reflection_day0: 'onboarding',
  voice_demo: 'onboarding',
};

/** A block with a small spaced title and the content beneath it. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Overline>{title}</Overline>
      {children}
    </View>
  );
}

/** One remembered item: the thing in the heavier weight, why we think so in grey, and two small buttons to mark it right or wrong. */
function RateRow({ item, reportId }: { item: Rated; reportId?: string }) {
  const theme = useTheme();
  const rate = useRateVoiceMemory();
  const set = (correct: boolean) => rate.mutate({ id: item.id, correct: item.correct === correct ? null : correct, reportId });
  return (
    <View style={[styles.rateRow, { borderColor: theme.border }]}>
      <Text variant="small" medium>
        {item.label}
      </Text>
      {item.basis ? (
        <Text variant="caption" color={theme.textTertiary}>
          {item.basis}
        </Text>
      ) : null}
      <View style={styles.pills}>
        <Pill label="Accurate" active={item.correct === true} onPress={() => set(true)} />
        <Pill label="Inaccurate" active={item.correct === false} onPress={() => set(false)} />
      </View>
    </View>
  );
}

export default function ResearchScreen() {
  const theme = useTheme();
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
      labelFor.set(f.id, `${str(f.fact)}${f.habit ? ` · habit, ${n}×` : n > 1 ? ` · ${n}×` : ''}`);
    }
    for (const t of memory.openThreads) labelFor.set(t.id, `${str(t.topic)} · ${str(t.status)}`);
  }

  return (
    <ScreenContainer style={styles.container} ambient={false}>
      <ScreenHeader title="Session research" />

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Text variant="caption" color={theme.textTertiary}>
          Working assumptions, not findings. No transcripts are kept or shown.
        </Text>

        {!data ? (
          <View style={styles.block}>
            <Text variant="small" color={theme.textSecondary}>
              {isLoading ? 'Loading' : error ? `Could not load: ${error.message}` : 'Not loaded yet'}
            </Text>
            <Text variant="caption" color={theme.textTertiary}>
              {status} / {fetchStatus}
            </Text>
            <Pressable onPress={() => void refetch()} hitSlop={12}>
              <Text variant="small" medium>
                Try again
              </Text>
            </Pressable>
          </View>
        ) : null}

        {data && data.reports.length ? (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text variant="bodyMedium" medium>
              Voice, latest session
            </Text>
            <Text variant="caption" color={theme.textTertiary}>
              Raw phone signal, not calibrated for noise or room. Only change against this person&apos;s own earlier sessions means anything.{' '}
              {deviation.calibrating
                ? `Building a baseline: ${deviation.priorSessions} of ${BASELINE_SESSIONS_NEEDED} earlier sessions.`
                : `Compared with their last ${deviation.priorSessions} sessions.`}
            </Text>
            <View style={styles.table}>
              <View style={styles.tr}>
                <Overline style={styles.c1}>Measure</Overline>
                <Overline style={styles.cn}>Latest</Overline>
                <Overline style={styles.cn}>Avg</Overline>
                <Overline style={styles.cn}>Change</Overline>
              </View>
              {deviation.rows.map((row, i) => {
                const metric = VOICE_METRICS[i];
                const change =
                  row.pctChange === null
                    ? '–'
                    : `${row.pctChange >= 0 ? '+' : ''}${row.pctChange.toFixed(0)}%${row.z === null ? '' : ` · ${row.z >= 0 ? '+' : ''}${row.z.toFixed(1)}σ`}`;
                return (
                  <View key={row.key} style={[styles.tr, styles.trLine, { borderColor: theme.border }]}>
                    <Text variant="caption" style={styles.c1}>
                      {row.label} <Text variant="caption" color={theme.textTertiary}>{row.unit}</Text>
                    </Text>
                    <Text variant="caption" medium style={styles.cn}>
                      {formatMetric(metric, row.latest)}
                    </Text>
                    <Text variant="caption" color={theme.textTertiary} style={styles.cn}>
                      {formatMetric(metric, row.baselineMean)}
                    </Text>
                    <Text variant="caption" style={styles.cn}>
                      {change}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {memory ? (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Text variant="bodyMedium" medium>
              What we remember
            </Text>
            {(
              [
                ['People', asRated(memory.people, (i) => labelFor.get(i.id) ?? i.id)],
                ['What matters', asRated(memory.themes, (i) => labelFor.get(i.id) ?? i.id)],
                ['Facts', asRated(memory.facts, (i) => labelFor.get(i.id) ?? i.id)],
                ['Open threads', asRated(memory.openThreads, (i) => labelFor.get(i.id) ?? i.id)],
              ] as [string, Rated[]][]
            ).map(([title, rows]) =>
              rows.length ? (
                <Section key={title} title={title}>
                  {rows.map((r) => (
                    <RateRow key={r.id} item={r} />
                  ))}
                </Section>
              ) : null,
            )}
            {memory.style.notes.length ? (
              <Section title="How they talk">
                {memory.style.notes.map((n) => (
                  <Text key={n} variant="small">
                    {n}
                  </Text>
                ))}
              </Section>
            ) : null}
            {!memory.people.length && !memory.themes.length && !memory.facts.length && !memory.openThreads.length ? (
              <Text variant="small" color={theme.textTertiary}>
                Nothing yet.
              </Text>
            ) : null}
          </View>
        ) : null}

        {(data?.reports ?? []).map((r) => {
          const profile = r.profile ?? {};
          const voice = r.voiceFeatures ?? {};
          const flow = r.flow ?? 'session';
          const accent = sessionAccents[(FLOW_ACCENT[flow] ?? flow) as keyof typeof sessionAccents] ?? sessionAccents.onboarding;
          const directive = Array.isArray((r.models as { directive?: unknown } | null | undefined)?.directive)
            ? ((r.models as { directive: string[] }).directive).join(', ')
            : 'none';
          return (
            <View key={r.id} style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={styles.cardHead}>
                <View style={[styles.flowTag, { backgroundColor: accent.soft }]}>
                  <Text variant="caption" medium>
                    {FLOW_LABEL[flow] ?? flow}
                  </Text>
                </View>
                <Text variant="caption" color={theme.textTertiary}>
                  {new Date(r.createdAt).toLocaleString()}
                </Text>
              </View>

              {r.card?.headline ? (
                <Text variant="bodyMedium" medium>
                  {r.card.headline}
                </Text>
              ) : null}
              {r.card?.moment ? <Text variant="small">{r.card.moment}</Text> : null}

              <View style={styles.facts}>
                <LabeledValue label="Length" value={`${r.durationSeconds ?? '?'} s`} />
                <LabeledValue label="Cost" value={`$${(r.costUsd ?? 0).toFixed(4)}`} />
                <LabeledValue label="Prompt" value={r.promptVersion ?? '?'} />
                <LabeledValue label="Rules" value={r.ruleVersion ?? 'none'} secondary={directive === 'none' ? undefined : directive} />
              </View>

              <Section title="How they reflected">
                <View style={styles.tags}>
                  {Object.entries(profile)
                    .filter(([k]) => k !== 'reading')
                    .map(([k, v]) => (
                      <View key={k} style={[styles.tag, { borderColor: theme.border }]}>
                        <Text variant="caption" color={theme.textTertiary}>
                          {k.replace(/_/g, ' ')}{' '}
                        </Text>
                        <Text variant="caption" medium>
                          {String(v)}
                        </Text>
                      </View>
                    ))}
                </View>
                {profile.reading ? (
                  <Text variant="caption" color={theme.textTertiary}>
                    {String(profile.reading)}
                  </Text>
                ) : null}
              </Section>

              <Section title={`Voice, raw · ${String(voice.utterances ?? 0)} utterances`}>
                <Text variant="caption" color={theme.textSecondary}>
                  {VOICE_METRICS.filter((m) => displayMetric(m, voice[m.key]) !== null)
                    .map((m) => `${m.label} ${displayMetric(m, voice[m.key])} ${m.unit}`)
                    .join('  ·  ') || 'none captured'}
                </Text>
              </Section>

              {r.memoryUpdates?.length ? (
                <Section title={`Memory this session · ${r.memoryUpdates.length}`}>
                  {r.memoryUpdates.map((u) => (
                    <RateRow
                      key={`${u.id}-${u.action}`}
                      reportId={r.id}
                      item={{ id: u.id, label: `${u.action} · ${labelFor.get(u.id) ?? readableId(u.id)}`, basis: u.basis, correct: u.correct }}
                    />
                  ))}
                </Section>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { gap: spacing.md, paddingBottom: spacing.xxl },
  block: { gap: spacing.sm },
  card: { borderRadius: 20, padding: spacing.md, gap: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flowTag: { borderRadius: 999, paddingHorizontal: spacing.sm + 2, paddingVertical: 3 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  section: { gap: spacing.sm },
  table: { gap: 2 },
  tr: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: 4 },
  trLine: { borderTopWidth: StyleSheet.hairlineWidth },
  c1: { flex: 5 },
  cn: { flex: 3, textAlign: 'right' },
  rateRow: { gap: 2, paddingBottom: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  pills: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 3 },
});
