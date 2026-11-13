import { getCollection } from 'astro:content';
import { buildDocumentTree, flattenTree, navigationFor, sourceFor, type Language } from './model.ts';
import { pageHistory } from './git.ts';

export async function getKnowledgeBase() {
  const entries = await getCollection('docs');
  const root = buildDocumentTree(entries.map((entry) => {
    if (!entry.filePath) throw new Error(`Missing source path: ${entry.id}`);
    return { id: entry.id, filePath: entry.filePath, data: entry.data };
  }));
  return { root, nodes: flattenTree(root), entries };
}

export async function getNotes(language: Language) {
  const { root, nodes } = await getKnowledgeBase();
  return nodes.filter((node) => !node.folder && node.translations[language]).map((node) => {
    const source = node.translations[language]!;
    const history = pageHistory(source.filePath);
    const { domain, topic } = navigationFor(root, node.key);
    const category = topic ?? domain;
    const categoryLabel = category ? [
      ...(domain && topic ? [sourceFor(domain, language).data.title] : []),
      sourceFor(category, language).data.title,
    ].join(' / ') : undefined;
    return {
      node, source, history,
      published: source.data.published ?? history.firstPublished,
      domain,
      category,
      categoryLabel,
    };
  }).sort((a, b) => (b.published ?? '').localeCompare(a.published ?? '') || a.node.key.localeCompare(b.node.key));
}
