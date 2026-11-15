import { McpServer, type McpServerFactory } from '@modelcontextprotocol/server';

/** The name of the one tool that `createGreetingToolServer` registers. */
export const GREETING_TOOL_NAME = 'greet';

/** The text that the greeting tool returns. */
export const GREETING_TEXT = 'Hello from the app.';

/** Returns a server factory whose servers register one argument-free tool that answers `GREETING_TEXT`. */
export function createGreetingToolServer(): McpServerFactory {
  return buildGreetingServer;
}

// region | Helpers
/** Builds a server with the greeting tool registered. */
function buildGreetingServer(): McpServer {
  const server = new McpServer({ name: 'greeting-tools', version: '1.0.0' });
  server.registerTool(GREETING_TOOL_NAME, { description: 'Greets the agent.' }, () => ({
    content: [{ type: 'text', text: GREETING_TEXT }],
  }));
  return server;
}
// endregion | Helpers
