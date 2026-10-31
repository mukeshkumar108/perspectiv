import { experiencesEndpoint, fetchOpenOffer, interpretAnswer, reportExperience, resumeLine } from '../src/voice/stream/experiences';

const URL_WSS = 'wss://api.unknwnfreq.xyz/voice/v1/realtime?token=abc.def';

describe('experiences relay', () => {
  it('derives the http base and token from the realtime url', () => {
    expect(experiencesEndpoint(URL_WSS)).toEqual({ base: 'https://api.unknwnfreq.xyz/voice/v1', token: 'abc.def' });
    expect(experiencesEndpoint('wss://x/voice/v1/realtime')).toBeNull();
    expect(experiencesEndpoint('not a url')).toBeNull();
  });

  it('reads the open card, and treats a missing or failing server as no card', async () => {
    const ok = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ offer: { offer_id: 'o1', experience_id: 'breathing-4-7-8', title: '4-7-8 breathing', status: 'offered' } }) });
    expect(await fetchOpenOffer(URL_WSS, ok as any)).toEqual({ offerId: 'o1', experienceId: 'breathing-4-7-8', title: '4-7-8 breathing', status: 'offered' });
    expect(ok.mock.calls[0][0]).toBe('https://api.unknwnfreq.xyz/voice/v1/experiences/open?token=abc.def');
    expect(await fetchOpenOffer(URL_WSS, jest.fn().mockResolvedValue({ ok: true, json: async () => ({ offer: null }) }) as any)).toBeNull();
    expect(await fetchOpenOffer(URL_WSS, jest.fn().mockRejectedValue(new Error('net')) as any)).toBeNull();
  });

  it('reports what happened with a whole-second duration, and says whether it was delivered', async () => {
    const f = jest.fn().mockResolvedValue({ ok: true });
    expect(await reportExperience(URL_WSS, 'o1', 'completed', 118.6, f as any)).toBe(true);
    expect(f.mock.calls[0][0]).toBe('https://api.unknwnfreq.xyz/voice/v1/experiences/o1/event?token=abc.def');
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ status: 'completed', duration_s: 119 });
    expect(await reportExperience(URL_WSS, 'o1', 'declined', undefined, jest.fn().mockResolvedValue({ ok: false }) as any)).toBe(false);
  });

  it('only a clear, short spoken answer counts', () => {
    for (const yes of ['yes', 'Yeah.', 'sure, go on', "let's do it", 'ok', 'Yes please']) expect(interpretAnswer(yes)).toBe('yes');
    for (const no of ['no', 'not now', 'nah', 'maybe later', 'no thanks']) expect(interpretAnswer(no)).toBe('no');
    for (const other of ['', 'I had a long day and my sister called me', 'what is it exactly', 'yes I did go to the shops yesterday and it was fine']) expect(interpretAnswer(other)).toBeNull();
  });

  it('tells the companion the outcome in plain words', () => {
    expect(resumeLine('COMPLETED', '4-7-8 Breathing', 118)).toBe('[I finished the 4-7-8 breathing exercise, about 2 min.]');
    expect(resumeLine('EXITED', '4-7-8 Breathing', 0)).toBe('[I closed the 4-7-8 breathing exercise without doing it.]');
    expect(resumeLine('EXITED', '4-7-8 Breathing', 25)).toBe('[I stopped the 4-7-8 breathing exercise early, after 25 seconds.]');
  });
});
