import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** The blog collection — local posts imported from Substack via
 *  scripts/fetch-substack.mjs plus natively-authored posts. Each imported
 *  post carries its source URL + guid so the bridge is idempotent (it rewrites
 *  only changed slugs). `canonical` points at the LOCAL copy — the archive is
 *  self-hosted; Substack stays as the distribution channel.
 *
 *  Astro v6 migration: legacy `type: 'content'` collections were removed —
 *  this is now the Content Layer API with the built-in glob loader. Entry ids
 *  remain the filename stems (no extension), so `/blog/${post.id}` routes are
 *  unchanged. */
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    // No `slug` field: Astro's glob loader derives the slug from the filename
    // and reserves the name. The route uses `post.id` (the filename stem).
    date: z
      .union([z.string(), z.date()])
      .transform((d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d)),
    author: z.string().default('P31 Labs'),
    excerpt: z.string().default(''),
    source: z.enum(['local', 'substack']).default('local'),
    // Zod 4 (Astro v6): the string-method validators moved to top level —
    // `z.string().url()` is gone, `z.url()` is the replacement.
    sourceUrl: z.url().optional(),
    canonical: z.string().optional(),
    guid: z.string().optional(),
  }),
});

/** Legacy FAQ entries — declared so the whole src/content/ dir is managed.
 *  Kept loose: the q/a/category fields are the historical shape. */
const faq = defineCollection({
  loader: glob({ base: './src/content/faq', pattern: '**/*.md' }),
  schema: z.object({
    q: z.string(),
    a: z.string(),
    category: z.string().optional(),
  }),
});

/** Legacy team/board entries — declared for the same reason. */
const team = defineCollection({
  loader: glob({ base: './src/content/team', pattern: '**/*.md' }),
  schema: z.object({
    name: z.string(),
    role: z.string().optional(),
    type: z.string().optional(),
  }),
});

export const collections = { blog, faq, team };