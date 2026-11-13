export const languages = ['zh', 'en'] as const;
export type Language = (typeof languages)[number];

export interface DocumentData {
  title: string;
  description: string;
  tags: string[];
  published?: string;
}

export interface SourceDocument {
  id: string;
  filePath: string;
  data: DocumentData;
}

export interface DocumentNode {
  key: string;
  folder: boolean;
  order?: string;
  translations: Partial<Record<Language, SourceDocument>>;
  children: DocumentNode[];
}

export function isCalendarDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value;
}

function numberedName(value: string) {
  const match = /^(?:(\d+)-)?([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(value);
  if (!match) throw new Error(`Use lowercase kebab-case names with an optional numeric prefix: ${value}`);
  return { name: match[2], order: match[1]?.replace(/^0+(?=\d)/, '') };
}

export function documentIdentity(id: string) {
  const match = /^(?:(.*)\/)?([^/]+)\.(zh|en)\.md$/.exec(id);
  if (!match) throw new Error(`Invalid document filename: ${id}`);
  const directories = match[1] ? match[1].split('/').map(numberedName) : [];
  const filename = numberedName(match[2]);
  const folder = filename.name === 'index';
  const segments = directories.map((directory) => directory.name);
  const key = [...segments, ...(folder ? [] : [filename.name])].join('/');
  const order = folder ? directories.at(-1)?.order : filename.order;
  if (['notes', 'tags', 'search'].includes(key.split('/')[0])) {
    throw new Error(`Reserved document route: ${id}`);
  }
  return { key, folder, language: match[3] as Language, order };
}

export function buildDocumentTree(sources: SourceDocument[]): DocumentNode {
  const nodes = new Map<string, DocumentNode>();
  for (const source of sources) {
    const { key, folder, language, order } = documentIdentity(source.id);
    let node = nodes.get(key);
    if (!node) {
      node = { key, folder, order, translations: {}, children: [] };
      nodes.set(key, node);
    }
    if (node.folder !== folder || node.translations[language]) {
      throw new Error(`Duplicate document route: ${source.id}`);
    }
    if (node.order !== order) {
      throw new Error(`Translations must use the same numeric prefix (or both omit it): ${key}`);
    }
    node.translations[language] = source;
  }
  const root = nodes.get('');
  if (!root?.folder) throw new Error('The content root needs an index such as 00-index.zh.md or 00-index.en.md');
  for (const node of nodes.values()) {
    if (!node.key) continue;
    const parentKey = node.key.includes('/') ? node.key.slice(0, node.key.lastIndexOf('/')) : '';
    const parent = nodes.get(parentKey);
    if (!parent?.folder) throw new Error(`Missing parent directory index for: ${node.key}`);
    parent.children.push(node);
  }
  for (const node of nodes.values()) {
    node.children.sort((a, b) => {
      if (a.order !== b.order) {
        if (a.order === undefined) return 1;
        if (b.order === undefined) return -1;
        return a.order.length - b.order.length || (a.order < b.order ? -1 : 1);
      }
      return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    });
  }
  return root;
}

export function flattenTree(root: DocumentNode): DocumentNode[] {
  return [root, ...root.children.flatMap(flattenTree)];
}

export function navigationFor(root: DocumentNode, activeKey?: string) {
  const domains = root.children.filter((node) => node.folder);
  const domain = domains.find((node) => activeKey === node.key || activeKey?.startsWith(`${node.key}/`));
  const topics = domain?.children.filter((node) => node.folder) ?? [];
  const topic = topics.find((node) => activeKey === node.key || activeKey?.startsWith(`${node.key}/`));
  return {
    domains,
    domain,
    topic,
    sidebarRoot: topic ?? domain ?? root,
    home: activeKey === root.key || Boolean(domain && activeKey === domain.key),
  };
}

export function sourceFor(node: DocumentNode, language: Language): SourceDocument {
  const source = node.translations[language] ?? node.translations.zh ?? node.translations.en;
  if (!source) throw new Error(`Document has no source: ${node.key}`);
  return source;
}

export function documentUrl(language: Language, key = ''): string {
  return `/${language}/${key ? `${key}/` : ''}`;
}

export function tagUrl(language: Language, tag: string): string {
  return `/${language}/notes/?tag=${encodeURIComponent(tag)}`;
}
