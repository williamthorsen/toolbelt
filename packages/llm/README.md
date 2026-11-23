<!-- readme-type: library -->

# @williamthorsen/toolbelt.llm

Runs an LLM job in the page or at an operator's endpoint, on a credential of the user's or the operator's.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.llm
```

Requires Node.js 24 or later, or a browser. `zod` is a peer dependency, which npm and pnpm install automatically.

## Usage

```ts
import { defineTool, runJob } from '@williamthorsen/toolbelt.llm/proposed';
import { z } from 'zod';

let greeting: string | undefined;
const outcome = await runJob(
  {
    instructions: 'Greet the person named in the input by calling `submit`.',
    input: 'Ada',
    maxRounds: 3,
    readResult: () => greeting,
    tools: {
      submit: defineTool({
        description: 'Submits the greeting.',
        inputSchema: z.object({ greeting: z.string() }),
        execute: (input) => {
          greeting = input.greeting;
          return 'Submitted.';
        },
      }),
    },
  },
  { provider: 'anthropic', model: 'claude-haiku-5-5', apiKey: userKey },
);
```

The API is in the `proposed` tier and may change.

## Why

An app defines what a job needs, and `runJob` runs the model loop: It sends the instructions and the input, executes the tools that the model calls, and stops when the job has its result. The app never imports the Vercel AI SDK, on which the package is built, so an SDK upgrade stays inside the package, and an app that calls the SDK directly writes and maintains that loop itself.

## The job

A `Job` holds the instructions, the input, the tools, a round cap (`maxRounds`, the most model requests that a run makes), and `readResult()`, which returns the result once the tools have produced one. The runner calls `readResult()` after each round and stops as soon as it returns a value. An optional `maxOutputTokens` caps the output tokens of all the job's rounds together: The runner limits each round to what remains of it.

A tool's `inputSchema` is any schema that implements both [Standard Schema](https://standardschema.dev) and Standard JSON Schema, such as a zod 4 schema. `defineTool` types a tool's `execute` input from its schema. The runner validates the model's input against it before `execute`, and returns invalid input to the model to correct. A tool reports an expected failure in its output; a tool that throws ends the run.

Build a fresh job for each run, such as through a `createJob(input)` factory, so that the tools' state does not carry over.

## The provider connection

A `ProviderConnection` names the provider (`anthropic`, `google`, `openai`, or `openrouter`), the model, the credential, and optional `headers`. The request goes straight from wherever `runJob` runs to the provider, so a user's key never reaches the operator's server. An Anthropic connection takes `apiKey` or `authToken`, a bearer token such as the `ant` CLI login's; the doc comment of `AnthropicConnection` lists the headers that the runner adds.

On an Anthropic connection, the runner marks the instructions and the end of the conversation for prompt caching, so that each round reads the input and the earlier rounds from the cache rather than paying the full input rate for them again. A request to any other provider does not include cache marks. A job's `Usage` reports, in `cacheReadTokens` and `cacheWriteTokens`, how many of its input tokens were read from the cache and written to it.

## User connections

A user supplies a credential in either of two ways, and `runJob` runs on it once the app adds a model: `runJob(job, { ...credential, model })`.

- **Pasted key:** The app builds `{ provider, apiKey }` from a key that the user pastes for Anthropic, Google, OpenAI, or OpenRouter.
- **OpenRouter connect:** `startOpenRouterConnect` returns the URL of OpenRouter's approval page, and `completeOpenRouterConnect` returns the credential on the page to which OpenRouter returns the user:

```ts
import { completeOpenRouterConnect, startOpenRouterConnect } from '@williamthorsen/toolbelt.llm/proposed';

async function connect(): Promise<void> {
  const url = await startOpenRouterConnect({ callbackUrl: location.href, limit: 5, expiration: '30-days' });
  location.assign(url);
}

// On every load of the callback page:
const credential = await completeOpenRouterConnect(location.href);
if (credential !== undefined) history.replaceState(null, '', location.pathname);
```

Each approval issues a new key on the user's OpenRouter account, which stays valid until it expires or the user revokes it, so offer `limit` and `expiration`. The user can change both on OpenRouter's form.

`createCredentialStore` keeps one credential per app. A credential saved without `remember` is kept in `sessionStorage` and is gone when the tab closes; a remembered one is kept in `localStorage` until `forget`. The key goes from the page straight to the provider, so the operator's server never sees it, but any script on the page, and any browser extension with access to it, can read it. Load no third-party scripts on such a page, and restrict where it can send a key with a Content Security Policy:

```
connect-src 'self' https://api.anthropic.com https://api.openai.com https://generativelanguage.googleapis.com https://openrouter.ai
```

## Events

`onEvent` receives a `text-delta`, `tool-call`, `tool-result`, `tool-error`, or `round-finished` event as each happens. Each `tool-call` is followed by its `tool-result` or its `tool-error`, and `round-finished` carries the round's token usage.

## Outcomes

`runJob` resolves with `completed` and the result, or with `unfinished` and its reason: `token-cap` when the job's output reached `maxOutputTokens` before the model stopped on its own, `round-cap` when the job reached `maxRounds` with the model still calling tools, or `stopped` when the model stopped calling tools first. Both report the rounds and the total usage, and both events and outcomes survive `JSON.stringify`.

Aborting the `signal` rejects with the signal's reason. Any other failure, the provider's or a tool's, rejects with `JobRunError`, whose `cause` holds the underlying error. Its `reason` tells the app what to report: `credential-refused` when the provider refused the key, with the provider's own `providerMessage`; `unreachable` when no response arrived, which is also how a browser reports a provider that refuses calls from a page; and `failed` otherwise. On an endpoint connection, a refusal rejects with `JobRefusedError`, and the endpoint withholds a failure's underlying error, as its doc comment describes.

## The handler

`createJobHandler` serves a job at the operator's endpoint, on the operator's key. It returns a fetch handler, `(Request) => Promise<Response>`, which a function on Vercel, Cloudflare Workers, or any runtime with web-standard `Request` and `Response` exports as it is:

```ts
import { createJobHandler } from '@williamthorsen/toolbelt.llm/proposed';

export const POST = createJobHandler({
  createJob,
  connection: { provider: 'anthropic', model: 'claude-haiku-5-5', apiKey: operatorKey },
  maxInputLength: 10_000,
  maxRounds: 6,
  onError: (error) => console.error(error),
});
```

The handler accepts only the job's input, so a caller can obtain the job's result and nothing else from the operator's key. It caps the input at `maxInputLength` and each job's rounds at the lower of `maxRounds` and the job's own, and calls the optional `checkBot`, `countJob`, and `reserveJob`, in that order, before the first model request to keep out bots and enforce the operator's limits. It refuses a request with a JSON body that names the reason, which `runJob` reports as `JobRefusedError`; the doc comment of `createJobHandler` lists the statuses. A failure reaches the page without its details, which go to `onError`. The handler adds no CORS headers, so a page on another origin needs the function to add them.

## The guards

An endpoint open to anyone spends the operator's key for anyone. Two optional factories build the handler's guards, and both refuse a job when their service fails or does not answer within 5 seconds:

```ts
import {
  createJobHandler,
  createTurnstileVerifier,
  createUpstashJobCounter,
} from '@williamthorsen/toolbelt.llm/proposed';

export const POST = createJobHandler({
  createJob,
  connection,
  maxInputLength: 10_000,
  checkBot: createTurnstileVerifier({ secretKey: process.env.TURNSTILE_SECRET_KEY ?? '' }),
  countJob: createUpstashJobCounter({
    url: process.env.UPSTASH_REDIS_REST_URL ?? '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
    readCallerIp: (request) => request.headers.get('x-real-ip') ?? undefined,
    perIpLimit: 5,
    globalDailyLimit: 200,
  }),
});
```

`createTurnstileVerifier` verifies a Cloudflare Turnstile token, read from the `cf-turnstile-response` header unless `header` names another, and can require the hostname and action for which the token was issued. A token is valid once, so the page gets a fresh one from the widget for each job and passes it in the `EndpointConnection`'s `headers`.

`createUpstashJobCounter` counts each job in Upstash Redis against `perIpLimit` and, when it is set, `globalDailyLimit` over the UTC day, under keys that start with `keyPrefix` (`llm-jobs` by default). A refusal names the limit that applied, `per-ip-daily` or `global-daily`, in `JobRefusedError`'s `limit`. Without `globalDailyLimit`, the counter limits jobs per IP alone and does not keep a site-wide count, for a site that bounds its spend with `reserveJob` instead. `readCallerIp` reads the caller's IP from a header that the host sets: `x-real-ip` on Vercel, `cf-connecting-ip` on Cloudflare. Do not read `x-forwarded-for`, which a client can set on some hosts to escape the per-IP limit.

`reserveJob` bounds what jobs cost. It reserves a job's budget, such as from a [`@williamthorsen/tank`](https://github.com/williamthorsen/showroom/tree/main/packages/tank#readme) balance, and either refuses the job, as `countJob` does, or grants it with a `maxOutputTokens`, which lowers the job's own cap, and a `settle` callback:

```ts
import { createTank } from '@williamthorsen/tank';

const MAX_OUTPUT_TOKENS = 4_000;
const tank = createTank({ config, store, key: 'free-jobs' });

export const POST = createJobHandler({
  createJob,
  connection,
  maxInputLength: 10_000,
  maxRounds: 6,
  reserveJob: async () => {
    const reserved = await tank.reserve(priceWorstCase(MAX_OUTPUT_TOKENS));
    if (!reserved.ok) return { allowed: false, limit: 'site-budget' };
    return {
      allowed: true,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      settle: async ({ status, usage }) => {
        // A failed or cancelled job's usage misses the round in flight, so its reservation stays charged in full.
        if (status === 'completed' || status === 'unfinished') await reserved.reservation.settle(price(usage));
      },
    };
  },
});
```

The handler calls `settle` exactly once, with the job's `status` (`completed`, `unfinished`, `failed`, or `cancelled`) and the `usage` of every round that reported one, and awaits it before it ends the response. A `failed` or `cancelled` job's usage excludes the round in flight, whose usage the provider never reported. A throw from `settle` goes to `onError`.

The reservation caps the job's output, not its input, so the amount reserved covers the worst-case input as well. Each round sends the instructions and tool definitions, the input, and everything that earlier rounds produced, so a job's input over all its rounds is at most `maxRounds` × (instructions and tool definitions + input + `maxOutputTokens` + the tools' total output) tokens. The job's own code bounds each term.

`checkBot` and `countJob` bound who runs jobs, not what a job costs, and a reservation bounds cost only as well as the site prices it. Run the endpoint on a dedicated provider workspace with a monthly spend limit, on prepaid credits with auto-reload off, so that the provider stops the spending when the guards do not.

## The endpoint connection

An `EndpointConnection` names the handler's `url` and optional `headers`, such as a bot-check token. `runJob` then posts the job's input and reports the endpoint's events and outcome as described above, so the page runs the same job definition on either connection. Aborting the `signal` stops the job at the endpoint.
