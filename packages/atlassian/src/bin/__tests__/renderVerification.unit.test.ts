import { describe, expect, it } from 'vitest';

import type { BoardColumnReport } from '../../3-candidate/BoardColumnReport.ts';
import type { VerificationReport } from '../../3-candidate/VerificationReport.ts';
import { renderVerification } from '../renderVerification.ts';

describe(renderVerification, () => {
  it('marks a status the server holds as the spec declares it', () => {
    const rendered = renderVerification(
      buildReport({ statuses: [{ category: 'TODO', matches: true, name: 'To Do', transition: 'To Do' }] }),
      buildColumns(),
    );

    expect(rendered).toContain("  ok   To Do (TODO), transition 'To Do'");
  });

  it('marks a status the server does not hold, naming what is absent', () => {
    const rendered = renderVerification(
      buildReport({
        matches: false,
        statuses: [{ category: undefined, matches: false, name: 'Waiting', transition: undefined }],
      }),
      buildColumns(),
    );

    expect(rendered).toContain("  MISS Waiting (absent), transition 'absent'");
  });

  it('reports each board feature against the state the spec requests', () => {
    const rendered = renderVerification(
      buildReport({
        features: [
          { feature: 'jsw.agility.backlog', locked: false, matches: true, state: 'ENABLED' },
          { feature: 'jsw.agility.sprints', locked: false, matches: false, state: undefined },
        ],
      }),
      buildColumns(),
    );

    expect(rendered).toContain('  ok   jsw.agility.backlog = ENABLED');
    expect(rendered).toContain('  MISS jsw.agility.sprints = absent');
  });

  it('marks a feature Jira has locked as neither met nor faulted', () => {
    const rendered = renderVerification(
      buildReport({
        features: [{ feature: 'jsw.agility.goals', locked: true, matches: false, state: 'DISABLED' }],
      }),
      buildColumns(),
    );

    expect(rendered).toContain('  LOCK jsw.agility.goals = DISABLED, which Jira has locked and no call can set');
    expect(rendered).not.toContain('MISS jsw.agility.goals');
  });

  it('lists the board columns', () => {
    expect(renderVerification(buildReport(), buildColumns())).toContain('columns  To Do | In Progress | Done');
  });

  it('names a status mapped to no column and what that costs', () => {
    const rendered = renderVerification(buildReport(), buildColumns({ uncovered: ['Waiting'] }));

    expect(rendered).toContain("columns  'Waiting' map to no column, so their work items appear only in search;");
    expect(rendered).toContain('add a column for each in the board settings');
  });

  it('reports a column order differing from the spec', () => {
    const rendered = renderVerification(
      buildReport(),
      buildColumns({ order: { actual: ['Done', 'To Do'], expected: ['To Do', 'Done'] } }),
    );

    expect(rendered).toContain('columns  order differs from the spec (To Do | Done);');
  });

  it('says nothing about column order where the board already holds the spec order', () => {
    expect(renderVerification(buildReport(), buildColumns())).not.toContain('order differs');
  });
});

// region | Helpers

function buildColumns(overrides: Partial<BoardColumnReport> = {}): BoardColumnReport {
  return { columns: ['To Do', 'In Progress', 'Done'], order: undefined, uncovered: [], ...overrides };
}

function buildReport(overrides: Partial<VerificationReport> = {}): VerificationReport {
  return { features: [], matches: true, statuses: [], ...overrides };
}

// endregion | Helpers
