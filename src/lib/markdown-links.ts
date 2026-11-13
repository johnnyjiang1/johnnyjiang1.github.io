import { readdirSync } from 'node:fs';
import path from 'node:path';
import { documentIdentity, documentUrl } from './model.ts';

interface MarkdownNode {
  type: string;
  url?: string;
  children?: MarkdownNode[];
}

export function remarkDocumentLinks() {
  return (tree: MarkdownNode, file: { path?: string; history?: string[] }) => {
    const filename = file.path ?? file.history?.[0];
    if (!filename) throw new Error('Markdown source path is required for document links');
    const base = path.resolve('src', 'content', 'docs');
    let availableDocuments: Set<string> | undefined;
    const walk = (node: MarkdownNode) => {
      if ((node.type === 'link' || node.type === 'definition') && node.url
        && !/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(node.url)) {
        const suffixIndex = node.url.search(/[?#]/);
        const target = suffixIndex < 0 ? node.url : node.url.slice(0, suffixIndex);
        const suffix = suffixIndex < 0 ? '' : node.url.slice(suffixIndex);
        if (target.endsWith('.md')) {
          const absolute = path.resolve(path.dirname(filename), decodeURIComponent(target));
          const relative = path.relative(base, absolute).replaceAll('\\', '/');
          const identity = documentIdentity(relative);
          availableDocuments ??= new Set(readdirSync(base, { recursive: true, encoding: 'utf8' })
            .filter((entry) => entry.endsWith('.md'))
            .map((entry) => documentIdentity(entry.replaceAll('\\', '/')).key));
          if (relative.startsWith('../') || !availableDocuments.has(identity.key)) {
            throw new Error(`Broken Markdown link in ${filename}: ${node.url}`);
          }
          node.url = documentUrl(identity.language, identity.key) + suffix;
        }
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}
