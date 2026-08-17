import { isFlatChecklist, type RdyCheck } from 'readyup';
import { describe, expect, it } from 'vitest';

import { type AdoptionKitSpec, defineAdoptionKit } from '../defineAdoptionKit.ts';

type Kind = 'clone' | 'inline' | 'unclassified';

const SPEC: AdoptionKitSpec<Kind> = {
  checks: [
    { fix: 'delete the clone', kinds: ['clone'], name: 'No source defines its own helper' },
    {
      fix: 'replace the expression',
      kinds: ['inline', 'unclassified'],
      name: 'No source inlines it',
      severity: 'recommend',
    },
  ],
  description: 'Adoption checks for a project consuming @scope/pkg',
  detect: () => [],
  exportNames: ['doThing'],
  noSourcesReason: 'the project holds no sources',
  packageName: '@scope/pkg',
  pathFilter: () => true,
};

describe(defineAdoptionKit, () => {
  it('assembles one adoption checklist carrying a check per declaration', () => {
    const kit = defineAdoptionKit(SPEC);
    const [checklist] = kit.checklists;

    expect(kit.checklists).toHaveLength(1);
    expect(checklist?.name).toBe('adoption');
    expect(listChecks(kit).map((check) => check.name)).toStrictEqual([
      'No source defines its own helper',
      'No source inlines it',
    ]);
  });

  it('carries each declaration’s fix text through to its check', () => {
    expect(listChecks(defineAdoptionKit(SPEC)).map((check) => check.fix)).toStrictEqual([
      'delete the clone',
      'replace the expression',
    ]);
  });

  it('defaults severity to warn and honors a declared override', () => {
    const kit = defineAdoptionKit(SPEC);

    expect(kit.defaultSeverity).toBe('warn');
    expect(listChecks(kit).map((check) => check.severity)).toStrictEqual([undefined, 'recommend']);
  });

  it('takes the description the spec declares', () => {
    expect(defineAdoptionKit(SPEC).description).toBe('Adoption checks for a project consuming @scope/pkg');
  });

  it('gives every check a skip, so none runs against a project it does not apply to', () => {
    expect(listChecks(defineAdoptionKit(SPEC)).every((check) => check.skip !== undefined)).toBe(true);
  });
});

// region | Helpers

/** Lists the assembled kit's adoption checks, which the flat checklist holds in declaration order. */
function listChecks(kit: ReturnType<typeof defineAdoptionKit>): RdyCheck[] {
  const [checklist] = kit.checklists;
  if (checklist === undefined || !isFlatChecklist(checklist)) return [];
  return checklist.checks;
}

// endregion | Helpers
