import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { FakeAgentConfig } from '../../test-utils/createFakeAgent.ts';
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

  it('rejects with the end of stderr when the agent exits before the handshake', async () => {
    const options = buildOptions({ exitBeforeInitialize: { stderr: 'not signed in', code: 3 } });

    await expect(Array.fromAsync(runPrompt(options))).rejects.toThrow(/exited 3[\s\S]*not signed in/);
  });

  it('rejects naming the command when it cannot be started', async () => {
    const options: RunPromptOptions = { agent: { command: 'no-such-agent-command' }, cwd: tmpdir(), prompt: 'x' };

    await expect(Array.fromAsync(runPrompt(options))).rejects.toThrow(/`no-such-agent-command` failed.*ENOENT/);
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

  it('rejects without starting the agent when the signal is already aborted', async () => {
    const pidFile = path.join(mkdtempSync(path.join(tmpdir(), 'acp-run-')), 'pid');
    const options = { ...buildOptions({ pidFile }), signal: AbortSignal.abort(new Error('stop')) };

    await expect(Array.fromAsync(runPrompt(options))).rejects.toThrow('stop');
    expect(() => readFileSync(pidFile)).toThrow(expect.objectContaining({ code: 'ENOENT' }));
  });
});

// region | Helpers
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
// endregion | Helpers
