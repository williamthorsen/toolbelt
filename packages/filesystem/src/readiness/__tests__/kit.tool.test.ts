import {
  createKitFixture,
  listReportedFindings,
  runCheck,
  runEveryCheck,
  runSkip,
  selectCheck,
  summarizeFraction,
} from '@williamthorsen/toolbelt.adoption/test-utils';
import { dedent } from '@williamthorsen/toolbelt.strings';
import { describe, expect, it } from 'vitest';

const KIT_URL = new URL('../../../.readyup/kits/default.ts', import.meta.url);
const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.filesystem', version: '1.0.0' });

const ATOMIC_WRITE = dedent`
  export async function save(filePath, content) {
    const tempPath = \`\${filePath}.tmp\`;
    await fs.writeFile(tempPath, content);
    await fs.rename(tempPath, filePath);
  }

`;
const CHAIN_WALK = dedent`
  export function listAncestors(startDir) {
    const dirs = [];
    let dir = startDir;
    let previous;
    while (dir !== previous) {
      previous = dir;
      dirs.push(dir);
      dir = path.dirname(dir);
    }
    return dirs;
  }

`;
const CHAIN_PROBE = dedent`
  export function findMarker(startDir) {
    let dir = startDir;
    while (true) {
      if (fs.existsSync(path.join(dir, '.git'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) return undefined;
      dir = parent;
    }
  }

`;
// A walk that `toolbelt.packaging` claims, which this kit declines rather than reporting under a kind that the
// checks here could not close.
const MANIFEST_PROBE = dedent`
  export function findRoot(startDir) {
    let dir = startDir;
    while (true) {
      if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) return undefined;
      dir = parent;
    }
  }

`;
// The package's own writeAtomic and listDirectoryChain, each written with the idiom that its check reports.
const OWN_WRITE_ATOMIC = dedent`
  export async function writeAtomic(filePath, content) {
    await fs.writeFile(tempPath, content);
    await fs.rename(tempPath, filePath);
  }

`;
const OWN_DIRECTORY_CHAIN = dedent`
  export function listDirectoryChain(startDir) {
    let dir = startDir;
    let previous;
    while (dir !== previous) {
      previous = dir;
      dir = path.dirname(dir);
    }
  }

`;
const ADOPTER = dedent`
  import { writeAtomic } from '@williamthorsen/toolbelt.filesystem/candidate';
  export const save = (filePath, content) => writeAtomic(filePath, content);

`;
const EVERY_IDIOM = {
  'package.json': MANIFEST,
  'src/ancestors.ts': CHAIN_WALK,
  'src/marker.ts': CHAIN_PROBE,
  'src/save.ts': ATOMIC_WRITE,
};

describe('The filesystem adoption kit', () => {
  it('reports each idiom under its own check, naming where it is', async () => {
    using kit = await createKitFixture(KIT_URL, EVERY_IDIOM);

    const outcomes = await runEveryCheck(kit.checks);

    // The write check names the function to change; a loop declares nothing, so the walk check names the location.
    expect(outcomes.map(listReportedFindings)).toStrictEqual([
      [{ line: 4, path: 'src/save.ts', reported: true, symbol: 'save' }],
      [
        { line: 5, path: 'src/ancestors.ts', reported: true },
        { line: 3, path: 'src/marker.ts', reported: true },
      ],
    ]);
  });

  it('spans all three sites in the one denominator that the checks share', async () => {
    using kit = await createKitFixture(KIT_URL, EVERY_IDIOM);

    const outcomes = await runEveryCheck(kit.checks);

    expect(outcomes.map(summarizeFraction)).toStrictEqual(
      Array.from({ length: 2 }, () => ({ adoptedCount: 0, findingCount: 3 })),
    );
  });

  it('counts a call into the package as adoption', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/save.ts': ADOPTER });

    await expect(runCheck(selectCheck(kit.checks, 'no-hand-rolled-atomic-write'))).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  it('leaves a walk that probes for a manifest out of the report and out of the denominator', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/root.ts': MANIFEST_PROBE });

    await expect(runCheck(selectCheck(kit.checks, 'no-hand-rolled-directory-walk'))).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [],
    });
  });

  it('exempts the package’s own implementations, and reports a hand-roll beside them', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'package.json': PUBLISHER_MANIFEST,
      'src/listDirectoryChain.ts': OWN_DIRECTORY_CHAIN,
      'src/other.ts': ATOMIC_WRITE,
      'src/writeAtomic.ts': OWN_WRITE_ATOMIC,
    });

    const outcomes = await runEveryCheck(kit.checks);

    expect(outcomes.flatMap(listReportedFindings)).toStrictEqual([
      { line: 4, path: 'src/other.ts', reported: true, symbol: 'save' },
    ]);
  });

  it('leaves a test file and a bootstrap wrapper alone', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'bin/run.js': CHAIN_PROBE,
      'package.json': MANIFEST,
      'src/__tests__/save.unit.test.ts': ATOMIC_WRITE,
      'src/save.ts': ADOPTER,
    });

    const outcomes = await runEveryCheck(kit.checks);

    expect(outcomes).toStrictEqual(Array.from({ length: 2 }, () => ({ adoptedCount: 1, findings: [] })));
  });

  it('skips every check when the sweep matches no source', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'bin/run.js': CHAIN_PROBE,
      'package.json': MANIFEST,
      'src/__tests__/save.unit.test.ts': ATOMIC_WRITE,
    });

    await expect(Promise.all(kit.checks.map((check) => runSkip(check)))).resolves.toStrictEqual(
      Array.from(
        { length: 2 },
        () => 'the project contains no JavaScript or TypeScript sources outside the exempt paths',
      ),
    );
  });
});
