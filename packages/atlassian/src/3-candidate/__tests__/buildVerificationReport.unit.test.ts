import { describe, expect, it } from 'vitest';

import { buildProjectConfiguration, buildStatus } from '../../test-utils/projectConfiguration.ts';
import { buildVerificationReport } from '../buildVerificationReport.ts';
import type { ProjectSpec } from '../ProjectSpec.ts';

const SPEC: ProjectSpec = {
  statuses: [
    { category: 'TODO', name: 'To Do' },
    { category: 'IN_PROGRESS', name: 'In Progress' },
    { category: 'DONE', name: 'Done' },
  ],
};

describe(buildVerificationReport, () => {
  it('reports a conformant project as matching, each status against its live category and transition', () => {
    const report = buildVerificationReport(buildProjectConfiguration(), SPEC);

    expect(report.matches).toBe(true);
    expect(report.statuses).toStrictEqual([
      { category: 'TODO', matches: true, name: 'To Do', transition: 'To Do' },
      { category: 'IN_PROGRESS', matches: true, name: 'In Progress', transition: 'In Progress' },
      { category: 'DONE', matches: true, name: 'Done', transition: 'Done' },
    ]);
  });

  it('matches a live name differing only in casing, which is how Jira reports one status across endpoints', () => {
    const statuses = [
      buildStatus({ name: 'to do', statusCategory: 'TODO' }),
      buildStatus({ name: 'In Progress', statusCategory: 'IN_PROGRESS' }),
      buildStatus({ name: 'Done', statusCategory: 'DONE' }),
    ];

    const report = buildVerificationReport(buildProjectConfiguration({ statuses }), SPEC);

    expect(report.matches).toBe(true);
    expect(report.statuses[0]).toStrictEqual({
      category: 'TODO',
      matches: true,
      name: 'To Do',
      transition: 'to do',
    });
  });

  it('reports a status not held by the workflow as absent rather than matching', () => {
    const statuses = [buildStatus({ name: 'To Do', statusCategory: 'TODO' })];

    const report = buildVerificationReport(buildProjectConfiguration({ statuses }), SPEC);

    expect(report.matches).toBe(false);
    expect(report.statuses[2]).toStrictEqual({
      category: undefined,
      matches: false,
      name: 'Done',
      transition: undefined,
    });
  });

  it('names no transition for a status not held by the workflow, even where one carries no target', () => {
    const configuration = buildProjectConfiguration({ statuses: [buildStatus({ name: 'To Do' })] });
    const transitions = [{ id: '30', name: 'Create', type: 'GLOBAL' }];

    const report = buildVerificationReport(
      { ...configuration, workflow: { ...configuration.workflow, transitions } },
      SPEC,
    );

    expect(report.statuses[2]).toStrictEqual({
      category: undefined,
      matches: false,
      name: 'Done',
      transition: undefined,
    });
  });

  it('reports a status whose live category differs as unmatched', () => {
    const statuses = [
      buildStatus({ name: 'To Do', statusCategory: 'TODO' }),
      buildStatus({ name: 'In Progress', statusCategory: 'TODO' }),
      buildStatus({ name: 'Done', statusCategory: 'DONE' }),
    ];

    const report = buildVerificationReport(buildProjectConfiguration({ statuses }), SPEC);

    expect(report.matches).toBe(false);
    expect(report.statuses[1]).toMatchObject({ category: 'TODO', matches: false });
  });

  it('reports a transition whose name no longer tracks its status as unmatched', () => {
    const configuration = buildProjectConfiguration();
    const transitions = configuration.workflow.transitions.map((transition) =>
      transition.toStatusReference === 'ref-to-do' ? { ...transition, name: 'Backlog' } : transition,
    );

    const report = buildVerificationReport(
      { ...configuration, workflow: { ...configuration.workflow, transitions } },
      SPEC,
    );

    expect(report.matches).toBe(false);
    expect(report.statuses[0]).toMatchObject({ matches: false, transition: 'Backlog' });
  });

  it('reports each declared board feature against its live state', () => {
    const spec: ProjectSpec = {
      ...SPEC,
      boardFeatures: { 'jsw.agility.backlog': 'ENABLED', 'jsw.agility.sprints': 'ENABLED' },
    };

    const report = buildVerificationReport(buildProjectConfiguration(), spec);

    expect(report.matches).toBe(false);
    expect(report.features).toStrictEqual([
      { feature: 'jsw.agility.backlog', matches: false, state: 'DISABLED' },
      { feature: 'jsw.agility.sprints', matches: false, state: undefined },
    ]);
  });

  it('reports no features where the spec declares none', () => {
    const report = buildVerificationReport(buildProjectConfiguration(), SPEC);

    expect(report.features).toStrictEqual([]);
  });
});
