#!/usr/bin/env node
// PostToolUse hook (Edit|Write): format and lint-fix the file Claude just
// changed, so agent edits match `npm run format` / `npm run lint` without a
// separate pass. Never blocks: problems are reported back as context only.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname, isAbsolute, relative } from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const file = input.tool_input?.file_path;
if (!file) process.exit(0);

const cwd = input.cwd || process.cwd();
const rel = relative(cwd, file);
// Outside the repo, or in generated/vendored output: leave it alone.
if (
  rel.startsWith('..') ||
  // On Windows a file on another drive has no relative path at all.
  isAbsolute(rel) ||
  /(^|[/\\])(node_modules|dist|types|coverage|vendor)[/\\]/.test(rel)
) {
  process.exit(0);
}

// One command string rather than an argument array: npx is a .cmd shim on
// Windows and needs a shell, and Node deprecates passing arrays with one.
const quote = (p) => `"${p.replace(/"/g, '\\"')}"`;
const run = (cmd) => {
  try {
    execSync(`npx --no-install ${cmd}`, { cwd, stdio: 'pipe' });
    return null;
  } catch (err) {
    return String(err.stdout || err.stderr || err.message).trim();
  }
};

const problems = [];
const prettier = run(`prettier --write --ignore-unknown ${quote(file)}`);
if (prettier) problems.push(`prettier: ${prettier}`);

if (['.js', '.mjs', '.cjs', '.ts'].includes(extname(file))) {
  const eslint = run(`eslint --fix --no-warn-ignored ${quote(file)}`);
  if (eslint) problems.push(`eslint: ${eslint}`);
}

if (problems.length) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `Formatting/lint issues in ${rel}:\n${problems.join('\n')}`,
      },
    }),
  );
}
