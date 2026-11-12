import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { RdyCheck, RdyKit } from 'readyup';
import { describe, expect, it } from 'vitest';

import { listFreshKitChecks, listKitChecks, runEveryCheck, selectCheck } from '../check-outcomes.ts';
import { createTempDir } from '../createTempDir.ts';

const FIRST: RdyCheck = { name: 'first', check: () => true };
const SECOND: RdyCheck = { name: 'second', check: () => true };

describe(listFreshKitChecks, () => {
  it('returns the checks of a separately evaluated kit on each call', async () => {
    using kitDir = createTempDir({
      'kit.js':
        "export default { checklists: [{ name: 'adoption', checks: [{ name: 'first', check: () => true }] }] };\n",
    });
    const kitUrl = pathToFileURL(path.join(kitDir.dir, 'kit.js'));

    const [first] = await listFreshKitChecks(kitUrl);
    const [second] = await listFreshKitChecks(kitUrl);

    expect(first).toHaveProperty('name', 'first');
    expect(second).toHaveProperty('name', 'first');
    expect(second).not.toBe(first);
  });

  it('throws when the module exports no kit', async () => {
    using kitDir = createTempDir({ 'kit.js': 'export const answer = 42;\n' });

    await expect(listFreshKitChecks(pathToFileURL(path.join(kitDir.dir, 'kit.js')))).rejects.toThrow(
      'the module exports no kit',
    );
  });
});

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

describe(runEveryCheck, () => {
  it("returns every check's report in the checks' order", async () => {
    const checks: RdyCheck[] = [
      { name: 'async', check: () => Promise.resolve({ adoptedCount: 1, findings: [] }) },
      { name: 'sync', check: () => ({ adoptedCount: 2, findings: [] }) },
    ];

    await expect(runEveryCheck(checks)).resolves.toStrictEqual([
      { adoptedCount: 1, findings: [] },
      { adoptedCount: 2, findings: [] },
    ]);
  });

  it('rejects when a check returns no report', async () => {
    await expect(runEveryCheck([FIRST])).rejects.toThrow('the check returned no report');
  });
});

describe(selectCheck, () => {
  const checks: RdyCheck[] = [
    { id: 'first-id', name: 'first', check: () => true },
    { id: 'second-id', name: 'second', check: () => true },
  ];

  it('returns the check with the given id', () => {
    expect(selectCheck(checks, 'second-id')).toBe(checks[1]);
  });

  it('throws, naming the id, when no check has it', () => {
    expect(() => selectCheck(checks, 'missing-id')).toThrow("the kit holds no check with id 'missing-id'");
  });
});
