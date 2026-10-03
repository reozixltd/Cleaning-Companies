/**
 * Groups questions for the questions page. Each question appears once, under
 * its first tag (its main topic in faqs.json); groups follow the page's order,
 * and a tag the page doesn't list still gets a group at the end.
 */
export interface TaggedFaq {
  q: string;
  a: string;
  tags: string[];
}

export function groupFaqs<T extends TaggedFaq>(items: T[], order: string[]): { tag: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const tag = item.tags[0];
    groups.set(tag, [...(groups.get(tag) ?? []), item]);
  }
  const rank = (tag: string) => (order.includes(tag) ? order.indexOf(tag) : order.length);
  return [...groups.entries()].sort(([a], [b]) => rank(a) - rank(b)).map(([tag, list]) => ({ tag, items: list }));
}
