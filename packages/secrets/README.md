# @williamthorsen/toolbelt.secrets

Utilities for storing and retrieving secrets in the OS credential store.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.secrets
```

Requires Node.js 24 or later, and macOS: the one backend is the macOS keychain, reached through `/usr/bin/security`. Constructing a store on another platform throws, naming the platform, rather than failing later at the first call.

## How a secret is stored

An item is named by a **service** and an **account**. The service is the caller's own name for the secret, never derived from a host or a URL, so one item can serve every product that accepts the same token. The account is optional and defaults to the empty account, which is matched exactly: a service holding several accounts answers with the one that is asked for, rather than with an arbitrary one.

A secret reaches `security` through its interactive mode, which takes a whole command on stdin, so the secret never sits in an argument vector that any local process could read. It travels as hexadecimal, which carries every byte, a line break included, and every write is read back and compared before it is reported as stored.

One command line carries the secret together with the service, the account, and the keychain, and `security` reads at most 4,095 bytes of it. That leaves room for a secret of roughly 2,000 bytes, and the exact ceiling falls as the other three grow. A secret that would not fit is refused, naming the room left; none is ever stored in part.

An item created here is local to the Mac that created it. `security` offers no iCloud Keychain synchronization, so a secret stored on one machine has to be stored again on the next.

## CLI

The package ships a `tb-secret` command exposing the store to a shell caller.

```sh
pnpm add --global @williamthorsen/toolbelt.secrets   # puts tb-secret on PATH
npx @williamthorsen/toolbelt.secrets get my-token    # or run it without installing
```

`tb-secret --help`, each subcommand's `--help`, and `tb-secret --version` report the surface and the installed version.

| Subcommand                   | Effect                                               |
| ---------------------------- | ---------------------------------------------------- |
| `tb-secret delete <service>` | Removes a secret                                     |
| `tb-secret get <service>`    | Prints a secret                                      |
| `tb-secret has <service>`    | Reports whether a secret is stored, printing nothing |
| `tb-secret set <service>`    | Stores a secret                                      |

| Option                  | Effect                                                  |
| ----------------------- | ------------------------------------------------------- |
| `-a, --account <name>`  | Account holding the secret (default: the empty account) |
| `-k, --keychain <path>` | Keychain to act on, rather than the default search list |

At a terminal, `set` prompts for the secret twice and echoes nothing; piped, it reads stdin and drops one trailing newline, since `echo` adds one. The secret passes through this process either way.

```sh
tb-secret set atlassian-api-token --account me@example.com   # prompts, echoing nothing

pbpaste | tb-secret set atlassian-api-token                  # or pipe it

export ATLASSIAN_API_TOKEN=$(tb-secret get atlassian-api-token --account me@example.com)
```

### Exit codes

| Code | Meaning                                                       |
| ---- | ------------------------------------------------------------- |
| `0`  | The command succeeded                                         |
| `1`  | No secret is stored under that service and account            |
| `2`  | Usage or validation error, with the message on stderr         |
| `3`  | The keychain could not be reached, with the message on stderr |

An absent secret is `1` and a keychain that could not be reached is `3`, so a script can tell one from the other.

```sh
if token=$(tb-secret get atlassian-api-token); then
  curl --user "me@example.com:$token" https://example.atlassian.net/rest/api/3/myself
elif [ $? -eq 1 ]; then
  echo 'No token stored. Run `tb-secret set atlassian-api-token`.' >&2
fi
```

## `createKeychainStore`

```ts
createKeychainStore(options?: { keychain: string }): WritableSecretStore;

interface SecretQuery {
  readonly account?: string | undefined;
  readonly service: string;
}

interface SecretStore {
  deleteSecret(query: SecretQuery): boolean;
  findSecret(query: SecretQuery): string | undefined;
  hasSecret(query: SecretQuery): boolean;
}

interface WritableSecretStore extends SecretStore {
  setSecret(query: SecretQuery, secret: string): void;
}
```

Opens the macOS keychain as a secret store. Every call is synchronous.

```ts
import { createKeychainStore } from '@williamthorsen/toolbelt.secrets/candidate';

const store = createKeychainStore();

store.setSecret({ account: 'me@example.com', service: 'atlassian-api-token' }, token);
store.findSecret({ account: 'me@example.com', service: 'atlassian-api-token' });
// the token
```

`findSecret` answers `undefined` where no item is stored, and throws where the keychain could not be reached, so absence is never confused with a failure. `deleteSecret` reports whether an item was there to remove.

`hasSecret` reads the item's attributes rather than its data. That is the difference worth knowing: retrieving a secret can raise a keychain access prompt where the item was created by another program, and an attribute lookup cannot.

`setSecret` rejects an empty secret, which the keychain would hold as an item indistinguishable from a stray one, and one too long for the command line that carries it. Every other secret is stored and returned byte for byte, whatever it holds. Each write is read back and compared, so a secret that did not survive the round trip fails at the write rather than at a later caller. That readback retrieves the secret, so replacing an item another program created can raise the keychain access prompt described above, and a write whose readback is refused is reported as unverified rather than as stored.

```ts
const projectStore = createKeychainStore({ keychain: '/Users/me/Library/Keychains/project.keychain-db' });

projectStore.findSecret({ service: 'deploy-key' });
```

A named keychain accepts a write like the default search list does. `SecretStore` remains the read-only half of the surface, for a backend that accepts no new secret.
