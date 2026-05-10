import { describe, it, expect } from 'vitest';
import { computeWeeklyVolume, statusFor, type MuscleGroup } from '@/lib/volume';

const ex = (groups: MuscleGroup[], sets: number) => ({
  exercise: { muscle_groups: groups },
  target_sets: sets,
});

describe('computeWeeklyVolume', () => {
  it('empty plan returns empty totals', () => {
    expect(computeWeeklyVolume([])).toEqual({});
  });

  it('single isolated exercise counts toward one group', () => {
    const r = computeWeeklyVolume([{ exercises: [ex(['biceps'], 3)] }]);
    expect(r).toEqual({ biceps: 3 });
  });

  it('compound exercise counts toward all listed groups', () => {
    const r = computeWeeklyVolume([{ exercises: [ex(['chest', 'triceps', 'shoulders'], 4)] }]);
    expect(r).toEqual({ chest: 4, triceps: 4, shoulders: 4 });
  });

  it('multiple days accumulate', () => {
    const r = computeWeeklyVolume([
      { exercises: [ex(['chest'], 3), ex(['chest', 'triceps'], 2)] },
      { exercises: [ex(['biceps'], 4)] },
    ]);
    expect(r).toEqual({ chest: 5, triceps: 2, biceps: 4 });
  });
});

describe('statusFor', () => {
  it('< 4 sets = under', () => {
    expect(statusFor('chest', 3)).toBe('under');
  });
  it('4-10 sets = optimal', () => {
    expect(statusFor('chest', 4)).toBe('optimal');
    expect(statusFor('chest', 7)).toBe('optimal');
    expect(statusFor('chest', 10)).toBe('optimal');
  });
  it('> 10 sets = over', () => {
    expect(statusFor('chest', 11)).toBe('over');
  });
  it('cardio is always optimal (no volume tracking)', () => {
    expect(statusFor('cardio', 0)).toBe('optimal');
    expect(statusFor('cardio', 100)).toBe('optimal');
  });
});
