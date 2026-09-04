/**
 * A project's live configuration, as the reads that compose it report it. Every Jira resource here is modelled
 * at the fields this package touches rather than at its documented shape.
 */
export interface ProjectConfiguration {
  readonly board: { readonly id: number };
  /** Live board-feature states, keyed by feature key. Jira reports `COMING_SOON` alongside the requestable two. */
  readonly features: ReadonlyMap<string, string>;
  readonly project: { readonly id: string };
  /** The workflow's statuses as full objects. `Workflow.statuses` holds the same statuses as layout entries. */
  readonly statuses: readonly WorkflowStatus[];
  readonly workflow: Workflow;
}

export interface Workflow {
  readonly description?: string | undefined;
  readonly id: string;
  readonly name?: string | undefined;
  readonly startPointLayout?: WorkflowLayout | undefined;
  /** Layout entries, one per status. The full status objects are on `ProjectConfiguration.statuses`. */
  readonly statuses: readonly WorkflowStatusLayout[];
  readonly transitions: readonly WorkflowTransition[];
  readonly version: unknown;
}

/** Where something sits on the workflow diagram. Jira omits a coordinate it has not placed. */
export interface WorkflowLayout {
  readonly x?: number | undefined;
  readonly y?: number | undefined;
}

export interface WorkflowStatus {
  readonly description?: string | undefined;
  readonly id: string;
  readonly name: string;
  readonly statusCategory: string;
  readonly statusReference: string;
}

/** Where one status sits on the workflow diagram. */
export interface WorkflowStatusLayout {
  readonly layout?: WorkflowLayout | undefined;
  readonly statusReference: string;
}

/**
 * One transition of the workflow graph. The index signature carries the fields this package does not model, such
 * as `actions`, `conditions`, `validators`, `properties`, and `triggers`: the workflow write replaces the graph
 * wholesale, so a transition that reaches it short of them loses them.
 */
export interface WorkflowTransition {
  readonly [field: string]: unknown;
  readonly id: string;
  readonly name: string;
  readonly toStatusReference?: string | undefined;
  /** `GLOBAL`, `INITIAL`, or `DIRECTED`. Left open, since only `GLOBAL` is acted on. */
  readonly type: string;
}
