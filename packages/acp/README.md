<!-- readme-type: library -->

# @williamthorsen/toolbelt.acp

An Agent Client Protocol client that runs an app's prompts on agent harnesses such as Claude Code and the Antigravity CLI.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.acp
```

Requires Node.js 24 or later.

## Usage

```ts
import { runPrompt } from '@williamthorsen/toolbelt.acp/proposed';

for await (const event of runPrompt({ agent: { command: 'agy', args: ['acp'] }, cwd: process.cwd(), prompt: 'Hello' })) {
  console.log(event);
}
```

`runPrompt` starts the agent command, connects to it through ACP v1, and yields each `update` that the agent sends during the turn, then one `stopped` event that contains the stop reason and, when the agent reports them, token usage and cost. Optional `instructions` reach the agent as a system prompt when it supports one, and ahead of the prompt otherwise. An `AbortSignal` cancels the run. The doc comments of `runPrompt` and its types state the details.

For now the client refuses every permission request ([#633](https://github.com/williamthorsen/toolbelt/issues/633)), gives the agent no tools of its own ([#634](https://github.com/williamthorsen/toolbelt/issues/634)), and leaves the command for each harness to the caller ([#635](https://github.com/williamthorsen/toolbelt/issues/635)).
