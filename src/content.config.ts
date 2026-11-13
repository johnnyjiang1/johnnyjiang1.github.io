import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { isCalendarDate } from './lib/model.ts';

const docs = defineCollection({
  loader: glob({
    base: './src/content/docs',
    pattern: '**/*.md',
    generateId: ({ entry }) => entry.replaceAll('\\', '/'),
  }),
  schema: z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    order: z.never({ error: 'Use a numeric file or directory name prefix instead of frontmatter order.' }).optional(),
    tags: z.array(z.string().trim().min(1)).default([]),
    published: z.string().refine(isCalendarDate, 'Use a real date in YYYY-MM-DD format').optional(),
  }),
});

export const collections = { docs };
