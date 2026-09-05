/**
 * The states that a spec may ask a board feature to be in. Jira also reports `COMING_SOON`, which nothing can
 * request.
 */
export type BoardFeatureRequest = 'DISABLED' | 'ENABLED';

/** The declared configuration against which a project is reconciled. */
export interface ProjectSpec {
  /** Requested board-feature states, keyed by feature key, such as `jsw.agility.backlog`. */
  readonly boardFeatures?: Readonly<Record<string, BoardFeatureRequest>> | undefined;
  /** The last source in the email resolution chain. */
  readonly email?: string | undefined;
  /** The last source in the site resolution chain. */
  readonly site?: string | undefined;
  readonly statuses: readonly SpecStatus[];
}

/** One status declared by the spec, and the live names that resolve to it. */
export interface SpecStatus {
  /** Live names also claimed by this entry, matched case-insensitively. */
  readonly aliases?: readonly string[] | undefined;
  readonly category: StatusCategory;
  readonly name: string;
}

export type StatusCategory = 'DONE' | 'IN_PROGRESS' | 'TODO';
