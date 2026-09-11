import {
  createTrackedRepo,
  listReportedFindings,
  pointCwdAt,
  runCheck,
  runSkip,
  summarizeFraction,
} from '@williamthorsen/toolbelt.adoption/test-utils';
import { isFlatChecklist, type RdyCheck } from 'readyup';
import { describe, expect, it, vi } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.enums', version: '1.0.0' });

const DIRECT = 'export const known = Object.values(Color).includes(value);\n';
const ARGUMENT_CAST = 'export const known = Object.values(Color).includes(value as Color);\n';
const ASSERTED = 'export const known = (Object.values(Color) as string[]).includes(value);\n';
const TYPE_ARGUMENT = 'export const known = Object.values<string>(Color).includes(value);\n';
// The package's own guard, written with the idiom that its check reports.
const OWN_GUARD = [
  'export function isEnumValue(enumObject, value) {',
  '  return Object.values(enumObject).includes(value);',
  '}',
  '',
].join('\n');
// Prose describing a search, and reads of an enum that search no values.
const UNCLAIMED = [
  '// Returns true where Object.values(Color).includes(value).',
  'export const count = Object.values(Color).length;',
  'export const hasKey = Object.keys(Color).includes(key);',
  '',
].join('\n');
const ADOPTER = [
  "import { isEnumValue } from '@williamthorsen/toolbelt.enums';",
  'export const known = isEnumValue(Color, value);',
  '',
].join('\n');
const EVERY_FORM = {
  'package.json': MANIFEST,
  'src/argument-cast.ts': ARGUMENT_CAST,
  'src/asserted.ts': ASSERTED,
  'src/direct.ts': DIRECT,
  'src/type-argument.ts': TYPE_ARGUMENT,
};

describe('The enums adoption kit', () => {
  it('reports every form of the test, naming where it is', async () => {
    using tree = createTrackedRepo(EVERY_FORM);
    using _cwd = pointCwdAt(tree.dir);

    expect(listReportedFindings(await runCheck((await loadChecks())[0]))).toStrictEqual([
      { line: 1, path: 'src/argument-cast.ts', reported: true },
      { line: 1, path: 'src/asserted.ts', reported: true },
      { line: 1, path: 'src/direct.ts', reported: true },
      { line: 1, path: 'src/type-argument.ts', reported: true },
    ]);
  });

  it('spans every site in the denominator', async () => {
    using tree = createTrackedRepo(EVERY_FORM);
    using _cwd = pointCwdAt(tree.dir);

    expect(summarizeFraction(await runCheck((await loadChecks())[0]))).toStrictEqual({
      adoptedCount: 0,
      findingCount: 4,
    });
  });

  it('counts a call into the package as adoption', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/known.ts': ADOPTER });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 1, findings: [] });
  });

  it('neither reports nor counts prose about the test or a read that searches no values', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/palette.ts': UNCLAIMED });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 0, findings: [] });
  });

  it('exempts the package’s own isEnumValue, and reports a hand-roll beside it', async () => {
    using tree = createTrackedRepo({
      'package.json': PUBLISHER_MANIFEST,
      'src/isEnumValue.ts': OWN_GUARD,
      'src/other.ts': DIRECT,
    });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 1, path: 'src/other.ts', reported: true }],
    });
  });

  it('leaves a test file and a bootstrap wrapper alone', async () => {
    using tree = createTrackedRepo({
      'bin/run.js': DIRECT,
      'package.json': MANIFEST,
      'src/__tests__/palette.unit.test.ts': DIRECT,
      'src/known.ts': ADOPTER,
    });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 1, findings: [] });
  });

  it('skips the check where the sweep matches no source', async () => {
    using tree = createTrackedRepo({
      'bin/run.js': DIRECT,
      'package.json': MANIFEST,
      'src/__tests__/palette.unit.test.ts': DIRECT,
    });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runSkip((await loadChecks())[0])).resolves.toBe(
      'the project holds no JavaScript or TypeScript sources outside the exempt paths',
    );
  });
});

// region | Helpers

/**
 * Loads a fresh kit and lists its adoption checks, which the flat checklist holds in declaration order.
 *
 * A kit holds its project sweep on its own closure, so one import would give every test here the first
 * fixture repo's findings. Resetting the registry leaves each test with a kit that has swept nothing yet.
 */
async function loadChecks(): Promise<RdyCheck[]> {
  vi.resetModules();
  const kit = (await import('../../../.readyup/kits/default.ts')).default;

  const [checklist] = kit.checklists;
  if (checklist === undefined || !isFlatChecklist(checklist)) return [];
  return checklist.checks;
}

// endregion | Helpers
