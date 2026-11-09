import {
  createKitFixture,
  listReportedFindings,
  runCheck,
  runEveryCheck,
  runSkip,
  summarizeFraction,
} from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const KIT_URL = new URL('../../../.readyup/kits/default.ts', import.meta.url);
const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.objects', version: '1.0.0' });
const OWN_PROPERTY = 'export const has = Object.prototype.hasOwnProperty.call(target, key);\n';
const RECORD = "export const ok = typeof value === 'object' && value !== null && !Array.isArray(value);\n";
const STRINGIFY = 'export const same = JSON.stringify(a) === JSON.stringify(b);\n';
// The package's own `isRecord`, containing the idiom that its check recommends replacing.
const OWN_RECORD =
  "export function isRecord(value) {\n  return typeof value === 'object' && value !== null && !Array.isArray(value);\n}\n";
const ADOPTER = "import { isRecord } from '@williamthorsen/toolbelt.objects';\nisRecord(value);\n";
const EVERY_IDIOM = {
  'package.json': MANIFEST,
  'src/guard.ts': RECORD,
  'src/has.ts': OWN_PROPERTY,
  'src/same.ts': STRINGIFY,
};

describe('The objects adoption kit', () => {
  it('reports each idiom under its own check, naming where it is', async () => {
    using kit = await createKitFixture(KIT_URL, EVERY_IDIOM);

    const outcomes = await runEveryCheck(kit.checks);

    expect(outcomes.map(listReportedFindings)).toStrictEqual([
      [{ line: 1, path: 'src/has.ts', reported: true }],
      [{ line: 1, path: 'src/guard.ts', reported: true }],
      [{ line: 1, path: 'src/same.ts', reported: true }],
    ]);
  });

  it('spans all three idioms in the denominator, so the checks share one fraction', async () => {
    using kit = await createKitFixture(KIT_URL, EVERY_IDIOM);

    const outcomes = await runEveryCheck(kit.checks);

    expect(outcomes.map(summarizeFraction)).toStrictEqual(
      Array.from({ length: 3 }, () => ({ adoptedCount: 0, findingCount: 3 })),
    );
  });

  it('counts a call into the package as adoption', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/guard.ts': ADOPTER });

    await expect(runCheck(kit.checks[0])).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  it('exempts the package’s own isRecord, and reports a hand-roll beside it', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'package.json': PUBLISHER_MANIFEST,
      'src/is-record.ts': OWN_RECORD,
      'src/other.ts': RECORD,
    });

    await expect(runCheck(kit.checks[1])).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 1, path: 'src/other.ts', reported: true }],
    });
  });

  it('skips every check when the sweep matches no source', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/guard.unit.test.ts': RECORD });

    await expect(runSkip(kit.checks[0])).resolves.toBe(
      'the project contains no JavaScript or TypeScript sources outside the exempt paths',
    );
  });
});
