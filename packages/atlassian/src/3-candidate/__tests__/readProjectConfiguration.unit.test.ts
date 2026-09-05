import { describe, expect, it } from 'vitest';

import { createFakeRequest, type FakeRoutes } from '../../test-utils/createFakeRequest.ts';
import { readProjectConfiguration } from '../readProjectConfiguration.ts';

const KEY = 'THOR';
const PROJECT_ID = '10000';
const BOARD_ID = 1;

describe(readProjectConfiguration, () => {
  it('reads the project, board, statuses, workflow, and features', async () => {
    const { calls, request } = createFakeRequest(buildRoutes());

    const configuration = await readProjectConfiguration(request, KEY);

    expect(configuration.board).toStrictEqual({ id: BOARD_ID });
    expect(configuration.project).toStrictEqual({ id: PROJECT_ID });
    expect(configuration.statuses.map((status) => status.name)).toStrictEqual(['To Do', 'Done']);
    expect(configuration.workflow.id).toBe('workflow-1');
    expect([...configuration.features]).toStrictEqual([['jsw.agility.backlog', 'DISABLED']]);
    expect(calls).toHaveLength(5);
  });

  it('carries every issue type into the workflow read rather than the first alone', async () => {
    const { calls, request } = createFakeRequest(buildRoutes());

    await readProjectConfiguration(request, KEY);

    const workflowCall = calls.find((call) => call.path.startsWith('/rest/api/3/workflows'));
    expect(workflowCall?.body).toStrictEqual({
      projectAndIssueTypes: [
        { issueTypeId: '10001', projectId: PROJECT_ID },
        { issueTypeId: '10002', projectId: PROJECT_ID },
      ],
    });
  });

  it('carries a transition through with the fields that this package does not model', async () => {
    const { request } = createFakeRequest(buildRoutes());

    const configuration = await readProjectConfiguration(request, KEY);

    expect(configuration.workflow.transitions[0]).toMatchObject({
      conditions: { operation: 'ALL' },
      id: '10',
      name: 'To Do',
      type: 'GLOBAL',
    });
  });

  it('refuses a company-managed project', async () => {
    const { request } = createFakeRequest(buildRoutesForProject({ id: PROJECT_ID, style: 'classic' }));

    await expect(readProjectConfiguration(request, KEY)).rejects.toThrow(/not team-managed \(style: classic\)/);
  });

  it('refuses a project reporting no style, rather than passing it', async () => {
    const { request } = createFakeRequest(buildRoutesForProject({ id: PROJECT_ID }));

    await expect(readProjectConfiguration(request, KEY)).rejects.toThrow(/not team-managed \(style: absent\)/);
  });

  it('refuses a project reporting a style that it does not recognize', async () => {
    const { request } = createFakeRequest(buildRoutesForProject({ id: PROJECT_ID, style: 'something-new' }));

    await expect(readProjectConfiguration(request, KEY)).rejects.toThrow(/not team-managed \(style: something-new\)/);
  });

  it('takes the sole board without consulting its location', async () => {
    const routes = {
      ...buildRoutes(),
      'GET /rest/agile/1.0/board': { json: { values: [{ id: BOARD_ID, name: 'THOR board' }] } },
    };

    const configuration = await readProjectConfiguration(createFakeRequest(routes).request, KEY);

    expect(configuration.board).toStrictEqual({ id: BOARD_ID });
  });

  it("takes the project's own board where another board also filters on the project", async () => {
    const routes = {
      ...buildRoutes(),
      'GET /rest/agile/1.0/board': {
        json: {
          values: [
            { id: 99, location: { projectId: 20_000 }, name: 'Programme board' },
            { id: BOARD_ID, location: { projectId: 10_000 }, name: 'THOR board' },
          ],
        },
      },
    };

    const configuration = await readProjectConfiguration(createFakeRequest(routes).request, KEY);

    expect(configuration.board).toStrictEqual({ id: BOARD_ID });
  });

  it('refuses a sole board whose location names another project', async () => {
    const routes = {
      ...buildRoutes(),
      'GET /rest/agile/1.0/board': { json: { values: [{ id: 99, location: { projectId: 20_000 } }] } },
    };

    await expect(readProjectConfiguration(createFakeRequest(routes).request, KEY)).rejects.toThrow(
      'resolves to no board of its own (the query returned 1)',
    );
  });

  it('refuses a project owning several of the boards returned', async () => {
    const routes = {
      ...buildRoutes(),
      'GET /rest/agile/1.0/board': {
        json: {
          values: [
            { id: 98, location: { projectId: 10_000 } },
            { id: 99, location: { projectId: 10_000 } },
          ],
        },
      },
    };

    await expect(readProjectConfiguration(createFakeRequest(routes).request, KEY)).rejects.toThrow(
      'resolves to 2 boards of its own',
    );
  });

  it('refuses a project resolving to several boards none of which is its own', async () => {
    const routes = {
      ...buildRoutes(),
      'GET /rest/agile/1.0/board': {
        json: {
          values: [
            { id: 98, location: { projectId: 20_000 } },
            { id: 99, location: { projectId: 30_000 } },
          ],
        },
      },
    };

    await expect(readProjectConfiguration(createFakeRequest(routes).request, KEY)).rejects.toThrow(
      'resolves to no board of its own (the query returned 2)',
    );
  });

  it('reads a feature reported twice rather than refusing over the repeat', async () => {
    const routes = {
      ...buildRoutes(),
      [`GET /rest/agile/1.0/board/${BOARD_ID}/features`]: {
        json: {
          features: [
            { feature: 'jsw.agility.backlog', state: 'DISABLED' },
            { feature: 'jsw.agility.backlog', state: 'ENABLED' },
          ],
        },
      },
    };

    const configuration = await readProjectConfiguration(createFakeRequest(routes).request, KEY);

    expect([...configuration.features]).toStrictEqual([['jsw.agility.backlog', 'ENABLED']]);
  });

  it('refuses a board entry that it cannot read rather than passing over it', async () => {
    const routes = {
      ...buildRoutes(),
      'GET /rest/agile/1.0/board': { json: { values: [{ id: BOARD_ID }, { name: 'no id' }] } },
    };

    await expect(readProjectConfiguration(createFakeRequest(routes).request, KEY)).rejects.toThrow(
      'answered with boards this cannot read',
    );
  });

  it('refuses an issue type that it cannot read, which would otherwise slip past the workflow count', async () => {
    const routes = {
      ...buildRoutes(),
      'GET /rest/api/3/project/THOR/statuses': { json: [{ id: '10001' }, { name: 'no id' }] },
    };

    await expect(readProjectConfiguration(createFakeRequest(routes).request, KEY)).rejects.toThrow(
      'answered with issue types this cannot read',
    );
  });

  it('refuses a board feature that it cannot read rather than reporting it absent', async () => {
    const routes = {
      ...buildRoutes(),
      [`GET /rest/agile/1.0/board/${BOARD_ID}/features`]: {
        json: { features: [{ feature: 'jsw.agility.backlog', state: 'DISABLED' }, { feature: 'jsw.agility.sprints' }] },
      },
    };

    await expect(readProjectConfiguration(createFakeRequest(routes).request, KEY)).rejects.toThrow(
      'answered with features this cannot read',
    );
  });

  it('refuses a project with no board', async () => {
    const routes = { ...buildRoutes(), [`GET /rest/agile/1.0/board`]: { json: { values: [] } } };

    await expect(readProjectConfiguration(createFakeRequest(routes).request, KEY)).rejects.toThrow(
      'Project THOR has no board.',
    );
  });

  it('refuses a project whose issue types resolve to more than one workflow', async () => {
    const routes = {
      ...buildRoutes(),
      'POST /rest/api/3/workflows': { json: { statuses: [], workflows: [buildWorkflow(), buildWorkflow()] } },
    };

    await expect(readProjectConfiguration(createFakeRequest(routes).request, KEY)).rejects.toThrow(
      'resolves its 2 issue types to 2 workflows',
    );
  });

  it('refuses a project whose issue types resolve to no workflow', async () => {
    const routes = { ...buildRoutes(), 'POST /rest/api/3/workflows': { json: { statuses: [], workflows: [] } } };

    await expect(readProjectConfiguration(createFakeRequest(routes).request, KEY)).rejects.toThrow(
      'resolves its 2 issue types to 0 workflows',
    );
  });

  it('refuses a status that it cannot read rather than dropping it', async () => {
    const routes = {
      ...buildRoutes(),
      'POST /rest/api/3/workflows': {
        json: { statuses: [{ id: 'id-1', name: 'To Do' }], workflows: [buildWorkflow()] },
      },
    };

    await expect(readProjectConfiguration(createFakeRequest(routes).request, KEY)).rejects.toThrow(
      'answered with statuses this cannot read',
    );
  });

  it('throws through requestOk where a read is rejected', async () => {
    const routes = { ...buildRoutes(), 'GET /rest/api/3/project/THOR': { json: { errorMessages: [] }, status: 403 } };

    await expect(readProjectConfiguration(createFakeRequest(routes).request, KEY)).rejects.toMatchObject({
      label: 'read project THOR',
      status: 403,
    });
  });
});

// region | Helpers

/** Builds the five routes that a whole read walks, against a team-managed project on one workflow. */
function buildRoutes(): FakeRoutes {
  return {
    'GET /rest/agile/1.0/board': { json: { values: [{ id: BOARD_ID, name: 'THOR board' }] } },
    [`GET /rest/agile/1.0/board/${BOARD_ID}/features`]: {
      json: { features: [{ feature: 'jsw.agility.backlog', state: 'DISABLED' }] },
    },
    'GET /rest/api/3/project/THOR': { json: { id: PROJECT_ID, key: KEY, style: 'next-gen' } },
    'GET /rest/api/3/project/THOR/statuses': { json: [{ id: '10001' }, { id: '10002' }] },
    'POST /rest/api/3/workflows': {
      json: {
        statuses: [
          { description: '', id: 'id-1', name: 'To Do', statusCategory: 'TODO', statusReference: 'ref-1' },
          { description: '', id: 'id-2', name: 'Done', statusCategory: 'DONE', statusReference: 'ref-2' },
        ],
        workflows: [buildWorkflow()],
      },
    },
  };
}

/** Builds the whole route set around a project resource answering as given. */
function buildRoutesForProject(project: Record<string, unknown>): FakeRoutes {
  return { ...buildRoutes(), 'GET /rest/api/3/project/THOR': { json: project } };
}

/** Builds the workflow graph narrowed by the read, carrying a `conditions` field that this package does not model. */
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
