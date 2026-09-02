import { describe, expect, it } from 'vitest';

import { listConsoleSites } from '../listConsoleSites.ts';

describe(listConsoleSites, () => {
  it('reports nothing for a file holding no console idiom', () => {
    expect(listConsoleSites("it('works', () => {});")).toStrictEqual([]);
  });

  describe('the spy anchor', () => {
    it('names a hand-rolled silence', () => {
      const source = `vi.spyOn(console, 'warn').mockImplementation(() => {});`;

      expect(listConsoleSites(source)).toStrictEqual([{ kind: 'console-silence', line: 1 }]);
    });

    it('names a lossy capture', () => {
      const source = `vi.spyOn(console, 'error').mockImplementation((message) => { lines.push(message); });`;

      expect(listConsoleSites(source)).toStrictEqual([{ kind: 'console-capture-lossy', line: 1 }]);
    });

    it('names a capture keeping every argument', () => {
      const source = `vi.spyOn(console, 'log').mockImplementation((...args) => { lines.push(args); });`;

      expect(listConsoleSites(source)).toStrictEqual([{ kind: 'console-capture', line: 1 }]);
    });

    it('names a spy carrying no implementation', () => {
      const source = `vi.spyOn(console, 'debug');`;

      expect(listConsoleSites(source)).toStrictEqual([{ kind: 'console-unclassified', line: 1 }]);
    });

    it('matches the spy however it is spaced or quoted', () => {
      const source = `vi.spyOn( console , "info" ).mockImplementation(() => {});`;

      expect(listConsoleSites(source)).toStrictEqual([{ kind: 'console-silence', line: 1 }]);
    });

    it('declines a method for which the package has no advice', () => {
      const source = `vi.spyOn(console, 'table').mockImplementation(() => {});`;

      expect(listConsoleSites(source)).toStrictEqual([]);
    });

    it('reports every spy in a file', () => {
      const source = `vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation((message) => { lines.push(message); });`;

      expect(listConsoleSites(source).map((site) => site.kind)).toStrictEqual([
        'console-silence',
        'console-capture-lossy',
      ]);
    });
  });

  describe('the read anchor', () => {
    it('reports a read of a bound console spy', () => {
      const source = `const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
console.error('boom');
expect(spy.mock.calls).toHaveLength(1);`;

      expect(listConsoleSites(source)).toStrictEqual([
        { kind: 'console-silence', line: 1 },
        { kind: 'console-calls-read', line: 3 },
      ]);
    });

    it('reports a read of the last call as readily as of every call', () => {
      const source = `const spy = vi.spyOn(console, 'warn');
expect(spy.mock.lastCall).toStrictEqual(['deprecated']);`;

      expect(listConsoleSites(source)).toStrictEqual([
        { kind: 'console-unclassified', line: 1 },
        { kind: 'console-calls-read', line: 2 },
      ]);
    });

    it('reports a read reached through a silenceConsole result', () => {
      const source = `using silent = silenceConsole(['warn']);
expect(silent.warn.mock.calls).toHaveLength(1);`;

      expect(listConsoleSites(source)).toStrictEqual([{ kind: 'console-calls-read', line: 2 }]);
    });

    it('resolves a binding broken across lines by a formatter', () => {
      const source = `const spy =
  vi.spyOn(console, 'info').mockImplementation(() => {});
expect(spy.mock.calls).toHaveLength(1);`;

      expect(listConsoleSites(source)).toStrictEqual([
        { kind: 'console-silence', line: 2 },
        { kind: 'console-calls-read', line: 3 },
      ]);
    });

    it('resolves a name declared in one scope and assigned the spy in another', () => {
      const source = `let spy;
beforeEach(() => {
  spy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
it('warns', () => { expect(spy.mock.calls).toHaveLength(1); });`;

      expect(listConsoleSites(source)).toStrictEqual([
        { kind: 'console-silence', line: 3 },
        { kind: 'console-calls-read', line: 5 },
      ]);
    });

    it('resolves a binding carrying a type annotation', () => {
      const source = `const spy: MockInstance = vi.spyOn(console, 'error').mockImplementation(() => {});
expect(spy.mock.calls).toHaveLength(1);`;

      expect(listConsoleSites(source)).toStrictEqual([
        { kind: 'console-silence', line: 1 },
        { kind: 'console-calls-read', line: 2 },
      ]);
    });

    it('binds nothing where a member assignment takes the spy', () => {
      const source = `harness.spy = vi.spyOn(console, 'error').mockImplementation(() => {});
expect(spy.mock.calls).toHaveLength(1);`;

      expect(listConsoleSites(source)).toStrictEqual([{ kind: 'console-silence', line: 1 }]);
    });

    it('declines a read of a spy that is not a console spy', () => {
      const source = `const existsSyncSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
expect(existsSyncSpy.mock.calls).toHaveLength(2);`;

      expect(listConsoleSites(source)).toStrictEqual([]);
    });

    it('declines a member read whose owner is not a silenceConsole result', () => {
      const source = `const mocks = createMocks();
expect(mocks.error.mock.calls).toHaveLength(1);`;

      expect(listConsoleSites(source)).toStrictEqual([]);
    });

    it('declines a read of a spy on a method for which the package has no advice', () => {
      const source = `const spy = vi.spyOn(console, 'table').mockImplementation(() => {});
expect(spy.mock.calls).toHaveLength(1);`;

      expect(listConsoleSites(source)).toStrictEqual([]);
    });
  });

  it("lists a file's sites in line order", () => {
    const source = `using silent = silenceConsole(['warn']);
expect(silent.warn.mock.calls).toHaveLength(1);
vi.spyOn(console, 'error').mockImplementation(() => {});`;

    expect(listConsoleSites(source)).toStrictEqual([
      { kind: 'console-calls-read', line: 2 },
      { kind: 'console-silence', line: 3 },
    ]);
  });

  it('finds no site in prose about one', () => {
    const sources = [
      "// Replaces vi.spyOn(console, 'error') with silenceConsole.\n",
      "/**\n * Replaces vi.spyOn(console, 'error') with silenceConsole.\n */\n",
      'const fix = "replace vi.spyOn(console, \'error\')";\n',
      "const fix = `replace vi.spyOn(console, 'error') with silenceConsole`;\n",
      "const pattern = /vi.spyOn(console, 'error')/;\n",
    ];

    expect(sources.map(listConsoleSites)).toStrictEqual(sources.map(() => []));
  });

  it('finds no read in a comment about one', () => {
    const source = `const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
// Read spy.mock.calls to assert on what was written.`;

    expect(listConsoleSites(source)).toStrictEqual([{ kind: 'console-silence', line: 1 }]);
  });
});
