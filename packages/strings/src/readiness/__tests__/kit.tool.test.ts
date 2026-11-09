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
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.strings', version: '1.0.0' });
const CAPITALIZE = 'export const label = word.charAt(0).toUpperCase() + word.slice(1);\n';
// The package's own `capitalize`, containing the idiom that its check recommends replacing.
const OWN_CAPITALIZE =
  'export function capitalize(input) {\n  return input.charAt(0).toUpperCase() + input.slice(1);\n}\n';
const PLURALIZE = "export const noun = count === 1 ? 'item' : 'items';\n";
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
const SOURCES_REASON = 'the project contains no JavaScript or TypeScript sources outside the exempt paths';
const WRAPPERS_REASON = 'the project contains no JavaScript or TypeScript sources outside its bootstrap wrappers';

describe('The strings adoption kit', () => {
  it('reports each idiom under its own check, naming where it is', async () => {
    using kit = await createKitFixture(KIT_URL, EVERY_IDIOM);

    const outcomes = await runEveryCheck(kit.checks);

    expect(outcomes.map(listReportedFindings)).toStrictEqual([
      [{ line: 1, path: 'src/label.ts', reported: true }],
      [{ line: 1, path: 'src/noun.ts', reported: true }],
      [{ line: 1, path: 'src/__tests__/text.unit.test.ts', reported: true }],
      [{ line: 2, path: 'src/help.ts', reported: true }],
    ]);
  });

  it('spans every idiom in the denominator, so the checks share one fraction', async () => {
    using kit = await createKitFixture(KIT_URL, EVERY_IDIOM);

    const outcomes = await runEveryCheck(kit.checks);

    expect(outcomes.map(summarizeFraction)).toStrictEqual(
      Array.from({ length: 4 }, () => ({ adoptedCount: 0, findingCount: 4 })),
    );
  });

  it('reads tests for the dedent checks alone, leaving a capitalization in a test out of every fraction', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'package.json': MANIFEST,
      'src/__tests__/label.unit.test.ts': CAPITALIZE,
      'src/__tests__/text.unit.test.ts': JOINED_ARRAY,
    });

    const checks = kit.checks;

    await expect(runCheck(checks[0])).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 1, path: 'src/__tests__/text.unit.test.ts', reported: false }],
    });
    expect(listReportedFindings(await runCheck(checks[2]))).toStrictEqual([
      { line: 1, path: 'src/__tests__/text.unit.test.ts', reported: true },
    ]);
  });

  it('counts a call into the package as adoption', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/label.ts': ADOPTER });

    await expect(runCheck(kit.checks[0])).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  it('exempts the package’s own capitalize, and reports a hand-roll beside it', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'package.json': PUBLISHER_MANIFEST,
      'src/capitalize.ts': OWN_CAPITALIZE,
      'src/other.ts': CAPITALIZE,
    });

    await expect(runCheck(kit.checks[0])).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 1, path: 'src/other.ts', reported: true }],
    });
  });

  it('skips the capitalize and pluralize checks when the project contains only tests', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/label.unit.test.ts': CAPITALIZE });

    const checks = kit.checks;

    await expect(Promise.all(checks.map((check) => runSkip(check)))).resolves.toStrictEqual([
      SOURCES_REASON,
      SOURCES_REASON,
      false,
      false,
    ]);
  });

  it('skips every check when the project contains only bootstrap wrappers', async () => {
    using kit = await createKitFixture(KIT_URL, { 'bin/tool.js': JOINED_ARRAY, 'package.json': MANIFEST });

    const checks = kit.checks;

    await expect(Promise.all(checks.map((check) => runSkip(check)))).resolves.toStrictEqual([
      SOURCES_REASON,
      SOURCES_REASON,
      WRAPPERS_REASON,
      WRAPPERS_REASON,
    ]);
  });
});
