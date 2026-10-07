// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * The Claude Code hooks in `.claude/hooks/`, run as Claude Code runs them: a
 * Node process fed the hook's JSON input on stdin. The branch guard is driven
 * against throwaway git repositories; the formatter against files in a
 * scratch directory inside this repository, where prettier and eslint are
 * installed.
 */

const ROOT = resolve(__dirname, '..');
const GUARD = join(ROOT, '.claude/hooks/guard-protected-branches.mjs');
const FORMAT = join(ROOT, '.claude/hooks/format-on-edit.mjs');

// Identity for the fixture repositories only, through the environment so no
// command line carries it.
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: 'fixture',
  GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
  GIT_COMMITTER_NAME: 'fixture',
  GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
};

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, env: GIT_ENV, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

function runHook(hook, input) {
  const r = spawnSync(process.execPath, [hook], {
    input: JSON.stringify(input),
    encoding: 'utf8',
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

/** Exit status of the guard for `command` run from `cwd`: 2 means blocked. */
function guard(command, cwd) {
  return runHook(GUARD, { tool_input: { command }, cwd }).status;
}

describe('guard-protected-branches', () => {
  let base;
  /** On `main`, with `origin/main` fetched. */
  let onMain;
  /** On `feature`, with `origin/main` fetched. */
  let onFeature;
  /** On `main`; the remote has `main`, but it was never fetched. */
  let unfetched;

  beforeAll(() => {
    base = mkdtempSync(join(tmpdir(), 'guard-'));
    const remote = join(base, 'remote.git');
    git(base, 'init', '--bare', '-b', 'main', remote);

    onMain = join(base, 'on-main');
    git(base, 'init', '-b', 'main', onMain);
    writeFileSync(join(onMain, 'a.txt'), 'a\n');
    git(onMain, 'add', '.');
    git(onMain, 'commit', '-m', 'init');
    git(onMain, 'remote', 'add', 'origin', remote);
    git(onMain, 'push', 'origin', 'main');
    git(onMain, 'fetch', 'origin');

    onFeature = join(base, 'on-feature');
    git(base, 'clone', remote, onFeature);
    git(onFeature, 'checkout', '-b', 'feature');

    unfetched = join(base, 'unfetched');
    git(base, 'init', '-b', 'main', unfetched);
    writeFileSync(join(unfetched, 'a.txt'), 'a\n');
    git(unfetched, 'add', '.');
    git(unfetched, 'commit', '-m', 'init');
    git(unfetched, 'remote', 'add', 'origin', remote);
  });

  afterAll(() => {
    rmSync(base, { recursive: true, force: true });
  });

  it('blocks a commit on main and allows one on a feature branch', () => {
    expect(guard('git commit -m x', onMain)).toBe(2);
    expect(guard('git commit -m x', onFeature)).toBe(0);
  });

  it('checks the repository a cd or -C points at', () => {
    expect(guard(`cd "${onMain}" && git commit -m x`, onFeature)).toBe(2);
    expect(guard(`git -C "${onMain}" commit -m x`, onFeature)).toBe(2);
    expect(guard(`git -C "${onFeature}" commit -m x`, onMain)).toBe(0);
  });

  it('blocks a push to main and allows one to another branch', () => {
    expect(guard('git push origin main', onFeature)).toBe(2);
    expect(guard('git push origin HEAD:main', onFeature)).toBe(2);
    expect(guard('git push origin feature', onFeature)).toBe(0);
    expect(guard('git push', onMain)).toBe(2);
  });

  it('blocks force refspecs and HEAD pushed from main (Qodo #8)', () => {
    expect(guard('git push origin +main', onFeature)).toBe(2);
    expect(guard('git push origin +refs/heads/main', onFeature)).toBe(2);
    expect(guard('git push origin HEAD', onMain)).toBe(2);
    expect(guard('git push origin +HEAD', onMain)).toBe(2);
    expect(guard('git push origin HEAD', onFeature)).toBe(0);
  });

  it('blocks --all and --mirror, which push main too', () => {
    expect(guard('git push --all origin', onFeature)).toBe(2);
    expect(guard('git push --mirror origin', onFeature)).toBe(2);
  });

  it('blocks a push to main even when origin/main was never fetched (Qodo #3)', () => {
    expect(guard('git push origin main', unfetched)).toBe(2);
  });

  it('follows a backslash-continued command onto the next line (Qodo #4)', () => {
    expect(guard('git \\\ncommit -m x', onMain)).toBe(2);
    expect(guard('git push \\\n  origin main', onFeature)).toBe(2);
  });

  it('only treats git as git when it is the command run (Qodo #6)', () => {
    expect(guard('echo git commit', onMain)).toBe(0);
    expect(guard('grep -r "git push origin main" docs', onFeature)).toBe(0);
  });

  it('still sees git behind env assignments and command wrappers', () => {
    expect(guard('GIT_TRACE=1 git commit -m x', onMain)).toBe(2);
    expect(guard('env GIT_TRACE=1 git commit -m x', onMain)).toBe(2);
    expect(guard('rtk git push origin main', onFeature)).toBe(2);
  });

  it('blocks a wildcard refspec whose destination can be main', () => {
    expect(guard("git push origin 'refs/heads/*:refs/heads/*'", onFeature)).toBe(2);
    expect(guard("git push origin '+refs/heads/*:refs/heads/*'", onFeature)).toBe(2);
    expect(guard("git push origin 'refs/heads/feat-*:refs/heads/feat-*'", onFeature)).toBe(0);
  });

  it('does not split on separators inside quotes', () => {
    // A word after `main` keeps the closing quote off it, so a quote-blind
    // split would see a real push to main.
    expect(guard('git commit -m "fix; git push origin main later"', onFeature)).toBe(0);
    expect(guard("git commit -m 'a && git push origin main later'", onFeature)).toBe(0);
    expect(guard('git commit -m "say \\"hi\\"; git push origin main later"', onFeature)).toBe(0);
    expect(guard('git commit -m "x" && git push origin main', onFeature)).toBe(2);
  });
});

describe('format-on-edit', () => {
  let scratch;

  beforeAll(() => {
    scratch = join(ROOT, 'tests', '.hook-scratch');
    mkdirSync(scratch, { recursive: true });
  });

  afterAll(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  /** Write `content` to `name` in the scratch dir, run the hook on it. */
  function edit(name, content) {
    const file = join(scratch, name);
    writeFileSync(file, content);
    const out = runHook(FORMAT, { tool_input: { file_path: file }, cwd: ROOT });
    return { ...out, after: readFileSync(file, 'utf8') };
  }

  it('formats the edited file', () => {
    expect(edit('plain.md', '#   Title\n').after).toBe('# Title\n');
  }, 30000);

  it('passes the file name to prettier verbatim, never through a shell (Qodo #2)', () => {
    // Each name is mangled by one platform's shell: %OS% by cmd.exe on
    // Windows, $(...) by sh elsewhere. Formatting the right file proves the
    // name reached prettier as written.
    expect(edit('cmd-%OS%.md', '#   Title\n').after).toBe('# Title\n');
    if (process.platform !== 'win32') {
      expect(edit('sh-$(echo x).md', '#   Title\n').after).toBe('# Title\n');
    }
  }, 30000);

  it('reports a formatter failure back to the agent (Qodo #9)', () => {
    const { stdout } = edit('broken.js', 'const = ;\n');
    expect(stdout).toContain('additionalContext');
    expect(stdout).toMatch(/prettier: .*\S/);
  }, 30000);
});
