import {
  createKitFixture,
  listReportedFindings,
  runCheck,
  runSkip,
  summarizeFraction,
} from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const KIT_URL = new URL('../../../.readyup/kits/default.ts', import.meta.url);
const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.async', version: '1.0.0' });
const SLEEP = 'export const waited = new Promise((resolve) => setTimeout(resolve, 50));\n';
// The package's own `delay`, containing the idiom that its check recommends replacing.
const OWN_DELAY = 'export function delay(ms) {\n  return new Promise((resolve) => setTimeout(resolve, ms));\n}\n';
const ADOPTER = "import { delay } from '@williamthorsen/toolbelt.async';\nawait delay(50);\n";

describe('The async adoption kit', () => {
  it('reports the idiom, naming where it is', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/wait.ts': SLEEP });

    await expect(runCheck(kit.checks[0])).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 1, path: 'src/wait.ts', reported: true }],
    });
  });

  // Fails if the kit's path filter exempts tests, as the source-oriented kits' filters do.
  it('reports a sleep in a test, where the idiom mostly lives', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/wait.unit.test.ts': SLEEP });

    expect(listReportedFindings(await runCheck(kit.checks[0]))).toStrictEqual([
      { line: 1, path: 'src/wait.unit.test.ts', reported: true },
    ]);
  });

  it('spans every site in the denominator', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'package.json': MANIFEST,
      'src/first.ts': SLEEP,
      'src/second.ts': SLEEP,
    });

    expect(summarizeFraction(await runCheck(kit.checks[0]))).toStrictEqual({
      adoptedCount: 0,
      findingCount: 2,
    });
  });

  it('counts a call into the package as adoption', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/wait.ts': ADOPTER });

    await expect(runCheck(kit.checks[0])).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  it('exempts the package’s own delay, and reports a hand-roll beside it', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'package.json': PUBLISHER_MANIFEST,
      'src/delay.ts': OWN_DELAY,
      'src/other.ts': SLEEP,
    });

    await expect(runCheck(kit.checks[0])).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 1, path: 'src/other.ts', reported: true }],
    });
  });

  it('skips the check when the sweep matches no source', async () => {
    using kit = await createKitFixture(KIT_URL, { 'bin/run.js': SLEEP, 'package.json': MANIFEST });

    await expect(runSkip(kit.checks[0])).resolves.toBe(
      'the project contains no JavaScript or TypeScript sources outside its bootstrap wrappers',
    );
  });
});
