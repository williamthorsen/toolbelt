import { describe, expect, it } from 'vitest';

import type { ReconciliationPlan } from '../../3-candidate/ReconciliationPlan.ts';
import { buildProjectConfiguration, buildStatus } from '../../test-utils/projectConfiguration.ts';
import { renderPlan } from '../renderPlan.ts';

const CONFIGURATION = buildProjectConfiguration();
const PROJECT_KEY = 'THOR';

describe(renderPlan, () => {
  it('leads with the project, board, and workflow the plan was built against', () => {
    const rendered = renderPlan(buildPlan(), CONFIGURATION, { projectKey: PROJECT_KEY });

    expect(rendered).toContain('project  THOR (id 10000), board 1');
    expect(rendered).toContain('workflow THOR: Software Simplified Workflow');
  });

  it('reports a project that already matches the spec', () => {
    expect(renderPlan(buildPlan(), CONFIGURATION, { projectKey: PROJECT_KEY })).toContain(
      'no changes: the project already matches the spec',
    );
  });

  it('names only the half of a status update that changes', () => {
    const renamed = renderPlan(
      buildPlan({
        statusUpdates: [
          {
            category: 'TODO',
            description: '',
            from: 'To Do',
            fromCategory: 'TODO',
            id: 'id-1',
            statusReference: 'ref-1',
            to: 'Todo',
          },
        ],
      }),
      CONFIGURATION,
      { projectKey: PROJECT_KEY },
    );

    expect(renamed).toContain("update   status id-1: 'To Do' → 'Todo'");
    expect(renamed).not.toContain('TODO → TODO');
  });

  it('reports a recategorized status', () => {
    const rendered = renderPlan(
      buildPlan({
        statusUpdates: [
          {
            category: 'DONE',
            description: '',
            from: 'Done',
            fromCategory: 'TODO',
            id: 'id-3',
            statusReference: 'ref-3',
            to: 'Done',
          },
        ],
      }),
      CONFIGURATION,
      { projectKey: PROJECT_KEY },
    );

    expect(rendered).toContain('update   status id-3: TODO → DONE');
  });

  it('reports the transition that a created status is reached through', () => {
    const rendered = renderPlan(
      buildPlan({ creations: [{ category: 'IN_PROGRESS', name: 'Waiting', statusReference: 'ref-waiting' }] }),
      CONFIGURATION,
      { projectKey: PROJECT_KEY },
    );

    expect(rendered).toContain("create   status 'Waiting' (IN_PROGRESS)");
    expect(rendered).toContain("create   transition GLOBAL → 'Waiting'");
  });

  it('reports a renamed transition and a board-feature toggle', () => {
    const rendered = renderPlan(
      buildPlan({
        featureToggles: [{ feature: 'jsw.agility.backlog', from: 'DISABLED', to: 'ENABLED' }],
        transitionRenames: [{ from: 'To Do', id: '10', to: 'Todo' }],
      }),
      CONFIGURATION,
      { projectKey: PROJECT_KEY },
    );

    expect(rendered).toContain("rename   transition 10: 'To Do' → 'Todo'");
    expect(rendered).toContain('toggle   jsw.agility.backlog: DISABLED → ENABLED');
  });

  it('reports a feature the board does not hold as absent', () => {
    const rendered = renderPlan(
      buildPlan({ featureToggles: [{ feature: 'jsw.agility.backlog', from: undefined, to: 'ENABLED' }] }),
      CONFIGURATION,
      { projectKey: PROJECT_KEY },
    );

    expect(rendered).toContain('toggle   jsw.agility.backlog: absent → ENABLED');
  });

  it('reports an unmanaged status without counting it as a change', () => {
    const rendered = renderPlan(buildPlan({ unmanaged: [buildStatus({ name: 'Blocked' })] }), CONFIGURATION, {
      projectKey: PROJECT_KEY,
    });

    expect(rendered).toContain("unmanaged status 'Blocked' is not in the spec and will not be touched");
    expect(rendered).toContain('no changes: the project already matches the spec');
  });

  it('reports the backlog seed the run was asked for', () => {
    const rendered = renderPlan(buildPlan(), CONFIGURATION, { projectKey: PROJECT_KEY, seedBacklog: 'To Do' });

    expect(rendered).toContain("seed     move every 'To Do' work item off the board");
  });
});

// region | Helpers

function buildPlan(overrides: Partial<ReconciliationPlan> = {}): ReconciliationPlan {
  return { creations: [], featureToggles: [], statusUpdates: [], transitionRenames: [], unmanaged: [], ...overrides };
}

// endregion | Helpers
