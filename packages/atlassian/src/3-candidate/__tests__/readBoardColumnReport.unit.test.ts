import { describe, expect, it } from 'vitest';

import { createFakeRequest, type FakeRoutes } from '../../test-utils/createFakeRequest.ts';
import { buildProjectConfiguration } from '../../test-utils/projectConfiguration.ts';
import { JiraResponseError } from '../JiraResponseError.ts';
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

  it('reports the two orders when the board orders its columns differently', async () => {
    const { request } = createFakeRequest(buildRoutes(['Done', 'To Do', 'In Progress']));

    const report = await readBoardColumnReport(request, buildProjectConfiguration(), SPEC);

    expect(report.order).toStrictEqual({
      actual: ['Done', 'To Do', 'In Progress'],
      expected: ['To Do', 'In Progress', 'Done'],
    });
  });

  it('skips a column that the spec does not name rather than reporting it out of order', async () => {
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

  it('skips a spec status absent from the workflow, which the plan reports as a creation', async () => {
    const spec = { statuses: [...SPEC.statuses, { category: 'TODO', name: 'Triage' }] } satisfies ProjectSpec;
    const { request } = createFakeRequest(buildRoutes(['To Do', 'In Progress', 'Done']));

    const report = await readBoardColumnReport(request, buildProjectConfiguration(), spec);

    expect(report.uncovered).toStrictEqual([]);
  });

  it('refuses a column that it cannot read rather than reporting its statuses uncovered', async () => {
    const { request } = createFakeRequest({
      [CONFIGURATION_PATH]: {
        json: { columnConfig: { columns: [{ name: 'To Do', statuses: [{ id: 'id-to-do' }] }, { statuses: [] }] } },
      },
    });

    const reading = readBoardColumnReport(request, buildProjectConfiguration(), SPEC);

    await expect(reading).rejects.toThrow('returned columns that this cannot read');
    await expect(reading).rejects.toBeInstanceOf(JiraResponseError);
  });

  it('refuses a status id that it cannot read rather than reporting that status uncovered', async () => {
    const { request } = createFakeRequest({
      [CONFIGURATION_PATH]: { json: { columnConfig: { columns: [{ name: 'To Do', statuses: [{ name: 'no id' }] }] } } },
    });

    const reading = readBoardColumnReport(request, buildProjectConfiguration(), SPEC);

    await expect(reading).rejects.toThrow('returned columns that this cannot read');
    await expect(reading).rejects.toBeInstanceOf(JiraResponseError);
  });

  it('refuses a configuration without a columns array rather than reporting every status uncovered', async () => {
    const { request } = createFakeRequest({ [CONFIGURATION_PATH]: { json: { columnConfig: {} } } });

    const reading = readBoardColumnReport(request, buildProjectConfiguration(), SPEC);

    await expect(reading).rejects.toThrow("Board 1 returned no 'columns' array.");
    await expect(reading).rejects.toBeInstanceOf(JiraResponseError);
  });

  it('refuses a column without a statuses array rather than reading it as empty', async () => {
    const { request } = createFakeRequest({
      [CONFIGURATION_PATH]: { json: { columnConfig: { columns: [{ name: 'To Do' }] } } },
    });

    const reading = readBoardColumnReport(request, buildProjectConfiguration(), SPEC);

    await expect(reading).rejects.toThrow('returned columns that this cannot read');
    await expect(reading).rejects.toBeInstanceOf(JiraResponseError);
  });

  it('throws naming the board when the configuration read is rejected', async () => {
    const { request } = createFakeRequest({ [CONFIGURATION_PATH]: { json: { errorMessages: [] }, status: 403 } });

    await expect(readBoardColumnReport(request, buildProjectConfiguration(), SPEC)).rejects.toMatchObject({
      label: 'read configuration for board 1',
      status: 403,
    });
  });
});

// region | Helpers

/** Builds the board configuration route, one column per name, each mapped to the status claimed by the name. */
function buildRoutes(columnNames: readonly string[]): FakeRoutes {
  const columns = columnNames.map((name) => ({
    name,
    statuses: [{ id: `id-${name.toLowerCase().replaceAll(' ', '-')}` }],
  }));

  return { [CONFIGURATION_PATH]: { json: { columnConfig: { columns } } } };
}

// endregion | Helpers
