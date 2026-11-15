import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

import { resolveBridgePath } from '../startToolServing.ts';

describe(resolveBridgePath, () => {
  it.each(['mcpStdioBridge.ts', 'mcpStdioBridge.js'])('returns the path of a bridge module named %s', (fileName) => {
    const modulePath = `/opt/app/node_modules/@williamthorsen/toolbelt.acp/dist/esm/internal/${fileName}`;

    expect(resolveBridgePath(pathToFileURL(modulePath).href)).toBe(modulePath);
  });

  it('throws, naming the module and the remedy, when the URL names a bundle', () => {
    expect(() => resolveBridgePath(pathToFileURL('/opt/app/dist/server.js').href)).toThrow(
      'The MCP stdio bridge resolves to /opt/app/dist/server.js, which is not the bridge module.',
    );
  });
});
