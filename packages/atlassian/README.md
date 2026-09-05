# @williamthorsen/toolbelt.atlassian

Utilities for working with Atlassian Cloud.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.atlassian
```

Requires Node.js 24 or later.

## Scope

Jira, Confluence, and Bitbucket Cloud. A scoped API token authenticates one product, so a credential is held per product, while the cloudId lookup and the Basic auth transport are shared here rather than duplicated across a package per product.

## CLI

The package ships a `tb-jira` command exposing the reconciler and the credential to a shell caller.

```sh
pnpm add --global @williamthorsen/toolbelt.atlassian   # puts tb-jira on PATH
npx @williamthorsen/toolbelt.atlassian configure-project THOR --dry-run
```

`tb-jira --help`, each subcommand's `--help`, and `tb-jira --version` report the surface and the installed version.

| Subcommand                      | Effect                                                                    |
| ------------------------------- | ------------------------------------------------------------------------- |
| `tb-jira auth delete`           | Removes the stored token                                                  |
| `tb-jira auth set`              | Stores a token, replacing one already held                                |
| `tb-jira auth status`           | Reports which source would supply the token, printing the token nowhere   |
| `tb-jira configure-project KEY` | Reconciles a project against the spec, then reports what the server holds |

Jira Cloud only, and team-managed projects only. A company-managed project is refused rather than reconciled: a status renamed there is renamed in every project on the site that uses it. `auth delete` and `auth set` additionally require macOS, the keychain being the one credential store.

### Reconciling a project

```sh
tb-jira configure-project THOR --dry-run                    # print the plan, write nothing
tb-jira configure-project THOR                              # reconcile, then report what the server holds
tb-jira configure-project THOR --seed-backlog 'To Do'       # also move every 'To Do' item off the board
```

| Option                  | Effect                                                              |
| ----------------------- | ------------------------------------------------------------------- |
| `--dry-run`             | Prints the plan and writes nothing                                  |
| `--email <address>`     | Atlassian account email, which names the keychain account           |
| `--seed-backlog <name>` | Moves every work item in that status off the board into the backlog |
| `--site <host>`         | Jira site, such as `acme.atlassian.net`                             |
| `--spec <path>`         | Spec file, rather than the upward search                            |
| `--token-command <cmd>` | Shell line printing the API token                                   |
| `--token-stdin`         | Reads the API token from stdin                                      |

The run prints the plan before it writes anything, and each write as it lands, so a process killed partway still leaves a record of what it did. It ends by re-reading the project and reporting each spec entry against what the server holds, followed by the board's column coverage and order.

### Managing the credential

```sh
tb-jira auth set                                    # prompt for the token, echoing nothing
pbpaste | tb-jira auth set                          # or pipe it
tb-jira auth status                                 # name the source, print no token
tb-jira auth delete
```

| Option                  | Effect                                                       |
| ----------------------- | ------------------------------------------------------------ |
| `--email <address>`     | Account holding the token (default: `$JIRA_EMAIL`)           |
| `--service <name>`      | Keychain service (default: `toolbelt.atlassian.jira`)        |
| `--token-command <cmd>` | `status` only: the shell line to probe as the command source |

`set` refuses a blank token, which the resolver would drop while `status` still reported the item as present. An item written by hand or by `tb-secret` can still hold one: `status` reports what is stored, not what it contains.

### Finding the spec

The consuming repo owns the file. `tb-jira` ascends from the working directory looking for `jira-project-spec.json` and takes the first one it reaches, so one spec at a repo root serves every directory under it. `--spec` names one directly and skips the search.

### Resolution orders

Each chain stops at the first source that answers.

| Value | Order                                                                             |
| ----- | --------------------------------------------------------------------------------- |
| site  | `--site`, then `JIRA_SITE`, then the spec's `site`                                |
| email | `--email`, then `JIRA_EMAIL`, then the spec's `email`                             |
| token | `--token-stdin`, then `JIRA_API_TOKEN`, then `--token-command`, then the keychain |

The keychain item is the service `toolbelt.atlassian.jira` with the email as the account, which is what `tb-jira auth set` writes and what `tb-secret set toolbelt.atlassian.jira --account you@example.com` writes too. It is opened only where the earlier sources miss, so a run authenticated from the environment reaches no keychain and raises no access prompt.

`tb-jira auth status` names the source that would answer without printing what it holds. It probes the keychain for presence rather than reading it, so it raises no access prompt either; a configured token command does run, and its output is discarded.

The base URL is not configurable. It is the `api.atlassian.com` gateway, and the cloudId is read from the site's `_edge/tenant_info` endpoint, which answers without authentication.

### Token scopes

The scope set a scoped API token needs is not yet determined; #283 determines it against a scratch project. What the reconciler requires of the acting user is known: **Administer Jira** for the workflow and status writes, **board administration** for the feature toggle, and **Schedule Issues** for the backlog move. Grant a token the scopes matching those and narrow from there rather than over-granting permanently.

### Exit codes

| Code | Meaning                                                       |
| ---- | ------------------------------------------------------------- |
| `0`  | The command succeeded                                         |
| `1`  | No token is stored, or nothing was there to remove            |
| `2`  | Usage or validation error, with the message on stderr         |
| `3`  | The keychain could not be reached, with the message on stderr |
| `4`  | A Jira request failed, with the method, path, and status      |
| `5`  | The run wrote, and the project does not match the spec        |

A run that wrote and left the project short of the spec is `5` rather than `4`, so a script can tell a rejected call from a reconciliation that did not take. A board column the spec has no counterpart for never changes the exit code: the public API cannot set one.

## Library

```ts
import {
  createTokenTransport,
  resolveJiraBaseUrl,
  resolveJiraEmail,
  resolveJiraToken,
} from '@williamthorsen/toolbelt.atlassian/candidate';

const email = resolveJiraEmail();
const token = resolveJiraToken({ account: email });
const baseUrl = await resolveJiraBaseUrl({ site: 'acme.atlassian.net' });

const request = createTokenTransport({ baseUrl, email, token });
const response = await request('GET', '/rest/api/3/myself');
```

### The base URL

`resolveJiraBaseUrl` returns `https://api.atlassian.com/ex/jira/<cloudId>`, the gateway against which a scoped API token authenticates. Where no `cloudId` is given, it is read from the site's `_edge/tenant_info` endpoint, which answers without authentication.

Requests against the site URL (`https://acme.atlassian.net`) are not offered as a fallback. Atlassian ignores a scoped token sent there rather than rejecting it, so the request would return an anonymous response instead of failing.

### The credential

Basic auth pairs an email with an API token. They resolve on separate chains, because the email is not a secret and the token is, and the email names the keychain account under which the token is stored.

`resolveJiraEmail` reads a supplied value, then `JIRA_EMAIL`, then `fallback`, which is where a spec's `email` reaches the chain.

`resolveJiraToken` reads a supplied value, then `JIRA_API_TOKEN`, then a configured shell command (`tokenCommand`), then the macOS keychain. The keychain is opened only where the earlier sources miss. Store a token with:

```sh
tb-jira auth set --email you@example.com                      # or, equivalently:
tb-secret set toolbelt.atlassian.jira --account you@example.com
```

The service defaults to `toolbelt.atlassian.jira`; pass `service` to read another.

`findJiraTokenSource` walks that same chain and answers which link would supply the token, or `undefined` where every one misses. It never returns the token: the keychain is probed with `hasSecret`, which reads the item's attributes rather than its data and so raises no keychain access prompt. A configured `tokenCommand` does run, and its output is discarded.

`resolveJiraSite` reads a supplied value, then `JIRA_SITE`, then `fallback`, which is where a spec's `site` reaches the chain. What it answers is the site that `resolveJiraBaseUrl` derives the cloudId from.

### The transport

`createTokenTransport` takes the email and token as values and reads no environment variable, file, or keystore of its own. It reports every status to the caller, a 401 or 403 included, so an authentication failure is a value to branch on rather than an exception.

### The project spec

A spec declares which statuses a Jira project should hold and which board features it should have on. The consuming repo owns the file; this package ships the validator and this schema, never a spec of its own. `tb-jira` looks for it under the name `jira-project-spec.json`.

```json
{
  "site": "acme.atlassian.net",
  "email": "you@example.com",
  "statuses": [
    { "name": "To Do", "category": "TODO" },
    { "name": "In Progress", "category": "IN_PROGRESS" },
    { "name": "Waiting", "category": "IN_PROGRESS", "aliases": ["Waiting for customer"] },
    { "name": "Done", "category": "DONE", "aliases": ["Resolved"] }
  ],
  "boardFeatures": { "jsw.agility.backlog": "ENABLED" }
}
```

`statuses` is required and non-empty. Each entry needs a `name` and a `category` of `TODO`, `IN_PROGRESS`, or `DONE`. Its `aliases` are the live names that also resolve to it, which is how a status is renamed: the new name goes in `name` and the current one in `aliases`. Names match case-insensitively, since Jira reports one status under two casings across endpoints, and no name or alias may be claimed by two entries.

`boardFeatures` maps a feature key to `ENABLED` or `DISABLED`. Jira also reports `COMING_SOON`, which no spec may request. `site` and `email` are the last source in their resolution chains.

A live status claimed by no entry is reported and left untouched, so a spec covers the statuses that it manages rather than the whole project.

### Planning a reconciliation

`parseProjectSpec` validates the spec, `buildReconciliationPlan` resolves it against the project's live configuration, and `buildWorkflowUpdatePayload` composes the body that `POST /rest/api/3/workflows/update` takes. None of the three reads or writes anything, so a plan can be built and reviewed before a project is touched.

```ts
import {
  buildReconciliationPlan,
  buildWorkflowUpdatePayload,
  parseProjectSpec,
} from '@williamthorsen/toolbelt.atlassian/candidate';

const spec = parseProjectSpec(await readFile('project-spec.json', 'utf8'));
// `configuration` is the project's live configuration, shaped as `ProjectConfiguration`.
const plan = buildReconciliationPlan(spec, configuration);
const payload = buildWorkflowUpdatePayload(configuration, plan);
```

The workflow write replaces the graph wholesale, so `buildWorkflowUpdatePayload` runs `assertGraphPreserved` before returning. That refuses a payload that would drop a status, drop a transition, or leave a status with no transition into it: none of the three fails loudly at Jira, and each leaves work items in a state out of which nothing can move them. A status that already carried no transition is passed over, since that is not the write's doing.

`assertGraphPreserved` is exported as well, for a payload composed some other way.

### The API functions

Each takes the transport as its first argument and constructs none of its own. A response outside 2xx throws `JiraRequestError`, which carries the method, path, status, and the server's reply as fields, so a caller branches on the status rather than parsing a message. Findings are returned rather than printed.

| Function                                              | Reads or writes                                                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `readProjectConfiguration(request, projectKey)`       | The project, board, issue types, workflow, and board features, as the `ProjectConfiguration` taken by the planner        |
| `applyWorkflowUpdate(request, configuration, plan)`   | The reconciled graph, then the statuses back, correcting through the status API any that the workflow write did not take |
| `applyBoardFeatures(request, configuration, plan)`    | One call per board-feature toggle in the plan                                                                            |
| `listIssueKeys(request, jql)`                         | Every work-item key matched by a JQL query, following the search's page token                                            |
| `moveIssuesToBacklog(request, boardId, keys)`         | Work items off the board and into the backlog, in batches of 50                                                          |
| `readBoardColumnReport(request, configuration, spec)` | The board's columns, reporting coverage and order                                                                        |
| `buildVerificationReport(configuration, spec)`        | Nothing: it compares a configuration already read against the spec                                                       |

`requestOk` is exported too, for a call that this package does not wrap.

```ts
import {
  applyBoardFeatures,
  applyWorkflowUpdate,
  buildReconciliationPlan,
  buildVerificationReport,
  readProjectConfiguration,
} from '@williamthorsen/toolbelt.atlassian/candidate';

const configuration = await readProjectConfiguration(request, 'THOR');
const plan = buildReconciliationPlan(spec, configuration);

await applyWorkflowUpdate(request, configuration, plan);
await applyBoardFeatures(request, configuration, plan);

// The run reports what the server holds, not what it sent.
const report = buildVerificationReport(await readProjectConfiguration(request, 'THOR'), spec);
```

### What the read refuses

`readProjectConfiguration` fails closed. Each of these throws rather than reconciling part of a project:

- **A project that is not team-managed.** A status renamed in a company-managed project is renamed in every project on the site that uses it. A project reporting no style, or one that this does not recognize, is refused alongside a company-managed one: a project that it cannot classify is not one to write to.
- **A project that does not resolve to a single board of its own.** The board-feature, column, and backlog calls are board-scoped. The board query returns every board whose filter references the project, so a board owned by another project can come back alongside it; where several come back, the project's own board is the one whose location names the project, and an ambiguous set is refused.
- **A project whose issue types resolve to other than exactly one workflow.** Every issue type is carried into the workflow read, so a project running its issue types on several workflows is refused rather than having one of them reconciled and reported green.
- **A response it cannot read.** A missing field is a refusal, not a default.

### Board columns

Board columns cannot be set through the public API. `readBoardColumnReport` reports the gap: which spec statuses map to no column, whose work items are then absent from the board and the backlog alike, and the column order where it differs from the spec's. Both are fixed by dragging in the board settings.
