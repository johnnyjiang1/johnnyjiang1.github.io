import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { remarkDocumentLinks } from './src/lib/markdown-links.ts';

export default defineConfig({
  site: 'https://johnnyjiang1.github.io',
  output: 'static',
  trailingSlash: 'always',
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath, remarkDocumentLinks],
      rehypePlugins: [[rehypeKatex, { strict: 'error', throwOnError: true }]],
    }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
