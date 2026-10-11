<!-- readme-type: library -->

# @williamthorsen/toolbelt.atlassian

Utilities for working with Atlassian Cloud.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.atlassian
```

Requires Node.js 24 or later.

## Scope

Jira, Confluence, and Bitbucket Cloud. A scoped API token authenticates one product, so a credential is stored per product, while the cloudId lookup and the Basic auth transport are shared here rather than duplicated across a package per product.

## CLI

For these functions on the command line, use `thor-jira` from [`@williamthorsen/atlassian-tools`](https://www.npmjs.com/package/@williamthorsen/atlassian-tools).

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

`resolveJiraBaseUrl` returns `https://api.atlassian.com/ex/jira/<cloudId>`, the gateway against which a scoped API token authenticates. When no `cloudId` is given, it is read from the site's `_edge/tenant_info` endpoint, which responds without authentication.

Requests against the site URL (`https://acme.atlassian.net`) are not offered as a fallback. Atlassian ignores a scoped token sent there rather than rejecting it, so the request would return an anonymous response instead of failing.

### The credential

Basic auth pairs an email with an API token. They resolve on separate chains, because the email is not a secret and the token is, and the email names the keychain account under which the token is stored.

`resolveJiraEmail` reads a supplied value, then `JIRA_EMAIL`, then `fallback`, the parameter that takes a spec's `email`.

`resolveJiraToken` reads a supplied value, then `JIRA_API_TOKEN`, then a configured shell command (`tokenCommand`), then the macOS keychain. The keychain is opened only when the earlier sources miss. Store a token with:

```sh
thor-jira auth set --email you@example.com                    # or, equivalently:
thor-secret set toolbelt.atlassian.jira --account you@example.com
```

The service defaults to `toolbelt.atlassian.jira`; pass `service` to read another.

`findJiraTokenSource` walks that same chain and reports which link would supply the token, or `undefined` when every one misses. It never returns the token: The keychain is probed with `hasSecret`, which reads the item's attributes rather than its data and so raises no keychain access prompt. A configured `tokenCommand` does run, and its output is discarded.

`resolveJiraSite` reads a supplied value, then `JIRA_SITE`, then `fallback`, the parameter that takes a spec's `site`. It returns the site from which `resolveJiraBaseUrl` derives the cloudId.

### Token scopes

A scoped API token targets one app, so this needs a **Jira** token. Grant it these 23 granular scopes, which the reconciler's twelve endpoints require and nothing more:

```
read:application-role:jira            read:project-category:jira
read:avatar:jira                      read:project-version:jira
read:board-scope:jira-software        read:project.component:jira
read:board-scope.admin:jira-software  read:project.property:jira
read:field:jira                       read:project:jira
read:field.default-value:jira         read:status:jira
read:field.option:jira                read:user:jira
read:group:jira                       read:workflow:jira
read:issue-details:jira               write:board-scope:jira-software
read:issue-status:jira                write:board-scope.admin:jira-software
read:issue-type-hierarchy:jira        write:workflow:jira
read:issue-type:jira
```

No classic scope is needed. Every endpoint has a granular path, and `/rest/agile/1.0/` accepts granular scopes alone: A token with classic scopes can call none of it. The picker caps a token at 50, which leaves room. A token's scopes are fixed at creation, so adding one means creating a replacement.

Which endpoint needs what, so that a narrower grant can be derived for a subset of the calls:

| Endpoint                                       | Granular scopes                                                                                                                                                                                                                                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /rest/api/3/project/{key}`                | `read:application-role:jira`, `read:avatar:jira`, `read:group:jira`, `read:issue-type-hierarchy:jira`, `read:issue-type:jira`, `read:project-category:jira`, `read:project-version:jira`, `read:project.component:jira`, `read:project.property:jira`, `read:project:jira`, `read:user:jira` |
| `GET /rest/api/3/project/{key}/statuses`       | `read:issue-status:jira`, `read:issue-type:jira`, `read:status:jira`                                                                                                                                                                                                                         |
| `POST /rest/api/3/workflows?expand=statuses`   | `read:workflow:jira`                                                                                                                                                                                                                                                                         |
| `POST /rest/api/3/workflows/update`            | `write:workflow:jira`                                                                                                                                                                                                                                                                        |
| `GET /rest/api/3/statuses/search`              | `read:workflow:jira`                                                                                                                                                                                                                                                                         |
| `PUT /rest/api/3/statuses`                     | `write:workflow:jira`                                                                                                                                                                                                                                                                        |
| `POST /rest/api/3/search/jql`                  | `read:field.default-value:jira`, `read:field.option:jira`, `read:field:jira`, `read:group:jira`, `read:issue-details:jira`                                                                                                                                                                   |
| `GET /rest/agile/1.0/board`                    | `read:board-scope:jira-software`, `read:project:jira`                                                                                                                                                                                                                                        |
| `GET /rest/agile/1.0/board/{id}/features`      | `read:board-scope.admin:jira-software`                                                                                                                                                                                                                                                       |
| `PUT /rest/agile/1.0/board/{id}/features`      | `write:board-scope.admin:jira-software`                                                                                                                                                                                                                                                      |
| `GET /rest/agile/1.0/board/{id}/configuration` | `read:board-scope.admin:jira-software`, `read:project:jira`                                                                                                                                                                                                                                  |
| `POST /rest/agile/1.0/backlog/{boardId}/issue` | `write:board-scope:jira-software`                                                                                                                                                                                                                                                            |

Only `read:project:jira` is in the grant for the Agile calls as well as for the project read; every other scope is required by the endpoint that names it.

The status writes are covered by `write:workflow:jira`. There is no `write:status:jira`, and `manage:jira-configuration` is only the classic alternative to the granular scope rather than a requirement, so `PUT /rest/api/3/statuses` needs no Jira administration scope of its own.

The acting user still needs the Jira permissions that the calls demand, which the scopes do not grant: **Administer Jira** for the workflow and status writes, **board administration** for the feature toggle, and **Schedule Issues** for the backlog move.

### The transport

`createTokenTransport` takes the email and token as values and reads no environment variable, file, or keystore of its own. It reports every status to the caller, a 401 or 403 included, so an authentication failure is a value to branch on rather than an exception. Each response contains the `url` at which it was aimed, origin and cloudId included, alongside the status and the body.

### Errors

Three error types separate a Jira that answered from a Jira that did not, and an answer that this package can read from one that it cannot. `JiraRequestError` reports a status outside 2xx and has `body`, `label`, `method`, `path`, `reason`, `status`, and `url`, so that a caller branches on those rather than parsing the message; `reason` is the classification that ["Diagnosing a rejected request"](#diagnosing-a-rejected-request) tabulates. `JiraTransportError` reports a request that never arrived and has the `url` at which it was aimed, with the fault that the runtime raised as its `cause`. `JiraResponseError` reports a 2xx response that does not have the shape that its reader reads, a missing list field included, and has the `url` that returned it.

The split matters because node's `fetch` reports every transport failure as `TypeError: fetch failed` and names the reason on `cause` alone. Reading the chain turns that into `getaddrinfo ENOTFOUND acme.atlassian.net`, and a retry is worth attempting for the second type and never for the first.

### Diagnosing a rejected request

Four failures look similar and mean different things. The gateway checks the token's scopes before Jira validates anything, so a scope shortfall is reported before any permission or payload error.

| Response                                                            | `reason`     | Meaning                                                                                           |
| ------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------- |
| `401` `{"code":401,"message":"Unauthorized; scope does not match"}` | `scope`      | The credential is good and the token lacks a scope required by the endpoint                       |
| `401` `{"code":401,"message":"Unauthorized"}`                       | `credential` | The credential itself was rejected                                                                |
| `403`                                                               | `permission` | The acting user lacks a Jira permission required by the call                                      |
| `404` naming the project as not found                               | `not-found`  | The resource does not exist, or no credential reached the gateway and the request ran anonymously |

The `403` comes from Jira rather than the gateway, and reports a permission that the acting user lacks rather than a scope that the token lacks.

`JiraRequestError` has the matching row as `reason` and states it, with the remedy, in its message. A status outside the table, a 5xx included, leaves `reason` undefined and the message without a remedy.

### The project spec

A spec declares which statuses a Jira project should have and which board features it should have on. The consuming repo owns the file; this package provides the validator and this schema, never a spec of its own. `thor-jira` looks for it under the name `jira-project-spec.json`.

```json
{
  "projectKey": "PROJ",
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

`statuses` is required and non-empty. Each entry needs a `name` and a `category` of `TODO`, `IN_PROGRESS`, or `DONE`. Its `aliases` are the live names that also resolve to it, which is how a status is renamed: The new name goes in `name` and the current one in `aliases`. Names match case-insensitively, since Jira reports one status under two casings across endpoints, and no name or alias may be claimed by two entries.

`boardFeatures` maps a feature key to `ENABLED` or `DISABLED`. Jira also reports `COMING_SOON`, which a spec may not request. `projectKey`, `site`, and `email` are optional, and each is the last source in its resolution chain.

Jira locks some features, such as one belonging to a product that the site does not have. A write against a locked feature returns `200` and changes nothing, so a spec naming one is reported rather than written: The plan lists it under `lockedFeatures`, the verification report marks it `locked`, and the report's `matches` verdict leaves it out. Without that, the toggle would be re-planned on every run and the project would never match.

A spec covers the statuses that it manages rather than the whole project: A live status claimed by no entry is reported and left untouched.

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

Because the workflow write replaces the graph wholesale, `buildWorkflowUpdatePayload` runs `assertGraphPreserved` before returning. That refuses a payload that would drop a status, drop a transition, or leave a status with no transition into it: None of the three fails loudly at Jira, and each leaves work items in a state out of which nothing can move them. A status that already had no transition is passed over, since that is not the write's doing.

`assertGraphPreserved` is exported as well, for a payload composed some other way.

### The API functions

Each takes the transport as its first argument and constructs none of its own. A response outside 2xx throws `JiraRequestError`, and a 2xx response that a reader cannot read throws `JiraResponseError`; ["Errors"](#errors) lists the fields of both. Findings are returned rather than printed.

| Function                                              | Reads or writes                                                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `readProjectConfiguration(request, projectKey)`       | The project, board, issue types, workflow, and board features, as the `ProjectConfiguration` taken by the planner         |
| `applyWorkflowUpdate(request, configuration, plan)`   | The reconciled graph, then the statuses back, correcting through the status API any that the workflow write did not apply |
| `applyBoardFeatures(request, configuration, plan)`    | One call per board-feature toggle in the plan                                                                             |
| `listIssueKeys(request, jql)`                         | Every work-item key matched by a JQL query, following the search's page token                                             |
| `listIssueSummaries(request, { jql, limit })`         | Up to `limit` work items matched by a JQL query, each as its key, status name, and summary                                |
| `moveIssuesToBacklog(request, boardId, keys)`         | Work items off the board and into the backlog, in batches of 50                                                           |
| `readBoardColumnReport(request, configuration, spec)` | The board's columns, reporting coverage and order                                                                         |
| `buildVerificationReport(configuration, spec)`        | Nothing: It compares a configuration already read against the spec                                                        |

`requestOk` is exported too, for a call that this package does not wrap.

```ts
import {
  applyBoardFeatures,
  applyWorkflowUpdate,
  buildReconciliationPlan,
  buildVerificationReport,
  readProjectConfiguration,
} from '@williamthorsen/toolbelt.atlassian/candidate';

const configuration = await readProjectConfiguration(request, 'PROJ');
const plan = buildReconciliationPlan(spec, configuration);

await applyWorkflowUpdate(request, configuration, plan);
await applyBoardFeatures(request, configuration, plan);

// The run reports what the server stores, not what it sent.
const report = buildVerificationReport(await readProjectConfiguration(request, 'PROJ'), spec);
```

### What the read refuses

`readProjectConfiguration` fails closed. Each of these throws rather than reconciling part of a project, a refusal of the project as a plain `Error` and an unreadable response as `JiraResponseError`:

- **A project that is not team-managed.** A status renamed in a company-managed project is renamed in every project on the site that uses it. A project reporting no style, or one that this does not recognize, is refused alongside a company-managed one: A project that it cannot classify is not one to write to.
- **A project that does not resolve to a single board of its own.** The board-feature, column, and backlog calls are board-scoped. The board query returns every board whose filter references the project, so a board owned by another project can come back alongside it; when several come back, the project's own board is the one whose location names the project, and an ambiguous set is refused.
- **A project whose issue types resolve to other than exactly one workflow.** Because every issue type is passed into the workflow read, a project running its issue types on several workflows is refused rather than having one of them reconciled and reported green.
- **A response that it cannot read.** A missing field is a refusal, not a default.

### Board columns

`readProjectConfiguration` returns the `toggleLocked` flag that Jira reports per feature, which lets `buildReconciliationPlan` leave a locked toggle unplanned rather than issuing a write that silently does nothing.

Board columns cannot be set through the public API. `readBoardColumnReport` reports the gap: which spec statuses map to no column, whose work items are then absent from the board and the backlog alike, and the column order when it differs from the spec's. Both are fixed by dragging in the board settings.
