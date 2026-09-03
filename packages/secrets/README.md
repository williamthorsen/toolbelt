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

A secret reaches `security` on stdin, never on a command line, where any local process could read it. That has one consequence worth stating: `security` accepts a secret this way only for the **default keychain**, so a store opened on a named keychain reads and deletes but does not write.

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
| `tb-secret set <service>`    | Stores a secret read from stdin                      |

| Option                  | Effect                                                         |
| ----------------------- | -------------------------------------------------------------- |
| `-a, --account <name>`  | Account holding the secret (default: the empty account)        |
| `-k, --keychain <path>` | Keychain to act on; `delete`, `get`, and `has` alone accept it |

`set` takes the secret from stdin. At a terminal it hands the prompt to `security`, which reads the secret with no echo and asks for it twice, so an interactively typed secret never enters the Node process; piped, one trailing newline is dropped, since `echo` adds one. A secret carrying a line break is rejected: the prompt reads a single line, so storing one would silently keep the first.

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

### Checking the write path

`set` writes to the default keychain, which is the login keychain on a stock Mac, so the package's own tests do not exercise it: they run against a keychain created and deleted for the test. Three commands check it by hand.

```sh
printf 'probe-value' | tb-secret set tb-secret-probe
tb-secret get tb-secret-probe   # probe-value
tb-secret delete tb-secret-probe
```

## `createKeychainStore`

```ts
createKeychainStore(): WritableSecretStore;
createKeychainStore(options: { keychain: string }): SecretStore;

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

`setSecret` rejects an empty secret and one carrying a line break, both of which `security` would otherwise store wrong. A secret is otherwise stored and returned byte for byte, whatever it holds.

```ts
const projectStore = createKeychainStore({ keychain: '/Users/me/Library/Keychains/project.keychain-db' });

projectStore.findSecret({ service: 'deploy-key' });
```

A named keychain is typed as a `SecretStore`, which carries no `setSecret`: the write is unavailable there, and unavailable at compile time rather than at the call.
