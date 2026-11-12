import {
  createKitFixture,
  listReportedFindings,
  runCheck,
  runEveryCheck,
  runSkip,
  selectCheck,
  summarizeFraction,
} from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const KIT_URL = new URL('../../../.readyup/kits/default.ts', import.meta.url);
const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.numbers', version: '1.0.0' });
const CLAMP = 'export const bounded = Math.max(min, Math.min(max, value));\n';
// The package's own `clamp`, containing the idiom that its check recommends replacing.
const OWN_CLAMP = 'export function clamp(value, bounds) {\n  return Math.max(min, Math.min(max, value));\n}\n';
const ROUND = 'export const rate = Math.round(value * 100) / 100;\n';
const RANDOM = 'export const roll = Math.floor(Math.random() * sides);\n';
const ADOPTER = "import { round } from '@williamthorsen/toolbelt.numbers/candidate';\nround(value, 2);\n";
const ALL_IDIOMS = { 'package.json': MANIFEST, 'src/bound.ts': CLAMP, 'src/rate.ts': ROUND, 'src/roll.ts': RANDOM };

describe('The numbers adoption kit', () => {
  it('reports each idiom under its own check, naming where it is', async () => {
    using kit = await createKitFixture(KIT_URL, ALL_IDIOMS);

    const outcomes = await runEveryCheck(kit.checks);

    expect(outcomes.map(listReportedFindings)).toStrictEqual([
      [{ line: 1, path: 'src/bound.ts', reported: true }],
      [{ line: 1, path: 'src/rate.ts', reported: true }],
      [{ line: 1, path: 'src/roll.ts', reported: true }],
    ]);
  });

  it('spans every idiom in the denominator, so the three checks share one fraction', async () => {
    using kit = await createKitFixture(KIT_URL, ALL_IDIOMS);

    const outcomes = await runEveryCheck(kit.checks);

    expect(outcomes.map(summarizeFraction)).toStrictEqual(
      Array.from({ length: 3 }, () => ({ adoptedCount: 0, findingCount: 3 })),
    );
  });

  it('counts a call into the package as adoption', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/rate.ts': ADOPTER });

    await expect(runCheck(selectCheck(kit.checks, 'no-hand-rolled-round'))).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  // A subscripted random integer is `toolbelt.arrays`' site. Claiming it would report one line twice across
  // the two kits; counting it would leave a fraction that the checks here could not close.
  it('exempts the package’s own clamp, and reports a hand-roll beside it', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'package.json': PUBLISHER_MANIFEST,
      'src/clamp.ts': OWN_CLAMP,
      'src/other.ts': CLAMP,
    });

    await expect(runCheck(selectCheck(kit.checks, 'no-hand-rolled-clamp'))).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 1, path: 'src/other.ts', reported: true }],
    });
  });

  it('skips every check when the sweep matches no source', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/bound.unit.test.ts': CLAMP });

    await expect(Promise.all(kit.checks.map((check) => runSkip(check)))).resolves.toStrictEqual(
      Array.from(
        { length: 3 },
        () => 'the project contains no JavaScript or TypeScript sources outside the exempt paths',
      ),
    );
  });
});
