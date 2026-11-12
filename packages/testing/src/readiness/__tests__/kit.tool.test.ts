import {
  createKitFixture,
  listReportedFindings,
  runCheck,
  runSkip,
  selectCheck,
  summarizeFraction,
} from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const KIT_URL = new URL('../../../.readyup/kits/default.ts', import.meta.url);
const ERROR_CAPTURE_CHECK = 'no-hand-rolled-error-capture';
const STDIO_CAPTURE_CHECK = 'no-hand-rolled-stdio-capture';
const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
// rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on testing, so testing cannot import dedent without a cycle
const CAPTURE = [
  'let caught: unknown;',
  '',
  'try {',
  '  parseConfig(text);',
  '} catch (error) {',
  '  caught = error;',
  '}',
  '',
].join('\n');
const STDIO_SPY = "vi.spyOn(process.stdout, 'write').mockImplementation(() => true);\n";
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.testing', version: '1.0.0' });
// rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on testing, so testing cannot import dedent without a cycle
const ADOPTER = [
  "import { captureError } from '@williamthorsen/toolbelt.testing';",
  'const caught = await captureError(() => parseConfig(text));',
  '',
].join('\n');
// rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on testing, so testing cannot import dedent without a cycle
const STDIO_ADOPTER = [
  "import { captureStdio } from '@williamthorsen/toolbelt.testing/candidate';",
  'using stdio = captureStdio();',
  '',
].join('\n');

describe('The testing adoption kit', () => {
  it('reports an error capture, naming where it is', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/config.unit.test.ts': CAPTURE });

    await expect(runCheck(selectCheck(kit.checks, ERROR_CAPTURE_CHECK))).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 3, path: 'src/config.unit.test.ts', reported: true, symbol: 'caught' }],
    });
  });

  it('reports a stdio spy, naming where it is', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/output.unit.test.ts': STDIO_SPY });

    await expect(runCheck(selectCheck(kit.checks, STDIO_CAPTURE_CHECK))).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 1, path: 'src/output.unit.test.ts', reported: true }],
    });
  });

  // The test file beside it keeps the check running, so a widened filter reports the capture here rather than
  // leaving the check skipped: Outside a test, a try/catch of this shape is error handling rather than an
  // unadopted capture.
  it('leaves a source that is no test alone', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'package.json': MANIFEST,
      'src/adopter.unit.test.ts': ADOPTER,
      'src/config.ts': CAPTURE,
    });

    await expect(runCheck(selectCheck(kit.checks, ERROR_CAPTURE_CHECK))).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  it('spans every site of both idioms in one denominator, naming each under its own check', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'package.json': MANIFEST,
      'src/first.unit.test.ts': CAPTURE,
      'src/output.unit.test.ts': STDIO_SPY,
      'src/second.unit.test.ts': CAPTURE,
    });

    const errorCaptureOutcome = await runCheck(selectCheck(kit.checks, ERROR_CAPTURE_CHECK));
    const stdioCaptureOutcome = await runCheck(selectCheck(kit.checks, STDIO_CAPTURE_CHECK));

    expect(summarizeFraction(errorCaptureOutcome)).toStrictEqual({ adoptedCount: 0, findingCount: 3 });
    expect(summarizeFraction(stdioCaptureOutcome)).toStrictEqual({ adoptedCount: 0, findingCount: 3 });
    expect(listReportedFindings(stdioCaptureOutcome)).toStrictEqual([
      { line: 1, path: 'src/output.unit.test.ts', reported: true },
    ]);
  });

  it('counts a call into the package as adoption', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/config.unit.test.ts': ADOPTER });

    await expect(runCheck(selectCheck(kit.checks, ERROR_CAPTURE_CHECK))).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  it('counts a call to captureStdio as adoption', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/output.unit.test.ts': STDIO_ADOPTER });

    await expect(runCheck(selectCheck(kit.checks, STDIO_CAPTURE_CHECK))).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  it('reports each capture in a single test file', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'package.json': MANIFEST,
      'src/config.unit.test.ts': CAPTURE + CAPTURE,
    });

    expect(listReportedFindings(await runCheck(selectCheck(kit.checks, ERROR_CAPTURE_CHECK)))).toStrictEqual([
      { line: 3, path: 'src/config.unit.test.ts', reported: true, symbol: 'caught' },
      { line: 10, path: 'src/config.unit.test.ts', reported: true, symbol: 'caught' },
    ]);
  });

  // The own-implementation exemption applies to a declaration exported under an adopted name, and this kit
  // sweeps no file that could contain one, the package declaring `captureError` outside its tests. So the repository
  // publishing the utility is reported like any other consumer, which is why its own suite shows findings.
  it('reports a capture in the publishing repository, which declares the utility elsewhere', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'package.json': PUBLISHER_MANIFEST,
      'src/config.unit.test.ts': CAPTURE,
    });

    expect(listReportedFindings(await runCheck(selectCheck(kit.checks, ERROR_CAPTURE_CHECK)))).toStrictEqual([
      { line: 3, path: 'src/config.unit.test.ts', reported: true, symbol: 'caught' },
    ]);
  });

  it('skips every check when the sweep matches no source', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/config.ts': CAPTURE });

    await expect(Promise.all(kit.checks.map((check) => runSkip(check)))).resolves.toStrictEqual(
      Array.from({ length: 2 }, () => 'the project contains no test files'),
    );
  });
});
