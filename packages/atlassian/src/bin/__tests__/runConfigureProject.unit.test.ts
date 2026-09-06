import { describe, expect, it } from 'vitest';

import type { FakeRoutes } from '../../test-utils/createFakeRequest.ts';
import { runTbJira } from '../runTbJira.ts';
import { createTbJiraHarness, type HarnessOptions } from '../test-utils/createTbJiraHarness.ts';

const BOARD_ID = 1;
const KEY = 'THOR';
const PROJECT_ID = '10000';
const SPEC_PATH = '/repo/jira-project-spec.json';

const CONFORMANT_SPEC = JSON.stringify({
  boardFeatures: { 'jsw.agility.backlog': 'DISABLED' },
  email: 'spec@example.com',
  site: 'spec.atlassian.net',
  statuses: [
    { category: 'TODO', name: 'To Do' },
    { category: 'DONE', name: 'Done' },
  ],
});

const RENAMING_SPEC = JSON.stringify({
  site: 'spec.atlassian.net',
  statuses: [
    { aliases: ['To Do'], category: 'TODO', name: 'Todo' },
    { category: 'DONE', name: 'Done' },
  ],
});

describe('tb-jira configure-project', () => {
  it('prints the help it is asked for', async () => {
    const harness = createHarness();

    await expect(run(harness, ['--help'])).resolves.toBe(0);
    expect(harness.readOutput()).toContain('Usage: tb-jira configure-project <KEY>');
  });

  it('requires a project key', async () => {
    const harness = createHarness();

    await expect(run(harness, [])).resolves.toBe(2);
    expect(harness.readErrors()).toContain('A project key is required.');
  });

  it('reports a project that already matches the spec, and exits 0', async () => {
    const harness = createHarness();

    await expect(run(harness, [KEY])).resolves.toBe(0);
    expect(harness.readOutput()).toContain('no changes: the project already matches the spec');
    expect(harness.readOutput()).toContain('configuration after the run:');
  });

  it('finds the spec by ascending from the working directory', async () => {
    const harness = createHarness({ cwd: '/repo', files: { [SPEC_PATH]: CONFORMANT_SPEC } });

    await expect(run(harness, [KEY])).resolves.toBe(0);
  });

  it('reads the spec that --spec names', async () => {
    const harness = createHarness({ files: { '/elsewhere/spec.json': CONFORMANT_SPEC } });

    await expect(run(harness, [KEY, '--spec', '/elsewhere/spec.json'])).resolves.toBe(0);
  });

  describe('a dry run', () => {
    it('prints the plan and writes nothing, against a transport that fails on anything but a known read', async () => {
      const harness = createHarness({ files: { [SPEC_PATH]: RENAMING_SPEC }, readOnly: true });

      await expect(run(harness, [KEY, '--dry-run'])).resolves.toBe(0);
      expect(harness.readOutput()).toContain("update   status id-1: 'To Do' → 'Todo'");
      expect(harness.readOutput()).toContain('dry run: nothing was written');
    });

    it('reports the seed it would run without moving anything', async () => {
      const harness = createHarness({ readOnly: true });

      await run(harness, [KEY, '--dry-run', '--seed-backlog', 'To Do']);

      expect(harness.readOutput()).toContain("seed     move every 'To Do' work item off the board");
    });
  });

  describe('a real run', () => {
    it('writes the reconciled workflow and reports what it amended', async () => {
      const harness = createHarness({ files: { [SPEC_PATH]: RENAMING_SPEC } });

      await run(harness, [KEY]);

      expect(harness.readOutput()).toContain('workflow updated: 1 amended, 0 created');
      expect(harness.calls.some((call) => call.method === 'POST' && call.path === '/rest/api/3/workflows/update')).toBe(
        true,
      );
    });

    it('issues no workflow write where the plan holds no change', async () => {
      const harness = createHarness();

      await run(harness, [KEY]);

      expect(harness.readOutput()).toContain('workflow unchanged');
    });

    it('moves the named status off the board and names the call that puts it back', async () => {
      const harness = createHarness();

      await run(harness, [KEY, '--seed-backlog', 'To Do']);

      expect(harness.readOutput()).toContain("backlog  moved 2 'To Do' work items off the board");
      expect(harness.readOutput()).toContain(`undo: POST /rest/agile/1.0/board/${BOARD_ID}/issue`);
    });

    it('reports an empty seed rather than issuing a move', async () => {
      const harness = createHarness({ routes: { 'POST /rest/api/3/search/jql': { json: { issues: [] } } } });

      await run(harness, [KEY, '--seed-backlog', 'To Do']);

      expect(harness.readOutput()).toContain("backlog  no 'To Do' work items to move");
      expect(harness.calls.some((call) => call.path.includes('/backlog/'))).toBe(false);
    });

    it('exits 5 where the server does not hold what the spec declares', async () => {
      const harness = createHarness({ files: { [SPEC_PATH]: RENAMING_SPEC } });

      await expect(run(harness, [KEY])).resolves.toBe(5);
      expect(harness.readOutput()).toContain("MISS Todo (absent), transition 'absent'");
    });
  });

  describe('the credential', () => {
    it('exits 4 naming the call that Jira rejected', async () => {
      const harness = createHarness({
        routes: { 'GET /rest/api/3/project/THOR': { json: { errorMessages: ['Unauthorized'] }, status: 401 } },
      });

      await expect(run(harness, [KEY])).resolves.toBe(4);
      expect(harness.readErrors()).toContain('401');
    });

    it('reads the token from stdin, dropping the newline a shell adds', async () => {
      const harness = createHarness({ env: {}, stdin: 'piped-token\n' });

      await expect(run(harness, [KEY, '--token-stdin'])).resolves.toBe(0);
      expect(harness.transportOptions()?.token).toBe('piped-token');
    });

    it('builds the transport with the resolved site, email, and token', async () => {
      const harness = createHarness();

      await run(harness, [KEY]);

      expect(harness.transportOptions()).toMatchObject({
        baseUrl: 'https://api.atlassian.com/ex/jira/cloud-1',
        email: 'someone@example.com',
        token: 'a-token',
      });
      expect(harness.fetchedUrls()).toStrictEqual(['https://spec.atlassian.net/_edge/tenant_info']);
    });

    it('prefers --site over the environment and the spec, reading the cloudId from it', async () => {
      const harness = createHarness({
        env: { JIRA_API_TOKEN: 'a-token', JIRA_EMAIL: 'someone@example.com', JIRA_SITE: 'env.atlassian.net' },
      });

      await run(harness, [KEY, '--site', 'flag.atlassian.net']);

      expect(harness.fetchedUrls()).toStrictEqual(['https://flag.atlassian.net/_edge/tenant_info']);
    });

    it('falls back to JIRA_SITE before the spec', async () => {
      const harness = createHarness({
        env: { JIRA_API_TOKEN: 'a-token', JIRA_EMAIL: 'someone@example.com', JIRA_SITE: 'env.atlassian.net' },
      });

      await run(harness, [KEY]);

      expect(harness.fetchedUrls()).toStrictEqual(['https://env.atlassian.net/_edge/tenant_info']);
    });

    it('exits 3 where the keychain could not be reached', async () => {
      const harness = createHarness({
        env: { JIRA_EMAIL: 'someone@example.com' },
        keystoreFault: 'the keychain is locked',
      });

      await expect(run(harness, [KEY])).resolves.toBe(3);
      expect(harness.readErrors()).toContain('the keychain is locked');
    });

    it('reports a token no source holds, naming the command that stores one', async () => {
      const harness = createHarness({ env: {} });

      await expect(run(harness, [KEY])).resolves.toBe(2);
      expect(harness.readErrors()).toContain('tb-secret set toolbelt.atlassian.jira');
    });

    it('takes the email from the spec where neither the flag nor the environment holds one', async () => {
      const harness = createHarness({ env: { JIRA_API_TOKEN: 'a-token' } });

      await expect(run(harness, [KEY])).resolves.toBe(0);
      expect(harness.transportOptions()?.email).toBe('spec@example.com');
    });

    it('prefers --email over the environment and the spec', async () => {
      const harness = createHarness();

      await run(harness, [KEY, '--email', 'flag@example.com']);

      expect(harness.transportOptions()?.email).toBe('flag@example.com');
    });

    it('reports a site no source holds', async () => {
      const harness = createHarness({
        files: { [SPEC_PATH]: JSON.stringify({ statuses: [{ category: 'TODO', name: 'To Do' }] }) },
      });

      await expect(run(harness, [KEY])).resolves.toBe(2);
      expect(harness.readErrors()).toContain('JIRA_SITE');
    });

    it('exits 6 where Jira could not be reached, naming the URL and the fault', async () => {
      const cause = new Error('getaddrinfo ENOTFOUND spec.atlassian.net');
      const harness = createHarness({ fetchFault: new TypeError('fetch failed', { cause }) });

      await expect(run(harness, [KEY])).resolves.toBe(6);
      expect(harness.readErrors()).toContain(
        'Could not reach https://spec.atlassian.net/_edge/tenant_info: fetch failed: getaddrinfo ENOTFOUND spec.atlassian.net',
      );
    });

    it('does not point an unreachable site at the help, which cannot fix a network', async () => {
      const harness = createHarness({ fetchFault: new TypeError('fetch failed') });

      await run(harness, [KEY]);

      expect(harness.readErrors()).not.toContain('--help');
    });
  });
});

// region | Helpers

function createHarness(options: HarnessOptions = {}): ReturnType<typeof createTbJiraHarness> {
  return createTbJiraHarness({
    env: { JIRA_API_TOKEN: 'a-token', JIRA_EMAIL: 'someone@example.com' },
    files: { [SPEC_PATH]: CONFORMANT_SPEC },
    ...options,
    routes: { ...buildRoutes(), ...options.routes },
  });
}

/** Runs `configure-project` through the whole command line, so dispatch is exercised alongside it. */
async function run(harness: ReturnType<typeof createTbJiraHarness>, args: string[]): Promise<number> {
  return await runTbJira(['configure-project', ...args], harness.effects);
}

/** Builds every route a whole run walks, against a team-managed project on one workflow. */
function buildRoutes(): FakeRoutes {
  return {
    'GET /rest/agile/1.0/board': { json: { values: [{ id: BOARD_ID, name: 'THOR board' }] } },
    [`GET /rest/agile/1.0/board/${BOARD_ID}/configuration`]: {
      json: {
        columnConfig: {
          columns: [
            { name: 'To Do', statuses: [{ id: 'id-1' }] },
            { name: 'Done', statuses: [{ id: 'id-2' }] },
          ],
        },
      },
    },
    [`GET /rest/agile/1.0/board/${BOARD_ID}/features`]: {
      json: { features: [{ feature: 'jsw.agility.backlog', state: 'DISABLED' }] },
    },
    [`POST /rest/agile/1.0/backlog/${BOARD_ID}/issue`]: { status: 204 },
    'GET /rest/api/3/project/THOR': { json: { id: PROJECT_ID, key: KEY, style: 'next-gen' } },
    'GET /rest/api/3/project/THOR/statuses': { json: [{ id: '10001' }] },
    'GET /rest/api/3/statuses/search': { json: { values: [] } },
    'POST /rest/api/3/search/jql': { json: { issues: [{ key: 'THOR-1' }, { key: 'THOR-2' }] } },
    'POST /rest/api/3/workflows': {
      json: {
        statuses: [
          { description: '', id: 'id-1', name: 'To Do', statusCategory: 'TODO', statusReference: 'ref-1' },
          { description: '', id: 'id-2', name: 'Done', statusCategory: 'DONE', statusReference: 'ref-2' },
        ],
        workflows: [buildWorkflow()],
      },
    },
    'POST /rest/api/3/workflows/update': { json: {} },
    'PUT /rest/api/3/statuses': { json: {} },
  };
}

/** Builds the workflow graph the read narrows, reaching each status through a global transition named for it. */
function buildWorkflow(): unknown {
  return {
    description: 'The project workflow.',
    id: 'workflow-1',
    name: 'THOR: Software Simplified Workflow',
    startPointLayout: { x: 0, y: 0 },
    statuses: [
      { layout: { x: 0, y: 0 }, statusReference: 'ref-1' },
      { layout: { x: 0, y: 60 }, statusReference: 'ref-2' },
    ],
    transitions: [
      { conditions: { operation: 'ALL' }, id: '10', name: 'To Do', toStatusReference: 'ref-1', type: 'GLOBAL' },
      { conditions: { operation: 'ALL' }, id: '20', name: 'Done', toStatusReference: 'ref-2', type: 'GLOBAL' },
    ],
    version: { id: 'version-1', versionNumber: 1 },
  };
}

// endregion | Helpers
