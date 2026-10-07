#!/usr/bin/env node
// PreToolUse hook (Bash): refuse `git commit` on `main` and `git push` to
// `main`. The branch flow is feature branch -> dev -> main through pull
// requests; see AGENTS.md. Exit code 2 blocks the tool call and shows the
// reason to Claude.
//
// Each git invocation is checked in the repository it actually runs in: the
// directory set by a preceding `cd` in the same command, or by `git -C`,
// falling back to the session's cwd. A push that reaches `main` is blocked
// whatever the local refs say: a missing `origin/main` only means it was never
// fetched, not that the remote has none. The first push of a new repository is
// a one-off for a human to make.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const command = input.tool_input?.command || '';
if (!/\bgit\b/.test(command)) process.exit(0);

const PROTECTED = 'main';

/** Words that can precede the command a simple command runs. */
const WRAPPERS = new Set(['env', 'command', 'exec', 'nohup', 'time', 'rtk']);

/**
 * Split a shell command into simple commands on && || ; | and newlines. A
 * backslash-newline is a line continuation, not a boundary: the shell runs
 * `git \<newline>commit` as `git commit`.
 */
function segments(cmd) {
  return cmd
    .replace(/\\\r?\n/g, ' ')
    .split(/&&|\|\||;|\||\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Split one simple command into words, honouring quotes. */
function words(seg) {
  return [...seg.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3]);
}

/**
 * Index of `git` when it is the command this simple command runs: the first
 * word, after any `VAR=value` assignments and wrappers such as `env` or `rtk`.
 * -1 when git is only an argument, as in `echo git commit`.
 */
function gitIndex(w) {
  let i = 0;
  while (i < w.length && (/^[A-Za-z_]\w*=/.test(w[i]) || WRAPPERS.has(w[i]))) {
    i += 1;
  }
  return i < w.length && /^(.*[/\\])?git(\.exe)?$/i.test(w[i]) ? i : -1;
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

  const gi = gitIndex(w);
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
  const args = w.slice(i + 1);
  const pushesAll = args.find((a) => a === '--all' || a === '--mirror');
  if (pushesAll) {
    block(`'git push ${pushesAll}' includes '${PROTECTED}' in ${dir}`);
  }
  const refspecs = args.filter((a) => !a.startsWith('-')).slice(1);
  // Each refspec's destination: after the colon if there is one, without the
  // force marker `+`, and with `HEAD` meaning the branch checked out.
  const targets = refspecs.length
    ? refspecs.map((r) => {
        const dst = r.replace(/^\+/, '').split(':').pop();
        return dst === 'HEAD' ? branch : dst.replace(/^refs\/heads\//, '');
      })
    : [branch];
  if (targets.includes(PROTECTED)) {
    block(`'git push' to '${PROTECTED}' in ${dir}`);
  }
}
