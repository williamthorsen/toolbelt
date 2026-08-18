import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { listExitMocks } from '../listExitMocks.ts';

const JS_TS_EXTENSION = /\.[cm]?[jt]sx?$/;
const KITS_DIR = fileURLToPath(new URL('../../../.readyup/kits', import.meta.url));
const READINESS_DIR = fileURLToPath(new URL('..', import.meta.url));
const TESTS_DIR = fileURLToPath(new URL('.', import.meta.url));

describe(listExitMocks, () => {
  // This kit sweeps tests, so the sweep here reads them too. Every fixture beside this file writes the spy
  // inside a literal, and each one reported a mock of its own before blanking.
  it('finds nothing in the sources describing what it looks for', () => {
    const findings = listSweptFiles().flatMap((file) =>
      listExitMocks(fs.readFileSync(file, 'utf8')).map((mock) => `${path.basename(file)}:${mock.line}`),
    );

    expect(findings).toStrictEqual([]);
  });

  // Guard against a vacuous pass: a broken walk would report no findings either.
  it('sweeps the detector fixtures alongside the modules and the compiled kit', () => {
    const names = listSweptFiles().map((file) => path.basename(file));

    expect(names).toContain('default.js');
    expect(names).toContain('listExitMocks.unit.test.ts');
  });
});

// region | Helpers

/** Lists the sources this package's own prose about the mock lives in. */
function listSweptFiles(): string[] {
  return [KITS_DIR, READINESS_DIR, TESTS_DIR].flatMap((directory) =>
    fs
      .readdirSync(directory)
      .filter((name) => JS_TS_EXTENSION.test(name))
      .map((name) => path.join(directory, name)),
  );
}

// endregion | Helpers
