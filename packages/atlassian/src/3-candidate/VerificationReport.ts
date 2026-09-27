/** How one board feature declared by the spec compares with what the board contains. */
export interface FeatureVerification {
  readonly feature: string;
  /**
   * Whether Jira has locked the feature. A locked one is reported rather than counted as a fault, as is a board column
   * for which the spec has no counterpart: No call can change it, so it is not something that the run failed to do.
   */
  readonly locked: boolean;
  readonly matches: boolean;
  /** The live state, or `undefined` when the board reports no such feature. */
  readonly state: string | undefined;
}

/** How one spec status compares with what the workflow contains. */
export interface StatusVerification {
  /** The live category, or `undefined` when no live status has the name. */
  readonly category: string | undefined;
  readonly matches: boolean;
  /** The name declared by the spec, which a reader is looking for in the report. */
  readonly name: string;
  /** The global transition into the status, or `undefined` when none targets it. */
  readonly transition: string | undefined;
}

/** Each spec entry compared with what a read of the project returns. */
export interface VerificationReport {
  readonly features: readonly FeatureVerification[];
  /** Whether every status and feature declared by the spec matches. */
  readonly matches: boolean;
  readonly statuses: readonly StatusVerification[];
}
