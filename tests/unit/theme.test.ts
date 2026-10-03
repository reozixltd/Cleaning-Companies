import { describe, expect, it } from 'vitest';
import { resolveTheme } from '@/core/theme';

const base = { stored: null, configured: 'floorplan', allowed: ['floorplan', 'eucalyptus'], demoMode: true };

describe('resolveTheme', () => {
  it('uses the URL param in demo mode', () => {
    expect(resolveTheme({ ...base, param: 'eucalyptus' })).toBe('eucalyptus');
  });
  it('ignores the param outside demo mode', () => {
    expect(resolveTheme({ ...base, param: 'eucalyptus', demoMode: false })).toBe('floorplan');
  });
  it('falls back to the stored theme, then the configured one', () => {
    expect(resolveTheme({ ...base, param: 'neon', stored: 'eucalyptus' })).toBe('eucalyptus');
    expect(resolveTheme({ ...base, param: 'neon', stored: 'neon' })).toBe('floorplan');
    expect(resolveTheme({ ...base, param: null })).toBe('floorplan');
  });
});
