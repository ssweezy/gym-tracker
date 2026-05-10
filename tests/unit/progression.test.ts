import { describe, it, expect } from 'vitest';
import { suggestNext, validateFollowupSet, REP_RANGES } from '@/lib/progression';

const today = new Date('2026-05-06T10:00:00Z');
const daysAgo = (n: number) => new Date(today.getTime() - n * 24 * 60 * 60 * 1000);

describe('suggestNext', () => {
  it('first time → returns low end of range, weight 0', () => {
    const r = suggestNext([], 'beginner', 2.5);
    expect(r.weight_kg).toBe(0);
    expect(r.target_reps).toBe(12);
    expect(r.min_reps_followups).toBe(9);
    expect(r.reasoning).toBe('first_time');
  });

  it('first time strength → low = 5', () => {
    expect(suggestNext([], 'strength', 2.5).target_reps).toBe(5);
  });

  it('first time classic → low = 8', () => {
    expect(suggestNext([], 'classic', 2.5).target_reps).toBe(8);
  });

  it('hit target inside range → +1 rep', () => {
    const r = suggestNext(
      [{ weight_kg: 50, reps: 12, target_reps: 12, reached_failure: true, completed_at: daysAgo(3) }],
      'beginner',
      2.5,
      today,
    );
    expect(r.weight_kg).toBe(50);
    expect(r.target_reps).toBe(13);
    expect(r.reasoning).toBe('reps_up');
  });

  it('hit upper bound (15 for beginner) → +weight, target back to low', () => {
    const r = suggestNext(
      [{ weight_kg: 50, reps: 15, target_reps: 15, reached_failure: true, completed_at: daysAgo(3) }],
      'beginner',
      2.5,
      today,
    );
    expect(r.weight_kg).toBe(52.5);
    expect(r.target_reps).toBe(12);
    expect(r.reasoning).toBe('weight_up');
  });

  it('did not hit target → hold', () => {
    const r = suggestNext(
      [{ weight_kg: 50, reps: 11, target_reps: 12, reached_failure: false, completed_at: daysAgo(3) }],
      'beginner',
      2.5,
      today,
    );
    expect(r.weight_kg).toBe(50);
    expect(r.target_reps).toBe(12);
    expect(r.reasoning).toBe('hold');
  });

  it('break > 14 days → deload (-10%, low end)', () => {
    const r = suggestNext(
      [{ weight_kg: 50, reps: 13, target_reps: 13, reached_failure: true, completed_at: daysAgo(20) }],
      'beginner',
      2.5,
      today,
    );
    expect(r.weight_kg).toBe(45);   // 50 * 0.9 = 45
    expect(r.target_reps).toBe(12);
    expect(r.reasoning).toBe('deload');
  });

  it('respects custom increment for dumbbells', () => {
    const r = suggestNext(
      [{ weight_kg: 10, reps: 12, target_reps: 12, reached_failure: true, completed_at: daysAgo(3) }],
      'beginner',
      1.0,        // dumbbell increment
      today,
    );
    expect(r.weight_kg).toBe(10);    // reps_up — вес не меняется
    expect(r.target_reps).toBe(13);
  });

  it('weight_up uses custom increment', () => {
    // classic high = 12, target_reps=12 reps=12 → weight_up by custom increment (1.0)
    const r = suggestNext(
      [{ weight_kg: 10, reps: 12, target_reps: 12, reached_failure: true, completed_at: daysAgo(3) }],
      'classic',
      1.0,
      today,
    );
    expect(r.weight_kg).toBe(11);    // 10 + 1.0
    expect(r.target_reps).toBe(8);   // back to classic low
    expect(r.reasoning).toBe('weight_up');
  });

  it.todo('FIXME: классика на 8 повторениях — это low, должен быть reps_up до 9, а не weight_up');
});

describe('validateFollowupSet', () => {
  it('reps within 3 of first → ok, no warning', () => {
    expect(validateFollowupSet(12, 9)).toEqual({ ok: true });
    expect(validateFollowupSet(12, 12)).toEqual({ ok: true });
    expect(validateFollowupSet(12, 15)).toEqual({ ok: true });
  });

  it('reps drop > 3 → warning, but still ok', () => {
    const r = validateFollowupSet(12, 8);
    expect(r.ok).toBe(true);
    expect(r.warning).toMatch(/более чем на 3/);
  });

  it('boundary: drop exactly 3 is ok', () => {
    expect(validateFollowupSet(12, 9)).toEqual({ ok: true });
  });

  it('boundary: drop of 4 triggers warning', () => {
    expect(validateFollowupSet(12, 8).warning).toBeDefined();
  });
});

describe('REP_RANGES', () => {
  it('exposes correct ranges', () => {
    expect(REP_RANGES.strength).toEqual({ low: 5, high: 8 });
    expect(REP_RANGES.classic).toEqual({ low: 8, high: 12 });
    expect(REP_RANGES.beginner).toEqual({ low: 12, high: 15 });
  });
});
