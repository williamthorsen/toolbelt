import { describe, expect, it } from 'vitest';

import { createFakeRequest, type FakeRoutes } from '../../test-utils/createFakeRequest.ts';
import { buildProjectConfiguration } from '../../test-utils/projectConfiguration.ts';
import { applyWorkflowUpdate } from '../applyWorkflowUpdate.ts';
import type { ReconciliationPlan, StatusUpdate } from '../ReconciliationPlan.ts';

const UPDATE_PATH = '/rest/api/3/workflows/update';
const SEARCH_PATH = '/rest/api/3/statuses/search';
const STATUSES_PATH = '/rest/api/3/statuses';

const RENAME: StatusUpdate = {
  category: 'IN_PROGRESS',
  description: 'The work is under way.',
  from: 'In Progress',
  fromCategory: 'IN_PROGRESS',
  id: 'id-in-progress',
  statusReference: 'ref-in-progress',
  to: 'Doing',
};

describe(applyWorkflowUpdate, () => {
  it('writes the payload and reports nothing corrected where the read-back shows the write took', async () => {
    const { calls, request } = createFakeRequest(
      buildRoutes([{ id: RENAME.id, name: 'Doing', statusCategory: 'IN_PROGRESS' }]),
    );

    const result = await applyWorkflowUpdate(request, buildProjectConfiguration(), buildPlan([RENAME]));

    expect(result).toStrictEqual({ correctedStatuses: [], written: true });
    expect(calls.map((call) => call.path)).toStrictEqual([
      UPDATE_PATH,
      `${SEARCH_PATH}?projectId=10000&maxResults=100`,
    ]);
  });

  it('writes through the status API where the read-back shows the write did not take', async () => {
    const { calls, request } = createFakeRequest(
      buildRoutes([{ id: RENAME.id, name: 'In Progress', statusCategory: 'IN_PROGRESS' }]),
    );

    const result = await applyWorkflowUpdate(request, buildProjectConfiguration(), buildPlan([RENAME]));

    expect(result.correctedStatuses).toStrictEqual([RENAME]);
    expect(calls.at(-1)).toStrictEqual({
      body: { statuses: [{ description: '', id: RENAME.id, name: 'Doing', statusCategory: 'IN_PROGRESS' }] },
      method: 'PUT',
      path: STATUSES_PATH,
    });
  });

  it('reports a rename that changed only casing as unlanded, since the write asked for the new casing', async () => {
    const update: StatusUpdate = { ...RENAME, from: 'doing', to: 'Doing' };
    const { calls, request } = createFakeRequest(
      buildRoutes([{ id: update.id, name: 'doing', statusCategory: 'IN_PROGRESS' }]),
    );

    const result = await applyWorkflowUpdate(request, buildProjectConfiguration(), buildPlan([update]));

    expect(result.correctedStatuses).toStrictEqual([update]);
    // A casing-only change is no rename, so the status keeps the description written for it.
    expect(calls.at(-1)?.body).toStrictEqual({
      statuses: [{ description: update.description, id: update.id, name: 'Doing', statusCategory: 'IN_PROGRESS' }],
    });
  });

  it('keeps the description where only the category changed', async () => {
    const update: StatusUpdate = { ...RENAME, category: 'DONE', to: RENAME.from };
    const { calls, request } = createFakeRequest(
      buildRoutes([{ id: update.id, name: update.to, statusCategory: 'IN_PROGRESS' }]),
    );

    await applyWorkflowUpdate(request, buildProjectConfiguration(), buildPlan([update]));

    expect(calls.at(-1)?.body).toStrictEqual({
      statuses: [{ description: update.description, id: update.id, name: update.to, statusCategory: 'DONE' }],
    });
  });

  it('writes nothing where the plan holds no workflow change', async () => {
    const { calls, request } = createFakeRequest({});

    const result = await applyWorkflowUpdate(request, buildProjectConfiguration(), buildPlan([]));

    expect(result).toStrictEqual({ correctedStatuses: [], written: false });
    expect(calls).toStrictEqual([]);
  });

  it('reads no statuses back where the plan creates a status but amends none', async () => {
    const plan = {
      ...buildPlan([]),
      creations: [{ category: 'TODO', name: 'Triage', statusReference: 'ref-triage' }],
    } as const satisfies ReconciliationPlan;
    const { calls, request } = createFakeRequest(buildRoutes([]));

    const result = await applyWorkflowUpdate(request, buildProjectConfiguration(), plan);

    expect(result).toStrictEqual({ correctedStatuses: [], written: true });
    expect(calls.map((call) => call.path)).toStrictEqual([UPDATE_PATH]);
  });

  it('throws where the workflow write is rejected, leaving the status API untouched', async () => {
    const routes = { ...buildRoutes([]), [`POST ${UPDATE_PATH}`]: { json: { errors: {} }, status: 400 } };
    const { calls, request } = createFakeRequest(routes);

    await expect(applyWorkflowUpdate(request, buildProjectConfiguration(), buildPlan([RENAME]))).rejects.toMatchObject({
      label: 'update workflow',
      status: 400,
    });
    expect(calls.map((call) => call.path)).toStrictEqual([UPDATE_PATH]);
  });
});

// region | Helpers

/** Builds a plan carrying the given status updates and nothing else. */
function buildPlan(statusUpdates: readonly StatusUpdate[]): ReconciliationPlan {
  return { creations: [], featureToggles: [], statusUpdates, transitionRenames: [], unmanaged: [] };
}

/** Builds the write and read-back routes, with the read-back answering the given live statuses. */
function buildRoutes(live: readonly unknown[]): FakeRoutes {
  return {
    [`GET ${SEARCH_PATH}`]: { json: { values: live } },
    [`POST ${UPDATE_PATH}`]: { json: {} },
    [`PUT ${STATUSES_PATH}`]: { json: {} },
  };
}

// endregion | Helpers
