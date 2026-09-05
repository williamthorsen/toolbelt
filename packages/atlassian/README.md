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

## Usage

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

`resolveJiraBaseUrl` returns `https://api.atlassian.com/ex/jira/<cloudId>`, the gateway a scoped API token authenticates against. Where no `cloudId` is given, it is read from the site's `_edge/tenant_info` endpoint, which answers without authentication.

Requests against the site URL (`https://acme.atlassian.net`) are not offered as a fallback. Atlassian ignores a scoped token sent there rather than rejecting it, so the request would return an anonymous response instead of failing.

### The credential

Basic auth pairs an email with an API token. They resolve on separate chains, because the email is not a secret and the token is, and the email names the keychain account under which the token is stored.

`resolveJiraEmail` reads a supplied value, then `JIRA_EMAIL`.

`resolveJiraToken` reads a supplied value, then `JIRA_API_TOKEN`, then a configured shell command (`tokenCommand`), then the macOS keychain. The keychain is opened only where the earlier sources miss. Store a token with:

```sh
tb-secret set toolbelt.atlassian.jira --account you@example.com
```

The service defaults to `toolbelt.atlassian.jira`; pass `service` to read another.

### The transport

`createTokenTransport` takes the email and token as values and reads no environment variable, file, or keystore of its own. It reports every status to the caller, a 401 or 403 included, so an authentication failure is a value to branch on rather than an exception.

### The project spec

A spec declares the statuses a Jira project should hold and the board features it should have on. The consuming repo owns the file; this package ships the validator and this schema, never a spec of its own.

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

A live status no entry claims is reported and left untouched, so a spec covers the statuses it manages rather than the whole project.

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

The workflow write replaces the graph wholesale, so `buildWorkflowUpdatePayload` runs `assertGraphPreserved` before returning. That refuses a payload that would drop a status, drop a transition, or leave a status with no transition into it: none of the three fails loudly at Jira, and each leaves work items in a state nothing can move them out of. A status that already carried no transition is passed over, since that is not the write's doing.

`assertGraphPreserved` is exported as well, for a payload composed some other way.

### The API functions

Each takes the transport as its first argument and constructs none of its own. A response outside 2xx throws `JiraRequestError`, which carries the method, path, status, and the server's reply as fields, so a caller branches on the status rather than parsing a message. Findings are returned rather than printed.

| Function                                              | Reads or writes                                                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `readProjectConfiguration(request, projectKey)`       | The project, board, issue types, workflow, and board features, as the `ProjectConfiguration` the planner takes      |
| `applyWorkflowUpdate(request, configuration, plan)`   | The reconciled graph, then the statuses back, correcting through the status API any the workflow write did not take |
| `applyBoardFeatures(request, configuration, plan)`    | One call per board-feature toggle the plan holds                                                                    |
| `listIssueKeys(request, jql)`                         | Every work-item key a JQL query matches, following the search's page token                                          |
| `moveIssuesToBacklog(request, boardId, keys)`         | Work items off the board and into the backlog, in batches of 50                                                     |
| `readBoardColumnReport(request, configuration, spec)` | The board's columns, reporting coverage and order                                                                   |
| `buildVerificationReport(configuration, spec)`        | Nothing: it compares a configuration already read against the spec                                                  |

`requestOk` is exported too, for a call this package does not wrap.

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

- **A project that is not team-managed.** A status renamed in a company-managed project is renamed in every project on the site that uses it. A project reporting no style, or one this does not recognize, is refused alongside a company-managed one: a project it cannot classify is not one to write to.
- **A project that does not resolve to a single board of its own.** The board-feature, column, and backlog calls are board-scoped. The board query answers with every board whose filter references the project, so a board another project owns can come back alongside it; where several come back, the project's own board is the one whose location names the project, and an ambiguous set is refused.
- **A project whose issue types resolve to other than exactly one workflow.** Every issue type is carried into the workflow read, so a project running its issue types on several workflows is refused rather than having one of them reconciled and reported green.
- **A response it cannot read.** A missing field is a refusal, not a default.

### Board columns

Board columns cannot be set through the public API. `readBoardColumnReport` reports the gap: which spec statuses map to no column, whose work items are then absent from the board and the backlog alike, and the column order where it differs from the spec's. Both are fixed by dragging in the board settings.
