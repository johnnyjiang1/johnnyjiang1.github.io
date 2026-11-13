import type { Language } from './model.ts';

const strings = {
  zh: {
    site: '知识笔记', subtitle: 'Knowledge Notes',
    home: '知识库', notes: '全部笔记', tags: '标签', search: '搜索',
    searchHint: '搜索当前语言的全部笔记', searchLanguage: '搜索语言',
    tree: '知识目录', toc: '本页目录', menu: '展开 / 收起知识目录',
    theme: '切换深色 / 浅色', skip: '跳到正文',
    missing: '译文尚未发布', missingDescription: '此页面的中文版本正在整理中。',
    readOriginal: '阅读 English 版本', pending: '待翻译',
    previous: '上一篇', next: '下一篇', updated: '页面更新', published: '发布于',
    build: '整站构建', sourceCommit: '源码提交', pageCommit: '页面提交',
    uncommitted: '未提交', noHistory: '尚无提交记录', placeholderHistory: '尚无译文，无独立更新记录',
    copy: '复制', copied: '已复制', copyFailed: '复制失败，请手动选择代码',
    category: '分类', allCategories: '全部分类', allTags: '全部标签',
    noResults: '没有符合条件的笔记。', count: '篇笔记',
    browse: '浏览本节', folder: '目录', note: '笔记',
    domains: '知识领域', topics: '主题', domainHome: '领域首页',
    latest: '按发布日期倒序排列；目录页与缺译占位页不计入。',
    searchDev: '搜索索引在生产构建后生成。请执行 npm run build 和 npm run preview 后使用搜索。',
    searchError: '搜索索引加载失败。请刷新重试；若持续失败，请检查部署产物。',
    loading: '正在加载搜索索引…', builtFrom: '静态知识库 · Astro + Pagefind',
    noTags: '暂无标签。', emptyFolder: '本节暂无子文档。',
    unknownFilter: '未知筛选值',
  },
  en: {
    site: 'Knowledge Notes', subtitle: '知识笔记',
    home: 'Knowledge base', notes: 'All notes', tags: 'Tags', search: 'Search',
    searchHint: 'Search all notes in this language', searchLanguage: 'Search language',
    tree: 'Contents', toc: 'On this page', menu: 'Toggle contents',
    theme: 'Toggle dark / light theme', skip: 'Skip to content',
    missing: 'Translation coming soon', missingDescription: 'The English version of this page is not available yet.',
    readOriginal: 'Read the 中文 version', pending: 'Not translated',
    previous: 'Previous', next: 'Next', updated: 'Page updated', published: 'Published',
    build: 'Site built', sourceCommit: 'Source commit', pageCommit: 'Page commit',
    uncommitted: 'Uncommitted', noHistory: 'No commit yet', placeholderHistory: 'No translation; no independent update history',
    copy: 'Copy', copied: 'Copied', copyFailed: 'Copy failed; please select the code manually',
    category: 'Category', allCategories: 'All categories', allTags: 'All tags',
    noResults: 'No matching notes.', count: 'notes',
    browse: 'In this section', folder: 'Directory', note: 'Note',
    domains: 'Knowledge domains', topics: 'Explore topics', domainHome: 'Domain home',
    latest: 'Newest publication first. Directory indexes and untranslated placeholders are excluded.',
    searchDev: 'The search index is generated during production builds. Run npm run build and npm run preview to use search.',
    searchError: 'The search index could not be loaded. Refresh to retry; if this persists, check the deployed build.',
    loading: 'Loading search index…', builtFrom: 'Static knowledge base · Astro + Pagefind',
    noTags: 'No tags yet.', emptyFolder: 'No documents in this section yet.',
    unknownFilter: 'Unknown filter',
  },
} satisfies Record<Language, Record<string, string>>;

export function text(language: Language) {
  return strings[language];
}

export function formatDate(value: string, language: Language, dateOnly = false) {
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-GB', {
    dateStyle: 'medium',
    ...(dateOnly ? {} : { timeStyle: 'short' as const }),
    timeZone: 'UTC',
  }).format(new Date(value)) + (dateOnly ? '' : ' UTC');
}
