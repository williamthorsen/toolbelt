export { createHttpFileStore } from './createHttpFileStore.ts';
export { createMemoryFileStore, type MemoryFileStore } from './createMemoryFileStore.ts';
export { createWebStorageFileStore } from './createWebStorageFileStore.ts';
export type {
  FileStore,
  StoredFileEntry,
  StoredFileRead,
  StoredFileRemoval,
  StoredFileWrite,
  StoreProblem,
} from './FileStore.ts';
