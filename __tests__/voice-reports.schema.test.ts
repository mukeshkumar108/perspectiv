import { VoiceLibraryResponseSchema, VoiceResearchResponseSchema, VoiceRateRequestSchema } from '../src/api/schemas';

describe('voice report schemas', () => {
  it('accepts a library item with a null-ish card field', () => {
    const parsed = VoiceLibraryResponseSchema.parse({
      items: [{ id: 'a', createdAt: '2026-10-22T10:00:00.000Z', card: { headline: 'Tea at the top', moment: 'He handed me his flask.', theme: null, tags: ['dad'] } }],
    });
    expect(parsed.items[0].card?.headline).toBe('Tea at the top');
  });

  it('accepts a research payload with memory items that carry extra fields', () => {
    const parsed = VoiceResearchResponseSchema.parse({
      reports: [{ id: 'r1', createdAt: '2026-10-22T10:00:00.000Z', profile: { expression: 'brief' }, voiceFeatures: { f0_mean_hz: 172.5 },
        memoryUpdates: [{ id: 'fact_x', kind: 'fact', action: 'added', basis: 'said so' }], costUsd: 0, models: { directive: ['known_people'] } }],
      memory: { people: [{ id: 'person_dad', name: 'Dad', correct: null }], themes: [], facts: [], openThreads: [], style: { notes: [], lastDirective: {} } },
    });
    expect(parsed.memory.people[0].name).toBe('Dad');
  });

  it('only allows true, false or null as a rating', () => {
    expect(() => VoiceRateRequestSchema.parse({ id: 'x', correct: 'yes' })).toThrow();
    expect(VoiceRateRequestSchema.parse({ id: 'x', correct: null }).correct).toBeNull();
  });
});

import { LessonsResponseSchema } from '../src/api/schemas';

describe('lessons catalog', () => {
  it('accepts the nulls the server sends for metadata a lesson does not have', () => {
    const parsed = LessonsResponseSchema.parse({
      items: [{ id: 'lesson_001', slug: 'manual-save', title: 'Why everything piles up', description: 'x', order: 1, durationSec: null, tags: [], version: 'v1', audioUrl: 'https://x/a.mp3', audioMimeType: 'audio/mpeg', uploadedAt: '2026-01-01T00:00:00.000Z', pathname: 'voice/lessons/a.mp3' },
        { id: 'b', slug: 'b', title: 'B', description: null, order: null, durationSec: null, tags: null, version: null, audioUrl: 'https://x/b.mp3' }],
    });
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[1].order).toBeUndefined();
    expect(parsed.items[1].description).toBe('');
  });
});
