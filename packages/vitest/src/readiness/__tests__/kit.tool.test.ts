import {
  createKitFixture,
  listReportedFindings,
  runCheck,
  runEveryCheck,
  runSkip,
  selectCheck,
  summarizeFraction,
} from '@williamthorsen/toolbelt.adoption/test-utils';
import { dedent } from '@williamthorsen/toolbelt.strings';
import { describe, expect, it } from 'vitest';

const KIT_URL = new URL('../../../.readyup/kits/default.ts', import.meta.url);
const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.vitest', version: '1.0.0' });

const CAPTURE = "vi.spyOn(console, 'log').mockImplementation((...args) => { lines.push(args); });\n";
const CONSOLE_SPY_ONLY = "vi.spyOn(console, 'debug');\n";
const DISPOSAL = dedent`
  it('builds a tree', () => {
    const tree = createTempTree({});
    onTestFinished(() => tree[Symbol.dispose]());
  });

`;
const LOSSY_CAPTURE = "vi.spyOn(console, 'error').mockImplementation((message) => { lines.push(message); });\n";
const NON_THROWING = "vi.spyOn(process, 'exit').mockImplementation(() => {});\n";
const READ = dedent`
  using silent = silenceConsole(['warn']);
  expect(silent.warn.mock.calls).toHaveLength(1);

`;
const SENTINEL_CLONE = dedent`
  class ExitError extends Error {}

  beforeEach(() => {
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new ExitError(code);
    });
  });

`;
const SILENCE = "vi.spyOn(console, 'warn').mockImplementation(() => {});\n";
const THROWING = dedent`
  vi.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('exit');
  });

`;
const UNREADABLE_EXIT_MOCK = "vi.spyOn(process, 'exit').mockImplementation(handleExit);\n";
const ADOPTER = dedent`
  import { throwOnProcessExit } from '@williamthorsen/toolbelt.vitest';
  using _exit = throwOnProcessExit();

`;
const EVERY_IDIOM = {
  'package.json': MANIFEST,
  'src/capture.unit.test.ts': CAPTURE,
  'src/dispose.unit.test.ts': DISPOSAL,
  'src/lossy.unit.test.ts': LOSSY_CAPTURE,
  'src/non-throwing.unit.test.ts': NON_THROWING,
  'src/read.unit.test.ts': READ,
  'src/sentinel.unit.test.ts': SENTINEL_CLONE,
  'src/silence.unit.test.ts': SILENCE,
  'src/spy-only.unit.test.ts': CONSOLE_SPY_ONLY,
  'src/throwing.unit.test.ts': THROWING,
  'src/unreadable.unit.test.ts': UNREADABLE_EXIT_MOCK,
};

describe('The vitest adoption kit', () => {
  it('reports each idiom under its own check, naming where it is', async () => {
    using kit = await createKitFixture(KIT_URL, EVERY_IDIOM);

    const outcomes = await runEveryCheck(kit.checks);

    // Nine kinds over eight checks: `no-hand-rolled-exit-mock` takes the throwing and the unreadable mock,
    // and `no-hand-rolled-console-capture` takes the full capture and the spy left unclassified.
    expect(outcomes.map(listReportedFindings)).toStrictEqual([
      [{ line: 4, path: 'src/sentinel.unit.test.ts', reported: true, symbol: 'ExitError' }],
      [{ line: 1, path: 'src/non-throwing.unit.test.ts', reported: true }],
      [
        { line: 1, path: 'src/throwing.unit.test.ts', reported: true },
        { line: 1, path: 'src/unreadable.unit.test.ts', reported: true },
      ],
      [{ line: 1, path: 'src/lossy.unit.test.ts', reported: true }],
      [
        { line: 1, path: 'src/capture.unit.test.ts', reported: true },
        { line: 1, path: 'src/spy-only.unit.test.ts', reported: true },
      ],
      [{ line: 1, path: 'src/silence.unit.test.ts', reported: true }],
      [{ line: 2, path: 'src/read.unit.test.ts', reported: true }],
      [{ line: 3, path: 'src/dispose.unit.test.ts', reported: true }],
    ]);
  });

  it('spans all ten sites in the denominator, so the checks share one fraction', async () => {
    using kit = await createKitFixture(KIT_URL, EVERY_IDIOM);

    const outcomes = await runEveryCheck(kit.checks);

    expect(outcomes.map(summarizeFraction)).toStrictEqual(
      Array.from({ length: 8 }, () => ({ adoptedCount: 0, findingCount: 10 })),
    );
  });

  it('counts a call into the package as adoption', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/exit.unit.test.ts': ADOPTER });

    await expect(runCheck(selectCheck(kit.checks, 'no-exit-sentinel-clone'))).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  // Because the test file beside it keeps the check running, a narrowed filter reports the silence here rather than
  // leaving the check skipped.
  it('leaves a source that is no test alone', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'package.json': MANIFEST,
      'src/config.ts': SILENCE,
      'src/exit.unit.test.ts': ADOPTER,
    });

    await expect(runCheck(selectCheck(kit.checks, 'no-hand-rolled-console-silence'))).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  // The own-implementation exemption applies to a declaration exported under an adopted name, and this kit sweeps
  // no file that could contain one: The package declares `silenceConsole` in `src/3-candidate/`, which `isTestFile`
  // never matches. So the repository publishing the utility is reported like any other consumer, which is why
  // its own suite shows findings.
  it('reports a silence in the publishing repository, which declares the utility elsewhere', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'package.json': PUBLISHER_MANIFEST,
      'src/silence.unit.test.ts': SILENCE,
    });

    expect(
      listReportedFindings(await runCheck(selectCheck(kit.checks, 'no-hand-rolled-console-silence'))),
    ).toStrictEqual([{ line: 1, path: 'src/silence.unit.test.ts', reported: true }]);
  });

  it('skips every check when the sweep matches no source', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/config.ts': SILENCE });

    await expect(Promise.all(kit.checks.map((check) => runSkip(check)))).resolves.toStrictEqual(
      Array.from({ length: 8 }, () => 'the project contains no test files'),
    );
  });
});
