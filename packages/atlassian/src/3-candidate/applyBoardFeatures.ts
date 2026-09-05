import type { JiraRequest } from './createTokenTransport.ts';
import type { ProjectConfiguration } from './ProjectConfiguration.ts';
import type { FeatureToggle, ReconciliationPlan } from './ReconciliationPlan.ts';
import { requestOk } from './requestOk.ts';

/**
 * Brings each board feature to the state the plan asks for, one call per toggle, and answers with the toggles
 * written. A plan with no toggle issues no call.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export async function applyBoardFeatures(
  request: JiraRequest,
  configuration: Pick<ProjectConfiguration, 'board'>,
  plan: Pick<ReconciliationPlan, 'featureToggles'>,
): Promise<readonly FeatureToggle[]> {
  const { id } = configuration.board;

  for (const toggle of plan.featureToggles) {
    // The board-scoped endpoint carries the feature in the body; its project-scoped counterpart carries it in
    // the path, so the two take different shapes.

    await requestOk(request, {
      body: { boardId: id, enabling: toggle.to === 'ENABLED', feature: toggle.feature },
      label: `set board feature ${toggle.feature} to ${toggle.to}`,
      method: 'PUT',
      path: `/rest/agile/1.0/board/${id}/features`,
    });
  }

  return plan.featureToggles;
}
