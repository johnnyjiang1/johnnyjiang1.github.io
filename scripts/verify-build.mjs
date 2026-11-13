import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildDocumentTree, documentIdentity, documentUrl, flattenTree, navigationFor } from '../src/lib/model.ts';

const output = path.resolve('dist');
const pages = fs.readdirSync(output, { recursive: true })
  .filter((file) => file.endsWith('.html')).map((file) => path.join(output, file));
assert.ok(pages.length > 0, 'No HTML pages generated');
const buildTimes = new Set();
const buildCommits = new Set();

function unescape(value) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  const buildTime = /data-build-time="([^"]+)"/.exec(html)?.[1];
  const buildCommit = /data-build-commit="([a-f0-9]{40})"/.exec(html)?.[1];
  assert.ok(buildTime && !Number.isNaN(Date.parse(buildTime)), `Invalid build time: ${page}`);
  assert.ok(buildCommit, `Invalid build commit: ${page}`);
  buildTimes.add(buildTime);
  buildCommits.add(buildCommit);
  assert.match(html, /datetime="[^"]+"/, `Missing build time: ${page}`);
  assert.match(html, /github\.com\/johnnyjiang1\/johnnyjiang1\.github\.io\/commit\/[a-f0-9]{40}/, `Missing build commit: ${page}`);
  assert.match(html, /页面更新|Page updated/, `Missing per-page metadata: ${page}`);
  assert.doesNotMatch(html, /href="[^"]+\.md(?:[?#"][^>]*)?/, `Unconverted Markdown link: ${page}`);
  for (const card of html.matchAll(/<a class="section-card"[^>]*>([\s\S]*?)<\/a>/g)) {
    assert.doesNotMatch(card[1], /class="card-path"/, `Navigation cards must not display content paths: ${page}`);
  }
  for (const label of html.matchAll(/<div class="eyebrow"[^>]*>([\s\S]*?)<\/div>/g)) {
    assert.doesNotMatch(label[1], /<span>\s*\//, `Document heading labels must not display content paths: ${page}`);
  }
  if (html.includes('data-placeholder="true"')) {
    assert.doesNotMatch(html, /data-pagefind-body/, `Placeholder must not be indexed: ${page}`);
    assert.match(html, /noindex/, `Placeholder must have noindex: ${page}`);
  }
  assert.equal(buildTimes.size, 1, 'All pages must report the same site build time');
  assert.equal(buildCommits.size, 1, 'All pages must report the same source commit');
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url = unescape(match[1]);
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) continue;
    const sourcePath = path.relative(output, page).split(path.sep).join('/');
    const base = `https://local.invalid/${sourcePath.endsWith('index.html') ? sourcePath.slice(0, -10) : sourcePath}`;
    const resolved = new URL(url, base);
    const pathname = decodeURIComponent(resolved.pathname);
    let target = path.join(output, pathname);
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
    assert.ok(fs.existsSync(target), `Broken local link in ${page}: ${url}`);
    if (resolved.hash && target.endsWith('.html')) {
      const targetHtml = fs.readFileSync(target, 'utf8');
      const id = decodeURIComponent(resolved.hash.slice(1));
      const ids = [...targetHtml.matchAll(/\bid="([^"]+)"/g)].map((item) => unescape(item[1]));
      assert.ok(ids.includes(id), `Missing anchor in ${page}: ${url}`);
    }
  }
}

const contentBase = path.resolve('src', 'content', 'docs');
const contentFiles = fs.readdirSync(contentBase, { recursive: true }).filter((file) => file.endsWith('.md'));
const identities = contentFiles.map((file) => documentIdentity(file.split(path.sep).join('/')));
const root = buildDocumentTree(contentFiles.map((file) => ({
  id: file.split(path.sep).join('/'),
  filePath: path.join(contentBase, file),
  data: { title: file, description: file, tags: [] },
})));
const domains = root.children.filter((node) => node.folder);
for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  const language = /data-language="(zh|en)"/.exec(html)?.[1];
  if (!language) continue;
  const menus = [...html.matchAll(/<details class="knowledge-menu" data-domain-key="([^"]+)">([\s\S]*?)<\/details>/g)];
  assert.deepEqual(menus.map((menu) => menu[1]), domains.map((domain) => domain.key), `Expected one ordered menu per domain: ${page}`);
  assert.equal([...html.matchAll(/class="knowledge-menu-trigger"/g)].length, domains.length, `Incorrect domain control count: ${page}`);
  assert.doesNotMatch(html, /class="nav-brand"|class="nav-links"/, `Legacy top navigation remains: ${page}`);
  for (const [index, menu] of menus.entries()) {
    const topics = domains[index].children.filter((node) => node.folder);
    const links = [...menu[2].matchAll(/href="([^"]+)" data-category-key="([^"]+)"/g)];
    assert.deepEqual(links.map((link) => link[2]), topics.map((topic) => topic.key), `Incorrect domain topics or order: ${page}`);
    for (const link of links) assert.equal(link[1], documentUrl(language, link[2]), `Incorrect dropdown language or target: ${page}`);
    const homeLink = /class="knowledge-menu-home" href="([^"]+)"/.exec(menu[2])?.[1];
    assert.equal(homeLink, documentUrl(language, menu[1]), `Missing domain home link: ${page}`);
  }
  const documentAttribute = /data-document-key(?:="([^"]*)")?(?=[\s>])/.exec(html);
  const documentKey = documentAttribute ? documentAttribute[1] ?? '' : undefined;
  const { home, domain, sidebarRoot } = navigationFor(root, documentKey);
  if (home) {
    assert.match(html, /class="home-page"/, `Missing topic homepage: ${page}`);
    assert.doesNotMatch(html, /id="directory"|class="directory-toggle"|class="page-outline"|class="page-navigation"/, `Homepage must not have document navigation: ${page}`);
    const cards = /<div class="section-cards topic-cards">([\s\S]*?)<\/div>/.exec(html)?.[1];
    const expectedCards = (domain ?? root).children.filter((node) => node.folder);
    assert.ok(cards || expectedCards.length === 0, `Homepage topic cards missing: ${page}`);
    const cardLinks = [...(cards ?? '').matchAll(/class="section-card" href="([^"]+)"/g)].map((link) => link[1]);
    assert.deepEqual(cardLinks, expectedCards.map((node) => documentUrl(language, node.key)), `Incorrect cards on global or domain home: ${page}`);
    continue;
  }
  const sidebar = /<aside class="directory" id="directory">([\s\S]*?)<\/aside>/.exec(html)?.[1];
  assert.ok(sidebar, `Missing sidebar: ${page}`);
  const sidebarRootAttribute = /data-sidebar-root(?:="([^"]*)")?(?=[\s>])/.exec(sidebar);
  assert.ok(sidebarRootAttribute, `Missing sidebar root attribute: ${page}`);
  assert.equal(sidebarRootAttribute[1] ?? '', sidebarRoot.key, `Incorrect sidebar root: ${page}`);
  const sidebarLinks = [...sidebar.matchAll(/href="([^"]+)"/g)].map((link) => link[1]);
  const expectedSidebarLinks = flattenTree(sidebarRoot).map((node) => documentUrl(language, node.key));
  assert.deepEqual(sidebarLinks, expectedSidebarLinks, `Sidebar must contain only its ordered root and descendants: ${page}`);
}
for (const key of new Set(identities.map((identity) => identity.key))) {
  for (const language of ['zh', 'en']) {
    const file = path.join(output, documentUrl(language, key), 'index.html');
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, new RegExp(`<html lang="${language === 'zh' ? 'zh-CN' : 'en'}"`));
    const hasSource = identities.some((identity) => identity.key === key && identity.language === language);
    assert.equal(html.includes('data-placeholder="true"'), !hasSource, `Incorrect placeholder: ${file}`);
  }
}

const entry = JSON.parse(fs.readFileSync(path.join(output, 'pagefind', 'pagefind-entry.json'), 'utf8'));
assert.ok(entry.languages.en, 'English search index missing');
assert.ok(entry.languages['zh-cn'], 'Chinese search index missing');
assert.equal(entry.languages.en.page_count, identities.filter((identity) => identity.language === 'en').length);
assert.equal(entry.languages['zh-cn'].page_count, identities.filter((identity) => identity.language === 'zh').length);
console.log(`Verified ${pages.length} pages: local links, anchors, global/domain homepages, domain menus, topic-scoped sidebars and routes, placeholders, metadata, and exact search index counts.`);
