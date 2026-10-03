/**
 * Content collections. Schemas make the build fail on missing or malformed
 * content, so mistakes never reach the live site.
 */
import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';

const faq = z.object({ q: z.string(), a: z.string() });

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    service: z.enum(['regular', 'deep', 'end-of-lease', 'move-in']),
    summary: z.string().max(200),
    suits: z.string(),
    duration: z.string(),
    faqs: z.array(faq).length(3),
    /** An eco claim must name what backs it (ACCC guidance). */
    ecoClaim: z.object({ text: z.string(), basis: z.string().min(10) }).optional(),
    seoTitle: z.string(),
    seoDescription: z.string().max(160),
  }),
});

const areas = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/areas' }),
  schema: z.object({
    suburb: z.string(),
    postcode: z.string().regex(/^\d{4}$/),
    nearby: z.array(z.string()).min(2),
    intro: z.string(),
    seoDescription: z.string().max(160),
  }),
});

const policies = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/policies' }),
  schema: z.object({ title: z.string(), description: z.string().max(160), updated: z.coerce.date() }),
});

const reviews = defineCollection({
  loader: file('src/content/reviews.json'),
  schema: z.object({
    name: z.string(),
    suburb: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    rating: z.number().int().min(1).max(5),
    service: z.enum(['regular', 'deep', 'end-of-lease', 'move-in', 'offices']),
    text: z.string().max(400),
  }),
});

const faqs = defineCollection({
  loader: file('src/content/faqs.json'),
  schema: faq.extend({ tags: z.array(z.enum(['home', 'booking', 'offices', 'keys', 'payment'])).min(1) }),
});

const team = defineCollection({
  loader: file('src/content/team.json'),
  schema: z.object({ name: z.string(), role: z.string(), since: z.number().int(), note: z.string() }),
});

export const collections = { services, areas, policies, reviews, faqs, team };
