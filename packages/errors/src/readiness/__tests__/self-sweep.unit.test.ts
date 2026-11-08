import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { listJsTsSources } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

import { listErrorSites } from '../listErrorSites.ts';

const KITS_DIR = fileURLToPath(new URL('../../../.readyup/kits', import.meta.url));
const READINESS_DIR = fileURLToPath(new URL('..', import.meta.url));

/** The directories whose sources contain this package's own prose about the operator. */
const SWEPT_DIRS = [KITS_DIR, READINESS_DIR];

describe(listErrorSites, () => {
  // Most files swept here write `instanceof Error` in a comment, a pattern, or a fix string, each of which would
  // count as a site of its own if blanking missed it. readyup drops the compiled bundle from its own sweep, and
  // nothing in CI runs `rdy run --sources`, so nothing else would notice.
  it('finds nothing in the sources describing what it looks for', () => {
    const findings = listJsTsSources(SWEPT_DIRS).flatMap((file) =>
      listErrorSites(fs.readFileSync(file, 'utf8')).map((site) => `${path.basename(file)}:${site.line}`),
    );

    expect(findings).toStrictEqual([]);
  });

  // Guard against a vacuous pass: A broken walk would report no findings either.
  it('sweeps the modules and the compiled kit alike', () => {
    expect(listJsTsSources(SWEPT_DIRS).map((file) => path.basename(file))).toContain('default.js');
    expect(listJsTsSources(SWEPT_DIRS).length).toBeGreaterThan(4);
  });
});
