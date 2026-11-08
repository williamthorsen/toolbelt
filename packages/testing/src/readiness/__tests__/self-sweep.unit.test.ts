import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { listJsTsSources } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

import { listSites } from '../listSites.ts';

const KITS_DIR = fileURLToPath(new URL('../../../.readyup/kits', import.meta.url));
const READINESS_DIR = fileURLToPath(new URL('..', import.meta.url));
const TESTS_DIR = fileURLToPath(new URL('.', import.meta.url));

/** The directories whose sources contain this package's own prose about the idioms. */
const SWEPT_DIRS = [KITS_DIR, READINESS_DIR, TESTS_DIR];

describe(listSites, () => {
  // This kit sweeps tests, so the sweep here reads them too. Every fixture beside this file writes its idiom
  // inside a literal, which blanking erases before the scan reads it; one rewritten as literal code would put
  // the package's own suite on its own report, and nothing in CI runs `rdy run --sources` to catch it.
  it('finds nothing in the sources describing what it looks for', () => {
    const findings = listJsTsSources(SWEPT_DIRS).flatMap((file) =>
      listSites(fs.readFileSync(file, 'utf8')).map((site) => `${path.basename(file)}:${site.line}`),
    );

    expect(findings).toStrictEqual([]);
  });

  // Guard against a vacuous pass: A broken walk would report no findings either.
  it('sweeps the detector fixtures alongside the modules and the compiled kit', () => {
    const names = listJsTsSources(SWEPT_DIRS).map((file) => path.basename(file));

    expect(names).toContain('default.js');
    expect(names).toContain('kit.tool.test.ts');
    expect(names).toContain('listCaptureSites.unit.test.ts');
    expect(names).toContain('listStdioSpies.unit.test.ts');
  });
});
