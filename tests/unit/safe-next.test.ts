import { describe, it, expect } from 'vitest';
import { safeNextPath } from '@/lib/auth/safe-next';

describe('safeNextPath', () => {
  it('keeps same-origin paths', () => {
    expect(safeNextPath('/account/recover')).toBe('/account/recover');
    expect(safeNextPath('/plan?x=1')).toBe('/plan?x=1');
  });

  it('falls back to / for missing or foreign targets', () => {
    expect(safeNextPath(null)).toBe('/');
    expect(safeNextPath('')).toBe('/');
    expect(safeNextPath('https://evil.com')).toBe('/');
    expect(safeNextPath('//evil.com')).toBe('/');
    expect(safeNextPath('/\\evil.com')).toBe('/');
    expect(safeNextPath('@evil.com')).toBe('/');
  });
});
