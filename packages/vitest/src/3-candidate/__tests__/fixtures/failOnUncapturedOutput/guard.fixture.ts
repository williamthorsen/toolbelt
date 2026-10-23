import process from 'node:process';

import { it, vi } from 'vitest';

it('writes to stderr without a capture', () => {
  process.stderr.write('UNCAPTURED-OUTPUT\n');
});

it('writes to stderr under a spy', () => {
  const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  process.stderr.write('CAPTURED-OUTPUT\n');
  spy.mockRestore();
});
