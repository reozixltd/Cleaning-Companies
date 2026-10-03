import { describe, expect, it } from 'vitest';
import { faqSchema, localBusinessSchema, serialiseJsonLd, serviceSchema, type BusinessFacts } from '@/core/schema';

const facts: BusinessFacts = {
  name: 'Clearday Home Cleaning',
  legalName: 'Clearday Cleaning Services Pty Ltd',
  type: 'HouseCleaning',
  url: 'https://cleaning.reozix.com',
  phone: '07 5550 1234',
  email: 'hello@clearday.example',
  abn: '00 000 000 000',
  areas: ['Chermside', 'Aspley'],
  hours: [{ days: ['Mo', 'Tu'], opens: '07:00', closes: '17:00' }],
};

describe('localBusinessSchema', () => {
  it('omits rating when not given', () => {
    const s = localBusinessSchema(facts) as Record<string, unknown>;
    expect(s['@type']).toBe('HouseCleaning');
    expect(s.areaServed).toEqual([
      { '@type': 'Place', name: 'Chermside' },
      { '@type': 'Place', name: 'Aspley' },
    ]);
    expect(s).not.toHaveProperty('aggregateRating');
  });

  it('includes aggregateRating when given', () => {
    const s = localBusinessSchema({ ...facts, rating: { value: 4.9, count: 212 } }) as Record<string, any>;
    expect(s.aggregateRating).toMatchObject({ ratingValue: 4.9, reviewCount: 212 });
  });
});

describe('serviceSchema', () => {
  it('prices in AUD', () => {
    const s = serviceSchema({ name: 'Regular clean', description: 'd', provider: 'Clearday', areas: ['Aspley'], priceFrom: 110 }) as Record<string, any>;
    expect(s['@type']).toBe('Service');
    expect(s.offers).toMatchObject({ priceCurrency: 'AUD', price: 110 });
  });
});

describe('faqSchema', () => {
  it('maps q and a', () => {
    const s = faqSchema([{ q: 'Do I need to be home?', a: 'No.' }]) as Record<string, any>;
    expect(s['@type']).toBe('FAQPage');
    expect(s.mainEntity[0].name).toBe('Do I need to be home?');
    expect(s.mainEntity[0].acceptedAnswer.text).toBe('No.');
  });
});

describe('serialiseJsonLd', () => {
  // Built from char codes so the source file itself holds no raw line or paragraph separators.
  const LS = String.fromCharCode(0x2028);
  const PS = String.fromCharCode(0x2029);
  const hostile = faqSchema([
    { q: 'Can I write </script> here?', a: `</SCRIPT><script>alert(1)</script> <!-- & --> a${LS}b${PS}c` },
  ]);

  it('cannot end the script block or open an HTML comment', () => {
    const out = serialiseJsonLd(hostile);
    expect(out).not.toMatch(/<\/script/i);
    expect(out).not.toContain('<!--');
    for (const c of ['<', '>', '&', LS, PS]) expect(out).not.toContain(c);
  });

  it('writes each unsafe character as a JSON unicode escape', () => {
    const slash = '\\';
    expect(serialiseJsonLd({ a: `</x>&${LS}${PS}` })).toBe(
      `{"a":"${slash}u003c/x${slash}u003e${slash}u0026${slash}u2028${slash}u2029"}`,
    );
  });

  it('still parses back to the same value', () => {
    expect(JSON.parse(serialiseJsonLd(hostile))).toEqual(hostile);
    expect(JSON.parse(serialiseJsonLd([hostile, { n: 1 }]))).toEqual([hostile, { n: 1 }]);
  });

  it('leaves plain text as JSON.stringify writes it', () => {
    const plain = faqSchema([{ q: 'Do I need to be home?', a: "No, we'll use your key." }]);
    expect(serialiseJsonLd(plain)).toBe(JSON.stringify(plain));
  });
});
