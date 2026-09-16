import { describe, expect, it } from 'vitest';

import { describeInvalidOutputStyle, type OutputStyleResolution, resolveOutputStyle } from '../resolveOutputStyle.ts';

// An environment naming neither CI nor a terminal type, leaving the TTY flag to decide on its own.
const BARE_ENV = {};

const ENV_VAR = 'RDY_STYLE';
const FLAG = '--style';

const PIPE = false;
const TTY = true;

describe(describeInvalidOutputStyle, () => {
  it('names the source, the accepted settings, and the value that was given', () => {
    expect(describeInvalidOutputStyle({ source: FLAG, value: 'fancy' })).toBe(
      '--style must be one of: auto, plain, rich (got "fancy")',
    );
  });
});

describe(resolveOutputStyle, () => {
  describe('the flag', () => {
    it.each(['plain', 'rich'] as const)('takes %s as a spaced value', (style) => {
      expect(resolve([FLAG, style], BARE_ENV, PIPE).style).toBe(style);
    });

    it.each(['plain', 'rich'] as const)('takes %s as an assigned value', (style) => {
      expect(resolve([`${FLAG}=${style}`], BARE_ENV, PIPE).style).toBe(style);
    });

    it('outranks the environment variable', () => {
      expect(resolve([FLAG, 'rich'], { [ENV_VAR]: 'plain' }, PIPE).style).toBe('rich');
    });

    it('keeps the last occurrence, as the argument parser would', () => {
      expect(resolve([FLAG, 'rich', FLAG, 'plain'], BARE_ENV, TTY).style).toBe('plain');
    });

    it('ignores a value after the positional terminator', () => {
      expect(resolve(['--', FLAG, 'plain'], BARE_ENV, TTY).style).toBe('rich');
    });

    it('takes the next argument even where that argument is itself a flag', () => {
      expect(resolve([FLAG, '--verbose'], BARE_ENV, TTY).invalid).toStrictEqual({ source: FLAG, value: '--verbose' });
    });

    it('reads an empty assigned value as absent', () => {
      expect(resolve([`${FLAG}=`], { [ENV_VAR]: 'plain' }, TTY).style).toBe('plain');
    });
  });

  describe('the environment variable', () => {
    it.each(['plain', 'rich'] as const)('is honoured when it names %s', (style) => {
      expect(resolve([], { [ENV_VAR]: style }, PIPE).style).toBe(style);
    });

    it('outranks detection', () => {
      expect(resolve([], { [ENV_VAR]: 'rich' }, PIPE).style).toBe('rich');
    });

    it('is ignored when empty, so that an unset-looking export does not shadow detection', () => {
      expect(resolve([], { [ENV_VAR]: '' }, TTY).style).toBe('rich');
    });
  });

  describe('auto', () => {
    it('defers to detection when the flag names it', () => {
      expect(resolve([FLAG, 'auto'], BARE_ENV, PIPE).style).toBe('plain');
    });

    it('defers to detection even when the environment variable names a style', () => {
      expect(resolve([FLAG, 'auto'], { [ENV_VAR]: 'plain' }, TTY).style).toBe('rich');
    });

    it('defers to detection when the environment variable names it', () => {
      expect(resolve([], { [ENV_VAR]: 'auto' }, PIPE).style).toBe('plain');
    });
  });

  describe('a value that names no setting', () => {
    it('is reported rather than thrown, and the next source decides', () => {
      expect(resolve([FLAG, 'fancy'], { [ENV_VAR]: 'plain' }, TTY)).toStrictEqual({
        invalid: { source: FLAG, value: 'fancy' },
        style: 'plain',
      });
    });

    it('is reported from the environment variable, leaving detection to decide', () => {
      expect(resolve([], { [ENV_VAR]: 'fancy' }, TTY)).toStrictEqual({
        invalid: { source: ENV_VAR, value: 'fancy' },
        style: 'rich',
      });
    });

    it('keeps the first of two, the flag being read ahead of the environment variable', () => {
      expect(resolve([FLAG, 'fancy'], { [ENV_VAR]: 'gaudy' }, PIPE).invalid).toStrictEqual({
        source: FLAG,
        value: 'fancy',
      });
    });
  });

  describe('an omitted source name', () => {
    it('drops the flag, leaving the environment variable to decide', () => {
      const resolution = resolveOutputStyle({
        argv: [FLAG, 'rich'],
        env: { [ENV_VAR]: 'plain' },
        envVar: ENV_VAR,
        isTty: TTY,
      });

      expect(resolution.style).toBe('plain');
    });

    it('drops the environment variable, leaving detection to decide', () => {
      const resolution = resolveOutputStyle({ argv: [], env: { [ENV_VAR]: 'plain' }, flag: FLAG, isTty: TTY });

      expect(resolution.style).toBe('rich');
    });

    it('leaves detection to decide alone when both are omitted', () => {
      const resolution = resolveOutputStyle({ argv: [FLAG, 'rich'], env: { [ENV_VAR]: 'rich' }, isTty: PIPE });

      expect(resolution.style).toBe('plain');
    });
  });
});

// region | Helpers

/** Resolves with both source names given, which is the fullest chain and the one that most cases exercise. */
function resolve(
  argv: readonly string[],
  env: Record<string, string | undefined>,
  isTty: boolean,
): OutputStyleResolution {
  return resolveOutputStyle({ argv, env, envVar: ENV_VAR, flag: FLAG, isTty });
}

// endregion | Helpers
