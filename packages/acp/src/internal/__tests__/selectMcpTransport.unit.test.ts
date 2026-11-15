import { describe, expect, it } from 'vitest';

import { selectMcpTransport } from '../selectMcpTransport.ts';

describe(selectMcpTransport, () => {
  it.each([
    { capabilities: undefined, expected: 'stdio' },
    { capabilities: null, expected: 'stdio' },
    { capabilities: {}, expected: 'stdio' },
    { capabilities: { sse: true }, expected: 'stdio' },
    { capabilities: { http: true }, expected: 'http' },
    { capabilities: { http: true, sse: true }, expected: 'http' },
    { capabilities: { acp: true }, expected: 'acp' },
    { capabilities: { acp: true, http: true, sse: true }, expected: 'acp' },
  ] as const)('selects $expected for $capabilities', ({ capabilities, expected }) => {
    expect(selectMcpTransport(capabilities)).toBe(expected);
  });
});
