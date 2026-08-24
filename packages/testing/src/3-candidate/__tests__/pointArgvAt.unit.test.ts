import process from 'node:process';

import { describe, expect, it } from 'vitest';

import { pointArgvAt } from '../pointArgvAt.ts';

describe(pointArgvAt, () => {
  describe('the arguments', () => {
    it('reports what the caller passed', () => {
      using argv = pointArgvAt(['--config', 'custom.config.ts']);

      expect(process.argv.slice(2)).toStrictEqual(['--config', 'custom.config.ts']);
      expect(argv.args).toStrictEqual(['--config', 'custom.config.ts']);
    });

    it('reports no arguments when the caller passes none', () => {
      using argv = pointArgvAt([]);

      expect(process.argv.slice(2)).toStrictEqual([]);
      // The executable and script entries are installed even with nothing to follow them.
      expect(process.argv).toHaveLength(2);
      expect(argv.args).toStrictEqual([]);
    });

    it('copies the arguments, so a later mutation of the caller’s array does not reach `process.argv`', () => {
      const args = ['--quiet'];

      using argv = pointArgvAt(args);
      args.push('--fix');

      expect(process.argv.slice(2)).toStrictEqual(['--quiet']);
      expect(argv.args).toStrictEqual(['--quiet']);
    });
  });

  describe('the executable and script entries', () => {
    it('supplies the running executable and a placeholder script', () => {
      using _argv = pointArgvAt(['--quiet']);

      expect(process.argv[0]).toBe(process.execPath);
      expect(process.argv[1]).toBe('script');
    });

    it('takes the executable entry from `execPath`, leaving the script entry defaulted', () => {
      using _argv = pointArgvAt([], { execPath: '/usr/local/bin/node' });

      expect(process.argv[0]).toBe('/usr/local/bin/node');
      expect(process.argv[1]).toBe('script');
    });

    it('takes the script entry from `scriptPath`, leaving the executable entry defaulted', () => {
      using _argv = pointArgvAt([], { scriptPath: 'strict-lint' });

      expect(process.argv[0]).toBe(process.execPath);
      expect(process.argv[1]).toBe('strict-lint');
    });
  });

  describe('restoration', () => {
    it('restores the previous arguments on disposal', () => {
      const startArgv = process.argv;

      {
        using _argv = pointArgvAt(['--quiet']);
      }

      expect(process.argv).toBe(startArgv);
    });

    it('restores them when the scope is left by a throw', () => {
      const startArgv = process.argv;

      expect(() => {
        using _argv = pointArgvAt(['--quiet']);
        throw new Error('thrown within the scope');
      }).toThrow('thrown within the scope');

      expect(process.argv).toBe(startArgv);
    });

    it('leaves the array it found untouched, which is what disposal restores by reference', () => {
      const startArgv = process.argv;
      const startEntries = [...startArgv];

      using _argv = pointArgvAt(['--quiet']);

      expect(startArgv).toStrictEqual(startEntries);
      expect(process.argv).not.toBe(startArgv);
    });
  });

  describe('nested scopes', () => {
    it('restores what the enclosing scope installed', () => {
      using _outer = pointArgvAt(['--quiet']);
      {
        using _inner = pointArgvAt(['--fix']);

        expect(process.argv.slice(2)).toStrictEqual(['--fix']);
      }

      expect(process.argv.slice(2)).toStrictEqual(['--quiet']);
    });
  });
});
