import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateGitGuard } from './guard.mjs';

const blocked = [
  'git push origin main',
  'git push origin HEAD:master',
  'git push --force origin feature',
  'git push -f',
  'git push --force-with-lease origin edge/wi-009',
  'git push origin codex/development-workspace',
  'git push --all origin',
  'git push --mirror origin',
  'gh pr merge 12 --squash',
  'gh pr review 12 --approve',
  'git reset --hard HEAD~3',
  'git clean -fd',
  'git status && git push origin main',
];

const allowed = [
  'git status --short',
  'git push origin edge-opencode/wi-009-visible-git',
  'git push --dry-run origin main',
  'git push -u origin edge-opencode/wi-010-thing',
  'git log --oneline -5',
  'gh pr create --draft --base codex/development-workspace',
  'gh pr checks --watch',
  'git reset HEAD~1',
  'npm test',
  '',
];

test('blocked git and gh operations are refused', () => {
  for (const command of blocked) {
    assert.ok(evaluateGitGuard(command), `expected a block for: ${command}`);
  }
});

test('ordinary delivery commands are allowed', () => {
  for (const command of allowed) {
    assert.equal(evaluateGitGuard(command), null, `unexpected block for: ${JSON.stringify(command)}`);
  }
});

test('a protected push inside a chain still blocks', () => {
  assert.match(evaluateGitGuard('cd repo; git push origin main'), /protected branch/);
});

test('non-string input is ignored', () => {
  assert.equal(evaluateGitGuard(undefined), null);
});
