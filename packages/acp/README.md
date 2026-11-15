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
import { claudeCodeProfile, runPrompt } from '@williamthorsen/toolbelt.acp/proposed';

for await (const event of runPrompt({ agent: claudeCodeProfile(), cwd: process.cwd(), prompt: 'Hello' })) {
  console.log(event);
}
```

`runPrompt` starts the agent that the profile names, connects to it through ACP v1, and yields each `update` that the agent sends during the turn, then one `stopped` event that contains the stop reason and, when the agent reports them, token usage and cost. Optional `instructions` reach the agent as a system prompt when it supports one, and ahead of the prompt otherwise. An `AbortSignal` cancels the run. A failed run rejects with an `AgentRunError`, which records the command, how the agent exited, and the end of its stderr. The doc comments of `runPrompt` and its types state the details.

### Profiles

A profile names the command that starts a harness, how it signs in, the mode in which its session asks before running a tool, and the options that keep the user's own configuration out of the session:

| Profile              | Harness         | Command on `PATH`                                                                     | Signs in with                   | Cannot isolate                                               |
| -------------------- | --------------- | ------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------ |
| `claudeCodeProfile`  | Claude Code     | `claude-agent-acp`, from `npm install --global @agentclientprotocol/claude-agent-acp` | The `claude` CLI's login        | The account's own slash commands                             |
| `antigravityProfile` | Antigravity CLI | `agy`                                                                                 | The CLI's personal Google login | Its built-in tools and commands, whose file reads do not ask |
| `codexProfile`       | Codex           | `codex-acp`, from `npm install --global @agentclientprotocol/codex-acp`               | A ChatGPT login or API key      | Unverified: The profile has not been run                     |

Each factory takes an optional `command`, for a harness installed elsewhere; the doc comment of each states its other options and what its session loads. A profile is a plain `AgentProfile`, so an app can also write its own. On Windows, an npm-installed harness is a `.cmd` shim, which `runPrompt` cannot start, because it spawns the command without a shell; name the executable that the shim runs instead.

Claude's adapter fails the run of a harness that is not signed in with an `AgentRunError` whose `cause` has code `-32000`, as the doc comment of `AgentRunError` states. How Antigravity and Codex fail when not signed in has not been observed.

### Permissions

```ts
runPrompt({
  agent: antigravityProfile(),
  cwd: process.cwd(),
  prompt: 'Tidy the notes',
  permissionPolicy: ({ toolCall }) => (toolCall.kind === 'read' ? 'allow' : undefined),
});
```

A profile's `permissionModeId` names the session mode in which the harness asks before it runs a tool, and `runPrompt` sets it before sending the prompt; each built-in profile sets one. A profile without one leaves the session in the mode that the harness chose, which can be a mode of the user's own settings that runs tools without asking. `permissionPolicy` answers each request that the agent then makes: `'allow'` grants it once, and a request that the policy does not cover is refused, as is every request when there is no policy. A policy may be async, to ask the app's user. The doc comment of `PermissionPolicy` states the rest.

### Tools

```ts
import { McpServer } from '@modelcontextprotocol/server';

runPrompt({
  agent: claudeCodeProfile(),
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

The agent runs the bridge from the package's own files, so an app that bundles its server code leaves `@williamthorsen/toolbelt.acp` external to the bundle; with a bundled copy, a run that needs the bridge fails before its session opens. The doc comment of `runPrompt` states the rest.
