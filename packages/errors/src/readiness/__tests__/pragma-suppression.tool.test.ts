import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const CLONE = [
  'export function toMessage(error) {',
  '  if (error instanceof Error) return error.message;',
  '  return String(error);',
  '}',
  '',
].join('\n');
const COERCE = 'export const wrapped = value instanceof Error ? value : new Error(String(value));\n';
const DESCRIBE_INLINE = 'export const message = error instanceof Error ? error.message : String(error);';
const NARROW = "export const isErrno = error instanceof Error && 'code' in error;\n";
const ADOPTER = [
  "import { describeError } from '@williamthorsen/toolbelt.errors';",
  'export const message = describeError(error);',
  '',
].join('\n');
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

describe('The errors adoption kit, run through rdy', () => {
  it('names every site and spans them all in one denominator', () => {
    expect(runKit(`${DESCRIBE_INLINE}\n`)).toStrictEqual([
      { count: 5, detail: 'toMessage (src/clone.ts:2)', id: 'no-describe-clone', passedCount: 1 },
      { count: 5, detail: 'src/describe.ts:1', id: 'no-inline-description', passedCount: 1 },
      { count: 5, detail: 'src/narrow.ts:1', id: 'no-instanceof-error', passedCount: 1 },
      { count: 5, detail: 'src/coerce.ts:1', id: 'no-error-coercion', passedCount: 1 },
    ]);
  });

  it('drops a site covered by an unqualified pragma from every check’s detail and fraction', () => {
    expect(runKit(`${DESCRIBE_INLINE} // rdy-ignore -- reviewed\n`)).toStrictEqual([
      { count: 4, detail: 'toMessage (src/clone.ts:2)', id: 'no-describe-clone', passedCount: 1 },
      { count: 4, detail: undefined, id: 'no-inline-description', passedCount: 1 },
      { count: 4, detail: 'src/narrow.ts:1', id: 'no-instanceof-error', passedCount: 1 },
      { count: 4, detail: 'src/coerce.ts:1', id: 'no-error-coercion', passedCount: 1 },
    ]);
  });

  // A `dir:` kit source has no namespace, so the bare id stands. A consumer running the kit from the
  // installed package writes `toolbelt.errors/no-inline-description`.
  it('drops a site covered by a qualified pragma from the named check alone', () => {
    expect(runKit(`${DESCRIBE_INLINE} // rdy-ignore no-inline-description -- reviewed\n`)).toStrictEqual([
      { count: 5, detail: 'toMessage (src/clone.ts:2)', id: 'no-describe-clone', passedCount: 1 },
      { count: 4, detail: undefined, id: 'no-inline-description', passedCount: 1 },
      { count: 5, detail: 'src/narrow.ts:1', id: 'no-instanceof-error', passedCount: 1 },
      { count: 5, detail: 'src/coerce.ts:1', id: 'no-error-coercion', passedCount: 1 },
    ]);
  });
});

// region | Helpers

/**
 * Runs the package's compiled kit over a fixture repo whose inline description carries the given source, and
 * reports what each check named and counted.
 *
 * A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report reaches the
 * layer that acts on one.
 */
function runKit(describeSource: string): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/clone.ts': CLONE,
    'src/coerce.ts': COERCE,
    'src/describe.ts': describeSource,
    'src/narrow.ts': NARROW,
    'src/report.ts': ADOPTER,
  });
}

// endregion | Helpers
