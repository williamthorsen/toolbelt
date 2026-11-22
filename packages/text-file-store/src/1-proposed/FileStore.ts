/** A store of named text files, which a caller reads through whichever backend serves it. */
export interface FileStore {
  /** Lists the stored files newest first; rejects when the store cannot be reached or answers unexpectedly. */
  list: () => Promise<StoredFileEntry[]>;
  read: (name: string) => Promise<StoredFileRead>;
  remove: (name: string) => Promise<StoredFileRemoval>;
  /** Stores the text under the name; without `replace`, a name that the store already holds is not overwritten. */
  write: (name: string, text: string, options: { replace: boolean }) => Promise<StoredFileWrite>;
}

/** A reason that the store gives for refusing or failing a write; `path` is empty when it does not name a place. */
export interface StoreProblem {
  path: string;
  message: string;
}

/** A stored file, as the store lists it. */
export interface StoredFileEntry {
  name: string;
  /** The file's modification time, in ISO 8601. */
  modifiedAt: string;
}

/** The text of a stored file, or why the store did not return it. */
export type StoredFileRead =
  { ok: true; text: string } | { ok: false; reason: 'missing' | 'unavailable'; message: string };

/** Whether a removal removed the file, or why it did not: a file not stored, a refusal, or a store out of reach. */
export type StoredFileRemoval =
  { ok: true } | { ok: false; reason: 'missing' | 'refused' | 'unavailable'; message: string };

/** Whether a write stored the file, or why it did not: a name already held, a refusal, or a store out of reach. */
export type StoredFileWrite =
  { ok: true } | { ok: false; reason: 'exists' | 'refused' | 'unavailable'; problems: StoreProblem[] };
