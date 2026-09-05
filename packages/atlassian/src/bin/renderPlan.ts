import type { ProjectConfiguration } from '../3-candidate/ProjectConfiguration.ts';
import type { ReconciliationPlan } from '../3-candidate/ReconciliationPlan.ts';

/**
 * Renders the reconciliation plan as the run's unit of review, listing every write it would make and reporting
 * a project that already matches the spec. Composes a string and prints nothing.
 *
 * @internal
 */
export function renderPlan(
  plan: ReconciliationPlan,
  configuration: ProjectConfiguration,
  options: PlanRenderOptions,
): string {
  const lines = [
    `project  ${options.projectKey} (id ${configuration.project.id}), board ${configuration.board.id}`,
    `workflow ${configuration.workflow.name ?? configuration.workflow.id}`,
  ];

  for (const update of plan.statusUpdates) {
    lines.push(`update   status ${update.id}: ${describeStatusUpdate(update)}`);
  }
  for (const creation of plan.creations) {
    lines.push(
      `create   status '${creation.name}' (${creation.category})`,
      `create   transition GLOBAL → '${creation.name}'`,
    );
  }
  for (const rename of plan.transitionRenames) {
    lines.push(`rename   transition ${rename.id}: '${rename.from}' → '${rename.to}'`);
  }
  for (const toggle of plan.featureToggles) {
    lines.push(`toggle   ${toggle.feature}: ${toggle.from ?? 'absent'} → ${toggle.to}`);
  }
  for (const status of plan.unmanaged) {
    lines.push(`unmanaged status '${status.name}' is not in the spec and will not be touched`);
  }
  if (options.seedBacklog !== undefined) {
    lines.push(`seed     move every '${options.seedBacklog}' work item off the board`);
  }

  if (countChanges(plan) === 0) lines.push('no changes: the project already matches the spec');

  return lines.join('\n');
}

/** What the plan alone does not carry: the key it was read for, and the backlog seed the run was asked for. */
export interface PlanRenderOptions {
  readonly projectKey: string;
  readonly seedBacklog?: string | undefined;
}

// region | Helpers

/** Counts the writes a plan holds. An unmanaged status is a report rather than a change. */
function countChanges(plan: ReconciliationPlan): number {
  return plan.creations.length + plan.featureToggles.length + plan.statusUpdates.length + plan.transitionRenames.length;
}

/** Names whichever of a status's name and category the update changes. */
function describeStatusUpdate(update: ReconciliationPlan['statusUpdates'][number]): string {
  const parts: string[] = [];

  if (update.to !== update.from) parts.push(`'${update.from}' → '${update.to}'`);
  if (update.category !== update.fromCategory) parts.push(`${update.fromCategory} → ${update.category}`);

  return parts.join(', ');
}

// endregion | Helpers
