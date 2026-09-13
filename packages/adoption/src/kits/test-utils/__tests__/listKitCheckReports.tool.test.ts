import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createTempDir } from '../createTempDir.ts';
import { listKitCheckReports } from '../listKitCheckReports.ts';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
// Both checks name `src/site.ts` only where the working directory holds it, so a run outside the fixture repo
// reports no site.
const SITE_CHECKS = [
  "{ id: 'names-site', name: 'names a site', check: () => ({ adoptedCount: 1, findings: listSite(true) }) }",
  "{ id: 'names-none', name: 'names none', check: () => ({ adoptedCount: 1, findings: listSite(false) }) }",
];

describe(listKitCheckReports, () => {
  it('lists each check’s id, detail, and fraction in declaration order', () => {
    using kitPackage = createTempDir({ '.readyup/kits/default.js': buildKit(SITE_CHECKS) });

    expect(
      listKitCheckReports(kitPackage.dir, { 'package.json': MANIFEST, 'src/site.ts': 'export {};\n' }),
    ).toStrictEqual([
      { count: 2, detail: 'src/site.ts:1', id: 'names-site', passedCount: 1 },
      { count: 2, detail: undefined, id: 'names-none', passedCount: 1 },
    ]);
  });

  it('throws where a check reports no fraction', () => {
    using kitPackage = createTempDir({
      '.readyup/kits/default.js': buildKit(["{ id: 'verdict', name: 'returns a verdict', check: () => true }"]),
    });

    expect(() => listKitCheckReports(kitPackage.dir, { 'package.json': MANIFEST })).toThrow(
      'the report holds a check with no fraction',
    );
  });

  it('throws with rdy’s own message where the package holds no kit', () => {
    using kitPackage = createTempDir({});

    // Only rdy's load error names the directory that it searched.
    expect(() => listKitCheckReports(kitPackage.dir, { 'package.json': MANIFEST })).toThrow(
      path.join(kitPackage.dir, '.readyup', 'kits'),
    );
  });
});

// region | Helpers

/** Builds a kit module whose one checklist holds the given check literals. */
function buildKit(checks: string[]): string {
  return [
    "import fs from 'node:fs';",
    '',
    'function listSite(reported) {',
    "  return fs.existsSync('src/site.ts') ? [{ line: 1, path: 'src/site.ts', reported }] : [];",
    '}',
    '',
    'export default {',
    "  description: 'fixture kit',",
    `  checklists: [{ name: 'adoption', checks: [${checks.join(', ')}] }],`,
    '};',
    '',
  ].join('\n');
}

// endregion | Helpers
