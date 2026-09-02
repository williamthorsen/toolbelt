import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { listSites } from '../listSites.ts';

const JS_TS_EXTENSION = /\.[cm]?[jt]sx?$/;
const KITS_DIR = fileURLToPath(new URL('../../../.readyup/kits', import.meta.url));
const READINESS_DIR = fileURLToPath(new URL('..', import.meta.url));
const TESTS_DIR = fileURLToPath(new URL('.', import.meta.url));

describe(listSites, () => {
  // This kit sweeps tests, so the sweep here reads them too. Every fixture beside this file writes its idiom
  // inside a literal, and each one reported a site of its own before blanking.
  it('finds nothing in the sources describing what it looks for', () => {
    const findings = listSweptFiles().flatMap((file) =>
      listSites(fs.readFileSync(file, 'utf8')).map((site) => `${path.basename(file)}:${site.line}`),
    );

    expect(findings).toStrictEqual([]);
  });

  // Guard against a vacuous pass: a broken walk would report no findings either.
  it('sweeps the detector fixtures alongside the modules and the compiled kit', () => {
    const names = listSweptFiles().map((file) => path.basename(file));

    expect(names).toContain('default.js');
    expect(names).toContain('classifyConsoleMock.unit.test.ts');
    expect(names).toContain('listConsoleSites.unit.test.ts');
    expect(names).toContain('listDisposalHooks.unit.test.ts');
    expect(names).toContain('listExitMocks.unit.test.ts');
  });
});

// region | Helpers

/** Lists the sources in which this package's own prose about the idioms lives. */
function listSweptFiles(): string[] {
  return [KITS_DIR, READINESS_DIR, TESTS_DIR].flatMap((directory) =>
    fs
      .readdirSync(directory)
      .filter((name) => JS_TS_EXTENSION.test(name))
      .map((name) => path.join(directory, name)),
  );
}

// endregion | Helpers
