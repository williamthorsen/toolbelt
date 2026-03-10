import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* eslint-disable vitest/require-mock-type-parameters -- mocks are used loosely across overloads */
const mockReleasePrepareMono = vi.hoisted(() => vi.fn());
/* eslint-enable vitest/require-mock-type-parameters */

// eslint-disable-next-line vitest/prefer-import-in-mock -- string path avoids strict type-checking issues with partial mocks
vi.mock('../releasePrepareMono.ts', () => ({
  releasePrepareMono: mockReleasePrepareMono,
}));

import { runReleasePrepare } from '../runReleasePrepare.ts';
import type { MonorepoReleaseConfig, WorkTypeConfig } from '../types.ts';

const workTypes: WorkTypeConfig[] = [
  { type: 'feat', header: 'Features', bump: 'minor' },
  { type: 'fix', header: 'Bug fixes', bump: 'patch' },
];

function makeConfig(overrides?: Partial<MonorepoReleaseConfig>): MonorepoReleaseConfig {
  return {
    components: [
      {
        tagPrefix: 'arrays-v',
        packageFiles: ['packages/arrays/package.json'],
        changelogPaths: ['packages/arrays'],
        paths: ['packages/arrays/**'],
      },
      {
        tagPrefix: 'strings-v',
        packageFiles: ['packages/strings/package.json'],
        changelogPaths: ['packages/strings'],
        paths: ['packages/strings/**'],
      },
    ],
    workTypes,
    ...overrides,
  };
}

/** Sentinel error thrown by the mocked process.exit. */
class ExitError extends Error {
  constructor(public readonly code: number | undefined) {
    super(`process.exit(${code})`);
  }
}

describe(runReleasePrepare, () => {
  let originalArgv: string[];

  beforeEach(() => {
    originalArgv = process.argv;
    // Mock process.exit to throw so we can assert on it
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new ExitError(typeof code === 'number' ? code : undefined);
    });
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.argv = originalArgv;
    mockReleasePrepareMono.mockReset();
    vi.restoreAllMocks();
  });

  it('calls releasePrepareMono with dryRun false when no args are given', () => {
    process.argv = ['node', 'script.ts'];

    runReleasePrepare(makeConfig());

    expect(mockReleasePrepareMono).toHaveBeenCalledWith(expect.objectContaining({ components: expect.any(Array) }), {
      dryRun: false,
    });
  });

  it('passes dryRun true when --dry-run is provided', () => {
    process.argv = ['node', 'script.ts', '--dry-run'];

    runReleasePrepare(makeConfig());

    expect(mockReleasePrepareMono).toHaveBeenCalledWith(expect.any(Object), { dryRun: true });
  });

  it('passes bumpOverride when --bump is provided', () => {
    process.argv = ['node', 'script.ts', '--bump=major'];

    runReleasePrepare(makeConfig());

    expect(mockReleasePrepareMono).toHaveBeenCalledWith(expect.any(Object), {
      dryRun: false,
      bumpOverride: 'major',
    });
  });

  it('combines --dry-run and --bump', () => {
    process.argv = ['node', 'script.ts', '--dry-run', '--bump=patch'];

    runReleasePrepare(makeConfig());

    expect(mockReleasePrepareMono).toHaveBeenCalledWith(expect.any(Object), {
      dryRun: true,
      bumpOverride: 'patch',
    });
  });

  it('filters components when --only is provided', () => {
    process.argv = ['node', 'script.ts', '--only=arrays'];

    runReleasePrepare(makeConfig());

    expect(mockReleasePrepareMono).toHaveBeenCalledWith(
      expect.objectContaining({
        components: [expect.objectContaining({ tagPrefix: 'arrays-v' })],
      }),
      expect.any(Object),
    );
  });

  it('filters to multiple components when --only has comma-separated names', () => {
    process.argv = ['node', 'script.ts', '--only=arrays,strings'];

    runReleasePrepare(makeConfig());

    expect(mockReleasePrepareMono).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.arrayContaining([
          expect.objectContaining({ tagPrefix: 'arrays-v' }),
          expect.objectContaining({ tagPrefix: 'strings-v' }),
        ]),
      }),
      expect.any(Object),
    );
  });

  it('exits with code 1 for an invalid bump type', () => {
    process.argv = ['node', 'script.ts', '--bump=invalid'];

    expect(() => runReleasePrepare(makeConfig())).toThrowError(ExitError);
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid bump type'));
  });

  it('exits with code 1 for an unknown component name in --only', () => {
    process.argv = ['node', 'script.ts', '--only=nonexistent'];

    expect(() => runReleasePrepare(makeConfig())).toThrowError(ExitError);
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Unknown component'));
  });

  it('exits with code 1 for an unknown argument', () => {
    process.argv = ['node', 'script.ts', '--foo'];

    expect(() => runReleasePrepare(makeConfig())).toThrowError(ExitError);
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Unknown argument'));
  });

  it('exits with code 0 when --help is provided', () => {
    process.argv = ['node', 'script.ts', '--help'];

    expect(() => runReleasePrepare(makeConfig())).toThrowError(ExitError);
    expect(process.exit).toHaveBeenCalledWith(0);
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining('gh workflow run release.yaml'));
  });

  it('exits with code 1 when releasePrepareMono throws', () => {
    process.argv = ['node', 'script.ts'];
    mockReleasePrepareMono.mockImplementation(() => {
      throw new Error('something went wrong');
    });

    expect(() => runReleasePrepare(makeConfig())).toThrowError(ExitError);
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith('Error preparing release:', 'something went wrong');
  });

  it('exits with code 1 when --only value is empty', () => {
    process.argv = ['node', 'script.ts', '--only='];

    expect(() => runReleasePrepare(makeConfig())).toThrowError(ExitError);
    expect(process.exit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('--only requires'));
  });
});
