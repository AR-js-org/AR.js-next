#!/usr/bin/env node
// PreToolUse hook (Bash): refuse `git commit` and `git push` while on `main`
// (or when pushing to it). The branch flow is feature branch -> dev -> main
// through pull requests; see AGENTS.md. Exit code 2 blocks the tool call and
// shows the reason to Claude.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const command = input.tool_input?.command || '';
if (!/\bgit\s+(commit|push)\b/.test(command)) process.exit(0);

let branch = '';
try {
  branch = execFileSync('git', ['branch', '--show-current'], {
    cwd: input.cwd || process.cwd(),
    encoding: 'utf8',
  }).trim();
} catch {
  process.exit(0);
}

const pushesToMain = /\bgit\s+push\b[^;&|]*\b(main|HEAD:main)\b/.test(command);
if (branch === 'main' || pushesToMain) {
  console.error(
    `Blocked: '${command}' would commit or push to main. Work on a feature ` +
      "branch and open a pull request into dev (see AGENTS.md, 'Git').",
  );
  process.exit(2);
}
