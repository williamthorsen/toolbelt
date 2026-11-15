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

`runPrompt` starts the agent command, connects to it through ACP v1, and yields each `update` that the agent sends during the turn, then one `stopped` event that contains the stop reason and, when the agent reports them, token usage and cost. Optional `instructions` reach the agent as a system prompt when it supports one, and ahead of the prompt otherwise. An `AbortSignal` cancels the run. A failed run rejects with an `AgentRunError`, which records the command, how the agent exited, and the end of its stderr. The doc comments of `runPrompt` and its types state the details.

### Permissions

```ts
runPrompt({
  agent: { command: 'agy', args: ['acp'], permissionModeId: 'default' },
  cwd: process.cwd(),
  prompt: 'Tidy the notes',
  permissionPolicy: ({ toolCall }) => (toolCall.kind === 'read' ? 'allow' : undefined),
});
```

`permissionModeId` names the session mode in which the harness asks before it runs a tool, and `runPrompt` sets it before sending the prompt. A profile without one leaves the session in the mode that the harness chose, which can be a mode of the user's own settings that runs tools without asking. `permissionPolicy` answers each request that the agent then makes: `'allow'` grants it once, and a request that the policy does not cover is refused, as is every request when there is no policy. A policy may be async, to ask the app's user. The doc comment of `PermissionPolicy` states the rest.

For now the client does not give the agent any tools of its own ([#634](https://github.com/williamthorsen/toolbelt/issues/634)) and leaves the command for each harness to the caller ([#635](https://github.com/williamthorsen/toolbelt/issues/635)).
