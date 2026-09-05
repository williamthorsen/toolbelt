import { isRecord } from '../internal/isRecord.ts';
import { readArrayField } from '../internal/readArrayField.ts';
import type { JiraRequest } from './createTokenTransport.ts';
import type {
  ProjectConfiguration,
  Workflow,
  WorkflowLayout,
  WorkflowStatus,
  WorkflowStatusLayout,
  WorkflowTransition,
} from './ProjectConfiguration.ts';
import { requestOk } from './requestOk.ts';

const TEAM_MANAGED_STYLE = 'next-gen';

/**
 * Reads the project, board, workflow, and board features a reconciliation is planned against. Refuses a project
 * this reconciler cannot safely write to: one that is not team-managed, one that does not resolve to a single
 * board of its own, and one whose issue types resolve to other than a single workflow. Each refusal fails closed,
 * so a response it cannot read is a refusal rather than a pass.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export async function readProjectConfiguration(
  request: JiraRequest,
  projectKey: string,
): Promise<ProjectConfiguration> {
  const key = encodeURIComponent(projectKey);

  const project = await readProject(request, projectKey, key);
  const board = await readBoard(request, projectKey, key, project.id);
  const issueTypeIds = await readIssueTypeIds(request, projectKey, key);
  const { statuses, workflow } = await readWorkflow(request, projectKey, project.id, issueTypeIds);
  const features = await readFeatures(request, board.id);

  return { board, features, project, statuses, workflow };
}

// region | Helpers

/**
 * Reads the project's own board, which the feature, column, and backlog calls are scoped to. The query answers
 * with every board whose filter references the project, so a board another project owns can come back alongside
 * it; the project's own board is the one whose location names the project.
 */
async function readBoard(
  request: JiraRequest,
  projectKey: string,
  key: string,
  projectId: string,
): Promise<{ id: number }> {
  const response = await requestOk(request, {
    label: `read boards for ${projectKey}`,
    method: 'GET',
    path: `/rest/agile/1.0/board?projectKeyOrId=${key}`,
  });

  const values = readArrayField(response.json, 'values');
  if (values === undefined || values.length === 0) {
    throw new Error(`Project ${projectKey} has no board.`);
  }

  const boards = values.flatMap((value) => {
    const board = readBoardEntry(value);

    return board === undefined ? [] : [board];
  });
  if (boards.length !== values.length) {
    throw new Error(`Project ${projectKey} answered with boards this cannot read.`);
  }
  // A sole board is taken without a location, which Jira may omit, but never one whose location names another
  // project: its id would carry this project's feature writes and backlog moves onto that project's board.
  const owned = boards.filter(
    (entry) => entry.locationProjectId === projectId || (boards.length === 1 && entry.locationProjectId === undefined),
  );
  const [board] = owned;
  if (board === undefined) {
    throw new Error(
      `Project ${projectKey} resolves to no board of its own (the query returned ${boards.length}). Refusing, since another project's board would take this project's feature writes and backlog moves.`,
    );
  }
  if (owned.length > 1) {
    throw new Error(
      `Project ${projectKey} resolves to ${owned.length} boards of its own. This reconciler configures one board, so an ambiguous set is refused rather than half-configured.`,
    );
  }

  return { id: board.id };
}

/** Narrows one board to its id and the project its location names, which is what identifies the project's own. */
function readBoardEntry(value: unknown): BoardEntry | undefined {
  if (!isRecord(value) || typeof value['id'] !== 'number') return undefined;

  const location = value['location'];
  const projectId = isRecord(location) ? location['projectId'] : undefined;

  return {
    id: value['id'],
    locationProjectId: typeof projectId === 'number' || typeof projectId === 'string' ? String(projectId) : undefined,
  };
}

interface BoardEntry {
  readonly id: number;
  readonly locationProjectId: string | undefined;
}

/** Reads the board's live feature states, which the plan's toggles are resolved against. */
async function readFeatures(request: JiraRequest, boardId: number): Promise<ReadonlyMap<string, string>> {
  const response = await requestOk(request, {
    label: `read features for board ${boardId}`,
    method: 'GET',
    path: `/rest/agile/1.0/board/${boardId}/features`,
  });

  const values = readArrayField(response.json, 'features');
  if (values === undefined) {
    throw new Error(`Board ${boardId} answered without a 'features' array.`);
  }

  const entries: [string, string][] = values.flatMap((value) => {
    if (!isRecord(value)) return [];

    const { feature, state } = value;

    return typeof feature === 'string' && typeof state === 'string' ? [[feature, state]] : [];
  });
  if (entries.length !== values.length) {
    throw new Error(`Board ${boardId} answered with features this cannot read.`);
  }

  return new Map(entries);
}

/** Reads every issue-type id the project holds, which the workflow read resolves its workflows from. */
async function readIssueTypeIds(request: JiraRequest, projectKey: string, key: string): Promise<string[]> {
  const response = await requestOk(request, {
    label: `read issue types for ${projectKey}`,
    method: 'GET',
    path: `/rest/api/3/project/${key}/statuses`,
  });

  const values = Array.isArray(response.json) ? response.json : undefined;
  if (values === undefined || values.length === 0) {
    throw new Error(`Project ${projectKey} answered with no issue types.`);
  }

  // An issue type dropped here never reaches the workflow read, so a project on several workflows could pass the
  // exactly-one refusal. The count is what keeps that refusal load-bearing.
  const ids = values.flatMap((value) => (isRecord(value) && typeof value['id'] === 'string' ? [value['id']] : []));
  if (ids.length !== values.length) {
    throw new Error(`Project ${projectKey} answered with issue types this cannot read.`);
  }

  return ids;
}

/** Narrows a diagram coordinate, which Jira omits where it has not placed one. */
function readLayout(value: unknown): WorkflowLayout | undefined {
  if (!isRecord(value)) return undefined;

  const { x, y } = value;

  return { ...(typeof x === 'number' && { x }), ...(typeof y === 'number' && { y }) };
}

/** Reads the project, refusing anything but a team-managed one, whose statuses are the project's own. */
async function readProject(request: JiraRequest, projectKey: string, key: string): Promise<{ id: string }> {
  const response = await requestOk(request, {
    label: `read project ${projectKey}`,
    method: 'GET',
    path: `/rest/api/3/project/${key}`,
  });

  const project = isRecord(response.json) ? response.json : undefined;
  const id = project?.['id'];
  if (typeof id !== 'string') {
    throw new Error(`Project ${projectKey} answered without an 'id'.`);
  }

  const style = project?.['style'];

  // A status renamed in a company-managed project is renamed in every project on the site that uses it. An
  // unreadable style is refused alongside a company-managed one: a project this cannot classify is not one to write to.
  if (style !== TEAM_MANAGED_STYLE) {
    throw new Error(
      `Project ${projectKey} is not team-managed (style: ${typeof style === 'string' ? style : 'absent'}). Refusing to write, since a status renamed in a company-managed project is renamed in every project on the site that uses it.`,
    );
  }

  return { id };
}

/** Narrows one transition, carrying through every field this package does not model. */
function readTransition(value: unknown): WorkflowTransition | undefined {
  if (!isRecord(value)) return undefined;

  const { id, name, toStatusReference, type } = value;
  if (typeof id !== 'string' || typeof name !== 'string' || typeof type !== 'string') return undefined;

  return {
    ...value,
    id,
    name,
    toStatusReference: typeof toStatusReference === 'string' ? toStatusReference : undefined,
    type,
  };
}

/** Reads the workflow every issue type resolves to, refusing a project whose issue types span more than one. */
async function readWorkflow(
  request: JiraRequest,
  projectKey: string,
  projectId: string,
  issueTypeIds: readonly string[],
): Promise<{ statuses: readonly WorkflowStatus[]; workflow: Workflow }> {
  const response = await requestOk(request, {
    body: { projectAndIssueTypes: issueTypeIds.map((issueTypeId) => ({ issueTypeId, projectId })) },
    label: `read workflow for ${projectKey}`,
    method: 'POST',
    path: '/rest/api/3/workflows?expand=statuses',
  });

  const workflows = readArrayField(response.json, 'workflows') ?? [];
  if (workflows.length !== 1) {
    throw new Error(
      `Project ${projectKey} resolves its ${issueTypeIds.length} issue types to ${workflows.length} workflows. This reconciler writes one workflow, so a project holding several is refused rather than half-reconciled.`,
    );
  }

  const workflow = readWorkflowGraph(workflows[0]);
  if (workflow === undefined) {
    throw new Error(`Project ${projectKey} answered with a workflow this cannot read.`);
  }

  const values = readArrayField(response.json, 'statuses') ?? [];
  const statuses = values.flatMap((value) => {
    const status = readWorkflowStatus(value);

    return status === undefined ? [] : [status];
  });
  if (statuses.length !== values.length || statuses.length === 0) {
    throw new Error(`Project ${projectKey} answered with statuses this cannot read.`);
  }

  return { statuses, workflow };
}

/** Narrows a workflow's graph, whose statuses here are layout entries rather than full status objects. */
function readWorkflowGraph(value: unknown): Workflow | undefined {
  if (!isRecord(value)) return undefined;

  const { description, id, name, startPointLayout, statuses, transitions, version } = value;
  if (typeof id !== 'string' || !Array.isArray(statuses) || !Array.isArray(transitions)) return undefined;

  const layouts: WorkflowStatusLayout[] = [];
  for (const entry of statuses) {
    if (!isRecord(entry) || typeof entry['statusReference'] !== 'string') return undefined;
    layouts.push({ layout: readLayout(entry['layout']), statusReference: entry['statusReference'] });
  }

  const moves: WorkflowTransition[] = [];
  for (const entry of transitions) {
    const transition = readTransition(entry);
    if (transition === undefined) return undefined;
    moves.push(transition);
  }

  return {
    description: typeof description === 'string' ? description : undefined,
    id,
    name: typeof name === 'string' ? name : undefined,
    startPointLayout: readLayout(startPointLayout),
    statuses: layouts,
    transitions: moves,
    version,
  };
}

/** Narrows one full status object, as the workflow read reports it alongside the layout entries. */
function readWorkflowStatus(value: unknown): WorkflowStatus | undefined {
  if (!isRecord(value)) return undefined;

  const { description, id, name, statusCategory, statusReference } = value;
  if (typeof id !== 'string' || typeof name !== 'string') return undefined;
  if (typeof statusCategory !== 'string' || typeof statusReference !== 'string') return undefined;

  return {
    description: typeof description === 'string' ? description : undefined,
    id,
    name,
    statusCategory,
    statusReference,
  };
}

// endregion | Helpers
