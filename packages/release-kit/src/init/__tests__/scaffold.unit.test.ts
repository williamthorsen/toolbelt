import { afterEach, describe, expect, it, vi } from 'vitest';

/* eslint-disable vitest/require-mock-type-parameters -- mocks are used loosely across overloads */
const mockExistsSync = vi.hoisted(() => vi.fn());
const mockMkdirSync = vi.hoisted(() => vi.fn());
const mockReadFileSync = vi.hoisted(() => vi.fn());
const mockWriteFileSync = vi.hoisted(() => vi.fn());
const mockFileURLToPath = vi.hoisted(() => vi.fn());
const mockPrintError = vi.hoisted(() => vi.fn());
const mockPrintSkip = vi.hoisted(() => vi.fn());
const mockPrintSuccess = vi.hoisted(() => vi.fn());
/* eslint-enable vitest/require-mock-type-parameters */

vi.mock(import('node:fs'), () => ({
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
}));

vi.mock(import('node:url'), () => ({
  fileURLToPath: mockFileURLToPath,
}));

vi.mock(import('../prompt.ts'), () => ({
  printError: mockPrintError,
  printSkip: mockPrintSkip,
  printSuccess: mockPrintSuccess,
}));

import { copyCliffTemplate, scaffoldFiles } from '../scaffold.ts';

describe('scaffold', () => {
  afterEach(() => {
    mockExistsSync.mockReset();
    mockMkdirSync.mockReset();
    mockReadFileSync.mockReset();
    mockWriteFileSync.mockReset();
    mockFileURLToPath.mockReset();
    mockPrintError.mockReset();
    mockPrintSkip.mockReset();
    mockPrintSuccess.mockReset();
  });

  describe(scaffoldFiles, () => {
    it('creates scaffold files when they do not exist', () => {
      mockExistsSync.mockReturnValue(false);
      // readFileSync for package.json in updatePackageJsonScripts
      mockReadFileSync.mockReturnValue(JSON.stringify({ name: 'test' }));

      scaffoldFiles({ repoType: 'single-package', dryRun: false, overwrite: false });

      expect(mockMkdirSync).toHaveBeenCalledWith('.github/scripts', { recursive: true });
      expect(mockMkdirSync).toHaveBeenCalledWith('.github/workflows', { recursive: true });
      expect(mockWriteFileSync).toHaveBeenCalledWith('.github/scripts/release-prepare.ts', expect.any(String), 'utf8');
      expect(mockWriteFileSync).toHaveBeenCalledWith('.github/scripts/release.config.ts', expect.any(String), 'utf8');
      expect(mockWriteFileSync).toHaveBeenCalledWith('.github/workflows/release.yaml', expect.any(String), 'utf8');
    });

    it('skips files that already exist when overwrite is false', () => {
      mockExistsSync.mockReturnValue(true);
      // readFileSync for updatePackageJsonScripts
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          name: 'test',
          scripts: { 'release:prepare': 'existing', 'release:prepare:dry': 'existing' },
        }),
      );

      scaffoldFiles({ repoType: 'single-package', dryRun: false, overwrite: false });

      // writeIfAbsent should skip, not write
      expect(mockWriteFileSync).not.toHaveBeenCalled();
      expect(mockPrintSkip).toHaveBeenCalledTimes(3);
    });

    it('overwrites existing files when overwrite is true', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          name: 'test',
          scripts: { 'release:prepare': 'existing', 'release:prepare:dry': 'existing' },
        }),
      );

      scaffoldFiles({ repoType: 'single-package', dryRun: false, overwrite: true });

      // Should write files even though they exist
      expect(mockWriteFileSync).toHaveBeenCalledWith('.github/scripts/release-prepare.ts', expect.any(String), 'utf8');
      expect(mockWriteFileSync).toHaveBeenCalledWith('.github/scripts/release.config.ts', expect.any(String), 'utf8');
      expect(mockWriteFileSync).toHaveBeenCalledWith('.github/workflows/release.yaml', expect.any(String), 'utf8');
      expect(mockPrintSkip).not.toHaveBeenCalled();
    });

    it('logs but does not write in dry-run mode', () => {
      mockExistsSync.mockReturnValue(false);
      mockReadFileSync.mockReturnValue(JSON.stringify({ name: 'test' }));

      scaffoldFiles({ repoType: 'single-package', dryRun: true, overwrite: false });

      // mkdirSync and writeFileSync should not be called for the scaffold files
      expect(mockMkdirSync).not.toHaveBeenCalled();
      // writeFileSync should not be called at all (dry-run skips package.json writes too)
      expect(mockWriteFileSync).not.toHaveBeenCalled();
      expect(mockPrintSuccess).toHaveBeenCalledWith(expect.stringContaining('[dry-run]'));
    });

    it('adds release:prepare scripts to package.json when absent', () => {
      mockExistsSync.mockReturnValue(false);
      mockReadFileSync.mockReturnValue(JSON.stringify({ name: 'test', scripts: { test: 'vitest' } }));

      scaffoldFiles({ repoType: 'single-package', dryRun: false, overwrite: false });

      // Verify package.json was written with the expected scripts
      const expectedPkg = {
        name: 'test',
        scripts: {
          test: 'vitest',
          'release:prepare': 'tsx .github/scripts/release-prepare.ts',
          'release:prepare:dry': 'tsx .github/scripts/release-prepare.ts --dry-run',
        },
      };
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        'package.json',
        `${JSON.stringify(expectedPkg, null, 2)}\n`,
        'utf8',
      );
    });

    it('skips package.json update when scripts already exist', () => {
      mockExistsSync.mockReturnValue(false);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({
          name: 'test',
          scripts: {
            'release:prepare': 'tsx .github/scripts/release-prepare.ts',
            'release:prepare:dry': 'tsx .github/scripts/release-prepare.ts --dry-run',
          },
        }),
      );

      scaffoldFiles({ repoType: 'single-package', dryRun: false, overwrite: false });

      // No writeFileSync call for package.json
      const pkgWriteCall = mockWriteFileSync.mock.calls.find((call: unknown[]) => call[0] === 'package.json');
      expect(pkgWriteCall).toBeUndefined();
      expect(mockPrintSuccess).toHaveBeenCalledWith('package.json scripts already configured');
    });

    it('prints an error when package.json cannot be read', () => {
      mockExistsSync.mockReturnValue(false);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      scaffoldFiles({ repoType: 'single-package', dryRun: false, overwrite: false });

      expect(mockPrintError).toHaveBeenCalledWith(expect.stringContaining('Failed to read package.json'));
    });

    it('prints an error when package.json contains invalid JSON', () => {
      mockExistsSync.mockReturnValue(false);
      mockReadFileSync.mockReturnValue('{not valid json}');

      scaffoldFiles({ repoType: 'single-package', dryRun: false, overwrite: false });

      expect(mockPrintError).toHaveBeenCalledWith('Failed to parse package.json');
    });

    it('prints an error when package.json cannot be written', () => {
      mockExistsSync.mockReturnValue(false);
      mockReadFileSync.mockReturnValue(JSON.stringify({ name: 'test' }));
      mockWriteFileSync.mockImplementation((path: string) => {
        if (path === 'package.json') {
          throw new Error('EACCES: permission denied');
        }
      });

      scaffoldFiles({ repoType: 'single-package', dryRun: false, overwrite: false });

      expect(mockPrintError).toHaveBeenCalledWith(expect.stringContaining('Failed to write package.json'));
    });

    it('prints an error when mkdirSync fails for scaffold files', () => {
      mockExistsSync.mockReturnValue(false);
      mockReadFileSync.mockReturnValue(JSON.stringify({ name: 'test' }));
      mockMkdirSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      scaffoldFiles({ repoType: 'single-package', dryRun: false, overwrite: false });

      expect(mockPrintError).toHaveBeenCalledWith(expect.stringContaining('Failed to create directory for'));
    });
  });

  describe(copyCliffTemplate, () => {
    it('prints an error when the template file is not found', () => {
      mockFileURLToPath.mockReturnValue('/fake/dist/esm/init/scaffold.js');
      mockExistsSync.mockReturnValue(false);

      copyCliffTemplate(false);

      expect(mockPrintError).toHaveBeenCalledWith(expect.stringContaining('Could not find cliff.toml.template'));
    });

    it('reads the template and writes cliff.toml when template exists', () => {
      mockFileURLToPath.mockReturnValue('/fake/dist/esm/init/scaffold.js');
      // First call: existsSync for templatePath (true), second call: existsSync for cliff.toml (false)
      mockExistsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);
      mockReadFileSync.mockReturnValue('[changelog]\nbody = "template content"');

      copyCliffTemplate(false);

      expect(mockReadFileSync).toHaveBeenCalledWith(expect.stringContaining('cliff.toml.template'), 'utf8');
      expect(mockWriteFileSync).toHaveBeenCalledWith('cliff.toml', '[changelog]\nbody = "template content"', 'utf8');
    });

    it('prints an error when readFileSync fails for the template', () => {
      mockFileURLToPath.mockReturnValue('/fake/dist/esm/init/scaffold.js');
      mockExistsSync.mockReturnValueOnce(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      copyCliffTemplate(false);

      expect(mockPrintError).toHaveBeenCalledWith(expect.stringContaining('Failed to read cliff.toml.template'));
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it('does not write in dry-run mode', () => {
      mockFileURLToPath.mockReturnValue('/fake/dist/esm/init/scaffold.js');
      mockExistsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);
      mockReadFileSync.mockReturnValue('template content');

      copyCliffTemplate(true);

      expect(mockWriteFileSync).not.toHaveBeenCalled();
      expect(mockPrintSuccess).toHaveBeenCalledWith(expect.stringContaining('[dry-run]'));
    });
  });
});
