import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { FakeAgentConfig } from '../../test-utils/createFakeAgent.ts';
import {
  createGreetingToolServer,
  GREETING_TEXT,
  GREETING_TOOL_NAME,
} from '../../test-utils/createGreetingToolServer.ts';
import type { RunPromptOptions } from '../../types/run.ts';
import { runPrompt } from '../runPrompt.ts';

const FAKE_AGENT_PATH = fileURLToPath(new URL('../../test-utils/runFakeAgentProcess.ts', import.meta.url));

describe(runPrompt, () => {
  it('runs a prompt on the agent process and reports its updates and stop', async () => {
    const events = await Array.fromAsync(
      runPrompt(
        buildOptions({ updates: [{ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'hi' } }] }),
      ),
    );

    expect(events).toStrictEqual([
      { type: 'update', update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'hi' } } },
      { type: 'stopped', stopReason: 'end_turn' },
    ]);
  });

  it('serves the tools through the stdio bridge to an agent that advertises no MCP transport', async () => {
    const options = buildOptions({ callTool: { name: GREETING_TOOL_NAME } });

    const events = await Array.fromAsync(
      runPrompt({ ...options, tools: { name: 'app', createServer: createGreetingToolServer() } }),
    );

    expect(events).toStrictEqual([
      {
        type: 'update',
        update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: GREETING_TEXT } },
      },
      { type: 'stopped', stopReason: 'end_turn' },
    ]);
  });

  it('rejects with the end of stderr when the agent exits before the handshake', async () => {
    const options = buildOptions({ exitBeforeInitialize: { stderr: 'not signed in', code: 3 } });

    await expect(Array.fromAsync(runPrompt(options))).rejects.toThrow(
      expect.objectContaining({ name: 'AgentRunError', exitCode: 3, stderrTail: 'not signed in' }),
    );
  });

  it('rejects naming the command when it cannot be started', async () => {
    const options: RunPromptOptions = { agent: { command: 'no-such-agent-command' }, cwd: tmpdir(), prompt: 'x' };

    await expect(Array.fromAsync(runPrompt(options))).rejects.toThrow(
      expect.objectContaining({ command: 'no-such-agent-command', cause: expect.objectContaining({ code: 'ENOENT' }) }),
    );
  });

  it('stops the agent process when the consumer stops iterating', async () => {
    const pidFile = path.join(mkdtempSync(path.join(tmpdir(), 'acp-run-')), 'pid');
    const options = buildOptions({
      pidFile,
      updates: [{ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'hi' } }],
      holdUntilCancel: true,
    });

    for await (const _event of runPrompt(options)) break;

    const pid = Number(readFileSync(pidFile, 'utf8'));
    expect(() => process.kill(pid, 0)).toThrow(expect.objectContaining({ code: 'ESRCH' }));
  });

  it("rejects with the signal's reason itself, and stops the agent, when the signal aborts during the handshake", async () => {
    const pidFile = path.join(mkdtempSync(path.join(tmpdir(), 'acp-run-')), 'pid');
    const controller = new AbortController();
    const reason = new Error('stop');
    await using run = runPrompt({ ...buildOptions({ pidFile, holdInitialize: true }), signal: controller.signal });

    const first = run.next();
    const pid = await readPidWhenWritten(pidFile);
    controller.abort(reason);

    await expect(first).rejects.toBe(reason);
    expect(() => process.kill(pid, 0)).toThrow(expect.objectContaining({ code: 'ESRCH' }));
  });

  it('rejects without starting the agent when the signal is already aborted', async () => {
    const pidFile = path.join(mkdtempSync(path.join(tmpdir(), 'acp-run-')), 'pid');
    const options = { ...buildOptions({ pidFile }), signal: AbortSignal.abort(new Error('stop')) };

    await expect(Array.fromAsync(runPrompt(options))).rejects.toThrow('stop');
    expect(() => readFileSync(pidFile)).toThrow(expect.objectContaining({ code: 'ENOENT' }));
  });
});

// region | Helpers
/** Builds options that run the fake agent process with `config`. */
function buildOptions(config: FakeAgentConfig): RunPromptOptions {
  return {
    agent: {
      command: process.execPath,
      args: [FAKE_AGENT_PATH],
      env: { FAKE_AGENT_CONFIG: JSON.stringify(config) },
    },
    cwd: tmpdir(),
    prompt: 'hello',
  };
}

/** Polls for the pid that the fake agent process writes once it starts. */
async function readPidWhenWritten(pidFile: string): Promise<number> {
  for (;;) {
    if (existsSync(pidFile)) {
      const content = readFileSync(pidFile, 'utf8');
      if (content !== '') return Number(content);
    }
    // eslint-disable-next-line sky-pilot/no-real-time-sleep -- the pid file is written by another process, which fake timers do not reach.
    await delay(10);
  }
}
// endregion | Helpers
