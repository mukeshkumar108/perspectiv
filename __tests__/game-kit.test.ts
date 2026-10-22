jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(), impactAsync: jest.fn(), notificationAsync: jest.fn(), ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }));

import { formatClock, median, percent } from '../src/games/kit/useGameRun';

describe('game kit maths', () => {
  it('takes the median of odd and even samples and of none', () => {
    expect(median([300, 100, 200])).toBe(200);
    expect(median([100, 200, 300, 400])).toBe(250);
    expect(median([])).toBe(0);
  });

  it('gives a whole percentage and never divides by zero', () => {
    expect(percent(3, 4)).toBe(75);
    expect(percent(0, 0)).toBe(0);
  });

  it('formats the clock as minutes and seconds, rounding up so it never shows 0:00 while time remains', () => {
    expect(formatClock(30_000)).toBe('0:30');
    expect(formatClock(59_001)).toBe('1:00');
    expect(formatClock(1)).toBe('0:01');
    expect(formatClock(-5)).toBe('0:00');
  });
});
