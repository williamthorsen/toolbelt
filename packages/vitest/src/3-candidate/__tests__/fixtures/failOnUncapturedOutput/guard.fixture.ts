import process from 'node:process';

import { afterEach, describe, it, onTestFinished, vi } from 'vitest';

it('writes to stderr without a capture', () => {
  process.stderr.write('UNCAPTURED-OUTPUT\n');
});

it('writes to stderr under a spy', () => {
  const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  process.stderr.write('CAPTURED-OUTPUT\n');
  spy.mockRestore();
});

it('writes to stderr from a finish hook', () => {
  onTestFinished(() => {
    process.stderr.write('FINISH-HOOK-OUTPUT\n');
  });
});

describe('with an afterEach that writes', () => {
  afterEach(() => {
    process.stdout.write('AFTER-EACH-OUTPUT\n');
  });

  it('writes nothing in its body', () => {});
});
