import type { Workflow } from './ProjectConfiguration.ts';
import type { WorkflowUpdatePayload } from './WorkflowUpdatePayload.ts';

/**
 * Refuses a payload that would drop a status or a transition the workflow holds, or leave a status with no
 * transition into it. `POST /rest/api/3/workflows/update` replaces the graph wholesale, and none of the three
 * fails loudly: each leaves work items in a state nothing can move them out of.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export function assertGraphPreserved(workflow: Workflow, payload: WorkflowUpdatePayload): void {
  const [updated] = payload.workflows;

  const references = new Set(updated.statuses.map((status) => status.statusReference));
  for (const status of workflow.statuses) {
    if (!references.has(status.statusReference)) {
      throw new Error(`Refusing to write: status ${status.statusReference} would be dropped from the workflow.`);
    }
  }

  const transitionIds = new Set(updated.transitions.map((transition) => transition.id));
  for (const transition of workflow.transitions) {
    if (!transitionIds.has(transition.id)) {
      throw new Error(`Refusing to write: transition ${transition.id} (${transition.name}) would be dropped.`);
    }
  }

  // A status left untargeted is reachable by no route and offers the board no way into it. A status that already
  // carried no transition is passed over: it is not this write's doing, and refusing over it would block every
  // reconciliation of the project in which it sits.
  const targeted = new Set(updated.transitions.map((transition) => transition.toStatusReference));
  const targetedBefore = new Set(workflow.transitions.map((transition) => transition.toStatusReference));
  const heldBefore = new Set(workflow.statuses.map((status) => status.statusReference));
  for (const reference of references) {
    if (targeted.has(reference) || (heldBefore.has(reference) && !targetedBefore.has(reference))) continue;
    throw new Error(`Refusing to write: status ${reference} would be left with no transition into it.`);
  }
}
