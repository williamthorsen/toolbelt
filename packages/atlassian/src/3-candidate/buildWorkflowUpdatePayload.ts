import { assertGraphPreserved } from './assertGraphPreserved.ts';
import type { ProjectConfiguration, WorkflowTransition } from './ProjectConfiguration.ts';
import type { ReconciliationPlan } from './ReconciliationPlan.ts';
import type { WorkflowStatusUpdate, WorkflowUpdatePayload } from './WorkflowUpdatePayload.ts';

const TRANSITION_ID_SPACING = 10;

/**
 * Composes the bulk workflow-update body from the live graph, so nothing the plan leaves unstated is discarded,
 * and refuses a payload the graph guards reject. Every payload this returns has passed those guards.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export function buildWorkflowUpdatePayload(
  configuration: Pick<ProjectConfiguration, 'statuses' | 'workflow'>,
  plan: ReconciliationPlan,
): WorkflowUpdatePayload {
  const { statuses, workflow } = configuration;

  const amendedStatuses: WorkflowStatusUpdate[] = statuses.map((status) => {
    const update = plan.statusUpdates.find((entry) => entry.statusReference === status.statusReference);

    return {
      // A renamed status keeps a description written for the status it no longer is; a status whose category
      // alone changes is still itself, so its description stands.
      description: update !== undefined && update.to !== update.from ? '' : (status.description ?? ''),
      id: status.id,
      name: update?.to ?? status.name,
      statusCategory: update?.category ?? status.statusCategory,
      statusReference: status.statusReference,
    };
  });

  // A renamed transition differs from the live one in its name alone. The write replaces the graph wholesale, so
  // a transition reaching it short of the fields this package does not model would lose them.
  const amendedTransitions: WorkflowTransition[] = workflow.transitions.map((transition) => {
    const rename = plan.transitionRenames.find((entry) => entry.id === transition.id);
    return rename === undefined ? transition : { ...transition, name: rename.to };
  });

  // The API requires an id on a new transition rather than assigning one, so continue the decade spacing Jira
  // uses for a team-managed project's global transitions. The floor covers a workflow holding no transition.
  let nextTransitionId = Math.max(0, ...workflow.transitions.map((transition) => Number(transition.id)));

  const payload: WorkflowUpdatePayload = {
    statuses: [
      ...amendedStatuses,
      ...plan.creations.map((creation) => ({
        description: '',
        name: creation.name,
        statusCategory: creation.category,
        statusReference: creation.statusReference,
      })),
    ],
    workflows: [
      {
        description: workflow.description,
        id: workflow.id,
        startPointLayout: workflow.startPointLayout ?? { x: 0, y: 0 },
        statuses: [
          ...workflow.statuses.map((status) => ({
            layout: status.layout ?? {},
            statusReference: status.statusReference,
          })),
          ...plan.creations.map((creation) => ({ layout: {}, statusReference: creation.statusReference })),
        ],
        transitions: [
          ...amendedTransitions,
          ...plan.creations.map((creation) => {
            nextTransitionId += TRANSITION_ID_SPACING;
            return {
              id: String(nextTransitionId),
              name: creation.name,
              toStatusReference: creation.statusReference,
              type: 'GLOBAL',
            };
          }),
        ],
        version: workflow.version,
      },
    ],
  };

  assertGraphPreserved(workflow, payload);

  return payload;
}
