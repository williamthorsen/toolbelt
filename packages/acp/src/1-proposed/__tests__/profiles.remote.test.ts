import { constants } from 'node:fs';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createGreetingToolServer,
  GREETING_TEXT,
  GREETING_TOOL_NAME,
} from '../../test-utils/createGreetingToolServer.ts';
import type { AgentProfile, PermissionPolicy, RunEvent } from '../../types/run.ts';
import { antigravityProfile } from '../antigravityProfile.ts';
import { claudeCodeProfile } from '../claudeCodeProfile.ts';
import { runPrompt } from '../runPrompt.ts';

const TOOL_SERVER_NAME = 'app';

const PROMPT = `Call the ${GREETING_TOOL_NAME} tool, then reply with exactly the text that it returned.`;

const RUN_TIMEOUT_MS = 180_000;

/**
 * An isolated Claude turn measured about 3,100 total tokens with adapter 0.107.0, and one that loaded the user's
 * configuration about 47,000.
 */
const CLAUDE_TOKEN_CEILING = 15_000;

// The adapter is run through npx, pinned, because it signs in with the `claude` CLI's login and is not
// otherwise installed.
const CLAUDE_ADAPTER_ARGS = ['--yes', '@agentclientprotocol/claude-agent-acp@0.107.0'];

describe.skipIf(!(await isOnPath('claude')))(claudeCodeProfile, () => {
  it(
    "calls the app's tool, and only the app's tools, within the isolated token budget",
    async () => {
      await using scratch = await createScratchDirectory();

      const events = await runGreeting(
        { ...claudeCodeProfile(), command: 'npx', args: CLAUDE_ADAPTER_ARGS },
        scratch.path,
      );

      expect(readReply(events)).toContain(GREETING_TEXT);
      const toolNames = listToolCalls(events).map((update) => readClaudeToolName(update));
      expect(toolNames).toContain(`mcp__${TOOL_SERVER_NAME}__${GREETING_TOOL_NAME}`);
      expect(toolNames.every((name) => name?.startsWith(`mcp__${TOOL_SERVER_NAME}__`))).toBe(true);
      const stop = events.at(-1);
      expect(stop?.type === 'stopped' ? stop.usage?.totalTokens : undefined).toBeLessThan(CLAUDE_TOKEN_CEILING);
    },
    RUN_TIMEOUT_MS,
  );
});

describe.skipIf(!(await isOnPath('agy')))(antigravityProfile, () => {
  it(
    "completes a call to the app's tool with its configuration read from a directory of its own",
    async () => {
      await using scratch = await createScratchDirectory();
      const geminiDir = path.join(scratch.path, 'gemini');

      const events = await runGreeting(antigravityProfile({ geminiDir }), scratch.path);

      // The model does not always repeat the tool's result, so the completed call is the evidence.
      expect(listCompletedToolTitles(events)).toContain(`Run mcp_${TOOL_SERVER_NAME}_${GREETING_TOOL_NAME}`);
      // The CLI creates the directory and reads its configuration from there.
      await expect(access(path.join(geminiDir, 'config'))).resolves.toBeUndefined();
    },
    RUN_TIMEOUT_MS,
  );
});

// region | Helpers
/** Creates a scratch directory, removed when the returned handle is disposed. */
async function createScratchDirectory(): Promise<AsyncDisposable & { readonly path: string }> {
  const directory = await mkdtemp(path.join(tmpdir(), 'toolbelt-acp-remote-'));
  return {
    path: directory,
    async [Symbol.asyncDispose]() {
      await rm(directory, { recursive: true, force: true });
    },
  };
}

/** Reports whether an executable named `command` is in a directory on `PATH`. */
async function isOnPath(command: string): Promise<boolean> {
  const directories = (process.env['PATH'] ?? '').split(path.delimiter).filter((directory) => directory !== '');
  for (const directory of directories) {
    try {
      await access(path.join(directory, command), constants.X_OK);
      return true;
    } catch {
      // Try the next directory.
    }
  }
  return false;
}

/** Lists the titles of the turn's tool calls that completed. */
function listCompletedToolTitles(events: readonly RunEvent[]): string[] {
  const titles = new Map<string, string>();
  const completed: string[] = [];
  for (const event of events) {
    if (event.type !== 'update') continue;
    const { update } = event;
    if (update.sessionUpdate !== 'tool_call' && update.sessionUpdate !== 'tool_call_update') continue;
    if (typeof update.title === 'string') titles.set(update.toolCallId, update.title);
    if (update.status === 'completed') completed.push(titles.get(update.toolCallId) ?? '');
  }
  return completed;
}

/** Lists the turn's tool-call updates. */
function listToolCalls(events: readonly RunEvent[]): unknown[] {
  return events.flatMap((event) =>
    event.type === 'update' && event.update.sessionUpdate === 'tool_call' ? [event.update] : [],
  );
}

/** Returns the tool name that Claude's adapter records in a tool call's `_meta`. */
function readClaudeToolName(update: unknown): string | undefined {
  if (typeof update !== 'object' || update === null || !('_meta' in update)) return undefined;
  const meta: unknown = update._meta;
  if (typeof meta !== 'object' || meta === null || !('claudeCode' in meta)) return undefined;
  const claudeCode: unknown = meta.claudeCode;
  if (typeof claudeCode !== 'object' || claudeCode === null || !('toolName' in claudeCode)) return undefined;
  return typeof claudeCode.toolName === 'string' ? claudeCode.toolName : undefined;
}

/** Joins the text of the agent's message chunks. */
function readReply(events: readonly RunEvent[]): string {
  return events
    .map((event) =>
      event.type === 'update' &&
      event.update.sessionUpdate === 'agent_message_chunk' &&
      event.update.content.type === 'text'
        ? event.update.content.text
        : '',
    )
    .join('');
}

/** Runs the greeting prompt on `agent` with the greeting tool, allowing only requests that name the tool. */
async function runGreeting(agent: AgentProfile, cwd: string): Promise<RunEvent[]> {
  const permissionPolicy: PermissionPolicy = ({ toolCall }) =>
    JSON.stringify(toolCall).includes(GREETING_TOOL_NAME) ? 'allow' : 'reject';
  return Array.fromAsync(
    runPrompt({
      agent,
      cwd,
      prompt: PROMPT,
      tools: { name: TOOL_SERVER_NAME, createServer: createGreetingToolServer() },
      permissionPolicy,
    }),
  );
}

// endregion | Helpers
