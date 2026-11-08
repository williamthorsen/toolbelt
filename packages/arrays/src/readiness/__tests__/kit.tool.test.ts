import {
  createTrackedRepo,
  listFreshKitChecks,
  listReportedFindings,
  runCheck,
  runSkip,
  summarizeFraction,
} from '@williamthorsen/toolbelt.adoption/test-utils';
import { pointCwdAt } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, it } from 'vitest';

const KIT_URL = new URL('../../../.readyup/kits/default.ts', import.meta.url);
const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.arrays', version: '1.0.0' });
const ARRAIFY = 'export const list = Array.isArray(value) ? value : [value];\n';
const RANDOM_ITEM = 'export const item = items[Math.floor(Math.random() * items.length)];\n';
const SHUFFLE = 'export const mixed = items.sort(() => Math.random() - 0.5);\n';
// The package's own `arraify`, containing the idiom that its check recommends replacing.
const OWN_ARRAIFY = 'export function arraify(value) {\n  return Array.isArray(value) ? value : [value];\n}\n';
// A tiebreak declined by the shuffle check, a floored random that the item check leaves to `toolbelt.numbers`,
// and a ternary choosing between two unrelated values.
// rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on arrays, so arrays cannot import dedent without a cycle
const UNCLAIMED = [
  'export const ranked = rows.sort((a, b) => a.score - b.score || Math.random() - 0.5);',
  'export const roll = Math.floor(Math.random() * sides);',
  'export const list = Array.isArray(value) ? value : [fallback];',
  '',
].join('\n');
const ADOPTER = "import { pickItem } from '@williamthorsen/toolbelt.arrays';\npickItem(items);\n";
const EVERY_IDIOM = {
  'package.json': MANIFEST,
  'src/mixed.ts': SHUFFLE,
  'src/pick.ts': RANDOM_ITEM,
  'src/wrap.ts': ARRAIFY,
};

describe('The arrays adoption kit', () => {
  it('reports each idiom under its own check, naming where it is', async () => {
    using tree = createTrackedRepo(EVERY_IDIOM);
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await listFreshKitChecks(KIT_URL)).map((check) => runCheck(check)));

    expect(outcomes.map(listReportedFindings)).toStrictEqual([
      [{ line: 1, path: 'src/mixed.ts', reported: true }],
      [{ line: 1, path: 'src/pick.ts', reported: true }],
      [{ line: 1, path: 'src/wrap.ts', reported: true }],
    ]);
  });

  it('spans all three idioms in the denominator, so the checks share one fraction', async () => {
    using tree = createTrackedRepo(EVERY_IDIOM);
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await listFreshKitChecks(KIT_URL)).map((check) => runCheck(check)));

    expect(outcomes.map(summarizeFraction)).toStrictEqual(
      Array.from({ length: 3 }, () => ({ adoptedCount: 0, findingCount: 3 })),
    );
  });

  it('counts a call into the package as adoption', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/pick.ts': ADOPTER });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await listFreshKitChecks(KIT_URL))[0])).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  it('neither reports nor counts a tiebreak, a bare random integer, or a ternary over two values', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/probe.ts': UNCLAIMED });
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await listFreshKitChecks(KIT_URL)).map((check) => runCheck(check)));

    expect(outcomes).toStrictEqual(Array.from({ length: 3 }, () => ({ adoptedCount: 0, findings: [] })));
  });

  it('exempts the package’s own arraify, and reports a hand-roll beside it', async () => {
    using tree = createTrackedRepo({
      'package.json': PUBLISHER_MANIFEST,
      'src/arraify.ts': OWN_ARRAIFY,
      'src/other.ts': ARRAIFY,
    });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await listFreshKitChecks(KIT_URL))[2])).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 1, path: 'src/other.ts', reported: true }],
    });
  });

  it('skips every check when the sweep matches no source', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/wrap.unit.test.ts': ARRAIFY });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runSkip((await listFreshKitChecks(KIT_URL))[0])).resolves.toBe(
      'the project contains no JavaScript or TypeScript sources outside the exempt paths',
    );
  });
});
