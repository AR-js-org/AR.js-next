#!/usr/bin/env node
// PreToolUse hook (Bash): refuse `git commit` on `main` and `git push` to
// `main`. The branch flow is feature branch -> dev -> main through pull
// requests; see AGENTS.md. Exit code 2 blocks the tool call and shows the
// reason to Claude.
//
// Each git invocation is checked in the repository it actually runs in: the
// directory set by a preceding `cd` in the same command, or by `git -C`,
// falling back to the session's cwd. The first push of an empty repository
// (no `origin/main` yet) is allowed, since it can only go to `main`.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const command = input.tool_input?.command || '';
if (!/\bgit\b/.test(command)) process.exit(0);

const PROTECTED = 'main';

/** Split a shell command into simple commands on && || ; | and newlines. */
function segments(cmd) {
  return cmd
    .split(/&&|\|\||;|\||\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Split one simple command into words, honouring quotes. */
function words(seg) {
  return [...seg.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3]);
}

/** Map Git Bash paths like /d/foo to D:/foo on Windows. */
function nativePath(p) {
  const m = process.platform === 'win32' && /^\/([a-zA-Z])(\/.*)?$/.exec(p);
  return m ? `${m[1].toUpperCase()}:${m[2] || '/'}` : p;
}

function git(cwd, args) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function block(reason) {
  console.error(
    `Blocked: ${reason}. Work on a feature branch and open a pull request ` +
      "into dev (see AGENTS.md, 'Git').",
  );
  process.exit(2);
}

let cwd = input.cwd || process.cwd();

for (const seg of segments(command)) {
  const w = words(seg);
  if (w[0] === 'cd' && w[1]) {
    const target = nativePath(w[1]);
    cwd = isAbsolute(target) ? target : resolve(cwd, target);
    continue;
  }

  const gi = w.indexOf('git');
  if (gi === -1) continue;

  // Global options before the subcommand, notably -C <dir>.
  let dir = cwd;
  let i = gi + 1;
  while (i < w.length && w[i].startsWith('-')) {
    if (w[i] === '-C' && w[i + 1]) {
      const target = nativePath(w[i + 1]);
      dir = isAbsolute(target) ? target : resolve(dir, target);
      i += 2;
    } else if (w[i] === '-c') {
      i += 2;
    } else {
      i += 1;
    }
  }
  const sub = w[i];
  if (sub !== 'commit' && sub !== 'push') continue;

  const branch = git(dir, ['branch', '--show-current']);
  if (branch === null) continue; // not a repository

  if (sub === 'commit') {
    if (branch === PROTECTED) {
      block(`'git commit' on '${PROTECTED}' in ${dir}`);
    }
    continue;
  }

  // push: positional args after the options are [remote] [refspec...]
  const positional = w.slice(i + 1).filter((a) => !a.startsWith('-'));
  const refspecs = positional.slice(1);
  const targets = refspecs.length
    ? refspecs.map((r) =>
        r
          .split(':')
          .pop()
          .replace(/^refs\/heads\//, ''),
      )
    : [branch];
  if (!targets.includes(PROTECTED)) continue;

  const remote = positional[0] || 'origin';
  const remoteHasMain = git(dir, [
    'rev-parse',
    '--verify',
    '--quiet',
    `refs/remotes/${remote}/${PROTECTED}`,
  ]);
  if (remoteHasMain === null) continue; // first push of an empty repository

  block(`'git push' to '${PROTECTED}' in ${dir}`);
}
