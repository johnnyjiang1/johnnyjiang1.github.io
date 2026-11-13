import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDocumentTree, documentIdentity, documentUrl, flattenTree, isCalendarDate, navigationFor, sourceFor, tagUrl, type SourceDocument } from '../src/lib/model.ts';

function source(id: string): SourceDocument {
  return { id, filePath: `src/content/docs/${id}`, data: { title: id, description: id, tags: [] } };
}

test('builds arbitrary nesting, empty directories, and leaf documents in stable shared order', () => {
  const tree = buildDocumentTree([
    source('00-index.zh.md'), source('b/index.en.md'), source('01-a/00-index.zh.md'),
    source('01-a/02-z.en.md'), source('01-a/01-a.zh.md'), source('01-a/03-deep/00-index.zh.md'),
    source('01-a/03-deep/leaf.zh.md'), source('01-a/03-deep/leaf.en.md'),
  ]);
  assert.deepEqual(flattenTree(tree).map((node) => node.key), ['', 'a', 'a/a', 'a/z', 'a/deep', 'a/deep/leaf', 'b']);
  const leaf = flattenTree(tree).find((node) => node.key === 'a/a')!;
  assert.equal(leaf.translations.en, undefined);
  assert.equal(sourceFor(leaf, 'en').id, '01-a/01-a.zh.md');
  assert.equal(tree.children[1].children.length, 0);
});

test('supports an English-only root and equal numeric prefixes with different padding', () => {
  const tree = buildDocumentTree([source('index.en.md'), source('05-one.en.md'), source('0005-one.zh.md')]);
  assert.equal(tree.children[0].order, '5');
  assert.equal(sourceFor(tree, 'zh').id, 'index.en.md');
});

test('rejects missing root, missing ancestor index, and a leaf used as a parent', () => {
  assert.throws(() => buildDocumentTree([source('a.zh.md')]), /root needs/);
  assert.throws(() => buildDocumentTree([source('index.zh.md'), source('a/b.zh.md')]), /Missing parent/);
  assert.throws(() => buildDocumentTree([source('index.zh.md'), source('a.zh.md'), source('a/b.zh.md')]), /Missing parent/);
});

test('rejects duplicate routes and conflicting translation order', () => {
  assert.throws(() => buildDocumentTree([source('index.zh.md'), source('a.zh.md'), source('a/index.en.md')]), /Duplicate/);
  assert.throws(() => buildDocumentTree([source('index.zh.md'), source('a.zh.md'), source('a.zh.md')]), /Duplicate/);
  assert.throws(() => buildDocumentTree([source('index.zh.md'), source('01-a.zh.md'), source('02-a.en.md')]), /same numeric prefix/);
  assert.throws(() => buildDocumentTree([source('index.zh.md'), source('01-a.zh.md'), source('a.en.md')]), /same numeric prefix/);
  assert.throws(() => buildDocumentTree([source('index.zh.md'), source('01-a.zh.md'), source('02-a.zh.md')]), /Duplicate/);
  assert.throws(() => buildDocumentTree([source('index.zh.md'), source('a.zh.md'), source('01-a.zh.md')]), /Duplicate/);
});

test('rejects invalid names, unsupported languages, traversal, and reserved routes', () => {
  for (const id of ['A.zh.md', 'a.md', 'a.fr.md', '../a.zh.md', 'bad_dir/a.en.md', 'search.zh.md', '01-search.zh.md', 'tags/01-index.en.md', '01-tags/00-index.en.md', 'notes/a.zh.md', '-01-a.zh.md', '01_a.zh.md', '01-.zh.md', '01-/a.zh.md']) {
    assert.throws(() => documentIdentity(id), id);
  }
});

test('creates language URLs, preserves index semantics, and safely encodes tag queries', () => {
  assert.deepEqual(documentIdentity('a/b/index.en.md'), { key: 'a/b', folder: true, language: 'en', order: undefined });
  assert.deepEqual(documentIdentity('01-a/002-b/000-index.en.md'), { key: 'a/b', folder: true, language: 'en', order: '2' });
  assert.equal(documentUrl('zh', documentIdentity('a/001-topic.zh.md').key), '/zh/a/topic/');
  assert.equal(documentUrl('zh'), '/zh/');
  assert.equal(documentUrl('en', 'a/b'), '/en/a/b/');
  assert.equal(tagUrl('zh', 'C++ & 数学'), '/zh/notes/?tag=C%2B%2B%20%26%20%E6%95%B0%E5%AD%A6');
});

test('sorts mixed prefix widths numerically, including zero and arbitrarily large integers', () => {
  const tree = buildDocumentTree([
    source('00-index.zh.md'), source('10-ten.zh.md'), source('002-two.zh.md'),
    source('1-one.zh.md'), source('000-zero.zh.md'), source('099-ninety-nine.zh.md'),
    source('100-hundred.zh.md'), source('a-unordered.zh.md'), source('z-unordered.zh.md'),
    source('9007199254740993-large.zh.md'), source('9007199254740992-smaller.zh.md'),
  ]);
  assert.deepEqual(tree.children.map((node) => node.key), [
    'zero', 'one', 'two', 'ten', 'ninety-nine', 'hundred', 'smaller', 'large', 'a-unordered', 'z-unordered',
  ]);
});

test('equal prefixes use stable paths as tie-breaker, and widening prefixes preserves routes and order', () => {
  const make = (width: number) => buildDocumentTree([
    source(`${'0'.repeat(width)}-index.zh.md`),
    source(`${'1'.padStart(width, '0')}-a/00-index.zh.md`),
    source(`${'1'.padStart(width, '0')}-a/${'1'.padStart(width, '0')}-z.zh.md`),
    source(`${'1'.padStart(width, '0')}-a/${'1'.padStart(width, '0')}-b.zh.md`),
  ]);
  const expected = ['', 'a', 'a/b', 'a/z'];
  assert.deepEqual(flattenTree(make(2)).map((node) => node.key), expected);
  assert.deepEqual(flattenTree(make(3)).map((node) => node.key), expected);
});

test('interleaves numbered folders and documents by the same numeric order at every depth', () => {
  const tree = buildDocumentTree([
    source('00-index.zh.md'), source('11-last.zh.md'), source('01-first.zh.md'),
    source('002-trees/99-index.zh.md'), source('003-middle.zh.md'), source('010-graphs/00-index.zh.md'),
    source('002-trees/010-ten.zh.md'), source('002-trees/001-one.zh.md'), source('002-trees/002-sub/00-index.zh.md'),
    source('unindexed/05-index.zh.md'),
  ]);
  assert.deepEqual(flattenTree(tree).map((node) => node.key), [
    '', 'first', 'trees', 'trees/one', 'trees/sub', 'trees/ten', 'middle', 'graphs', 'last', 'unindexed',
  ]);
  assert.equal(tree.children[1].order, '2');
  assert.equal(tree.children.at(-1)?.order, undefined);
});

test('folder numbering, not the index filename, controls a folder and its bilingual pairing', () => {
  const tree = buildDocumentTree([
    source('00-index.zh.md'), source('01-a/99-index.zh.md'), source('001-a/00-index.en.md'),
    source('01-a/01-note.zh.md'), source('001-a/001-note.en.md'),
  ]);
  assert.equal(tree.children[0].order, '1');
  assert.equal(tree.children[0].children[0].key, 'a/note');
  assert.equal(sourceFor(tree.children[0], 'en').id, '001-a/00-index.en.md');
  assert.throws(() => buildDocumentTree([
    source('00-index.zh.md'), source('01-a/00-index.zh.md'), source('02-a/00-index.en.md'),
  ]), /same numeric prefix/);
  assert.throws(() => buildDocumentTree([
    source('00-index.zh.md'), source('01-a/00-index.zh.md'), source('02-a/00-index.zh.md'),
  ]), /Duplicate/);
});

test('validates actual calendar dates, not just string shape', () => {
  for (const valid of ['2024-02-29', '2026-11-04']) assert.equal(isCalendarDate(valid), true);
  for (const invalid of ['2026-02-29', '2026-02-30', '2026-13-01', '2026-1-01', 'yesterday']) {
    assert.equal(isCalendarDate(invalid), false, invalid);
  }
});

test('multiple domains have separate topic namespaces, landing pages and topic-scoped sidebars', () => {
  const root = buildDocumentTree([
    source('00-index.zh.md'),
    source('01-computer-science/00-index.zh.md'),
    source('01-computer-science/01-foundations/00-index.zh.md'),
    source('01-computer-science/01-foundations/01-basics.zh.md'),
    source('01-computer-science/01-foundations/02-advanced/00-index.zh.md'),
    source('01-computer-science/01-foundations/02-advanced/01-details.zh.md'),
    source('02-mathematics/00-index.en.md'),
    source('02-mathematics/01-foundations/00-index.en.md'),
    source('02-mathematics/01-foundations/01-basics.en.md'),
  ]);
  assert.deepEqual(navigationFor(root, '').domains.map((node) => node.key), ['computer-science', 'mathematics']);
  assert.equal(navigationFor(root, '').home, true);
  assert.equal(navigationFor(root, 'computer-science').home, true);
  assert.equal(navigationFor(root, 'mathematics').home, true);
  const science = navigationFor(root, 'computer-science/foundations/advanced/details');
  assert.equal(science.domain?.key, 'computer-science');
  assert.equal(science.topic?.key, 'computer-science/foundations');
  assert.equal(science.sidebarRoot.key, 'computer-science/foundations');
  assert.equal(science.home, false);
  const maths = navigationFor(root, 'mathematics/foundations/basics');
  assert.equal(maths.sidebarRoot.key, 'mathematics/foundations');
  assert.equal(maths.domain?.key, 'mathematics');
  assert.equal(sourceFor(maths.domain!, 'zh').id, '02-mathematics/00-index.en.md');
  assert.equal(navigationFor(root).home, false);
  assert.equal(navigationFor(root).sidebarRoot, root);
  assert.equal(navigationFor(root, 'computer-science-extra/foundations').domain, undefined);
});

test('a document directly under a domain uses its domain sidebar, not another topic', () => {
  const root = buildDocumentTree([
    source('00-index.zh.md'), source('01-science/00-index.zh.md'),
    source('01-science/01-overview.zh.md'), source('01-science/02-topic/00-index.zh.md'),
  ]);
  const context = navigationFor(root, 'science/overview');
  assert.equal(context.home, false);
  assert.equal(context.domain?.key, 'science');
  assert.equal(context.topic, undefined);
  assert.equal(context.sidebarRoot.key, 'science');
  assert.equal(documentUrl('zh', documentIdentity('01-science/02-topic/001-basics.zh.md').key), '/zh/science/topic/basics/');
});
