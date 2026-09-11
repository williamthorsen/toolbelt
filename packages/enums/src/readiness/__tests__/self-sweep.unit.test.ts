import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { listMembershipSites } from '../listMembershipSites.ts';

const JS_TS_EXTENSION = /\.[cm]?[jt]sx?$/;
const KITS_DIR = fileURLToPath(new URL('../../../.readyup/kits', import.meta.url));
const READINESS_DIR = fileURLToPath(new URL('..', import.meta.url));
const TESTS_DIR = fileURLToPath(new URL('.', import.meta.url));

describe(listMembershipSites, () => {
  // Every fixture beside this file writes the idiom inside a literal, which blanking erases before the scan reads
  // it; one rewritten as literal code would put the package's own suite on its own report, and nothing in CI runs
  // `rdy run --packages` to catch it.
  it('finds nothing in the sources describing what it looks for', () => {
    const findings = listSweptFiles().flatMap((file) =>
      listMembershipSites(fs.readFileSync(file, 'utf8')).map((site) => `${path.basename(file)}:${site.line}`),
    );

    expect(findings).toStrictEqual([]);
  });

  // Guard against a vacuous pass: A broken walk would report no findings either.
  it('sweeps the detector fixtures alongside the modules and the compiled kit', () => {
    const names = listSweptFiles().map((file) => path.basename(file));

    expect(names).toContain('default.js');
    expect(names).toContain('kit.tool.test.ts');
    expect(names).toContain('listMembershipSites.unit.test.ts');
  });
});

// region | Helpers

/** Lists the sources in which this package's own prose about the idiom lives. */
function listSweptFiles(): string[] {
  return [KITS_DIR, READINESS_DIR, TESTS_DIR].flatMap((directory) =>
    fs
      .readdirSync(directory)
      .filter((name) => JS_TS_EXTENSION.test(name))
      .map((name) => path.join(directory, name)),
  );
}

// endregion | Helpers
