import { describe, expect, it } from 'vitest';
import { resolveSiteUrl } from '../../tools/site-url.mjs';

const FALLBACK = 'https://cleaning.reozix.com';

describe('resolveSiteUrl', () => {
  it('uses the fallback outside Vercel, e.g. a local build', () => {
    expect(resolveSiteUrl({}, FALLBACK)).toBe(FALLBACK);
  });

  it("uses Vercel's production address, so the *.vercel.app link works before a domain is assigned", () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'clearday-cleaning.vercel.app' }, FALLBACK)).toBe('https://clearday-cleaning.vercel.app');
  });

  it('follows a custom domain once Vercel reports it as the production address', () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'www.clearday.com.au' }, FALLBACK)).toBe('https://www.clearday.com.au');
  });

  it('lets SITE_URL override everything, with or without the protocol and trailing slash', () => {
    const vercel = { VERCEL_PROJECT_PRODUCTION_URL: 'clearday-cleaning.vercel.app' };
    expect(resolveSiteUrl({ ...vercel, SITE_URL: 'https://demo.example.com/' }, FALLBACK)).toBe('https://demo.example.com');
    expect(resolveSiteUrl({ ...vercel, SITE_URL: 'demo.example.com' }, FALLBACK)).toBe('https://demo.example.com');
  });

  it('ignores blank values', () => {
    expect(resolveSiteUrl({ SITE_URL: ' ', VERCEL_PROJECT_PRODUCTION_URL: '' }, FALLBACK)).toBe(FALLBACK);
  });
});
