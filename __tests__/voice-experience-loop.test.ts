import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer: any = require('react-test-renderer');
const { act } = TestRenderer;

import { useExperienceOffers } from '../src/voice/useExperienceOffers';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const URL_WSS = 'wss://h/voice/v1/realtime?token=T';
const OFFER = { offer_id: 'o2', experience_id: 'breathing-4-7-8', title: '4-7-8 Breathing', status: 'offered' };

async function setup(initialOpen: any = null) {
  const calls: string[] = [];
  let open: any = initialOpen;
  (global as any).fetch = jest.fn(async (url: string, init?: any) => {
    if (url.includes('/experiences/open')) return { ok: true, json: async () => ({ offer: open }) };
    const m = url.match(/experiences\/([^/]+)\/event/);
    calls.push(`${m?.[1]}:${JSON.parse(init.body).status}${JSON.parse(init.body).duration_s !== undefined ? ':' + JSON.parse(init.body).duration_s : ''}`);
    return { ok: true };
  });
  const voice: any = {
    connectionUrlRef: { current: URL_WSS },
    repliesDone: 0,
    userTurns: 0,
    userText: '',
    interrupt: jest.fn(),
    setMicPaused: jest.fn(),
    sendText: jest.fn(),
  };
  const result: { current: ReturnType<typeof useExperienceOffers> } = { current: undefined as any };
  function Probe({ v }: { v: any }) {
    result.current = useExperienceOffers(v, true);
    return null;
  }
  let renderer: any;
  act(() => { renderer = TestRenderer.create(React.createElement(Probe, { v: voice })); });
  const hook = { result };
  const rerender = (patch: any) => { Object.assign(voice, patch); act(() => { renderer.update(React.createElement(Probe, { v: { ...voice } })); }); };
  await act(async () => { await new Promise((r) => setTimeout(r, 30)); });       // the call's opening look at open cards settles first
  return { voice, hook, calls, rerender, setOpen: (o: any) => { open = o; } };
}

async function waitFor(fn: () => void, ms = 1500) {
  const end = Date.now() + ms;
  for (;;) {
    try { fn(); return; } catch (e) { if (Date.now() > end) throw e; await act(async () => { await new Promise((r) => setTimeout(r, 15)); }); }
  }
}

describe('offer / accept / activity / return loop', () => {
  it('shows only an offer made during this call, then runs accept -> complete -> resume exactly once', async () => {
    const t = await setup({ ...OFFER, offer_id: 'old' });
    await waitFor(() => expect((global as any).fetch).toHaveBeenCalled());       // baseline: the old card is remembered, not shown
    t.rerender({ repliesDone: 1 });
    await act(async () => { await Promise.resolve(); });
    expect(t.hook.result.current.offer).toBeNull();

    t.setOpen(OFFER);
    t.rerender({ repliesDone: 2 });
    await waitFor(() => expect(t.hook.result.current.offer?.offerId).toBe('o2'));

    act(() => { t.hook.result.current.accept(); t.hook.result.current.accept(); });                  // a double tap
    expect(t.hook.result.current.running).toBe(true);
    expect(t.voice.setMicPaused).toHaveBeenCalledWith(true);

    await act(async () => { t.hook.result.current.finish({ outcome: 'COMPLETED', durationSec: 118 }); t.hook.result.current.finish({ outcome: 'COMPLETED', durationSec: 118 }); });
    await waitFor(() => expect(t.voice.sendText).toHaveBeenCalledTimes(1));
    expect(t.calls).toEqual(['o2:accepted', 'o2:completed:118']);
    expect(t.voice.setMicPaused).toHaveBeenLastCalledWith(false);
    expect(t.voice.sendText).toHaveBeenCalledWith('[I finished the 4-7-8 breathing exercise, about 2 min.]');
    expect(t.hook.result.current.offer).toBeNull();
  });

  it('an early exit is reported as exited with the time spent, and the companion is told', async () => {
    const t = await setup(null);
    t.setOpen(OFFER);
    t.rerender({ repliesDone: 1 });
    await waitFor(() => expect(t.hook.result.current.offer).not.toBeNull());
    act(() => t.hook.result.current.accept());
    await act(async () => { t.hook.result.current.finish({ outcome: 'EXITED', durationSec: 25 }); });
    await waitFor(() => expect(t.voice.sendText).toHaveBeenCalledWith('[I stopped the 4-7-8 breathing exercise early, after 25 seconds.]'));
    expect(t.calls).toEqual(['o2:accepted', 'o2:exited:25']);
  });

  it('a spoken no declines once and the same card is not shown again; a spoken yes accepts', async () => {
    const t = await setup(null);
    t.setOpen(OFFER);
    t.rerender({ repliesDone: 1 });
    await waitFor(() => expect(t.hook.result.current.offer).not.toBeNull());
    t.rerender({ userTurns: 1, userText: 'not now' });
    await waitFor(() => expect(t.calls).toEqual(['o2:declined']));
    expect(t.hook.result.current.offer).toBeNull();
    t.rerender({ repliesDone: 2 });                                                                  // the server still lists it: it must not come back
    await act(async () => { await Promise.resolve(); });
    expect(t.hook.result.current.offer).toBeNull();

    const u = await setup(null);
    u.setOpen(OFFER);
    u.rerender({ repliesDone: 1 });
    await waitFor(() => expect(u.hook.result.current.offer).not.toBeNull());
    u.rerender({ userTurns: 1, userText: 'yeah sure' });
    await waitFor(() => expect(u.hook.result.current.running).toBe(true));
  });

  it('ordinary talk while a card is open leaves it open, and nothing is fetched while an activity runs', async () => {
    const t = await setup(null);
    t.setOpen(OFFER);
    t.rerender({ repliesDone: 1 });
    await waitFor(() => expect(t.hook.result.current.offer).not.toBeNull());
    t.rerender({ userTurns: 1, userText: 'I had a long day and my sister rang' });
    await act(async () => { await Promise.resolve(); });
    expect(t.hook.result.current.offer).not.toBeNull();
    expect(t.hook.result.current.running).toBe(false);
    act(() => t.hook.result.current.accept());
    const opens = () => ((global as any).fetch as jest.Mock).mock.calls.filter((c: any[]) => String(c[0]).includes('/experiences/open')).length;
    const before = opens();
    t.rerender({ repliesDone: 2 });
    await act(async () => { await Promise.resolve(); });
    expect(opens()).toBe(before);
  });
});
