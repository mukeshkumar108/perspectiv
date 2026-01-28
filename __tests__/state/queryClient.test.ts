import { shouldRetryQuery } from '../../src/state/queryClient';

describe('query retry logic', () => {
  it('should not retry on 401', () => {
    expect(shouldRetryQuery(0, { status: 401 })).toBe(false);
    expect(shouldRetryQuery(1, { status: 401 })).toBe(false);
  });

  it('should retry up to 2 times for non-401', () => {
    expect(shouldRetryQuery(0, { status: 500 })).toBe(true);
    expect(shouldRetryQuery(1, { status: 500 })).toBe(true);
    expect(shouldRetryQuery(2, { status: 500 })).toBe(false);
  });
});
