import {
  createKitFixture,
  listReportedFindings,
  runCheck,
  runSkip,
  summarizeFraction,
} from '@williamthorsen/toolbelt.adoption/test-utils';
import { dedent } from '@williamthorsen/toolbelt.strings';
import { describe, expect, it } from 'vitest';

const KIT_URL = new URL('../../../.readyup/kits/default.ts', import.meta.url);
const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.enums', version: '1.0.0' });

const DIRECT = 'export const known = Object.values(Color).includes(value);\n';
const ARGUMENT_CAST = 'export const known = Object.values(Color).includes(value as Color);\n';
const ASSERTED = 'export const known = (Object.values(Color) as string[]).includes(value);\n';
const TYPE_ARGUMENT = 'export const known = Object.values<string>(Color).includes(value);\n';
// The package's own guard, written with the idiom that its check reports.
const OWN_GUARD = dedent`
  export function isEnumValue(enumObject, value) {
    return Object.values(enumObject).includes(value);
  }

`;
const ADOPTER = dedent`
  import { isEnumValue } from '@williamthorsen/toolbelt.enums';
  export const known = isEnumValue(Color, value);

`;
const EVERY_FORM = {
  'package.json': MANIFEST,
  'src/argument-cast.ts': ARGUMENT_CAST,
  'src/asserted.ts': ASSERTED,
  'src/direct.ts': DIRECT,
  'src/type-argument.ts': TYPE_ARGUMENT,
};

describe('The enums adoption kit', () => {
  it('reports every form of the test, naming where it is', async () => {
    using kit = await createKitFixture(KIT_URL, EVERY_FORM);

    expect(listReportedFindings(await runCheck(kit.checks[0]))).toStrictEqual([
      { line: 1, path: 'src/argument-cast.ts', reported: true },
      { line: 1, path: 'src/asserted.ts', reported: true },
      { line: 1, path: 'src/direct.ts', reported: true },
      { line: 1, path: 'src/type-argument.ts', reported: true },
    ]);
  });

  it('spans every site in the denominator', async () => {
    using kit = await createKitFixture(KIT_URL, EVERY_FORM);

    expect(summarizeFraction(await runCheck(kit.checks[0]))).toStrictEqual({
      adoptedCount: 0,
      findingCount: 4,
    });
  });

  it('counts a call into the package as adoption', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/known.ts': ADOPTER });

    await expect(runCheck(kit.checks[0])).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  it('exempts the package’s own isEnumValue, and reports a hand-roll beside it', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'package.json': PUBLISHER_MANIFEST,
      'src/isEnumValue.ts': OWN_GUARD,
      'src/other.ts': DIRECT,
    });

    await expect(runCheck(kit.checks[0])).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 1, path: 'src/other.ts', reported: true }],
    });
  });

  it('leaves a test file and a bootstrap wrapper alone', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'bin/run.js': DIRECT,
      'package.json': MANIFEST,
      'src/__tests__/palette.unit.test.ts': DIRECT,
      'src/known.ts': ADOPTER,
    });

    await expect(runCheck(kit.checks[0])).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  it('skips the check when the sweep matches no source', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'bin/run.js': DIRECT,
      'package.json': MANIFEST,
      'src/__tests__/palette.unit.test.ts': DIRECT,
    });

    await expect(runSkip(kit.checks[0])).resolves.toBe(
      'the project contains no JavaScript or TypeScript sources outside the exempt paths',
    );
  });
});
