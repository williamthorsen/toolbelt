import type { RdyCheck, RdyKit } from 'readyup';
import { describe, expect, it } from 'vitest';

import { listKitChecks } from '../check-outcomes.ts';

const FIRST: RdyCheck = { name: 'first', check: () => true };
const SECOND: RdyCheck = { name: 'second', check: () => true };

describe(listKitChecks, () => {
  it("returns the checks of the kit's first flat checklist in declaration order", () => {
    const kit: RdyKit = {
      checklists: [
        { name: 'adoption', checks: [FIRST, SECOND] },
        { name: 'other', checks: [SECOND] },
      ],
    };

    expect(listKitChecks(kit)).toStrictEqual([FIRST, SECOND]);
  });

  it('throws when the kit holds no checklist', () => {
    expect(() => listKitChecks({ checklists: [] })).toThrow('the kit holds no flat checklist');
  });

  it('throws when the first checklist is staged', () => {
    const kit: RdyKit = { checklists: [{ name: 'staged', groups: [[FIRST]] }] };

    expect(() => listKitChecks(kit)).toThrow('the kit holds no flat checklist');
  });
});
