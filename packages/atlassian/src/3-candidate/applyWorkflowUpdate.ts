import { isRecord } from '../internal/isRecord.ts';
import { normalizeStatusName } from '../internal/normalizeStatusName.ts';
import { readArrayField } from '../internal/readArrayField.ts';
import { buildWorkflowUpdatePayload } from './buildWorkflowUpdatePayload.ts';
import type { JiraRequest } from './createTokenTransport.ts';
import type { ProjectConfiguration } from './ProjectConfiguration.ts';
import type { ReconciliationPlan, StatusUpdate } from './ReconciliationPlan.ts';
import { requestOk } from './requestOk.ts';

const STATUS_PAGE_SIZE = 100;

/**
 * Writes the reconciled status and transition graph in one call, then reads the statuses back and writes again,
 * through the status API, any status that the workflow write did not take. A plan holding no workflow change
 * issues no call.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export async function applyWorkflowUpdate(
  request: JiraRequest,
  configuration: Pick<ProjectConfiguration, 'project' | 'statuses' | 'workflow'>,
  plan: ReconciliationPlan,
): Promise<WorkflowUpdateResult> {
  const { creations, statusUpdates, transitionRenames } = plan;
  if (creations.length === 0 && statusUpdates.length === 0 && transitionRenames.length === 0) {
    return { correctedStatuses: [], written: false };
  }

  // The builder runs the graph guards itself, so no unguarded payload reaches the write.
  await requestOk(request, {
    body: buildWorkflowUpdatePayload(configuration, plan),
    label: 'update workflow',
    method: 'POST',
    path: '/rest/api/3/workflows/update',
  });

  const correctedStatuses = await correctStatuses(request, configuration.project.id, statusUpdates);

  return { correctedStatuses, written: true };
}

/** What the workflow write landed. */
export interface WorkflowUpdateResult {
  /** Statuses that the workflow write did not take, written again through the status API. */
  readonly correctedStatuses: readonly StatusUpdate[];
  /** Whether anything was written. A plan holding no workflow change issues no call. */
  readonly written: boolean;
}

// region | Helpers

/**
 * Reads the statuses back and writes any status that the workflow write did not take through the status API,
 * which is the fallback channel for a name or category that the workflow's own statuses array did not carry.
 */
async function correctStatuses(
  request: JiraRequest,
  projectId: string,
  statusUpdates: readonly StatusUpdate[],
): Promise<readonly StatusUpdate[]> {
  if (statusUpdates.length === 0) return [];

  // One page covers a project's statuses many times over, and a status that fell off it is reported stale and
  // written again, which the status API takes whether or not the first write had landed.
  const response = await requestOk(request, {
    label: 'read statuses back',
    method: 'GET',
    path: `/rest/api/3/statuses/search?projectId=${projectId}&maxResults=${STATUS_PAGE_SIZE}`,
  });

  const live = readArrayField(response.json, 'values') ?? [];
  const stale = statusUpdates.filter((update) => live.every((status) => !hasLanded(status, update)));
  if (stale.length === 0) return [];

  await requestOk(request, {
    body: {
      statuses: stale.map((update) => ({
        // Mirrors the payload builder: both channels write this field, so both apply its rule.
        description: isRenamed(update) ? '' : update.description,
        id: update.id,
        name: update.to,
        statusCategory: update.category,
      })),
    },
    label: 'amend statuses',
    method: 'PUT',
    path: '/rest/api/3/statuses',
  });

  return stale;
}

/**
 * Reports whether a live status carries what an update asked for. Names are compared exactly here, unlike
 * everywhere else: this asks whether the write landed, and a rename that changed only casing is one that it has
 * to be able to report as unlanded.
 */
function hasLanded(status: unknown, update: StatusUpdate): boolean {
  if (!isRecord(status)) return false;

  return status['id'] === update.id && status['name'] === update.to && status['statusCategory'] === update.category;
}

/** Reports whether an update renames the status, which a change of casing or of category alone does not. */
function isRenamed(update: StatusUpdate): boolean {
  return normalizeStatusName(update.to) !== normalizeStatusName(update.from);
}

// endregion | Helpers
