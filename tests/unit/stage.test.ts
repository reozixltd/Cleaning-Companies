import { describe, expect, it } from 'vitest';
import { passingProgress, pinnedProgress, stageState } from '@/features/stage/stage';

describe('stageState', () => {
  it('goes before, action, sweep, after at 0.3, 0.6 and 0.9', () => {
    expect(stageState(0).phase).toBe('before');
    expect(stageState(0.29).phase).toBe('before');
    expect(stageState(0.3).phase).toBe('action');
    expect(stageState(0.59).phase).toBe('action');
    expect(stageState(0.6).phase).toBe('sweep');
    expect(stageState(0.89).phase).toBe('sweep');
    expect(stageState(0.9).phase).toBe('after');
    expect(stageState(1).phase).toBe('after');
  });

  it('uncovers "after" only during the sweep', () => {
    expect(stageState(0).sweep).toBe(0);
    expect(stageState(0.6).sweep).toBe(0);
    expect(stageState(0.75).sweep).toBeCloseTo(0.5);
    expect(stageState(0.9).sweep).toBe(1);
    expect(stageState(1).sweep).toBe(1);
  });

  it('treats progress outside 0 to 1 as its nearest end', () => {
    expect(stageState(-1)).toEqual({ phase: 'before', sweep: 0 });
    expect(stageState(2)).toEqual({ phase: 'after', sweep: 1 });
  });
});

describe('pinnedProgress', () => {
  it('is 0 until the block sticks, 1 once it has travelled the whole way', () => {
    expect(pinnedProgress(400, 88, 960)).toBe(0);
    expect(pinnedProgress(88, 88, 960)).toBe(0);
    expect(pinnedProgress(88 - 480, 88, 960)).toBeCloseTo(0.5);
    expect(pinnedProgress(88 - 960, 88, 960)).toBe(1);
    expect(pinnedProgress(-5000, 88, 960)).toBe(1);
  });

  it('is complete when there is nowhere to travel', () => {
    expect(pinnedProgress(88, 88, 0)).toBe(1);
  });
});

describe('passingProgress', () => {
  it('runs from the stage centre 85% down the screen to 30% down', () => {
    expect(passingProgress(900, 200, 800)).toBe(0);
    expect(passingProgress(580, 200, 800)).toBe(0); // centre at 680 = 85%
    expect(passingProgress(360, 200, 800)).toBeCloseTo(0.5); // centre at 460
    expect(passingProgress(140, 200, 800)).toBe(1); // centre at 240 = 30%
    expect(passingProgress(-400, 200, 800)).toBe(1);
  });
});
