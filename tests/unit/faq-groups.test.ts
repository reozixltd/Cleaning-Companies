import { describe, expect, it } from 'vitest';
import { groupFaqs } from '@/features/faq/groups';

const faq = (id: string, ...tags: string[]) => ({ id, q: `${id}?`, a: id, tags });
type Item = ReturnType<typeof faq>;
const shape = (groups: { tag: string; items: Item[] }[]) => groups.map((g) => [g.tag, g.items.map((i) => i.id)]);

describe('groupFaqs', () => {
  it('puts each question once, under its first (main) tag, with groups in page order', () => {
    const items = [faq('a', 'home', 'keys'), faq('b', 'booking', 'home'), faq('c', 'keys'), faq('d', 'payment', 'booking')];
    expect(shape(groupFaqs(items, ['home', 'keys', 'booking', 'payment']))).toEqual([
      ['home', ['a']],
      ['keys', ['c']],
      ['booking', ['b']],
      ['payment', ['d']],
    ]);
  });

  it('never drops a question whose main tag is not in the order; it goes last', () => {
    expect(shape(groupFaqs([faq('b', 'pets'), faq('a', 'keys')], ['keys']))).toEqual([
      ['keys', ['a']],
      ['pets', ['b']],
    ]);
  });

  it('keeps the content order inside a group', () => {
    expect(shape(groupFaqs([faq('z', 'home'), faq('a', 'home')], ['home']))).toEqual([['home', ['z', 'a']]]);
  });
});
