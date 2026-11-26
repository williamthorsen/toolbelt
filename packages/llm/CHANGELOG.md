# Changelog

All notable changes to this project will be documented in this file.

## 0.6.0 — 2026-11-26

### 🎉 Features

- Adds `listModels` to `@williamthorsen/toolbelt.llm/proposed`, which follows every page of the model list from Anthropic, Google, OpenAI, or OpenRouter and resolves as `listed`, `refused` when the provider does not accept the key, or `unavailable` when the list cannot be read. (#799)

## 0.5.0 — 2026-11-23

### 🎉 Features

- Adds an optional `details` value to a refused `reserveJob` result, which the handler includes in the 429 refusal body and `runJob` exposes unvalidated as `JobRefusedError.details`, and which the handler drops and reports to `onError` when it cannot be serialized. (#791)

## 0.4.1 — 2026-11-23

### ⚡ Performance

- Reduces the input cost of a multi-round `runJob` on an Anthropic connection by marking the end of the conversation and of the previous round as prompt-cache breakpoints, so that each round reads the input and the earlier rounds from the cache rather than at the full input rate. (#788)

### 📚 Documentation

- Documents in the `Usage` doc comments and the `toolbelt.llm` README that `inputTokens` counts every input token, cache reads and writes included, and in the doc comments that the uncached input is `inputTokens - cacheReadTokens - cacheWriteTokens`. (#789)

## 0.4.0 — 2026-11-22

### 🎉 Features

- Makes `globalDailyLimit` optional in `createUpstashJobCounter`, which limits jobs per IP alone and does not keep a site-wide count when the option is omitted, for a site that bounds its spend with `reserveJob` instead. (#784)

## 0.3.0 — 2026-11-22

### 🎉 Features

- Adds an optional `Job.maxOutputTokens` to `@williamthorsen/toolbelt.llm`, which caps the output tokens of all of a job's rounds together and ends a run that reaches the cap as `unfinished` with the new reason `token-cap`. (#781)
- Adds a `reserveJob` option to `createJobHandler`, which runs after `countJob` and either refuses the job with a 429 or grants it with an output-token cap and a `settle` callback that the handler calls exactly once with the job's status and usage, whether the job completes, ends unfinished, fails, or is cancelled. (#781)

## 0.2.1 — 2026-11-19

### 📦 Dependencies

- Remove the unused root devDependencies rimraf and zod (#749)

  Removes the root devDependencies `rimraf` and `zod`, which nothing at the root uses. Because `packages/llm` is now the only manifest that declares `zod`, it pins version 4.6.7 directly, and the `zod` entry is dropped from the `catalog:` block in `pnpm-workspace.yaml`.

## 0.2.0 — 2026-11-18

### 🎉 Features

- Adds `runJob` to `@williamthorsen/toolbelt.llm/proposed`, which runs a job's model loop on an Anthropic, Google, OpenAI, or OpenRouter connection, reports each text delta, tool call, tool result, tool error, and finished round to `onEvent`, and resolves with a `completed` or `unfinished` outcome or rejects with `JobRunError`. (#730)
- Adds `defineTool`, which types a tool's `execute` input from its `inputSchema`, so that an input annotation that disagrees with the schema fails to compile. (#730)
- Adds `createJobHandler`, which returns a fetch handler that accepts only a job's input, caps the input at `maxInputLength` and the rounds at `maxRounds`, calls an optional `countJob` to enforce the operator's limits, and streams the job's events and outcome while it reports failure details only to `onError`. (#731)
- Extends `runJob` to accept an `EndpointConnection`, on which it posts the job's input to the handler's `url`, reports the events and outcome that the endpoint streams, and rejects with the new `JobRefusedError` when the endpoint refuses the job. (#731)
- Adds a `checkBot` option to `createJobHandler`, which runs before `countJob` and refuses the request with 403 (`bot-check-failed`) when it returns `false` and with 503 (`bot-check-unavailable`) when it throws. (#732)
- Adds `createTurnstileVerifier`, which builds a `checkBot` function that verifies the request's token from Cloudflare Turnstile, a bot-check widget, read from the `cf-turnstile-response` header by default, and can require the hostname and action for which the token was issued. (#732)
- Adds `createUpstashJobCounter`, which builds a `countJob` function that counts each job in Upstash Redis against a per-IP limit and a global limit over the UTC day. (#732)
- Adds `startOpenRouterConnect` and `completeOpenRouterConnect`, which send a user to OpenRouter's approval page and, on the callback page, return a `UserCredential` containing the key that OpenRouter issued, which the `limit` and `expiration` options can cap. (#733)
- Adds `createCredentialStore`, which keeps one app's `UserCredential` in `sessionStorage` until the tab closes or, when saved with `remember`, in `localStorage` until `forget` removes it. (#733)
- Adds a `reason` to `JobRunError` that distinguishes a key refused by the provider (`credential-refused`, with the provider's own `providerMessage`) from a request that did not receive a response (`unreachable`) and from any other failure (`failed`). (#733)

### 🐛 Bug fixes

- Fixes the issue that `runJob` did not retry a request that a browser's `fetch` rejected with a network error, such as Chrome's "Failed to fetch", because the AI SDK retries only the "fetch failed" error that Node reports. (#733)

### 🏗️ Internal features

- Adds the empty, publishable `@williamthorsen/toolbelt.llm` package at `packages/llm` and registers it with the repo's release labels and lockfile. (#729)

<!-- Generated by release-kit. Do not edit this file. Use .meta/changelog-overrides.json to override entries. -->
