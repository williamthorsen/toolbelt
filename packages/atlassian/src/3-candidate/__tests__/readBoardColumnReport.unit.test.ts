import { describe, expect, it } from 'vitest';

import { createFakeRequest, type FakeRoutes } from '../../test-utils/createFakeRequest.ts';
import { buildProjectConfiguration } from '../../test-utils/projectConfiguration.ts';
import type { ProjectSpec } from '../ProjectSpec.ts';
import { readBoardColumnReport } from '../readBoardColumnReport.ts';

const CONFIGURATION_PATH = 'GET /rest/agile/1.0/board/1/configuration';

const SPEC: ProjectSpec = {
  statuses: [
    { category: 'TODO', name: 'To Do' },
    { category: 'IN_PROGRESS', name: 'In Progress' },
    { category: 'DONE', name: 'Done' },
  ],
};

describe(readBoardColumnReport, () => {
  it('reports a conformant board with no uncovered status and no order mismatch', async () => {
    const { request } = createFakeRequest(buildRoutes(['To Do', 'In Progress', 'Done']));

    const report = await readBoardColumnReport(request, buildProjectConfiguration(), SPEC);

    expect(report).toStrictEqual({ columns: ['To Do', 'In Progress', 'Done'], order: undefined, uncovered: [] });
  });

  it('reports a status mapped to no column, whose work items appear only in search', async () => {
    const { request } = createFakeRequest(buildRoutes(['To Do', 'In Progress']));

    const report = await readBoardColumnReport(request, buildProjectConfiguration(), SPEC);

    expect(report.uncovered).toStrictEqual(['Done']);
  });

  it('reports the two orders where the board runs its columns in another one', async () => {
    const { request } = createFakeRequest(buildRoutes(['Done', 'To Do', 'In Progress']));

    const report = await readBoardColumnReport(request, buildProjectConfiguration(), SPEC);

    expect(report.order).toStrictEqual({
      actual: ['Done', 'To Do', 'In Progress'],
      expected: ['To Do', 'In Progress', 'Done'],
    });
  });

  it('passes over a column the spec does not name rather than reporting it out of order', async () => {
    const { request } = createFakeRequest(buildRoutes(['To Do', 'Blocked', 'In Progress', 'Done']));

    const report = await readBoardColumnReport(request, buildProjectConfiguration(), SPEC);

    expect(report.columns).toStrictEqual(['To Do', 'Blocked', 'In Progress', 'Done']);
    expect(report.order).toBeUndefined();
  });

  it('matches a column name differing only in casing', async () => {
    const { request } = createFakeRequest(buildRoutes(['to do', 'In Progress', 'Done']));

    const report = await readBoardColumnReport(request, buildProjectConfiguration(), SPEC);

    expect(report.uncovered).toStrictEqual([]);
    expect(report.order).toBeUndefined();
  });

  it('passes over a spec status the workflow does not hold, which the plan reports as a creation', async () => {
    const spec = { statuses: [...SPEC.statuses, { category: 'TODO', name: 'Triage' }] } satisfies ProjectSpec;
    const { request } = createFakeRequest(buildRoutes(['To Do', 'In Progress', 'Done']));

    const report = await readBoardColumnReport(request, buildProjectConfiguration(), spec);

    expect(report.uncovered).toStrictEqual([]);
  });

  it('throws naming the board where the configuration read is rejected', async () => {
    const { request } = createFakeRequest({ [CONFIGURATION_PATH]: { json: { errorMessages: [] }, status: 403 } });

    await expect(readBoardColumnReport(request, buildProjectConfiguration(), SPEC)).rejects.toMatchObject({
      label: 'read configuration for board 1',
      status: 403,
    });
  });
});

// region | Helpers

/** Builds the board configuration route, one column per name, each mapped to the status the name claims. */
function buildRoutes(columnNames: readonly string[]): FakeRoutes {
  const columns = columnNames.map((name) => ({
    name,
    statuses: [{ id: `id-${name.toLowerCase().replaceAll(' ', '-')}` }],
  }));

  return { [CONFIGURATION_PATH]: { json: { columnConfig: { columns } } } };
}

// endregion | Helpers
