import { isRecord } from '../internal/isRecord.ts';
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
 * this reconciler cannot safely write to: one that is not team-managed, one with no board, and one whose issue
 * types resolve to other than a single workflow. Each refusal fails closed, so a response it cannot read is a
 * refusal rather than a pass.
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
  const board = await readBoard(request, projectKey, key);
  const issueTypeIds = await readIssueTypeIds(request, projectKey, key);
  const { statuses, workflow } = await readWorkflow(request, projectKey, project.id, issueTypeIds);
  const features = await readFeatures(request, board.id);

  return { board, features, project, statuses, workflow };
}

// region | Helpers

/** Narrows a named field of a payload to an array, which every list-bearing Jira response nests under one. */
function readArrayField(payload: unknown, field: string): readonly unknown[] | undefined {
  if (!isRecord(payload)) return undefined;

  const value = payload[field];

  return Array.isArray(value) ? value : undefined;
}

/** Reads the project's board, refusing a project that has none: the features and backlog calls are board-scoped. */
async function readBoard(request: JiraRequest, projectKey: string, key: string): Promise<{ id: number }> {
  const response = await requestOk(request, {
    label: `read boards for ${projectKey}`,
    method: 'GET',
    path: `/rest/agile/1.0/board?projectKeyOrId=${key}`,
  });

  const values = readArrayField(response.json, 'values');
  const id = values === undefined || !isRecord(values[0]) ? undefined : values[0]['id'];
  if (typeof id !== 'number') {
    throw new TypeError(`Project ${projectKey} has no board.`);
  }

  return { id };
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

  const features = new Map<string, string>();
  for (const value of values) {
    if (!isRecord(value)) continue;
    const { feature, state } = value;
    if (typeof feature === 'string' && typeof state === 'string') features.set(feature, state);
  }

  return features;
}

/** Reads every issue-type id the project holds, which the workflow read resolves its workflows from. */
async function readIssueTypeIds(request: JiraRequest, projectKey: string, key: string): Promise<string[]> {
  const response = await requestOk(request, {
    label: `read issue types for ${projectKey}`,
    method: 'GET',
    path: `/rest/api/3/project/${key}/statuses`,
  });

  const values = Array.isArray(response.json) ? response.json : undefined;
  const ids = (values ?? []).flatMap((value) =>
    isRecord(value) && typeof value['id'] === 'string' ? [value['id']] : [],
  );
  if (ids.length === 0) {
    throw new Error(`Project ${projectKey} answered with no issue types.`);
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
    throw new TypeError(`Project ${projectKey} answered without an 'id'.`);
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
