import { homedir } from 'node:os';
import path from 'node:path';

import type { RequestPermissionRequest, ToolCallUpdate } from '@agentclientprotocol/sdk/unstable';
import { describe, expect, it } from 'vitest';

import { antigravityProfile } from '../antigravityProfile.ts';
import { claudeCodeProfile } from '../claudeCodeProfile.ts';
import { codexProfile } from '../codexProfile.ts';

describe(claudeCodeProfile, () => {
  it('starts the adapter on PATH in the asking mode, without the user settings or built-in tools', () => {
    expect(claudeCodeProfile()).toStrictEqual({
      command: 'claude-agent-acp',
      permissionModeId: 'default',
      sessionMeta: { claudeCode: { options: { settingSources: [], tools: [], strictMcpConfig: true } } },
      isToolServerCall: expect.any(Function),
    });
  });

  it('takes the command and the model', () => {
    const profile = claudeCodeProfile({ command: '/opt/bin/claude-agent-acp', model: 'sonnet' });

    expect(profile.command).toBe('/opt/bin/claude-agent-acp');
    expect(profile.sessionMeta).toStrictEqual({
      claudeCode: { options: { settingSources: [], tools: [], strictMcpConfig: true, model: 'sonnet' } },
    });
  });

  it("identifies a call of a tool on the named server by the server's name in the tool call's metadata", () => {
    const { isToolServerCall } = claudeCodeProfile();

    expect(isToolServerCall?.(buildClaudeRequest({ mcpServer: { name: 'app' } }), 'app')).toBe(true);
  });

  it.for([
    { title: 'another server', meta: { claudeCode: { mcpServer: { name: 'notes' } } } },
    { title: 'a server whose name extends the given one', meta: { claudeCode: { mcpServer: { name: 'app_extra' } } } },
    { title: 'a built-in tool', meta: { claudeCode: { toolName: 'Bash' } } },
    { title: 'a non-string server name', meta: { claudeCode: { mcpServer: { name: 7 } } } },
    { title: 'malformed metadata', meta: { claudeCode: 'app' } },
    { title: 'no metadata', meta: undefined },
  ])('does not identify a call of $title as a call on the named server', ({ meta }) => {
    const { isToolServerCall } = claudeCodeProfile();

    expect(
      isToolServerCall?.(buildRequest({ toolCallId: 'call-1', ...(meta !== undefined && { _meta: meta }) }), 'app'),
    ).toBe(false);
  });
});

describe(antigravityProfile, () => {
  it('starts agy on PATH with a configuration directory of its own, signed in personally, in the asking mode', () => {
    expect(antigravityProfile()).toStrictEqual({
      command: 'agy',
      args: ['acp', '--gemini-dir', path.join(homedir(), '.cache', 'toolbelt.acp', 'antigravity')],
      authMethodId: 'oauth-personal',
      permissionModeId: 'default',
      isToolServerCall: expect.any(Function),
    });
  });

  it('identifies a call of a tool on the named server by its title', () => {
    const { isToolServerCall } = antigravityProfile();

    expect(isToolServerCall?.(buildAntigravityRequest('Run mcp_app_greet', 'mcp_app_greet'), 'app')).toBe(true);
  });

  it.for([
    { title: 'another server', toolTitle: 'Run mcp_notes_list', name: 'mcp_notes_list' },
    { title: 'a shell command', toolTitle: 'find . -name "*app*"', name: 'run_command' },
    { title: 'a title holding only the prefix', toolTitle: 'Run mcp_app_', name: 'mcp_app_' },
    { title: 'a title without the run verb', toolTitle: 'mcp_app_greet', name: 'mcp_app_greet' },
  ])('does not identify a call titled for $title as a call on the named server', ({ toolTitle, name }) => {
    const { isToolServerCall } = antigravityProfile();

    expect(isToolServerCall?.(buildAntigravityRequest(toolTitle, name), 'app')).toBe(false);
  });

  it('does not identify an untitled call as a call on the named server', () => {
    const { isToolServerCall } = antigravityProfile();

    expect(isToolServerCall?.(buildRequest({ toolCallId: 'call-1' }), 'app')).toBe(false);
  });

  it('takes the command and the configuration directory', () => {
    const profile = antigravityProfile({ command: '/opt/bin/agy', geminiDir: '/var/app/gemini' });

    expect(profile.command).toBe('/opt/bin/agy');
    expect(profile.args).toStrictEqual(['acp', '--gemini-dir', '/var/app/gemini']);
  });
});

describe(codexProfile, () => {
  it('starts the adapter on PATH in the read-only mode', () => {
    expect(codexProfile()).toStrictEqual({ command: 'codex-acp', permissionModeId: 'read-only' });
  });

  it('cannot identify a call of a tool on an MCP server', () => {
    expect(codexProfile()).not.toHaveProperty('isToolServerCall');
  });

  it('takes the command', () => {
    expect(codexProfile({ command: '/opt/bin/codex-acp' }).command).toBe('/opt/bin/codex-acp');
  });
});

// region | Helpers
/** Builds the request that Antigravity raised for a call titled `title`, as a probe of the CLI recorded it. */
function buildAntigravityRequest(title: string, name: string): RequestPermissionRequest {
  // Antigravity also sends `name`, which the ACP schema does not define.
  const toolCall = { toolCallId: 'call-1', kind: 'other' as const, status: 'pending' as const, title, name };
  return buildRequest(toolCall);
}

/** Builds a request whose tool call has `claudeCode` metadata, as Claude's adapter sends it. */
function buildClaudeRequest(claudeCode: Record<string, unknown>): RequestPermissionRequest {
  return buildRequest({ toolCallId: 'call-1', title: 'mcp__app__greet', _meta: { claudeCode } });
}

/** Builds a permission request for `toolCall` that offers an allow-once and a reject-once option. */
function buildRequest(toolCall: ToolCallUpdate): RequestPermissionRequest {
  return {
    sessionId: 'session-1',
    toolCall,
    options: [
      { optionId: 'allow', name: 'Allow', kind: 'allow_once' },
      { optionId: 'deny', name: 'Deny', kind: 'reject_once' },
    ],
  };
}
// endregion | Helpers
