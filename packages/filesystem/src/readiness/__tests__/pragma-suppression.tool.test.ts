import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const ADOPTER = [
  "import { writeAtomic } from '@williamthorsen/toolbelt.filesystem/candidate';",
  'export const store = (filePath, content) => writeAtomic(filePath, content);',
  '',
].join('\n');
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

describe('The filesystem adoption kit, run through rdy', () => {
  // Both checks count the same two sites, and only the adopting call passes. A site of the other check's kind
  // raises the denominator without raising the numerator, so the fraction reports how far adoption of the
  // package got rather than how clean one check is.
  it('names the site under its own check and counts it against every fraction', () => {
    expect(runKit(buildWrite(''))).toStrictEqual([
      { count: 2, detail: 'save (src/save.ts:3)', id: 'no-hand-rolled-atomic-write', passedCount: 1 },
      { count: 2, detail: undefined, id: 'no-hand-rolled-directory-walk', passedCount: 1 },
    ]);
  });

  it('drops a site covered by an unqualified pragma from the detail and the fraction', () => {
    expect(runKit(buildWrite(' // rdy-ignore -- reviewed'))[0]).toStrictEqual({
      count: 1,
      detail: undefined,
      id: 'no-hand-rolled-atomic-write',
      passedCount: 1,
    });
  });

  // A `dir:` kit source has no namespace, so the bare id stands. A consumer running the kit from the
  // installed package writes `toolbelt.filesystem/no-hand-rolled-atomic-write`.
  it('drops a site covered by a qualified pragma', () => {
    expect(runKit(buildWrite(' // rdy-ignore no-hand-rolled-atomic-write -- reviewed'))[0]).toStrictEqual({
      count: 1,
      detail: undefined,
      id: 'no-hand-rolled-atomic-write',
      passedCount: 1,
    });
  });

  it('leaves a site standing where the pragma names the other check', () => {
    expect(runKit(buildWrite(' // rdy-ignore no-hand-rolled-directory-walk -- reviewed'))[0]).toStrictEqual({
      count: 2,
      detail: 'save (src/save.ts:3)',
      id: 'no-hand-rolled-atomic-write',
      passedCount: 1,
    });
  });
});

// region | Helpers

/** Builds a hand-rolled atomic write whose rename line carries the given trailing pragma. */
function buildWrite(pragma: string): string {
  return [
    'export async function save(filePath, content) {',
    '  await fs.writeFile(tempPath, content);',
    `  await fs.rename(tempPath, filePath);${pragma}`,
    '}',
    '',
  ].join('\n');
}

/**
 * Runs the package's compiled kit over a fixture repo holding the given source, and reports what each check
 * named and counted.
 *
 * A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report reaches the
 * layer that acts on one.
 */
function runKit(source: string): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/adopter.ts': ADOPTER,
    'src/save.ts': source,
  });
}

// endregion | Helpers
