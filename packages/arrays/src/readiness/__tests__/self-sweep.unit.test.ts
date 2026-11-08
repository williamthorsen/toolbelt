import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { listJsTsSources } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

import { listArrayIdioms } from '../listArrayIdioms.ts';

const KITS_DIR = fileURLToPath(new URL('../../../.readyup/kits', import.meta.url));
const READINESS_DIR = fileURLToPath(new URL('..', import.meta.url));

/** The directories whose sources contain this package's own prose about the idioms. */
const SWEPT_DIRS = [KITS_DIR, READINESS_DIR];

describe(listArrayIdioms, () => {
  // Every fix text describes its idiom without writing it out, which keeps the kit from reporting itself:
  // A spelled-out idiom would be a site in the source and again in the bundle. readyup drops the compiled
  // bundle from its own sweep, and nothing in CI runs `rdy run --sources`, so this suite fails on an
  // edit that spells one out.
  it('finds nothing in the sources describing what it looks for', () => {
    const findings = listJsTsSources(SWEPT_DIRS).flatMap((file) =>
      listArrayIdioms(fs.readFileSync(file, 'utf8')).map((site) => `${path.basename(file)}:${site.line}`),
    );

    expect(findings).toStrictEqual([]);
  });

  // Guard against a vacuous pass: A broken walk would report no findings either.
  it('sweeps the modules and the compiled kit alike', () => {
    expect(listJsTsSources(SWEPT_DIRS).map((file) => path.basename(file))).toContain('default.js');
    expect(listJsTsSources(SWEPT_DIRS).length).toBeGreaterThan(5);
  });
});
