export {};

interface SearchResult {
  url: string;
  meta: { title?: string };
  excerpt: string;
}
interface SearchIndex {
  search: (query: string) => Promise<{ results: { data: () => Promise<SearchResult> }[] }>;
}

const container = document.querySelector<HTMLElement>('#search-page');
const form = document.querySelector<HTMLFormElement>('.search-form');
const input = document.querySelector<HTMLInputElement>('#search-query');
const languageSelect = document.querySelector<HTMLSelectElement>('#search-language');
const status = document.querySelector<HTMLElement>('#search-status');
const results = document.querySelector<HTMLOListElement>('#search-results');
let indexPromise: Promise<SearchIndex> | undefined;
let revision = 0;
let debounce: ReturnType<typeof setTimeout>;

async function search() {
  if (!container || !input || !status || !results) return;
  const current = ++revision;
  const query = input.value.trim();
  results.replaceChildren();
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}`);
  if (container.dataset.dev) {
    status.textContent = container.dataset.devMessage ?? '';
    return;
  }
  if (!query) { status.textContent = ''; return; }
  status.textContent = container.dataset.loading ?? '';
  try {
    const moduleUrl = '/pagefind/pagefind.js';
    indexPromise ??= import(/* @vite-ignore */ moduleUrl);
    const index = await indexPromise;
    const response = await index.search(query);
    const pages = await Promise.all(response.results.slice(0, 50).map((result) => result.data()));
    if (revision !== current) return;
    status.textContent = response.results.length ? `${response.results.length} ${document.body.dataset.language === 'zh' ? '条结果（最多显示 50 条）' : 'results (up to 50 shown)'}` : container.dataset.empty ?? '';
    for (const result of pages) {
      const item = document.createElement('li');
      const heading = document.createElement('h2');
      const link = document.createElement('a');
      link.href = result.url;
      link.textContent = result.meta.title ?? result.url;
      heading.append(link);
      const excerpt = document.createElement('p');
      const parsed = new DOMParser().parseFromString(result.excerpt, 'text/html');
      excerpt.textContent = parsed.body.textContent;
      const path = document.createElement('span');
      path.className = 'card-path';
      path.textContent = result.url;
      item.append(heading, excerpt, path);
      results.append(item);
    }
  } catch (error) {
    if (revision !== current) return;
    indexPromise = undefined;
    console.error('Pagefind search failed.', error);
    status.textContent = container.dataset.errorMessage ?? 'Search failed';
  }
}

input?.addEventListener('input', () => {
  revision++;
  clearTimeout(debounce);
  debounce = setTimeout(search, 180);
});
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  clearTimeout(debounce);
  void search();
});
languageSelect?.addEventListener('change', () => {
  location.assign(`/${languageSelect.value}/search/?q=${encodeURIComponent(input?.value ?? '')}`);
});
function readQuery() {
  if (input) input.value = new URLSearchParams(location.search).get('q') ?? '';
  void search();
}
addEventListener('popstate', readQuery);
readQuery();
