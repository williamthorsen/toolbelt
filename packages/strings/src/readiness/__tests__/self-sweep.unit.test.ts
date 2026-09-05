import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { listStringIdioms } from '../listStringIdioms.ts';

const JS_TS_EXTENSION = /\.[cm]?[jt]sx?$/;
const KITS_DIR = fileURLToPath(new URL('../../../.readyup/kits', import.meta.url));
const READINESS_DIR = fileURLToPath(new URL('..', import.meta.url));

describe(listStringIdioms, () => {
  // Both fix texts describe their idiom without writing it out, which is what keeps the kit off its own report:
  // a spelled-out idiom would be a site in the source and again in the bundle. readyup drops the compiled
  // bundle from its own sweep, and nothing in CI runs `rdy run --packages`, so this suite is what fails on an
  // edit that spells one out.
  it('finds nothing in the sources describing what it looks for', () => {
    const findings = listSweptFiles().flatMap((file) =>
      listStringIdioms(fs.readFileSync(file, 'utf8')).map((site) => `${path.basename(file)}:${site.line}`),
    );

    expect(findings).toStrictEqual([]);
  });

  // Guard against a vacuous pass: A broken walk would report no findings either.
  it('sweeps the modules and the compiled kit alike', () => {
    expect(listSweptFiles().map((file) => path.basename(file))).toContain('default.js');
    expect(listSweptFiles().length).toBeGreaterThan(4);
  });
});

// region | Helpers

/** Lists the sources in which this package's own prose about the idioms lives. */
function listSweptFiles(): string[] {
  return [KITS_DIR, READINESS_DIR].flatMap((directory) =>
    fs
      .readdirSync(directory)
      .filter((name) => JS_TS_EXTENSION.test(name))
      .map((name) => path.join(directory, name)),
  );
}

// endregion | Helpers
