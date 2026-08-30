import { describe, expect, it } from 'vitest';

import { runTbGit, type TbGitEffects } from '../runTbGit.ts';

const CHECKED_OUT = '249_add-tb-git-cli';
const KEYED = 'author/MAC-22.1-add-widget';
const TICKETLESS = 'main';
const VERSION = '9.9.9';

const EFFECTS: TbGitEffects = {
  resolveBranch: () => CHECKED_OUT,
  resolveVersion: () => VERSION,
};

describe(runTbGit, () => {
  describe('branch-number', () => {
    it('prints the number the branch encodes', () => {
      expect(runTbGit(['branch-number', '249_add-tb-git-cli'], EFFECTS)).toStrictEqual({
        exitCode: 0,
        stderr: '',
        stdout: '249\n',
      });
    });

    it('bounds the number with --min and --max', () => {
      expect(run(['branch-number', '1232', '--min', '3000', '--max', '3999'])).toBe('3232\n');
    });

    it('rotates the number with --offset, which takes a negative value in the = form', () => {
      expect(run(['branch-number', '249', '--max', '999', '--offset', '5'])).toBe('254\n');
      expect(run(['branch-number', '249', '--max', '999', '--offset=-5'])).toBe('244\n');
    });

    it('honours --key', () => {
      expect(run(['branch-number', 'mac-22/add-widget', '--key', 'mac'])).toBe('22\n');
    });

    it('derives from the checked-out branch when no branch is given', () => {
      expect(run(['branch-number'])).toBe('249\n');
    });
  });

  describe('ticket-ref', () => {
    it('prints the ref id', () => {
      expect(run(['ticket-ref', KEYED])).toBe('MAC-22\n');
    });

    it('prints the whole ref on one line under --json', () => {
      expect(run(['ticket-ref', KEYED, '--json'])).toBe('{"id":"MAC-22","key":"MAC","number":22,"revisit":1}\n');
    });

    it('honours --key', () => {
      expect(run(['ticket-ref', 'mac-22/add-widget', '--key', 'mac'])).toBe('MAC-22\n');
    });

    it('derives from the checked-out branch when no branch is given', () => {
      expect(run(['ticket-ref'])).toBe('249\n');
    });

    it.each([
      ['ticket-ref', TICKETLESS],
      ['ticket-ref', TICKETLESS, '--json'],
    ])('exits 1 with both streams empty when the branch encodes no ticket: %o', (...args) => {
      expect(runTbGit(args, EFFECTS)).toStrictEqual({ exitCode: 1, stderr: '', stdout: '' });
    });
  });

  describe('help and version', () => {
    it.each([['--help'], ['-h']])('prints the root help on %o', (flag) => {
      const { exitCode, stdout } = runTbGit([flag], EFFECTS);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Usage: tb-git <subcommand>');
      expect(stdout).toContain('branch-number');
      expect(stdout).toContain('ticket-ref');
    });

    it.each(['branch-number', 'ticket-ref'])('prints the help of %o', (subcommand) => {
      const { exitCode, stdout } = runTbGit([subcommand, '--help'], EFFECTS);

      expect(exitCode).toBe(0);
      expect(stdout).toContain(`Usage: tb-git ${subcommand}`);
      expect(stdout).toContain('--key');
    });

    it('prints the resolved version', () => {
      expect(run(['--version'])).toBe(`${VERSION}\n`);
    });
  });

  describe('given a bad invocation', () => {
    it.each([
      { args: [], expected: 'A subcommand is required.' },
      { args: ['branch'], expected: 'Unknown subcommand: branch' },
      { args: ['--bogus'], expected: 'Unknown option: --bogus' },
      { args: ['branch-number', '--bogus'], expected: "Unknown option '--bogus'" },
      { args: ['branch-number', ''], expected: 'The branch name is empty.' },
      { args: ['ticket-ref', 'a', 'b'], expected: 'Expected at most one branch name. Received 2.' },
      { args: ['branch-number', '249', '--offset', '-3'], expected: "Option '--offset' argument is ambiguous." },
      { args: ['branch-number', '249', '--min', 'abc'], expected: 'Received min=NaN' },
      { args: ['ticket-ref', '249', '--key', 'a'], expected: 'Invalid key' },
    ])('exits 2 with the message on stderr: $args', ({ args, expected }) => {
      const { exitCode, stderr, stdout } = runTbGit(args, EFFECTS);

      expect(exitCode).toBe(2);
      expect(stdout).toBe('');
      expect(stderr).toContain(expected);
    });

    it('reports a failure to resolve the checked-out branch', () => {
      const failing: TbGitEffects = {
        resolveBranch: () => {
          throw new Error('HEAD names no branch.');
        },
        resolveVersion: () => VERSION,
      };
      const { exitCode, stderr, stdout } = runTbGit(['branch-number'], failing);

      expect(exitCode).toBe(2);
      expect(stdout).toBe('');
      expect(stderr).toContain('HEAD names no branch.');
    });

    it('points at the subcommand help when a subcommand was named', () => {
      expect(runTbGit(['branch-number', ''], EFFECTS).stderr).toContain('Try `tb-git branch-number --help`.');
      expect(runTbGit(['--bogus'], EFFECTS).stderr).toContain('Try `tb-git --help`.');
    });
  });
});

// region | Helpers

/** Runs the CLI, asserting it succeeded, and returns what it would write to stdout. */
function run(args: string[]): string {
  const { exitCode, stderr, stdout } = runTbGit(args, EFFECTS);

  expect({ exitCode, stderr }).toStrictEqual({ exitCode: 0, stderr: '' });

  return stdout;
}

// endregion | Helpers
