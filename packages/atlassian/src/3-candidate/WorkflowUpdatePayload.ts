import type { WorkflowLayout, WorkflowStatusLayout, WorkflowTransition } from './ProjectConfiguration.ts';

/** One status as the workflow write takes it, which is a different shape from the one reported by the read. */
export interface WorkflowStatusUpdate {
  readonly description: string;
  /** Absent on a status being created, which has no id until the write assigns one. */
  readonly id?: string | undefined;
  readonly name: string;
  readonly statusCategory: string;
  readonly statusReference: string;
}

export interface WorkflowUpdate {
  readonly description?: string | undefined;
  readonly id: string;
  readonly startPointLayout: WorkflowLayout;
  readonly statuses: readonly WorkflowStatusLayout[];
  readonly transitions: readonly WorkflowTransition[];
  readonly version: unknown;
}

/** The body that `POST /rest/api/3/workflows/update` takes. It replaces the workflow graph wholesale. */
export interface WorkflowUpdatePayload {
  readonly statuses: readonly WorkflowStatusUpdate[];
  readonly workflows: readonly [WorkflowUpdate];
}
