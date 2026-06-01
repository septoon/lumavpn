import { addDays } from '../src/subscriptions/time';

describe('addDays', () => {
  it('adds UTC days without mutating source date', () => {
    const source = new Date('2026-01-01T00:00:00.000Z');
    const result = addDays(source, 30);
    expect(result.toISOString()).toBe('2026-01-31T00:00:00.000Z');
    expect(source.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});
