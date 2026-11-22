<!-- readme-type: library -->

# @williamthorsen/toolbelt.text-file-store

A store of named text files, with Web Storage, HTTP, and memory backends.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.text-file-store
```

Requires Node.js 24 or later.

## Usage

```ts
import { createWebStorageFileStore } from '@williamthorsen/toolbelt.text-file-store/proposed';

const store = createWebStorageFileStore(() => sessionStorage, 'my-app:files:');
await store.write('notes.md', '# Notes\n', { replace: false });
```

Every backend implements `FileStore`: `list`, `read`, `write`, and `remove`. Apart from `list`, which rejects, a method does not throw; it resolves to `{ ok: true }` or to `{ ok: false, reason }`, so a caller can tell a missing file from a name already held, a refused write, or a store out of reach.

All exports are in the `/proposed` tier, and their shape may change in any release.

## Backends

### Web Storage

`createWebStorageFileStore(storage, keyPrefix)` keeps each file under `{keyPrefix}{name}` of a storage area such as `sessionStorage` or `localStorage`. It reports a write past the area's quota as refused, and a browser that blocks storage as unavailable.

### HTTP

`createHttpFileStore(basePath, fetch?)` reads and writes the files that a server serves under `basePath`, a path on the page's origin or an absolute URL. The server implements this protocol:

| Request                                                                                                   | Success                             | Failure statuses that the client distinguishes |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------- |
| `GET {basePath}`                                                                                          | `{ files: [{ name, modifiedAt }] }` | any, as a rejection                            |
| `GET {basePath}/{name}`                                                                                   | `{ text }`                          | `404` missing                                  |
| `PUT {basePath}/{name}` with the text as a `text/plain; charset=utf-8` body, `?replace=true` to overwrite | any `2xx`                           | `409` exists; `400`, `413`, `422` refused      |
| `DELETE {basePath}/{name}`                                                                                | any `2xx`, such as `204`            | `404` missing; `400`, `409` refused            |

`{name}` is URI-encoded. A failure answers `{ problems: [{ path, message }] }`, whose messages the client returns. For `read`, `write`, and `remove`, any other failure, and a server out of reach, is unavailable.

### Memory

`createMemoryFileStore(files?)` holds the files in memory, the last one given the newest, with a clock that does not depend on the system's. `add` stores a file directly, and setting `isUnreachable` makes every method report the store as out of reach, which suits a test of a caller's failure handling.
