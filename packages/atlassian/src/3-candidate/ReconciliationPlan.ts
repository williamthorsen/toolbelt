import type { WorkflowStatus } from './ProjectConfiguration.ts';
import type { BoardFeatureRequest, StatusCategory } from './ProjectSpec.ts';

/** One board feature whose live state differs from the state requested by the spec. */
export interface FeatureToggle {
  readonly feature: string;
  /** The live state, or `undefined` where the board reports no such feature. */
  readonly from: string | undefined;
  readonly to: BoardFeatureRequest;
}

/** What reconciling a project against a spec would change, resolved before anything is written. */
export interface ReconciliationPlan {
  readonly creations: readonly StatusCreation[];
  readonly featureToggles: readonly FeatureToggle[];
  readonly statusUpdates: readonly StatusUpdate[];
  readonly transitionRenames: readonly TransitionRename[];
  /** Live statuses claimed by no spec entry. They are reported and left untouched. */
  readonly unmanaged: readonly WorkflowStatus[];
}

/** A spec status not held by the workflow, and the reference minted for it. */
export interface StatusCreation {
  readonly category: StatusCategory;
  readonly name: string;
  readonly statusReference: string;
}

/** A live status whose name, category, or both differ from what the spec declares. */
export interface StatusUpdate {
  readonly category: StatusCategory;
  /** The description that the status currently carries. */
  readonly description: string;
  readonly from: string;
  readonly fromCategory: string;
  readonly id: string;
  readonly statusReference: string;
  readonly to: string;
}

/** A global transition whose name no longer matches the status that it targets. */
export interface TransitionRename {
  readonly from: string;
  readonly id: string;
  readonly to: string;
}
