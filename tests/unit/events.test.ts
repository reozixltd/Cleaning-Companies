import { describe, expect, it } from 'vitest';
import { emitSelection, onSelection } from '@/domain/events';
import { DEFAULT_SELECTION, type Selection } from '@/domain/selection';

describe('selection events', () => {
  it('onSelection receives emitted selections and unsubscribes', () => {
    const target = new EventTarget();
    const seen: Selection[] = [];
    const off = onSelection((s) => seen.push(s), target);
    emitSelection(DEFAULT_SELECTION, target);
    off();
    emitSelection({ ...DEFAULT_SELECTION, bedrooms: 4 }, target);
    expect(seen).toEqual([DEFAULT_SELECTION]);
  });

  it('defaults to document', () => {
    let got: Selection | null = null;
    const off = onSelection((s) => (got = s));
    emitSelection(DEFAULT_SELECTION);
    off();
    expect(got).toEqual(DEFAULT_SELECTION);
  });
});
