import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { listErrorSites } from '../listErrorSites.ts';

const JS_TS_EXTENSION = /\.[cm]?[jt]sx?$/;
const KITS_DIR = fileURLToPath(new URL('../../../.readyup/kits', import.meta.url));
const READINESS_DIR = fileURLToPath(new URL('..', import.meta.url));

describe(listErrorSites, () => {
  // Every file swept here writes `instanceof Error` in a comment, a pattern, or a fix string, and every one of
  // them reported a site of its own before blanking. The kit skips this project, so nothing else would notice.
  it('finds nothing in the sources describing what it looks for', () => {
    const findings = listSweptFiles().flatMap((file) =>
      listErrorSites(fs.readFileSync(file, 'utf8')).map((site) => `${path.basename(file)}:${site.line}`),
    );

    expect(findings).toStrictEqual([]);
  });

  // Guard against a vacuous pass: a broken walk would report no findings either.
  it('sweeps the modules and the compiled kit alike', () => {
    expect(listSweptFiles().map((file) => path.basename(file))).toContain('default.js');
    expect(listSweptFiles().length).toBeGreaterThan(4);
  });
});

// region | Helpers

/** Lists the sources this package's own prose about the operator lives in. */
function listSweptFiles(): string[] {
  return [KITS_DIR, READINESS_DIR].flatMap((directory) =>
    fs
      .readdirSync(directory)
      .filter((name) => JS_TS_EXTENSION.test(name))
      .map((name) => path.join(directory, name)),
  );
}

// endregion | Helpers
