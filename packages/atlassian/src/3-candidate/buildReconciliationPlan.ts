import { randomUUID } from 'node:crypto';

import { normalizeStatusName } from '../internal/normalizeStatusName.ts';
import type { ProjectConfiguration, WorkflowStatus, WorkflowTransition } from './ProjectConfiguration.ts';
import type { BoardFeatureRequest, ProjectSpec, SpecStatus } from './ProjectSpec.ts';
import type {
  FeatureToggle,
  ReconciliationPlan,
  StatusCreation,
  StatusUpdate,
  TransitionRename,
} from './ReconciliationPlan.ts';

/**
 * Resolves each spec status against the live configuration as unchanged, amended in place, or new, and derives
 * the transition renames, board-feature toggles, and unmanaged statuses that follow. Nothing here reads or writes
 * anything, so a plan can be built and reviewed before a project is touched.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export function buildReconciliationPlan(
  spec: ProjectSpec,
  configuration: Pick<ProjectConfiguration, 'features' | 'statuses' | 'workflow'>,
  options: ReconciliationPlanOptions = {},
): ReconciliationPlan {
  const { features, statuses, workflow } = configuration;
  const { newStatusReference = randomUUID } = options;

  const liveByName = new Map(statuses.map((status) => [normalizeStatusName(status.name), status]));
  const claimed = new Set<string>();
  const creations: StatusCreation[] = [];
  const statusUpdates: StatusUpdate[] = [];

  for (const wanted of spec.statuses) {
    const match = findLiveStatus(liveByName, wanted);
    if (match === undefined) {
      creations.push({ category: wanted.category, name: wanted.name, statusReference: newStatusReference() });
      continue;
    }

    claimed.add(normalizeStatusName(match.name));
    // A matched name settles identity alone. The category is reconciled on its own, or a template that
    // categorized a status differently would be reported as already conformant.
    if (match.name !== wanted.name || match.statusCategory !== wanted.category) {
      statusUpdates.push({
        category: wanted.category,
        description: match.description ?? '',
        from: match.name,
        fromCategory: match.statusCategory,
        id: match.id,
        statusReference: match.statusReference,
        to: wanted.name,
      });
    }
  }

  return {
    creations,
    featureToggles: listFeatureToggles(spec.boardFeatures, features),
    statusUpdates,
    transitionRenames: listTransitionRenames(statuses, workflow.transitions, statusUpdates),
    unmanaged: statuses.filter((status) => !claimed.has(normalizeStatusName(status.name))),
  };
}

export interface ReconciliationPlanOptions {
  /**
   * Mints the reference under which a created status is carried, which the API requires rather than assigning.
   * Defaults to `randomUUID`; supply one to make a plan reproducible.
   */
  readonly newStatusReference?: (() => string) | undefined;
}

// region | Helpers

/** Finds the live status to which a spec entry resolves, by its name and then by each of its aliases. */
function findLiveStatus(
  liveByName: ReadonlyMap<string, WorkflowStatus>,
  wanted: SpecStatus,
): WorkflowStatus | undefined {
  for (const name of [wanted.name, ...(wanted.aliases ?? [])]) {
    const match = liveByName.get(normalizeStatusName(name));
    if (match !== undefined) return match;
  }

  return undefined;
}

/** Lists the board features whose live state differs from the one requested by the spec. */
function listFeatureToggles(
  requested: Readonly<Record<string, BoardFeatureRequest>> | undefined,
  live: ReadonlyMap<string, string>,
): FeatureToggle[] {
  return Object.entries(requested ?? {})
    .map(([feature, to]) => ({ feature, from: live.get(feature), to }))
    .filter((toggle) => toggle.from !== toggle.to);
}

/** Lists the global transitions whose names no longer match the statuses that they target. */
function listTransitionRenames(
  statuses: readonly WorkflowStatus[],
  transitions: readonly WorkflowTransition[],
  statusUpdates: readonly StatusUpdate[],
): TransitionRename[] {
  const renames: TransitionRename[] = [];

  // A transition's name is what the board's action menu shows, so it tracks the status that it targets.
  for (const transition of transitions) {
    if (transition.type !== 'GLOBAL') continue;

    const target = statuses.find((status) => status.statusReference === transition.toStatusReference);
    if (target === undefined) continue;

    const update = statusUpdates.find((entry) => entry.statusReference === target.statusReference);
    const wantedName = update?.to ?? target.name;
    if (transition.name !== wantedName) renames.push({ from: transition.name, id: transition.id, to: wantedName });
  }

  return renames;
}

// endregion | Helpers
