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
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.errors', version: '1.0.0' });

const ASSERT = ['if (!(value instanceof Error)) {', "  throw new TypeError('Expected an Error');", '}', ''].join('\n');
// rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on errors through testing, so errors cannot import dedent without a cycle
const CLONE = [
  'export function toMessage(error) {',
  '  if (error instanceof Error) return error.message;',
  '  return String(error);',
  '}',
  '',
].join('\n');
const COERCE = 'export const wrapped = value instanceof Error ? value : new Error(String(value));\n';
const DESCRIBE_INLINE = 'export const message = error instanceof Error ? error.message : String(error);\n';
const NARROW = "export const isErrno = error instanceof Error && 'code' in error;\n";
// The package's own describeError, containing the idiom that its first check reports.
// rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on errors through testing, so errors cannot import dedent without a cycle
const OWN_DESCRIBE_ERROR = [
  'export function describeError(error) {',
  '  if (error instanceof Error) return error.message;',
  '  return String(error);',
  '}',
  '',
].join('\n');
// rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on errors through testing, so errors cannot import dedent without a cycle
const ADOPTER = [
  "import { describeError } from '@williamthorsen/toolbelt.errors';",
  'export const message = describeError(error);',
  '',
].join('\n');
const EVERY_IDIOM = {
  'package.json': MANIFEST,
  'src/assert.ts': ASSERT,
  'src/clone.ts': CLONE,
  'src/coerce.ts': COERCE,
  'src/describe.ts': DESCRIBE_INLINE,
  'src/narrow.ts': NARROW,
};

describe('The errors adoption kit', () => {
  it('reports each idiom under its own check, naming where it is', async () => {
    using kit = await createKitFixture(KIT_URL, EVERY_IDIOM);

    const outcomes = await runEveryCheck(kit.checks);

    // `no-instanceof-error` takes both the assert and the narrow kind, so its row contains two sites.
    expect(outcomes.map(listReportedFindings)).toStrictEqual([
      [{ line: 2, path: 'src/clone.ts', reported: true, symbol: 'toMessage' }],
      [{ line: 1, path: 'src/describe.ts', reported: true }],
      [
        { line: 1, path: 'src/assert.ts', reported: true },
        { line: 1, path: 'src/narrow.ts', reported: true },
      ],
      [{ line: 1, path: 'src/coerce.ts', reported: true }],
    ]);
  });

  it('spans all five sites in the one denominator that the checks share', async () => {
    using kit = await createKitFixture(KIT_URL, EVERY_IDIOM);

    const outcomes = await runEveryCheck(kit.checks);

    expect(outcomes.map(summarizeFraction)).toStrictEqual(
      Array.from({ length: 4 }, () => ({ adoptedCount: 0, findingCount: 5 })),
    );
  });

  it('counts a call into the package as adoption', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/report.ts': ADOPTER });

    await expect(runCheck(selectCheck(kit.checks, 'no-describe-clone'))).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  it('exempts the package’s own describeError, and reports a hand-roll beside it', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'package.json': PUBLISHER_MANIFEST,
      'src/describeError.ts': OWN_DESCRIBE_ERROR,
      'src/other.ts': DESCRIBE_INLINE,
    });

    const outcomes = await runEveryCheck(kit.checks);

    expect(outcomes.flatMap(listReportedFindings)).toStrictEqual([{ line: 1, path: 'src/other.ts', reported: true }]);
  });

  // `src/report.ts` keeps the check running, so a widened filter reports these files rather than leaving the
  // check skipped.
  it('leaves a test file and a bootstrap wrapper alone', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'bin/run.js': DESCRIBE_INLINE,
      'package.json': MANIFEST,
      'src/__tests__/config.unit.test.ts': DESCRIBE_INLINE,
      'src/report.ts': ADOPTER,
    });

    await expect(runCheck(selectCheck(kit.checks, 'no-describe-clone'))).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  it('skips every check when the sweep matches no source', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'bin/run.js': DESCRIBE_INLINE,
      'package.json': MANIFEST,
      'src/__tests__/config.unit.test.ts': DESCRIBE_INLINE,
    });

    await expect(Promise.all(kit.checks.map((check) => runSkip(check)))).resolves.toStrictEqual(
      Array.from(
        { length: 4 },
        () => 'the project contains no JavaScript or TypeScript sources outside the exempt paths',
      ),
    );
  });
});
