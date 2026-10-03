import { describe, expect, it } from 'vitest';
import { findArea, normaliseQuery, projectPoints, type AreaEntry } from '@/core/geo';

const areas: AreaEntry[] = [
  { suburb: 'Chermside', postcode: '4032', page: 'chermside' },
  { suburb: 'Aspley', postcode: '4034' },
  { suburb: 'Geebung', postcode: '4034' },
  { suburb: 'Mount Gravatt', postcode: '4122' },
];

describe('findArea', () => {
  it('handles real-world input', () => {
    const named = findArea(' chermside qld 4032 ', areas);
    expect(named.status).toBe('in');
    expect(named.matches[0].suburb).toBe('Chermside');
    expect(findArea('4034', areas)).toMatchObject({ status: 'in', query: '4034' });
    expect(findArea('4034', areas).matches).toHaveLength(2);
    expect(findArea('Mt Gravatt', areas).status).toBe('in');
    expect(findArea('Kedron', areas)).toEqual({ status: 'out', query: 'Kedron', matches: [] });
    expect(findArea('', areas).status).toBe('invalid');
    expect(findArea('x', areas).status).toBe('invalid');
  });

  it('a typed name wins over a postcode', () => {
    expect(findArea('Kedron 4032', areas)).toMatchObject({ status: 'out', query: 'Kedron' });
  });

  it('title-cases multi-word queries', () => {
    expect(findArea('albany creek', areas).query).toBe('Albany Creek');
  });

  it('an unknown postcode is out, a number that is not a postcode is invalid', () => {
    expect(findArea('4000', areas)).toMatchObject({ status: 'out', query: '4000' });
    expect(findArea('40', areas).status).toBe('invalid');
  });
});

describe('normaliseQuery', () => {
  it('drops state, postcode and punctuation, expands Mt', () => {
    expect(normaliseQuery('  Mt. Gravatt, QLD 4122 ')).toBe('mount gravatt');
  });
});

describe('projectPoints', () => {
  it('keeps relative positions and pads the box', () => {
    const out = projectPoints(
      [
        { id: 'a', lat: -27.3, lng: 153.0 },
        { id: 'b', lat: -27.4, lng: 153.1 },
        { id: 'c' },
      ],
      { width: 400, padding: 20 },
    );
    expect(out.points).toHaveLength(2);
    const [a, b] = out.points;
    expect(a.x).toBeCloseTo(20);
    expect(a.y).toBeCloseTo(20);
    expect(b.x).toBeCloseTo(380);
    expect(b.y).toBeGreaterThan(a.y);
  });
});
