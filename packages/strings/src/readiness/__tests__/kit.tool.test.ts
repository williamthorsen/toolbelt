import {
  createTrackedRepo,
  listReportedFindings,
  runCheck,
  runSkip,
  summarizeFraction,
} from '@williamthorsen/toolbelt.adoption/test-utils';
import { pointCwdAt } from '@williamthorsen/toolbelt.testing/candidate';
import { isFlatChecklist, type RdyCheck } from 'readyup';
import { describe, expect, it, vi } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.strings', version: '1.0.0' });
const CAPITALIZE = 'export const label = word.charAt(0).toUpperCase() + word.slice(1);\n';
// The package's own `capitalize`, holding the idiom that its check recommends replacing.
const OWN_CAPITALIZE =
  'export function capitalize(input) {\n  return input.charAt(0).toUpperCase() + input.slice(1);\n}\n';
const PLURALIZE = "export const noun = count === 1 ? 'item' : 'items';\n";
// An unrelated literal pair and a plural chosen by a greater-than test, neither of which this kit claims.
const UNCLAIMED =
  "export const state = status === 1 ? 'active' : 'inactive';\nexport const s = count > 1 ? 's' : '';\n";
const JOINED_ARRAY = "export const text = [\n  'first',\n  'second',\n].join('\\n');\n";
const LAYOUT_TEMPLATE = 'export function help() {\n  return `Usage: tool\nCommands:\n`;\n}\n';
const ADOPTER = "import { capitalize } from '@williamthorsen/toolbelt.strings/candidate';\ncapitalize(word);\n";
const EVERY_IDIOM = {
  'package.json': MANIFEST,
  'src/__tests__/text.unit.test.ts': JOINED_ARRAY,
  'src/help.ts': LAYOUT_TEMPLATE,
  'src/label.ts': CAPITALIZE,
  'src/noun.ts': PLURALIZE,
};
const SOURCES_REASON = 'the project holds no JavaScript or TypeScript sources outside the exempt paths';
const WRAPPERS_REASON = 'the project holds no JavaScript or TypeScript sources outside its bootstrap wrappers';

describe('The strings adoption kit', () => {
  it('reports each idiom under its own check, naming where it is', async () => {
    using tree = createTrackedRepo(EVERY_IDIOM);
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    expect(outcomes.map(listReportedFindings)).toStrictEqual([
      [{ line: 1, path: 'src/label.ts', reported: true }],
      [{ line: 1, path: 'src/noun.ts', reported: true }],
      [{ line: 1, path: 'src/__tests__/text.unit.test.ts', reported: true }],
      [{ line: 2, path: 'src/help.ts', reported: true }],
    ]);
  });

  it('spans every idiom in the denominator, so the checks share one fraction', async () => {
    using tree = createTrackedRepo(EVERY_IDIOM);
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    expect(outcomes.map(summarizeFraction)).toStrictEqual(
      Array.from({ length: 4 }, () => ({ adoptedCount: 0, findingCount: 4 })),
    );
  });

  it('reads tests for the dedent checks alone, so a capitalization in a test enters no fraction', async () => {
    using tree = createTrackedRepo({
      'package.json': MANIFEST,
      'src/__tests__/label.unit.test.ts': CAPITALIZE,
      'src/__tests__/text.unit.test.ts': JOINED_ARRAY,
    });
    using _cwd = pointCwdAt(tree.dir);

    const checks = await loadChecks();

    await expect(runCheck(checks[0])).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 1, path: 'src/__tests__/text.unit.test.ts', reported: false }],
    });
    expect(listReportedFindings(await runCheck(checks[2]))).toStrictEqual([
      { line: 1, path: 'src/__tests__/text.unit.test.ts', reported: true },
    ]);
  });

  it('counts a call into the package as adoption', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/label.ts': ADOPTER });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 1, findings: [] });
  });

  it('neither reports nor counts a comparison against 1 that pluralizes nothing', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/state.ts': UNCLAIMED });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[1])).resolves.toStrictEqual({ adoptedCount: 0, findings: [] });
  });

  it('exempts the package’s own capitalize, and reports a hand-roll beside it', async () => {
    using tree = createTrackedRepo({
      'package.json': PUBLISHER_MANIFEST,
      'src/capitalize.ts': OWN_CAPITALIZE,
      'src/other.ts': CAPITALIZE,
    });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 1, path: 'src/other.ts', reported: true }],
    });
  });

  it('skips the capitalize and pluralize checks where the project holds only tests', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/label.unit.test.ts': CAPITALIZE });
    using _cwd = pointCwdAt(tree.dir);

    const checks = await loadChecks();

    await expect(Promise.all(checks.map((check) => runSkip(check)))).resolves.toStrictEqual([
      SOURCES_REASON,
      SOURCES_REASON,
      false,
      false,
    ]);
  });

  it('skips every check where the project holds only bootstrap wrappers', async () => {
    using tree = createTrackedRepo({ 'bin/tool.js': JOINED_ARRAY, 'package.json': MANIFEST });
    using _cwd = pointCwdAt(tree.dir);

    const checks = await loadChecks();

    await expect(Promise.all(checks.map((check) => runSkip(check)))).resolves.toStrictEqual([
      SOURCES_REASON,
      SOURCES_REASON,
      WRAPPERS_REASON,
      WRAPPERS_REASON,
    ]);
  });
});

// region | Helpers

/**
 * Loads a fresh kit and lists its adoption checks, which the flat checklist holds in declaration order.
 *
 * A kit holds its project sweep on its own closure, so one import would give every test here the first
 * fixture repo's findings. Resetting the registry buys each test a kit that has swept nothing yet.
 */
async function loadChecks(): Promise<readonly RdyCheck[]> {
  vi.resetModules();
  const kit = (await import('../../../.readyup/kits/default.ts')).default;

  const [checklist] = kit.checklists;
  if (checklist === undefined || !isFlatChecklist(checklist)) return [];
  return checklist.checks;
}

// endregion | Helpers
