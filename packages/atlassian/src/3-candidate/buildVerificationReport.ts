import { normalizeStatusName } from '../internal/normalizeStatusName.ts';
import type { ProjectConfiguration, WorkflowStatus } from './ProjectConfiguration.ts';
import type { ProjectSpec } from './ProjectSpec.ts';
import type { FeatureVerification, StatusVerification, VerificationReport } from './VerificationReport.ts';

/**
 * Reports each spec entry against what a read of the project holds. This takes no transport, so the post-write
 * check is a second call to `readProjectConfiguration` and the comparison is exercisable on its own.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export function buildVerificationReport(
  configuration: Pick<ProjectConfiguration, 'features' | 'statuses' | 'workflow'>,
  spec: ProjectSpec,
): VerificationReport {
  const { features, statuses, workflow } = configuration;

  const verifiedStatuses: StatusVerification[] = spec.statuses.map((wanted) => {
    const live = findByName(statuses, wanted.name);
    // A transition carrying no target would otherwise match a status not held by the workflow, both being absent.
    const transition =
      live === undefined
        ? undefined
        : workflow.transitions.find(
            (entry) => entry.type === 'GLOBAL' && entry.toStatusReference === live.statusReference,
          );

    return {
      category: live?.statusCategory,
      matches: live?.statusCategory === wanted.category && hasSameName(transition?.name, wanted.name),
      name: wanted.name,
      transition: transition?.name,
    };
  });

  const verifiedFeatures: FeatureVerification[] = Object.entries(spec.boardFeatures ?? {}).map(([feature, wanted]) => ({
    feature,
    matches: features.get(feature) === wanted,
    state: features.get(feature),
  }));

  return {
    features: verifiedFeatures,
    matches: [...verifiedStatuses, ...verifiedFeatures].every((entry) => entry.matches),
    statuses: verifiedStatuses,
  };
}

// region | Helpers

/** Finds the live status claimed by a spec name. Jira reports one status under two casings across endpoints. */
function findByName(statuses: readonly WorkflowStatus[], name: string): WorkflowStatus | undefined {
  return statuses.find((status) => normalizeStatusName(status.name) === normalizeStatusName(name));
}

/** Reports whether two names are the same status name, which a difference of casing does not make them. */
function hasSameName(left: string | undefined, right: string): boolean {
  return left !== undefined && normalizeStatusName(left) === normalizeStatusName(right);
}

// endregion | Helpers
