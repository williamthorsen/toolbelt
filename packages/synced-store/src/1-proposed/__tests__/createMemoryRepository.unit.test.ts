import { describe, expect, it } from 'vitest';

import { createMemoryRepository } from '../createMemoryRepository.ts';
import type { Version } from '../types.ts';

const STAMP = '2026-11-24T14:40:07.123Z_0000_a';

describe(createMemoryRepository, () => {
  it('loads the initial versions', async () => {
    const initial: Version[] = [{ kind: 'part', name: 'names', stamp: STAMP, value: 'Ann' }];

    await expect(createMemoryRepository(initial).load()).resolves.toStrictEqual(initial);
  });

  it('does not share a value with the caller', async () => {
    const value = { player: 'Ann' };
    const repository = createMemoryRepository();
    await repository.apply([{ kind: 'part', name: 'names', stamp: STAMP, value }]);

    value.player = 'Bo';

    await expect(repository.load()).resolves.toStrictEqual([
      { kind: 'part', name: 'names', stamp: STAMP, value: { player: 'Ann' } },
    ]);
  });

  it('rejects a value that a JSON round trip would change, and changes nothing', async () => {
    const repository = createMemoryRepository();

    await expect(repository.apply([{ kind: 'part', name: 'rates', stamp: STAMP, value: [1, NaN] }])).rejects.toThrow(
      TypeError,
    );

    await expect(repository.load()).resolves.toStrictEqual([]);
  });

  it('rejects a batch with a malformed version, and changes nothing', async () => {
    const repository = createMemoryRepository();
    const valid: Version = { kind: 'part', name: 'names', stamp: STAMP, value: 'Ann' };
    const malformed: Version = { kind: 'part', name: 'rulebook', stamp: 'yesterday', value: {} };

    await expect(repository.apply([valid, malformed])).rejects.toThrow(TypeError);

    await expect(repository.load()).resolves.toStrictEqual([]);
  });
});
