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
import { runJob } from '@williamthorsen/toolbelt.llm/proposed';
import { z } from 'zod';

let greeting: string | undefined;
const outcome = await runJob(
  {
    instructions: 'Greet the person named in the input by calling `submit`.',
    input: 'Ada',
    maxRounds: 3,
    readResult: () => greeting,
    tools: {
      submit: {
        description: 'Submits the greeting.',
        inputSchema: z.object({ greeting: z.string() }),
        execute: (input: { greeting: string }) => {
          greeting = input.greeting;
          return 'Submitted.';
        },
      },
    },
  },
  { provider: 'anthropic', model: 'claude-haiku-5-5', apiKey: userKey },
);
```

The API is in the `proposed` tier and may change.

## Why

An app defines what a job needs, and `runJob` runs the model loop: It sends the instructions and the input, executes the tools that the model calls, and stops when the job has its result. The app never imports the Vercel AI SDK, on which the package is built, so an SDK upgrade stays inside the package, and an app that calls the SDK directly writes and maintains that loop itself.

## The job

A `Job` holds the instructions, the input, the tools, a round cap (`maxRounds`, the most model requests that a run makes), and `readResult()`, which returns the result once the tools have produced one. The runner calls `readResult()` after each round and stops as soon as it returns a value.

A tool's `inputSchema` is any schema that implements both [Standard Schema](https://standardschema.dev) and Standard JSON Schema, such as a zod 4 schema. The runner validates the model's input against it before `execute`, and returns invalid input to the model to correct. A tool reports an expected failure in its output; a tool that throws ends the run.

Build a fresh job for each run, such as through a `createJob(input)` factory, so that the tools' state does not carry over.

## The provider connection

A `ProviderConnection` names the provider (`anthropic`, `google`, `openai`, or `openrouter`), the model, the credential, and optional `headers`. The request goes straight from wherever `runJob` runs to the provider, so a user's key never reaches the operator's server. An Anthropic connection takes `apiKey` or `authToken`, a bearer token such as the `ant` CLI login's; the doc comment of `AnthropicConnection` lists the headers that the runner adds.

## Events

`onEvent` receives a `text-delta`, `tool-call`, `tool-result`, `tool-error`, or `round-finished` event as each happens. Each `tool-call` is followed by its `tool-result` or its `tool-error`, and `round-finished` carries the round's token usage.

## Outcomes

`runJob` resolves with `completed` and the result, or with `unfinished` and its reason: `round-cap` when the job reached `maxRounds` with the model still calling tools, or `stopped` when the model stopped calling tools first. Both report the rounds and the total usage, and both events and outcomes survive `JSON.stringify`.

Aborting the `signal` rejects with the signal's reason. Any other failure, the provider's or a tool's, rejects with `JobRunError`, whose `cause` holds the underlying error.
