// Native experiences (breathing, a lesson, a game) on top of a live voice call.
// The Runtime decides what to offer and remembers what happened; the voice server relays; this file is the phone's side of that relay.
// The calls authenticate with the call's own token, so they work for as long as the call is live (not just the first five minutes).

export type ExperienceStatus = 'accepted' | 'declined' | 'completed' | 'exited';

export type ExperienceOffer = {
  offerId: string;
  experienceId: string;
  title: string;
  status: 'offered' | 'accepted';
};

/** wss://host/voice/v1/realtime?token=T  ->  { base: https://host/voice/v1, token: T } */
export function experiencesEndpoint(realtimeUrl: string): { base: string; token: string } | null {
  try {
    const url = new URL(realtimeUrl);
    const token = url.searchParams.get('token');
    if (!token) return null;
    const scheme = url.protocol === 'wss:' ? 'https:' : url.protocol === 'ws:' ? 'http:' : url.protocol;
    const path = url.pathname.replace(/\/realtime\/?$/, '');
    return { base: `${scheme}//${url.host}${path}`, token };
  } catch {
    return null;
  }
}

export async function fetchOpenOffer(realtimeUrl: string, fetchImpl: typeof fetch = fetch): Promise<ExperienceOffer | null> {
  const ep = experiencesEndpoint(realtimeUrl);
  if (!ep) return null;
  try {
    const res = await fetchImpl(`${ep.base}/experiences/open?token=${encodeURIComponent(ep.token)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { offer?: { offer_id?: string; experience_id?: string; title?: string; status?: string } | null };
    const o = body.offer;
    if (!o?.offer_id || !o.experience_id) return null;
    return { offerId: o.offer_id, experienceId: o.experience_id, title: o.title ?? o.experience_id, status: o.status === 'accepted' ? 'accepted' : 'offered' };
  } catch {
    return null;
  }
}

export async function reportExperience(realtimeUrl: string, offerId: string, status: ExperienceStatus, durationSec?: number, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const ep = experiencesEndpoint(realtimeUrl);
  if (!ep) return false;
  try {
    const res = await fetchImpl(`${ep.base}/experiences/${encodeURIComponent(offerId)}/event?token=${encodeURIComponent(ep.token)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status, ...(durationSec !== undefined ? { duration_s: Math.max(0, Math.round(durationSec)) } : {}) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const YES = /^(?:yes|yeah|yep|yup|sure|ok|okay|alright|please|go on|go ahead|let'?s (?:do|go|try)(?: it| that)?|do it|that sounds good|sounds good|i would|i'?d like that)\b/i;
const NO = /^(?:no|nope|nah|not now|not right now|not today|maybe later|later|skip|i'?m good|no thanks|no thank you|don'?t)\b/i;

/** What the person's spoken answer means for an open offer. Only a clear, short answer counts; anything else is conversation and leaves the card as it is. */
export function interpretAnswer(transcript: string): 'yes' | 'no' | null {
  const t = (transcript || '').trim().replace(/[.!,]+$/g, '');
  if (!t || t.split(/\s+/).length > 7) return null;
  if (NO.test(t)) return 'no';
  if (YES.test(t)) return 'yes';
  return null;
}

/** What the companion hears when the app returns from the activity: said once, in plain words. */
export function resumeLine(outcome: 'COMPLETED' | 'EXITED', title: string, durationSec: number): string {
  const mins = Math.max(1, Math.round(durationSec / 60));
  if (outcome === 'EXITED' && durationSec < 3) return `[I closed the ${title.toLowerCase()} exercise without doing it.]`;
  return outcome === 'COMPLETED' ? `[I finished the ${title.toLowerCase()} exercise, about ${mins} min.]` : `[I stopped the ${title.toLowerCase()} exercise early, after ${Math.max(1, Math.round(durationSec))} seconds.]`;
}
