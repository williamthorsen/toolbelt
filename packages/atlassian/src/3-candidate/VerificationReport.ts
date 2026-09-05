/** How one board feature the spec declares stands against what the board holds. */
export interface FeatureVerification {
  readonly feature: string;
  readonly matches: boolean;
  /** The live state, or `undefined` where the board reports no such feature. */
  readonly state: string | undefined;
}

/** How one spec status stands against what the workflow holds. */
export interface StatusVerification {
  /** The live category, or `undefined` where no live status claims the name. */
  readonly category: string | undefined;
  readonly matches: boolean;
  /** The name the spec declares, which is what a reader is looking for in the report. */
  readonly name: string;
  /** The global transition into the status, or `undefined` where none targets it. */
  readonly transition: string | undefined;
}

/** Each spec entry against what a read of the project holds. */
export interface VerificationReport {
  readonly features: readonly FeatureVerification[];
  /** Whether every status and feature the spec declares matches. */
  readonly matches: boolean;
  readonly statuses: readonly StatusVerification[];
}
