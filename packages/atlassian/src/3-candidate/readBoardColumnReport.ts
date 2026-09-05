import { isRecord } from '../internal/isRecord.ts';
import { normalizeStatusName } from '../internal/normalizeStatusName.ts';
import { readArrayField } from '../internal/readArrayField.ts';
import type { BoardColumnReport } from './BoardColumnReport.ts';
import type { JiraRequest } from './createTokenTransport.ts';
import type { ProjectConfiguration } from './ProjectConfiguration.ts';
import type { ProjectSpec } from './ProjectSpec.ts';
import { requestOk } from './requestOk.ts';

/**
 * Reports which spec statuses the board's columns cover and whether the columns run in the spec's order. Neither
 * can be set through the public API, so this reports the gap rather than closing it.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export async function readBoardColumnReport(
  request: JiraRequest,
  configuration: Pick<ProjectConfiguration, 'board' | 'statuses'>,
  spec: ProjectSpec,
): Promise<BoardColumnReport> {
  const { board, statuses } = configuration;

  const response = await requestOk(request, {
    label: `read configuration for board ${board.id}`,
    method: 'GET',
    path: `/rest/agile/1.0/board/${board.id}/configuration`,
  });

  const columns = readColumns(board.id, response.json);
  const columnNames = columns.map((column) => column.name);
  const mapped = new Set(columns.flatMap((column) => column.statusIds));

  // A spec status not yet held by the workflow is a creation that the plan reports, not a coverage gap.
  const uncovered = spec.statuses.flatMap((wanted) => {
    const live = statuses.find((status) => normalizeStatusName(status.name) === normalizeStatusName(wanted.name));

    return live === undefined || mapped.has(live.id) ? [] : [wanted.name];
  });

  return { columns: columnNames, order: findOrderMismatch(columnNames, spec), uncovered };
}

// region | Helpers

/** Returns the spec's column order against the board's, and nothing where the board already holds it. */
function findOrderMismatch(columnNames: readonly string[], spec: ProjectSpec): BoardColumnReport['order'] {
  const expected = spec.statuses
    .map((wanted) => columnNames.find((name) => normalizeStatusName(name) === normalizeStatusName(wanted.name)))
    .filter((name) => name !== undefined);
  const actual = columnNames.filter((name) => expected.includes(name));

  return expected.join(' ') === actual.join(' ') ? undefined : { actual, expected };
}

/**
 * Narrows the board configuration to each column's name and the ids of the statuses mapped to it. A column or a
 * status id that it cannot read refuses the report: dropping either would report a covered status as uncovered.
 */
function readColumns(boardId: number, payload: unknown): readonly ReadColumn[] {
  const columnConfig = isRecord(payload) ? payload['columnConfig'] : undefined;
  const values = readArrayField(columnConfig, 'columns') ?? [];

  const columns = values.flatMap((column) => {
    if (!isRecord(column) || typeof column['name'] !== 'string') return [];

    const mapped = readArrayField(column, 'statuses') ?? [];
    const statusIds = mapped.flatMap((status) =>
      isRecord(status) && typeof status['id'] === 'string' ? [status['id']] : [],
    );
    if (statusIds.length !== mapped.length) return [];

    return [{ name: column['name'], statusIds }];
  });
  if (columns.length !== values.length) {
    throw new Error(`Board ${boardId} answered with columns that this cannot read.`);
  }

  return columns;
}

interface ReadColumn {
  readonly name: string;
  readonly statusIds: readonly string[];
}

// endregion | Helpers
