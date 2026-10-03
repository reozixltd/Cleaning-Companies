// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { resolveSiteUrl } from './tools/site-url.mjs';

export default defineConfig({
  // The public address: SITE_URL if set, else Vercel's production address (the
  // *.vercel.app link until a domain is assigned), else this fallback for local builds.
  site: resolveSiteUrl(process.env, 'https://cleaning.reozix.com'),
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !page.includes('/console/') && !page.includes('/dev/') })],
});
