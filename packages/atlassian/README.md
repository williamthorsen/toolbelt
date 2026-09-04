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
