/** schema.org JSON-LD builders. Callers pass plain facts; nothing here reads config. */

export interface BusinessFacts {
  name: string;
  legalName: string;
  /** schema.org LocalBusiness subtype, e.g. "HouseCleaning". */
  type: string;
  url: string;
  phone: string;
  email: string;
  abn: string;
  areas: string[];
  hours: { days: string[]; opens: string; closes: string }[];
  /** Only pass a rating that is real (never in demo mode). */
  rating?: { value: number; count: number };
}

const places = (areas: string[]) => areas.map((name) => ({ '@type': 'Place', name }));

export function localBusinessSchema(b: BusinessFacts): object {
  return {
    '@context': 'https://schema.org',
    '@type': b.type,
    name: b.name,
    legalName: b.legalName,
    url: b.url,
    telephone: b.phone,
    email: b.email,
    taxID: `ABN ${b.abn}`,
    areaServed: places(b.areas),
    openingHoursSpecification: b.hours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    })),
    ...(b.rating && {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: b.rating.value, reviewCount: b.rating.count },
    }),
  };
}

export function serviceSchema(s: { name: string; description: string; provider: string; areas: string[]; priceFrom: number }): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: s.name,
    description: s.description,
    provider: { '@type': 'LocalBusiness', name: s.provider },
    areaServed: places(s.areas),
    offers: { '@type': 'Offer', priceCurrency: 'AUD', price: s.priceFrom },
  };
}

/** `<`, `>`, `&` and the two JavaScript line terminators JSON allows inside strings. */
const UNSAFE_IN_SCRIPT = /[<>&\u{2028}\u{2029}]/gu;

/**
 * JSON for an inline `<script type="application/ld+json">`. Client text such as an FAQ answer
 * containing `</script>` or `<!--` would otherwise end the block early, so those characters are
 * written as `\uXXXX` escapes. The result is still valid JSON and parses back to the same value.
 */
export function serialiseJsonLd(value: object): string {
  return JSON.stringify(value).replace(UNSAFE_IN_SCRIPT, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

export function faqSchema(items: { q: string; a: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
  };
}
