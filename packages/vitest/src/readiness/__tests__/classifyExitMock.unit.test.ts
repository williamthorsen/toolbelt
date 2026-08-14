import { describe, expect, it } from 'vitest';

import { classifyExitMock } from '../classifyExitMock.ts';

const SENTINEL_DECLARATION = `class ExitError extends Error {
  constructor(public readonly code: number | undefined) {
    super(\`process.exit(\${code})\`);
  }
}`;

describe(classifyExitMock, () => {
  it('names a mock throwing a locally declared sentinel a clone', () => {
    const after = `.mockImplementation((code) => {
      throw new ExitError(typeof code === 'number' ? code : undefined);
    });`;

    expect(classifyExitMock(after, `${SENTINEL_DECLARATION}\n${after}`)).toBe('sentinel-clone');
  });

  it('names a mock throwing an undeclared class a plain throwing mock', () => {
    const after = `.mockImplementation(() => {
      throw new Error('process.exit called');
    });`;

    expect(classifyExitMock(after, after)).toBe('throwing');
  });

  it('names a no-op implementation non-throwing', () => {
    const after = '.mockImplementation(() => {});';

    expect(classifyExitMock(after, after)).toBe('non-throwing');
  });

  it('names a spy with no implementation non-throwing', () => {
    const after = ';\n    const errorSpy = vi.spyOn(console, "error");';

    expect(classifyExitMock(after, after)).toBe('non-throwing');
  });

  it('leaves an implementation passed by reference unclassified', () => {
    const after = '.mockImplementation(noop);';

    expect(classifyExitMock(after, after)).toBe('unclassified');
  });

  it('names an empty vi.fn implementation non-throwing, its arrow being a type parameter', () => {
    const after = '.mockImplementation(vi.fn<(code?: string | number | null) => never>());';

    expect(classifyExitMock(after, after)).toBe('non-throwing');
  });

  it('names a throwing implementation throwing however the error is built', () => {
    const after = '.mockImplementation((code) => { throw buildExitError(code); });';

    expect(classifyExitMock(after, after)).toBe('throwing');
  });
});
