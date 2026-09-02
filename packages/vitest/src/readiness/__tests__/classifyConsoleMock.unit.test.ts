import { describe, expect, it } from 'vitest';

import { classifyConsoleMock } from '../classifyConsoleMock.ts';

describe(classifyConsoleMock, () => {
  describe('an implementation that it cannot read', () => {
    it('declines a spy carrying no implementation', () => {
      expect(classifyConsoleMock(';')).toBe('console-unclassified');
    });

    it('declines a method attached away from the spy chain', () => {
      expect(classifyConsoleMock('.mockReturnValue(undefined);')).toBe('console-unclassified');
    });

    it('declines an implementation whose parentheses never balance', () => {
      expect(classifyConsoleMock('.mockImplementation(() => {}')).toBe('console-unclassified');
    });

    it('declines an implementation given as a bare reference', () => {
      expect(classifyConsoleMock('.mockImplementation(recordLine);')).toBe('console-unclassified');
    });

    it('declines a head that it does not recognize', () => {
      expect(classifyConsoleMock('.mockImplementation(new Recorder());')).toBe('console-unclassified');
    });
  });

  describe('a silence', () => {
    it('names an empty block', () => {
      expect(classifyConsoleMock('.mockImplementation(() => {});')).toBe('console-silence');
    });

    it('names an empty block whose parameter list still names an argument', () => {
      expect(classifyConsoleMock('.mockImplementation((_message) => {});')).toBe('console-silence');
    });

    it('names a block holding only a comment, which blanking has already emptied', () => {
      expect(classifyConsoleMock('.mockImplementation(() => {  });')).toBe('console-silence');
    });

    it('names an expression body discarding the call', () => {
      expect(classifyConsoleMock('.mockImplementation(() => undefined);')).toBe('console-silence');
    });

    it('names a function expression with an empty block and a return-type annotation', () => {
      expect(classifyConsoleMock('.mockImplementation(function (message): void {});')).toBe('console-silence');
    });

    it('names an arrow with an empty block and a return-type annotation', () => {
      expect(classifyConsoleMock('.mockImplementation((message: string): void => {});')).toBe('console-silence');
    });
  });

  describe('a lossy capture', () => {
    it('names a sole parenthesized parameter', () => {
      expect(classifyConsoleMock('.mockImplementation((message) => { lines.push(message); });')).toBe(
        'console-capture-lossy',
      );
    });

    it('names a sole parameter written without parentheses', () => {
      expect(classifyConsoleMock('.mockImplementation(message => lines.push(message));')).toBe('console-capture-lossy');
    });

    it('names a fixed list of more than one parameter, which drops the arguments past it', () => {
      expect(classifyConsoleMock('.mockImplementation((message, detail) => { lines.push(message, detail); });')).toBe(
        'console-capture-lossy',
      );
    });

    it('names a function expression naming a parameter', () => {
      expect(classifyConsoleMock('.mockImplementation(function (message) { lines.push(message); });')).toBe(
        'console-capture-lossy',
      );
    });

    it('reads a body ending in a brace group as an assigned value rather than an empty block', () => {
      expect(classifyConsoleMock('.mockImplementation((message) => seen[message] = {});')).toBe(
        'console-capture-lossy',
      );
    });

    it('reads a spread inside a default value as the value that it is, not as a rest parameter', () => {
      expect(classifyConsoleMock('.mockImplementation((message = [...prefix]) => { lines.push(message); });')).toBe(
        'console-capture-lossy',
      );
    });
  });

  describe('a lossless capture', () => {
    it('names a rest parameter', () => {
      expect(classifyConsoleMock('.mockImplementation((...args) => { lines.push(args.join(" ")); });')).toBe(
        'console-capture',
      );
    });

    it('names a rest parameter following a named one', () => {
      expect(classifyConsoleMock('.mockImplementation((message, ...rest) => { lines.push(message, ...rest); });')).toBe(
        'console-capture',
      );
    });

    it('names an empty parameter list over a body that does something', () => {
      expect(classifyConsoleMock('.mockImplementation(() => { called = true; });')).toBe('console-capture');
    });
  });

  it('reads a once-only implementation the same way', () => {
    expect(classifyConsoleMock('.mockImplementationOnce((message) => { lines.push(message); });')).toBe(
      'console-capture-lossy',
    );
  });

  it('reads an async implementation the same way', () => {
    expect(classifyConsoleMock('.mockImplementation(async (...args) => { await record(args); });')).toBe(
      'console-capture',
    );
  });

  it('reads a body running past any fixed window', () => {
    const padding = ' '.repeat(400);

    expect(classifyConsoleMock(`.mockImplementation((...args) => {${padding}lines.push(args); });`)).toBe(
      'console-capture',
    );
  });
});
