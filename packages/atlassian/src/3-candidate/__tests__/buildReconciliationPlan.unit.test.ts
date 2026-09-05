import { describe, expect, it } from 'vitest';

import { buildProjectConfiguration, buildStatus } from '../../test-utils/projectConfiguration.ts';
import { buildReconciliationPlan } from '../buildReconciliationPlan.ts';
import type { ProjectSpec, SpecStatus } from '../ProjectSpec.ts';

const newStatusReference = (): string => 'ref-minted';

describe(buildReconciliationPlan, () => {
  it('amends nothing where every spec status matches a live one', () => {
    const plan = buildReconciliationPlan(buildSpec(), buildProjectConfiguration(), { newStatusReference });

    expect(plan.creations).toStrictEqual([]);
    expect(plan.statusUpdates).toStrictEqual([]);
    expect(plan.transitionRenames).toStrictEqual([]);
  });

  it('amends a status that the spec spells with different casing', () => {
    const spec = buildSpec([{ category: 'TODO', name: 'To do' }]);

    const plan = buildReconciliationPlan(spec, buildProjectConfiguration(), { newStatusReference });

    expect(plan.statusUpdates).toStrictEqual([
      {
        category: 'TODO',
        description: '',
        from: 'To Do',
        fromCategory: 'TODO',
        id: 'id-to-do',
        statusReference: 'ref-to-do',
        to: 'To do',
      },
    ]);
  });

  it('amends a status whose category alone differs', () => {
    const spec = buildSpec([{ category: 'TODO', name: 'In Progress' }]);

    const plan = buildReconciliationPlan(spec, buildProjectConfiguration(), { newStatusReference });

    expect(plan.statusUpdates).toMatchObject([
      { category: 'TODO', from: 'In Progress', fromCategory: 'IN_PROGRESS', to: 'In Progress' },
    ]);
  });

  it('resolves a spec status through one of its aliases', () => {
    const spec = buildSpec([{ aliases: ['In Progress'], category: 'IN_PROGRESS', name: 'Waiting' }]);

    const plan = buildReconciliationPlan(spec, buildProjectConfiguration(), { newStatusReference });

    expect(plan.creations).toStrictEqual([]);
    expect(plan.statusUpdates).toMatchObject([{ from: 'In Progress', to: 'Waiting' }]);
  });

  it('creates a status not held by the workflow, under the supplied reference', () => {
    const spec = buildSpec([{ category: 'IN_PROGRESS', name: 'In Review' }]);

    const plan = buildReconciliationPlan(spec, buildProjectConfiguration(), { newStatusReference });

    expect(plan.creations).toStrictEqual([
      { category: 'IN_PROGRESS', name: 'In Review', statusReference: 'ref-minted' },
    ]);
  });

  it('mints a reference of its own where the caller supplies none', () => {
    const spec = buildSpec([{ category: 'IN_PROGRESS', name: 'In Review' }]);

    const plan = buildReconciliationPlan(spec, buildProjectConfiguration());

    expect(plan.creations[0]?.statusReference).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('renames the transition into a status renamed by the spec', () => {
    const spec = buildSpec([{ category: 'TODO', name: 'Backlog', aliases: ['To Do'] }]);

    const plan = buildReconciliationPlan(spec, buildProjectConfiguration(), { newStatusReference });

    expect(plan.transitionRenames).toStrictEqual([{ from: 'To Do', id: '10', to: 'Backlog' }]);
  });

  it('leaves a transition whose name already matches its status', () => {
    const spec = buildSpec([{ category: 'DONE', name: 'To Do' }]);

    const plan = buildReconciliationPlan(spec, buildProjectConfiguration(), { newStatusReference });

    expect(plan.transitionRenames).toStrictEqual([]);
  });

  it('reports the live statuses claimed by no spec entry', () => {
    const spec = buildSpec([{ category: 'TODO', name: 'To Do' }]);

    const plan = buildReconciliationPlan(spec, buildProjectConfiguration(), { newStatusReference });

    expect(plan.unmanaged.map((status) => status.name)).toStrictEqual(['In Progress', 'Done']);
  });

  it('toggles a board feature whose live state differs from the requested one', () => {
    const spec = { ...buildSpec(), boardFeatures: { 'jsw.agility.backlog': 'ENABLED' } } satisfies ProjectSpec;

    const plan = buildReconciliationPlan(spec, buildProjectConfiguration(), { newStatusReference });

    expect(plan.featureToggles).toStrictEqual([{ feature: 'jsw.agility.backlog', from: 'DISABLED', to: 'ENABLED' }]);
  });

  it('toggles a board feature not reported by the board', () => {
    const spec = { ...buildSpec(), boardFeatures: { 'jsw.agility.sprints': 'ENABLED' } } satisfies ProjectSpec;

    const plan = buildReconciliationPlan(spec, buildProjectConfiguration(), { newStatusReference });

    expect(plan.featureToggles).toStrictEqual([{ feature: 'jsw.agility.sprints', from: undefined, to: 'ENABLED' }]);
  });

  it('leaves a board feature already in the requested state', () => {
    const spec = { ...buildSpec(), boardFeatures: { 'jsw.agility.backlog': 'DISABLED' } } satisfies ProjectSpec;

    const plan = buildReconciliationPlan(spec, buildProjectConfiguration(), { newStatusReference });

    expect(plan.featureToggles).toStrictEqual([]);
  });

  it('passes over a transition that is not global', () => {
    const statuses = [buildStatus({ name: 'To Do', statusCategory: 'TODO' })];
    const configuration = buildProjectConfiguration({ statuses });
    const workflow = {
      ...configuration.workflow,
      transitions: [{ id: '1', name: 'Create', toStatusReference: 'ref-to-do', type: 'INITIAL' }],
    };

    const plan = buildReconciliationPlan(
      buildSpec([{ category: 'TODO', name: 'Backlog', aliases: ['To Do'] }]),
      { ...configuration, workflow },
      { newStatusReference },
    );

    expect(plan.transitionRenames).toStrictEqual([]);
  });
});

// region | Helpers

/** Builds a spec over the live statuses held by the default configuration, unless entries are supplied. */
function buildSpec(statuses?: readonly SpecStatus[]): ProjectSpec {
  return {
    statuses: statuses ?? [
      { category: 'TODO', name: 'To Do' },
      { category: 'IN_PROGRESS', name: 'In Progress' },
      { category: 'DONE', name: 'Done' },
    ],
  };
}

// endregion | Helpers
