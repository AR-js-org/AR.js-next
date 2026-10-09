#!/usr/bin/env node
// PostToolUse hook (Edit|Write): format and lint-fix the file Claude just
// changed, so agent edits match `npm run format` / `npm run lint` without a
// separate pass. Never blocks: problems are reported back as context only.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { extname, isAbsolute, join, relative } from 'node:path';

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

/**
 * The CLI script of a locally installed package, from its `bin` field, or null
 * when the package is not installed. A `bin` map is looked up by the package
 * name, falling back to its first entry when no key matches.
 */
function localBin(pkg) {
  const dir = join(cwd, 'node_modules', pkg);
  const manifest = join(dir, 'package.json');
  if (!existsSync(manifest)) return null;
  const { bin } = JSON.parse(readFileSync(manifest, 'utf8'));
  const script = typeof bin === 'string' ? bin : (bin?.[pkg] ?? Object.values(bin ?? {})[0]);
  return script ? join(dir, script) : null;
}

/**
 * Run a package's CLI on the file. Node runs the script directly, with the
 * file name as its own argument: no shell, so nothing in the name is
 * expanded. Returns null on success, otherwise what the tool printed.
 */
function run(pkg, args) {
  const script = localBin(pkg);
  if (!script) return `${pkg} is not installed; run npm install`;
  try {
    execFileSync(process.execPath, [script, ...args, file], {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return null;
  } catch (err) {
    // Errors go to stderr, results to stdout; report whichever has content.
    const out = [err.stderr, err.stdout].map((s) => (s || '').trim());
    return out.filter(Boolean).join('\n') || err.message;
  }
}

const problems = [];
const prettier = run('prettier', ['--write', '--ignore-unknown']);
if (prettier) problems.push(`prettier: ${prettier}`);

if (['.js', '.mjs', '.cjs', '.ts'].includes(extname(file))) {
  const eslint = run('eslint', ['--fix', '--no-warn-ignored']);
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
