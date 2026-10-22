import { daypartAt, planSession } from '../src/voice/sessionPlan';
import { dailySeed, greetingFor } from '../src/voice/greeting';

const at = (iso: string) => new Date(iso);
// London is UTC+1 in October (BST)
const base = { timezone: 'Europe/London', hasEverTalked: true };

describe('planSession', () => {
  it('welcomes someone who has never talked, whatever the time', () => {
    expect(planSession({ ...base, hasEverTalked: false, now: at('2026-10-22T08:00:00Z'), recent: [] }).flow).toBe('onboarding');
  });

  it('starts the morning check-in for the first session of a morning', () => {
    const plan = planSession({ ...base, now: at('2026-10-22T08:00:00Z'), recent: [] }); // 09:00 London
    expect(plan.flow).toBe('morning');
    expect(plan.eveningOpensAtHour).toBe(18);
  });

  it('moves to a drop-in once the morning is done, and in the middle of the day', () => {
    const recent = [{ flow: 'morning', createdAt: '2026-10-22T07:30:00Z' }];
    expect(planSession({ ...base, now: at('2026-10-22T09:00:00Z'), recent }).flow).toBe('daytime');
    expect(planSession({ ...base, now: at('2026-10-22T13:00:00Z'), recent: [] }).flow).toBe('daytime'); // 14:00 London, no morning
  });

  it('opens the evening reflection from 6 pm in the person\'s own timezone, not the server\'s', () => {
    expect(planSession({ ...base, now: at('2026-10-22T16:59:00Z'), recent: [] }).flow).toBe('daytime'); // 17:59 London
    expect(planSession({ ...base, now: at('2026-10-22T17:00:00Z'), recent: [] }).flow).toBe('evening'); // 18:00 London
    // 18:00 UTC is 14:00 in New York: still the day
    expect(planSession({ timezone: 'America/New_York', hasEverTalked: true, now: at('2026-10-22T18:00:00Z'), recent: [] }).flow).toBe('daytime');
  });

  it('goes back to a drop-in after the evening reflection is done, and counts a session after midnight as a new day', () => {
    const evening = [{ flow: 'evening', createdAt: '2026-10-22T18:30:00Z' }];
    expect(planSession({ ...base, now: at('2026-10-22T20:00:00Z'), recent: evening }).flow).toBe('daytime');
    expect(planSession({ ...base, now: at('2026-10-23T07:30:00Z'), recent: evening }).flow).toBe('morning'); // next morning
  });

  it('knows the part of the day', () => {
    expect([daypartAt(7), daypartAt(12), daypartAt(17), daypartAt(18), daypartAt(23)]).toEqual(['morning', 'day', 'day', 'evening', 'evening']);
  });
});

describe('greetingFor', () => {
  it('uses the name, stays the same all day, and never shouts', () => {
    const seed = dailySeed('2026-10-22');
    const a = greetingFor({ name: 'Ashley', daypart: 'evening', streak: 1, daysAway: 0, seed });
    const b = greetingFor({ name: 'Ashley', daypart: 'evening', streak: 1, daysAway: 0, seed });
    expect(a).toEqual(b);
    expect(a.headline).toContain('Ashley');
    expect(a.headline + a.sub).not.toContain('!');
  });

  it('welcomes someone back after a few days away, and mentions a streak only when there is one', () => {
    expect(greetingFor({ name: 'Sam', daypart: 'day', streak: 0, daysAway: 5, seed: 1 }).headline).toBe('Welcome back, Sam.');
    expect(greetingFor({ name: 'Sam', daypart: 'day', streak: 4, daysAway: 0, seed: 1 }).sub).toMatch(/4 days in a row/);
    expect(greetingFor({ name: 'Sam', daypart: 'day', streak: 1, daysAway: 0, seed: 1 }).sub).not.toMatch(/in a row/);
  });

  it('has a greeting without a name', () => {
    expect(greetingFor({ name: '  ', daypart: 'morning', streak: 0, daysAway: null, seed: 3 }).headline).not.toContain('{name}');
  });
});
