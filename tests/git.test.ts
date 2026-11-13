import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pageHistory } from '../src/lib/git.ts';

test('Git metadata distinguishes initial, committed, modified and renamed source files', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'cs-notes-git-test-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
  const commit = (date: string) => execFileSync('git', ['commit', '-qm', 'Test fixture'], {
    cwd: directory, env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
  });
  try {
    git('init', '-q');
    git('config', 'user.name', 'Test');
    git('config', 'user.email', 'test@example.invalid');
    git('config', 'core.autocrlf', 'false');
    writeFileSync(path.join(directory, 'seed'), '');
    git('add', 'seed');
    commit('2025-01-01T10:00:00Z');
    writeFileSync(path.join(directory, 'note.zh.md'), 'first\n');
    assert.deepEqual(pageHistory('note.zh.md', directory), {
      dirty: true, commit: undefined, updated: undefined, firstPublished: undefined,
    });
    git('add', 'note.zh.md');
    commit('2025-02-01T10:00:00Z');
    const first = git('rev-parse', 'HEAD');
    assert.equal(pageHistory('note.zh.md', directory).commit, first);
    assert.equal(pageHistory('note.zh.md', directory).firstPublished, '2025-02-01');
    assert.equal(pageHistory('note.zh.md', directory).dirty, false);
    writeFileSync(path.join(directory, 'note.zh.md'), 'second\n');
    const modified = pageHistory('note.zh.md', directory);
    assert.equal(modified.dirty, true);
    assert.equal(modified.commit, first);
    assert.match(modified.updated!, /^2025-02-01T10:00:00/);
    git('add', 'note.zh.md');
    commit('2025-03-01T10:00:00Z');
    assert.equal(pageHistory('note.zh.md', directory).firstPublished, '2025-02-01');
    renameSync(path.join(directory, 'note.zh.md'), path.join(directory, 'renamed.zh.md'));
    git('add', '-A');
    commit('2025-04-01T10:00:00Z');
    const renamed = pageHistory('renamed.zh.md', directory);
    assert.equal(renamed.commit, git('rev-parse', 'HEAD'));
    assert.equal(renamed.firstPublished, '2025-02-01');
    writeFileSync(path.join(directory, '[lang].md'), 'literal path\n');
    git('--literal-pathspecs', 'add', '[lang].md');
    commit('2025-05-01T10:00:00Z');
    assert.equal(pageHistory('[lang].md', directory).commit, git('rev-parse', 'HEAD'));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
