import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { listJsTsSources } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

import { listGuardClones } from '../listGuardClones.ts';

const KITS_DIR = fileURLToPath(new URL('../../../.readyup/kits', import.meta.url));
const READINESS_DIR = fileURLToPath(new URL('..', import.meta.url));

/** The directories whose sources contain this package's own prose about the guards. */
const SWEPT_DIRS = [KITS_DIR, READINESS_DIR];

describe(listGuardClones, () => {
  // The kit sweeps its own declaration and readiness modules when it runs over this repo, and the compiled kit
  // inlines shared modules that the sweep also reaches, so an edit writing a guard clone as code in any of them
  // makes the kit report a finding in its own package. Nothing in CI runs `rdy run --sources` to catch it.
  it('finds nothing in the sources describing what it looks for', () => {
    const findings = listJsTsSources(SWEPT_DIRS).flatMap((file) =>
      listGuardClones(fs.readFileSync(file, 'utf8')).map((site) => `${path.basename(file)}:${site.line}`),
    );

    expect(findings).toStrictEqual([]);
  });

  // Guard against a vacuous pass: A broken walk would report no findings either.
  it('sweeps the modules and the compiled kit alike', () => {
    const names = listJsTsSources(SWEPT_DIRS).map((file) => path.basename(file));

    expect(names).toContain('default.js');
    expect(names).toContain('listGuardClones.ts');
  });
});
