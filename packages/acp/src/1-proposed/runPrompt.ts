import { spawn } from 'node:child_process';
import { Readable, Writable } from 'node:stream';
import { setTimeout as sleep } from 'node:timers/promises';

import { ndJsonStream } from '@agentclientprotocol/sdk/unstable';

import { runAcpPrompt } from '../internal/runAcpPrompt.ts';
import type { RunEvent, RunPromptOptions } from '../types/run.ts';

const STDERR_TAIL_BYTES = 8192;
const EXIT_SETTLE_MS = 250;
const TERMINATE_GRACE_MS = 2000;

/**
 * Starts the agent that `options.agent` describes, runs one prompt on it through ACP v1, and yields the turn's
 * updates followed by a `stopped` event.
 *
 * The client authenticates with the profile's method when the agent lists it, sends `instructions` as an
 * appended system prompt when the agent supports one and ahead of the prompt otherwise, and refuses every
 * permission request. Aborting `signal` before the prompt is sent rejects with the signal's reason; aborting it
 * afterwards cancels the turn, which ends with a `cancelled` stop, or rejects with the reason when the agent does
 * not stop within 10 seconds. Any other failure rejects with an error that contains the end of the agent's
 * stderr. The agent process is stopped when the run ends, however it ends, including when the consumer stops
 * iterating.
 *
 * @category ACP
 * @stage proposed
 * @experimental
 */
export async function* runPrompt(options: RunPromptOptions): AsyncGenerator<RunEvent> {
  const { agent, signal } = options;
  signal?.throwIfAborted();

  const child = spawn(agent.command, [...(agent.args ?? [])], {
    cwd: options.cwd,
    env: { ...process.env, ...agent.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const exited = new Promise<void>((resolve) => {
    child.once('close', () => {
      resolve();
    });
  });
  let spawnError: Error | undefined;
  child.once('error', (error) => {
    spawnError = error;
  });
  let stderrTail = Buffer.alloc(0);
  child.stderr.on('data', (chunk: Buffer) => {
    stderrTail = Buffer.concat([stderrTail, chunk]).subarray(-STDERR_TAIL_BYTES);
  });

  const stream = ndJsonStream(Writable.toWeb(child.stdin), Readable.toWeb(child.stdout));

  try {
    yield* runAcpPrompt(stream, options);
  } catch (error) {
    // A connection that fails because the agent died closes before the process reports its exit.
    await Promise.race([exited, sleep(EXIT_SETTLE_MS)]);
    const exitedEarly = child.exitCode !== null || child.signalCode !== null;
    const exitDetail = exitedEarly ? describeExit(child.exitCode, child.signalCode) : undefined;
    await stopProcess();
    if (signal?.aborted === true && error === signal.reason) throw error;
    throw buildFailure(agent.command, spawnError ?? error, exitDetail, stderrTail.toString('utf8'));
  } finally {
    await stopProcess();
  }

  async function stopProcess(): Promise<void> {
    child.stdin.end();
    if (isRunning()) child.kill('SIGTERM');
    await Promise.race([exited, sleep(TERMINATE_GRACE_MS)]);
    if (isRunning()) child.kill('SIGKILL');
    await exited;
  }

  function isRunning(): boolean {
    return child.pid !== undefined && child.exitCode === null && child.signalCode === null;
  }
}

// region | Helpers
function buildFailure(command: string, cause: unknown, exitDetail: string | undefined, stderr: string): Error {
  const reason = cause instanceof Error ? cause.message : String(cause);
  const lines = [`The agent \`${command}\` failed${exitDetail === undefined ? '' : ` (${exitDetail})`}: ${reason}`];
  const trimmed = stderr.trim();
  if (trimmed !== '') lines.push(`Its stderr ended with:\n${trimmed}`);
  return new Error(lines.join('\n'), { cause });
}

function describeExit(code: number | null, signal: NodeJS.Signals | null): string {
  return code === null ? `killed by ${signal ?? 'a signal'}` : `exited ${code}`;
}
// endregion | Helpers
