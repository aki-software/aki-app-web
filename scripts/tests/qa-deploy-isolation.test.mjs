import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';

const workflow = readFileSync(new URL('../../.github/workflows/cd-qa.yml', import.meta.url), 'utf8');
const changes = workflow.slice(workflow.indexOf('  changes:'), workflow.indexOf('  publish-api-image:'));
const base = changes.match(/^\s+base:\s*(.+)$/m)?.[1].trim();
const filters = changes.match(/          filters: \|\r?\n([\s\S]*?)(?=\r?\n\S|$)/)?.[1]
  .split(/\r?\n/).map(line => line.replace(/^            /, '')).join('\n').trim();

test('QA push comparison uses the pushed branch instead of accumulated main divergence', () => {
  assert.equal(base, '${{ github.ref }}');
});

test('existing app gates and explicit manual all-service deployment remain unchanged', () => {
  assert.match(workflow, /^      - qa\s*$/m);
  assert.match(workflow, /^  workflow_dispatch:/m);
  for (const [job, app] of [
    ['publish-api-image', 'api'], ['run-migrations-qa', 'api'],
    ['deploy-api-qa', 'api'], ['deploy-web-qa', 'web'], ['deploy-site-qa', 'site'],
  ]) {
    const section = workflow.split(`\n  ${job}:`)[1]?.split(/\n  [a-z][a-z-]+:/)[0];
    assert.ok(section, `Missing existing job ${job}`);
    assert.ok(section.includes(`if: needs.changes.outputs.${app} == 'true' || github.event_name == 'workflow_dispatch'`), job);
  }
});

const action = process.env.PATHS_FILTER_ACTION;
test('real paths-filter action isolates Site pushes and preserves sibling/shared filters', {
  skip: !action && 'Set PATHS_FILTER_ACTION to the official v3 dist/index.js to run action probes',
}, () => {
  const scratch = mkdtempSync(join(tmpdir(), 'qa-deploy-isolation-'));
  console.log(`Action probe scratch: ${scratch}`);
  const env = {
    ...process.env,
    HOME: scratch,
    USERPROFILE: scratch,
    XDG_CONFIG_HOME: scratch,
    GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_TERMINAL_PROMPT: '0',
  };
  const git = (...args) => execFileSync('git', args, { cwd: scratch, env, encoding: 'utf8' }).trim();
  const put = (path, text) => {
    const target = join(scratch, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text);
  };
  const commit = message => { git('add', '.'); git('commit', '-m', message); return git('rev-parse', 'HEAD'); };
  git('init', '-b', 'main');
  git('config', 'user.name', 'Deployment Test');
  git('config', 'user.email', 'deployment-test@example.invalid');
  put('README.md', 'Baseline\n');
  commit('baseline');
  git('switch', '-c', 'qa');
  put('apps/api/prior.txt', 'Existing QA-only API feature\n');
  put('apps/web/prior.txt', 'Existing QA-only Web feature\n');
  let before = commit('existing QA divergence');
  // A local remote prevents the action from accessing an authenticated repository.
  git('remote', 'add', 'origin', scratch.replaceAll('\\', '/'));

  const scenarios = [
    { paths: ['apps/site/landing.txt', 'apps/site/copy.txt'], expected: { api: 'false', web: 'false', site: 'true' } },
    { paths: ['apps/api/current.txt'], expected: { api: 'true', web: 'false', site: 'false' } },
    { paths: ['apps/web/current.txt'], expected: { api: 'false', web: 'true', site: 'false' } },
    { paths: ['packages/design-tokens/current.txt'], expected: { api: 'true', web: 'true', site: 'true' } },
    { paths: ['pnpm-lock.yaml'], expected: { api: 'true', web: 'true', site: 'true' } },
    { paths: ['docs/qa-selection.md'], expected: { api: 'false', web: 'false', site: 'false' } },
    { paths: ['packages/contracts/qa-selection.ts'], expected: { api: 'true', web: 'true', site: 'false' } },
    { paths: ['apps/site/mixed.txt', 'apps/api/mixed.txt'], expected: { api: 'true', web: 'false', site: 'true' } },
  ];
  for (const [index, scenario] of scenarios.entries()) {
    // The first scenario covers multiple commits in one push, not just HEAD^.
    for (const path of scenario.paths) { put(path, `Scenario ${index}\n`); commit(`change ${path}`); }
    const after = git('rev-parse', 'HEAD');
    const event = join(scratch, `event-${index}.json`);
    const output = join(scratch, `output-${index}.txt`);
    writeFileSync(event, JSON.stringify({ before, after, repository: { default_branch: 'main' } }));
    writeFileSync(output, '');
    const run = spawnSync(process.execPath, [resolve(action)], {
      cwd: scratch,
      encoding: 'utf8',
      env: {
        ...env,
        GITHUB_EVENT_NAME: 'push', GITHUB_EVENT_PATH: event,
        GITHUB_REF: 'refs/heads/qa', GITHUB_SHA: after,
        GITHUB_REPOSITORY: 'fixture/deploy-isolation', GITHUB_WORKSPACE: scratch,
        GITHUB_OUTPUT: output,
        INPUT_BASE: base === '${{ github.ref }}' ? 'refs/heads/qa' : (base || ''),
        INPUT_FILTERS: filters, INPUT_TOKEN: '', INPUT_REF: '',
        'INPUT_WORKING-DIRECTORY': '', 'INPUT_LIST-FILES': 'none',
        'INPUT_INITIAL-FETCH-DEPTH': '100', 'INPUT_PREDICATE-QUANTIFIER': 'some',
      },
    });
    assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
    const results = readFileSync(output, 'utf8');
    for (const [app, expected] of Object.entries(scenario.expected)) {
      assert.match(results, new RegExp(`(?:^|\\n)${app}<<([^\\r\\n]+)\\r?\\n${expected}\\r?\\n`),
        `${scenario.paths.join(', ')} should produce ${app}=${expected}: ${results}`);
    }
    before = after;
  }
});
