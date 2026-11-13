export {};

const html = document.documentElement;
const language = document.body.dataset.language;
try {
  if (language) localStorage.setItem('notes-language', language);
} catch (error) {
  console.warn('Language preference storage is unavailable.', error);
}

const themeButton = document.querySelector<HTMLButtonElement>('.theme-toggle');
function syncThemeButton() {
  themeButton?.setAttribute('aria-pressed', String(html.dataset.theme === 'dark'));
}
syncThemeButton();
themeButton?.addEventListener('click', () => {
  html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
  syncThemeButton();
  try {
    localStorage.setItem('notes-theme', html.dataset.theme);
  } catch (error) {
    console.warn('Theme preference could not be saved.', error);
  }
});

document.querySelector('.directory-toggle')?.addEventListener('click', (event) => {
  const button = event.currentTarget;
  if (!(button instanceof HTMLButtonElement)) return;
  const open = button.getAttribute('aria-expanded') !== 'true';
  button.setAttribute('aria-expanded', String(open));
  document.querySelector('#directory')?.classList.toggle('is-open', open);
});

document.querySelectorAll<HTMLDetailsElement>('.knowledge-menu').forEach((knowledgeMenu) => {
  const trigger = knowledgeMenu.querySelector<HTMLElement>('summary');
  if (!trigger) throw new Error('Knowledge navigation requires a summary control');
  knowledgeMenu.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'touch' && matchMedia('(hover: hover)').matches) knowledgeMenu.open = true;
  });
  knowledgeMenu.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'touch' && !knowledgeMenu.contains(document.activeElement)) knowledgeMenu.open = false;
  });
  knowledgeMenu.addEventListener('focusout', (event) => {
    if (!(event.relatedTarget instanceof Node) || !knowledgeMenu.contains(event.relatedTarget)) knowledgeMenu.open = false;
  });
  knowledgeMenu.addEventListener('keydown', (event) => {
    if (event.target !== trigger || !['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    knowledgeMenu.open = true;
    const links = knowledgeMenu.querySelectorAll<HTMLAnchorElement>('.knowledge-menu-panel a');
    (event.key === 'ArrowDown' ? links[0] : links[links.length - 1])?.focus();
  });
  document.addEventListener('pointerdown', (event) => {
    if (event.target instanceof Node && !knowledgeMenu.contains(event.target)) knowledgeMenu.open = false;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !knowledgeMenu.open) return;
    event.preventDefault();
    const focusInside = knowledgeMenu.contains(document.activeElement);
    knowledgeMenu.open = false;
    if (focusInside) trigger.focus();
  });
});

document.querySelectorAll<HTMLPreElement>('.prose pre').forEach((pre) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'copy-button';
  button.textContent = document.body.dataset.copy ?? 'Copy';
  const status = document.createElement('span');
  status.className = 'sr-only';
  status.setAttribute('role', 'status');
  pre.append(button, status);
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(pre.querySelector('code')?.textContent ?? '');
      button.textContent = document.body.dataset.copied ?? 'Copied';
      status.textContent = button.textContent;
      setTimeout(() => { button.textContent = document.body.dataset.copy ?? 'Copy'; }, 1800);
    } catch (error) {
      console.error('Clipboard copy failed.', error);
      status.textContent = document.body.dataset.copyFailed ?? 'Copy failed';
      button.textContent = status.textContent;
    }
  });
});
