import { useCallback, useEffect, useRef, useState } from 'react';

import {
  fetchOpenOffer,
  interpretAnswer,
  reportExperience,
  resumeLine,
  type ExperienceOffer,
} from '@/src/voice/stream/experiences';
import type { useStreamingVoice } from '@/src/voice/stream/useStreamingVoice';

type Voice = ReturnType<typeof useStreamingVoice>;

/**
 * The offer / accept / activity / return loop for a live voice call.
 * - A card appears only for an offer made during THIS call (offers that existed when the call began are remembered and ignored).
 * - The person can tap, or answer out loud ("yes" / "not now").
 * - Accepting pauses the microphone and opens the activity; finishing or leaving it reports the outcome once and the companion carries on in the same sitting.
 * - Every status is reported at most once per offer, so a double tap or a repeated callback cannot send it twice.
 */
export function useExperienceOffers(voice: Voice, live: boolean) {
  const [offer, setOffer] = useState<ExperienceOffer | null>(null);
  const [running, setRunning] = useState(false);
  const seen = useRef<Set<string>>(new Set());
  const reported = useRef<Set<string>>(new Set());
  const baselined = useRef(false);
  const offerRef = useRef<ExperienceOffer | null>(null);
  offerRef.current = offer;
  const runningRef = useRef(false);
  runningRef.current = running;

  const url = () => voice.connectionUrlRef.current;

  const report = useCallback(async (offerId: string, status: 'accepted' | 'declined' | 'completed' | 'exited', durationSec?: number) => {
    const key = `${offerId}:${status}`;
    const u = voice.connectionUrlRef.current;
    if (!u || reported.current.has(key)) return;
    reported.current.add(key);
    const ok = await reportExperience(u, offerId, status, durationSec);
    if (!ok) reported.current.delete(key);        // not delivered: allow one more try
  }, [voice.connectionUrlRef]);

  // A new call starts clean; the offers already open when it began are not shown again.
  useEffect(() => {
    if (!live) {
      baselined.current = false;
      seen.current = new Set();
      reported.current = new Set();
      setOffer(null);
      setRunning(false);
      return;
    }
    if (baselined.current) return;
    baselined.current = true;
    const u = url();
    if (!u) return;
    void fetchOpenOffer(u).then((o) => {
      if (o) seen.current.add(o.offerId);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  // Look for a card after each finished reply (that is when the Runtime has put one on screen), but never while an activity runs.
  useEffect(() => {
    if (!live || voice.repliesDone === 0 || runningRef.current || offerRef.current) return;
    const u = url();
    if (!u) return;
    let cancelled = false;
    void fetchOpenOffer(u).then((o) => {
      if (cancelled || !o || seen.current.has(o.offerId) || runningRef.current) return;
      seen.current.add(o.offerId);
      setOffer(o);
    });
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.repliesDone, live]);

  const accept = useCallback(() => {
    const o = offerRef.current;
    if (!o || runningRef.current) return;
    runningRef.current = true;           // synchronous: a second tap in the same instant must see it
    voice.interrupt();
    void voice.setMicPaused(true);
    setRunning(true);
    void report(o.offerId, 'accepted');
  }, [report, voice]);

  const decline = useCallback(() => {
    const o = offerRef.current;
    if (!o || runningRef.current) return;
    offerRef.current = null;
    setOffer(null);
    void report(o.offerId, 'declined');
  }, [report]);

  // A clear spoken yes / no answers the open card.
  useEffect(() => {
    if (!live || voice.userTurns === 0 || !offerRef.current || runningRef.current) return;
    const answer = interpretAnswer(voice.userText);
    if (answer === 'yes') accept();
    else if (answer === 'no') decline();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.userTurns]);

  const finish = useCallback((result: { outcome: 'COMPLETED' | 'EXITED'; durationSec: number }) => {
    const o = offerRef.current;
    if (!o || !runningRef.current) return;
    runningRef.current = false;
    offerRef.current = null;
    setRunning(false);
    setOffer(null);
    void voice.setMicPaused(false);
    void report(o.offerId, result.outcome === 'COMPLETED' ? 'completed' : 'exited', result.durationSec).then(() => {
      voice.sendText(resumeLine(result.outcome, o.title, result.durationSec));
    });
  }, [report, voice]);

  return { offer, running, accept, decline, finish };
}
