<!-- readme-type: library -->

# @williamthorsen/toolbelt.acp

An Agent Client Protocol client that runs an app's prompts on agent harnesses such as Claude Code and the Antigravity CLI.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.acp @modelcontextprotocol/server
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

### Tools

```ts
import { McpServer } from '@modelcontextprotocol/server';

runPrompt({
  agent: { command: 'agy', args: ['acp'] },
  cwd: process.cwd(),
  prompt: 'List my notes',
  tools: {
    name: 'notes',
    createServer: () => {
      const server = new McpServer({ name: 'notes', version: '1.0.0' });
      server.registerTool('list_notes', { description: 'Lists the notes.' }, () => ({
        content: [{ type: 'text', text: 'groceries, travel' }],
      }));
      return server;
    },
  },
});
```

`tools` gives the agent an app's MCP server for the run. `createServer` returns a fresh `McpServer` from `@modelcontextprotocol/server`, a peer dependency, for each request, and `name` is the server's name in the session. The client serves it over the first transport that the agent advertises, so the harness needs no setup:

- **ACP**: over the ACP connection itself.
- **HTTP**: from an endpoint on `127.0.0.1` in the client's process, which answers only the run's bearer token.
- **stdio**, which every agent accepts: through a bridge module that the agent runs with the client's Node, which forwards to that endpoint.

The doc comment of `runPrompt` states the rest.

For now the client leaves the command for each harness to the caller ([#635](https://github.com/williamthorsen/toolbelt/issues/635)).
