import { describe, expect, it } from 'vitest';

import { buildProjectConfiguration, buildStatus } from '../../test-utils/projectConfiguration.ts';
import { buildWorkflowUpdatePayload } from '../buildWorkflowUpdatePayload.ts';
import type { ReconciliationPlan } from '../ReconciliationPlan.ts';

const configuration = buildProjectConfiguration();

describe(buildWorkflowUpdatePayload, () => {
  it('carries a transition through with the fields this package does not model', () => {
    const [workflow] = buildWorkflowUpdatePayload(configuration, buildPlan()).workflows;

    expect(workflow.transitions[0]).toStrictEqual(configuration.workflow.transitions[0]);
    expect(workflow.transitions[0]?.['conditions']).toStrictEqual({ conditionGroups: [], operation: 'ALL' });
  });

  it('changes the name alone of a renamed transition', () => {
    const plan = buildPlan({ transitionRenames: [{ from: 'To Do', id: '10', to: 'Backlog' }] });

    const [workflow] = buildWorkflowUpdatePayload(configuration, plan).workflows;

    expect(workflow.transitions[0]).toStrictEqual({ ...configuration.workflow.transitions[0], name: 'Backlog' });
  });

  it('carries the workflow description, version, and start point through', () => {
    const [workflow] = buildWorkflowUpdatePayload(configuration, buildPlan()).workflows;

    expect(workflow.description).toBe('The project workflow.');
    expect(workflow.version).toStrictEqual({ id: 'version-1', versionNumber: 1 });
    expect(workflow.startPointLayout).toStrictEqual({ x: 0, y: 0 });
  });

  it('blanks the description of a renamed status', () => {
    const plan = buildPlan({
      statusUpdates: [
        {
          category: 'TODO',
          description: 'Work not yet started.',
          from: 'To Do',
          fromCategory: 'TODO',
          id: 'id-to-do',
          statusReference: 'ref-to-do',
          to: 'Backlog',
        },
      ],
    });

    const payload = buildWorkflowUpdatePayload(withDescribedStatus(), plan);

    expect(payload.statuses[0]).toStrictEqual({
      description: '',
      id: 'id-to-do',
      name: 'Backlog',
      statusCategory: 'TODO',
      statusReference: 'ref-to-do',
    });
  });

  it('keeps the description of a status whose category alone changes', () => {
    const plan = buildPlan({
      statusUpdates: [
        {
          category: 'IN_PROGRESS',
          description: 'Work not yet started.',
          from: 'To Do',
          fromCategory: 'TODO',
          id: 'id-to-do',
          statusReference: 'ref-to-do',
          to: 'To Do',
        },
      ],
    });

    const payload = buildWorkflowUpdatePayload(withDescribedStatus(), plan);

    expect(payload.statuses[0]).toStrictEqual({
      description: 'Work not yet started.',
      id: 'id-to-do',
      name: 'To Do',
      statusCategory: 'IN_PROGRESS',
      statusReference: 'ref-to-do',
    });
  });

  it('adds a created status, its layout entry, and a transition into it', () => {
    const plan = buildPlan({
      creations: [{ category: 'IN_PROGRESS', name: 'In Review', statusReference: 'ref-in-review' }],
    });

    const payload = buildWorkflowUpdatePayload(configuration, plan);
    const [workflow] = payload.workflows;

    expect(payload.statuses.at(-1)).toStrictEqual({
      description: '',
      name: 'In Review',
      statusCategory: 'IN_PROGRESS',
      statusReference: 'ref-in-review',
    });
    expect(workflow.statuses.at(-1)).toStrictEqual({ layout: {}, statusReference: 'ref-in-review' });
    expect(workflow.transitions.at(-1)).toStrictEqual({
      id: '40',
      name: 'In Review',
      toStatusReference: 'ref-in-review',
      type: 'GLOBAL',
    });
  });

  it('continues the decade spacing across several created transitions', () => {
    const plan = buildPlan({
      creations: [
        { category: 'IN_PROGRESS', name: 'In Review', statusReference: 'ref-in-review' },
        { category: 'DONE', name: 'Cancelled', statusReference: 'ref-cancelled' },
      ],
    });

    const [workflow] = buildWorkflowUpdatePayload(configuration, plan).workflows;

    expect(workflow.transitions.slice(-2).map((transition) => transition.id)).toStrictEqual(['40', '50']);
  });

  it('allocates from the floor on a workflow holding no transitions', () => {
    const empty = buildProjectConfiguration({
      statuses: [],
      workflow: { ...configuration.workflow, statuses: [], transitions: [] },
    });
    const plan = buildPlan({ creations: [{ category: 'TODO', name: 'To Do', statusReference: 'ref-to-do' }] });

    const [workflow] = buildWorkflowUpdatePayload(empty, plan).workflows;

    expect(workflow.transitions.map((transition) => transition.id)).toStrictEqual(['10']);
  });

  it('carries every live status and transition into the payload it returns', () => {
    const payload = buildWorkflowUpdatePayload(configuration, buildPlan());
    const [workflow] = payload.workflows;

    expect(payload.statuses.map((status) => status.statusReference)).toStrictEqual([
      'ref-to-do',
      'ref-in-progress',
      'ref-done',
    ]);
    expect(workflow.transitions).toStrictEqual(configuration.workflow.transitions);
  });
});

// region | Helpers

function buildPlan(overrides: Partial<ReconciliationPlan> = {}): ReconciliationPlan {
  return {
    creations: [],
    featureToggles: [],
    statusUpdates: [],
    transitionRenames: [],
    unmanaged: [],
    ...overrides,
  };
}

/** Builds the default configuration with a description on `To Do`, which the description rules turn on. */
function withDescribedStatus(): ReturnType<typeof buildProjectConfiguration> {
  return buildProjectConfiguration({
    statuses: [
      buildStatus({ description: 'Work not yet started.', name: 'To Do', statusCategory: 'TODO' }),
      buildStatus({ name: 'In Progress', statusCategory: 'IN_PROGRESS' }),
      buildStatus({ name: 'Done', statusCategory: 'DONE' }),
    ],
  });
}

// endregion | Helpers
