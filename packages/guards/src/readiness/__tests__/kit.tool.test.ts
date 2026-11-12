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
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.guards', version: '1.0.0' });

// rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on guards through arrays, so guards cannot import dedent without a cycle
const ASSERTION = [
  'export function check(condition, message) {',
  '  if (!condition) throw new Error(message);',
  '}',
  '',
].join('\n');
// rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on guards through arrays, so guards cannot import dedent without a cycle
const NULLISH_ASSERTION = [
  'export function demand(value) {',
  '  if (value === null || value === undefined) throw new Error(MISSING);',
  '}',
  '',
].join('\n');
const PREDICATE = ['export function isText(value) {', "  return typeof value === 'string';", '}', ''].join('\n');
const NUMBER_GUARD = ['export function isNum(value) {', "  return typeof value === 'number';", '}', ''].join('\n');
// The package's own assert, containing the idiom that the first check reports.
// rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on guards through arrays, so guards cannot import dedent without a cycle
const OWN_ASSERT = [
  'export function assert(condition, message) {',
  '  if (condition) return;',
  '  throw new Error(message);',
  '}',
  '',
].join('\n');
// rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on guards through arrays, so guards cannot import dedent without a cycle
const ADOPTER = [
  "import { isString } from '@williamthorsen/toolbelt.guards';",
  'export const named = isString(value);',
  '',
].join('\n');
const EVERY_IDIOM = {
  'package.json': MANIFEST,
  'src/assertion.ts': ASSERTION,
  'src/nullish.ts': NULLISH_ASSERTION,
  'src/number.ts': NUMBER_GUARD,
  'src/predicate.ts': PREDICATE,
};

describe('The guards adoption kit', () => {
  it('reports each clone under its own check, naming the function to retire', async () => {
    using kit = await createKitFixture(KIT_URL, EVERY_IDIOM);

    const outcomes = await runEveryCheck(kit.checks);

    // `no-assertion-clone` takes both assertion kinds, so its row contains two sites.
    expect(outcomes.map(listReportedFindings)).toStrictEqual([
      [
        { line: 1, path: 'src/assertion.ts', reported: true, symbol: 'check' },
        { line: 1, path: 'src/nullish.ts', reported: true, symbol: 'demand' },
      ],
      [{ line: 1, path: 'src/predicate.ts', reported: true, symbol: 'isText' }],
      [{ line: 1, path: 'src/number.ts', reported: true, symbol: 'isNum' }],
    ]);
  });

  it('spans all four sites in the one denominator that the checks share', async () => {
    using kit = await createKitFixture(KIT_URL, EVERY_IDIOM);

    const outcomes = await runEveryCheck(kit.checks);

    expect(outcomes.map(summarizeFraction)).toStrictEqual(
      Array.from({ length: 3 }, () => ({ adoptedCount: 0, findingCount: 4 })),
    );
  });

  it('counts a call into the package as adoption', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/report.ts': ADOPTER });

    await expect(runCheck(selectCheck(kit.checks, 'no-assertion-clone'))).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  it('exempts the package’s own assert, and reports a hand-roll beside it', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'package.json': PUBLISHER_MANIFEST,
      'src/assert.ts': OWN_ASSERT,
      'src/other.ts': ASSERTION,
    });

    const outcomes = await runEveryCheck(kit.checks);

    expect(outcomes.flatMap(listReportedFindings)).toStrictEqual([
      { line: 1, path: 'src/other.ts', reported: true, symbol: 'check' },
    ]);
  });

  it('leaves a test file and a bootstrap wrapper alone', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'bin/run.js': ASSERTION,
      'package.json': MANIFEST,
      'src/__tests__/config.unit.test.ts': ASSERTION,
      'src/report.ts': ADOPTER,
    });

    await expect(runCheck(selectCheck(kit.checks, 'no-assertion-clone'))).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  it('skips every check when the sweep matches no source', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'bin/run.js': ASSERTION,
      'package.json': MANIFEST,
      'src/__tests__/config.unit.test.ts': ASSERTION,
    });

    await expect(Promise.all(kit.checks.map((check) => runSkip(check)))).resolves.toStrictEqual(
      Array.from(
        { length: 3 },
        () => 'the project contains no JavaScript or TypeScript sources outside the exempt paths',
      ),
    );
  });
});
