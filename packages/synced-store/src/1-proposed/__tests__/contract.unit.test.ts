import { describe, expect, it } from 'vitest';

import { createKeyValueRepository } from '../createKeyValueRepository.ts';
import { createMemoryKeyValueStore } from '../createMemoryKeyValueStore.ts';
import { createMemoryRepository } from '../createMemoryRepository.ts';
import { listKeyValueStoreContractCases } from '../listKeyValueStoreContractCases.ts';
import { listRepositoryContractCases } from '../listRepositoryContractCases.ts';

describe(listRepositoryContractCases, () => {
  describe(createMemoryRepository, () => {
    it.each(listRepositoryContractCases())('$name', async (contractCase) => {
      await expect(contractCase.run(() => Promise.resolve(createMemoryRepository()))).resolves.toBeUndefined();
    });
  });

  describe(createKeyValueRepository, () => {
    it.each(listRepositoryContractCases())('$name', async (contractCase) => {
      const create = () => Promise.resolve(createKeyValueRepository(createMemoryKeyValueStore(), { key: 'replica' }));

      await expect(contractCase.run(create)).resolves.toBeUndefined();
    });
  });
});

describe(listKeyValueStoreContractCases, () => {
  describe(createMemoryKeyValueStore, () => {
    it.each(listKeyValueStoreContractCases())('$name', async (contractCase) => {
      await expect(contractCase.run(() => Promise.resolve(createMemoryKeyValueStore()))).resolves.toBeUndefined();
    });
  });
});
