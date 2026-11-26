// Rules that the owner stated must never be broken, expressed as code.
// Pure function so it can be unit tested and used by both the shell hook and
// the terminal tool. Returns null when the command is allowed.

const PROTECTED = ['main', 'master', 'codex/development-workspace'];

function blocksPushToProtected(command) {
  // git push [flags] [remote] [refspec...]
  const match = /^git\s+push\b([^;&|]*)$/i.exec(command);
  if (!match) return null;
  const tail = match[1].trim();
  if (/--dry-run|-n\b/.test(tail)) return null;
  const targets = tail
    .split(/\s+/)
    .filter((part) => part && !part.startsWith('-'))
    .slice(1); // first non-flag token is the remote
  for (const target of targets) {
    const ref = target.replace(/^\+/, '').split(':').filter(Boolean);
    const name = ref[ref.length - 1];
    if (!name) continue;
    const branch = name.startsWith('refs/heads/') ? name.slice('refs/heads/'.length) : name;
    if (PROTECTED.includes(branch)) {
      return `Refusing to push to protected branch "${branch}". Open a pull request instead.`;
    }
  }
  return null;
}

export function evaluateGitGuard(rawCommand) {
  if (typeof rawCommand !== 'string') return null;
  // Check each statement in a chained command line separately.
  for (const command of rawCommand.split(/[\r\n]+|&&|\|\||;/)) {
    const text = command.trim();
    if (!text) continue;

    if (/^git\s+push\b[^;&|]*(--force\b|--force-with-lease\b|-f\b)/i.test(text)) {
      return 'Refusing to force-push. Shared history is never rewritten without the owner asking in the moment.';
    }
    if (/^git\s+push\b[^;&|]*(--all\b|--mirror\b)/i.test(text)) {
      return 'Refusing to push every branch or mirror the repository. Push one scoped branch.';
    }
    const protectedPush = blocksPushToProtected(text);
    if (protectedPush) return protectedPush;

    if (/^gh\s+pr\s+merge\b/i.test(text)) {
      return 'Refusing to merge a pull request. Merging is the owner\'s decision.';
    }
    if (/^gh\s+pr\s+review\b[^;&|]*--approve/i.test(text)) {
      return 'Refusing to approve a pull request the agent opened.';
    }
    if (/^git\s+reset\s+--hard\b/i.test(text)) {
      return 'Refusing to discard work with git reset --hard. Ask the owner first and name the commits at risk.';
    }
    if (/^git\s+clean\s+-[a-z]*[fd]/i.test(text)) {
      return 'Refusing to delete untracked files with git clean. Ask the owner first.';
    }
  }
  return null;
}
