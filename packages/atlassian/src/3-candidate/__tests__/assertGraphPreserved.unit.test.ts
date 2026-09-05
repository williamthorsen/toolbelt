import { describe, expect, it } from 'vitest';

import { buildProjectConfiguration, buildTransition } from '../../test-utils/projectConfiguration.ts';
import { assertGraphPreserved } from '../assertGraphPreserved.ts';
import type { Workflow } from '../ProjectConfiguration.ts';
import type { WorkflowUpdatePayload } from '../WorkflowUpdatePayload.ts';

const { workflow } = buildProjectConfiguration();

describe(assertGraphPreserved, () => {
  it('passes a payload carrying every status and transition that the workflow holds', () => {
    expect(() => assertGraphPreserved(workflow, buildPayload(workflow))).not.toThrow();
  });

  it('refuses a payload that would drop a status', () => {
    const payload = buildPayload(workflow, {
      statuses: workflow.statuses.filter((status) => status.statusReference !== 'ref-done'),
    });

    expect(() => assertGraphPreserved(workflow, payload)).toThrow('status ref-done would be dropped');
  });

  it('refuses a payload that would drop a transition', () => {
    const payload = buildPayload(workflow, {
      transitions: workflow.transitions.filter((transition) => transition.id !== '30'),
    });

    expect(() => assertGraphPreserved(workflow, payload)).toThrow('transition 30 (Done) would be dropped');
  });

  it('refuses a payload that would leave a status with no transition into it', () => {
    const payload = buildPayload(workflow, {
      transitions: workflow.transitions.map((transition) =>
        transition.id === '30' ? { ...transition, toStatusReference: 'ref-to-do' } : transition,
      ),
    });

    expect(() => assertGraphPreserved(workflow, payload)).toThrow('status ref-done would be left with no transition');
  });

  it('passes over a status that already carried no transition into it', () => {
    const stranded: Workflow = {
      ...workflow,
      transitions: workflow.transitions.filter((transition) => transition.toStatusReference !== 'ref-done'),
    };

    expect(() => assertGraphPreserved(stranded, buildPayload(stranded))).not.toThrow();
  });

  it('refuses a newly stranded status while still passing over one that already was', () => {
    const stranded: Workflow = {
      ...workflow,
      transitions: workflow.transitions.filter((transition) => transition.toStatusReference !== 'ref-done'),
    };
    const payload = buildPayload(stranded, {
      transitions: stranded.transitions.map((transition) =>
        transition.id === '20' ? buildTransition({ ...transition, toStatusReference: 'ref-to-do' }) : transition,
      ),
    });

    expect(() => assertGraphPreserved(stranded, payload)).toThrow(
      'status ref-in-progress would be left with no transition',
    );
  });
});

// region | Helpers

/** Builds the payload composed by a faithful write of a workflow, with the overrides that a test needs to spoil it. */
function buildPayload(source: Workflow, overrides: Partial<Workflow> = {}): WorkflowUpdatePayload {
  const { statuses = source.statuses, transitions = source.transitions } = overrides;

  return {
    statuses: statuses.map((status) => ({
      description: '',
      name: status.statusReference,
      statusCategory: 'TODO',
      statusReference: status.statusReference,
    })),
    workflows: [
      {
        id: source.id,
        startPointLayout: { x: 0, y: 0 },
        statuses,
        transitions,
        version: source.version,
      },
    ],
  };
}

// endregion | Helpers
