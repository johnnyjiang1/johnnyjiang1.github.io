import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { remarkDocumentLinks } from '../src/lib/markdown-links.ts';

const originalDirectory = process.cwd();
const fixtureDirectory = mkdtempSync(path.join(tmpdir(), 'knowledge-notes-links-'));
const contentDirectory = path.join(fixtureDirectory, 'src', 'content', 'docs');
const filename = path.join(contentDirectory, '01-computer-science', '04-algorithms', '01-complexity.zh.md');

before(() => {
  for (const file of [
    '00-index.zh.md',
    '01-computer-science/00-index.zh.md',
    '01-computer-science/04-algorithms/00-index.zh.md',
    '01-computer-science/04-algorithms/01-complexity.zh.md',
    '01-computer-science/04-algorithms/01-complexity.en.md',
    '01-computer-science/04-algorithms/02-trees/00-index.zh.md',
    '01-computer-science/04-algorithms/02-trees/01-traversal.zh.md',
    '01-computer-science/03-networks/00-index.en.md',
    '01-computer-science/03-networks/01-tcp.en.md',
  ]) {
    const target = path.join(contentDirectory, ...file.split('/'));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, '');
  }
  process.chdir(fixtureDirectory);
});

after(() => {
  process.chdir(originalDirectory);
  rmSync(fixtureDirectory, { recursive: true, force: true });
});

test('rewrites nested Markdown links, reference definitions and anchors', () => {
  const tree = { type: 'root', children: [
    { type: 'link', url: 'trees/index.zh.md#树与图的联系' },
    { type: 'definition', url: '../networks/tcp.en.md' },
    { type: 'link', url: '../index.zh.md' },
    { type: 'link', url: 'trees/index.zh.md?ref=notes#树与图的联系' },
  ] };
  remarkDocumentLinks()(tree, { path: filename });
  assert.deepEqual(tree.children.map((node) => node.url), [
    '/zh/computer-science/algorithms/trees/#树与图的联系', '/en/computer-science/networks/tcp/', '/zh/computer-science/',
    '/zh/computer-science/algorithms/trees/?ref=notes#树与图的联系',
  ]);
});

test('leaves external URLs, static images, and local fragments unchanged', () => {
  const urls = ['https://example.com/a.md', '/images/banner.jpg', '#二分查找', 'mailto:test@example.com'];
  const tree = { type: 'root', children: urls.map((url) => ({ type: 'link', url })) };
  remarkDocumentLinks()(tree, { path: filename });
  assert.deepEqual(tree.children.map((node) => node.url), urls);
});

test('rejects nonexistent and out-of-root Markdown targets', () => {
  for (const url of ['missing.zh.md', '../../../../README.md']) {
    assert.throws(() => remarkDocumentLinks()({ type: 'link', url }, { path: filename }));
  }
});

test('links to generated placeholders when only the other translation exists', () => {
  const tree = { type: 'link', url: 'trees/traversal.en.md' };
  remarkDocumentLinks()(tree, { path: filename });
  assert.equal(tree.url, '/en/computer-science/algorithms/trees/traversal/');
});

test('numbered links, widened prefixes and stable unnumbered links all use prefix-free URLs', () => {
  const tree = { type: 'root', children: [
    { type: 'link', url: 'trees/02-index.zh.md#树与图的联系' },
    { type: 'link', url: './001-complexity.en.md' },
    { type: 'link', url: './complexity.zh.md' },
    { type: 'link', url: 'trees/001-traversal.en.md' },
    { type: 'link', url: '002-trees/00-index.zh.md#树与图的联系' },
    { type: 'link', url: '../003-networks/001-tcp.en.md' },
  ] };
  remarkDocumentLinks()(tree, { path: filename });
  assert.deepEqual(tree.children.map((node) => node.url), [
    '/zh/computer-science/algorithms/trees/#树与图的联系', '/en/computer-science/algorithms/complexity/',
    '/zh/computer-science/algorithms/complexity/', '/en/computer-science/algorithms/trees/traversal/',
    '/zh/computer-science/algorithms/trees/#树与图的联系', '/en/computer-science/networks/tcp/',
  ]);
});

test('links can explicitly target the global index or include a numbered domain namespace', () => {
  const tree = { type: 'root', children: [
    { type: 'link', url: '../../00-index.zh.md' },
    { type: 'link', url: '../../001-computer-science/003-networks/tcp.en.md' },
  ] };
  remarkDocumentLinks()(tree, { path: filename });
  assert.deepEqual(tree.children.map((node) => node.url), ['/zh/', '/en/computer-science/networks/tcp/']);
});
