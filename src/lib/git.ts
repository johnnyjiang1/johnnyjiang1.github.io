import { execFileSync } from 'node:child_process';

const repo = 'https://github.com/johnnyjiang1/johnnyjiang1.github.io';

function gitAt(cwd: string, ...args: string[]): string {
  return execFileSync('git', ['--literal-pathspecs', ...args], { cwd, encoding: 'utf8' }).trim();
}

export const buildInfo = {
  time: new Date().toISOString(),
  commit: process.env.GITHUB_SHA ?? gitAt(process.cwd(), 'rev-parse', 'HEAD'),
  dirty: gitAt(process.cwd(), 'status', '--porcelain', '--untracked-files=normal').length > 0,
};

export function commitUrl(commit: string): string {
  return `${repo}/commit/${commit}`;
}

export function pageHistory(filePath: string, cwd = process.cwd()) {
  const dirty = gitAt(cwd, 'status', '--porcelain', '--', filePath).length > 0;
  const latest = gitAt(cwd, 'log', '--follow', '-1', '--format=%H|%cI', '--', filePath);
  const first = gitAt(cwd, 'log', '--follow', '--diff-filter=A', '--format=%cI', '--', filePath).split('\n').filter(Boolean).at(-1);
  const [commit, updated] = latest.split('|');
  return {
    dirty,
    commit: commit || undefined,
    updated: updated || undefined,
    firstPublished: first?.slice(0, 10),
  };
}
