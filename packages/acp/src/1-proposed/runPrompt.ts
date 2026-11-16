import { spawn } from 'node:child_process';
import { Readable, Writable } from 'node:stream';

import { ndJsonStream } from '@agentclientprotocol/sdk/unstable';

import { runAcpPrompt } from '../internal/runAcpPrompt.ts';
import type { RunEvent, RunPromptOptions } from '../types/run.ts';
import { AgentRunError } from './AgentRunError.ts';

const STDERR_TAIL_BYTES = 8192;
const EXIT_SETTLE_MS = 250;
const TERMINATE_GRACE_MS = 2000;

/**
 * Starts the agent that `options.agent` describes, runs one prompt on it through ACP v1, and yields the turn's
 * updates followed by a `stopped` event.
 *
 * The client authenticates with the profile's method when the agent lists it, sends `instructions` as an appended
 * system prompt when the agent supports one and ahead of the prompt otherwise, sets the session to the profile's
 * permission mode, allows each call of a preapproved `tools` server's tools that the profile identifies, and answers
 * every other permission request through `permissionPolicy`, refusing every one when there is none. The client serves
 * `tools` for the run over the first MCP transport that the agent advertises: the ACP connection itself, then an HTTP
 * endpoint on `127.0.0.1` that answers only the run's bearer token, and otherwise a stdio bridge that the agent runs
 * with this process's Node. Aborting `signal` before the prompt is sent rejects with the signal's reason; aborting it
 * afterwards cancels the turn, which ends with a `cancelled` stop, or rejects with the reason when the agent does not
 * stop within 10 seconds. Any other failure rejects with an `AgentRunError`, a policy that throws included, which also
 * cancels the turn. The agent process is stopped when the run ends, however it ends, including when the consumer stops
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
    if (signal?.aborted === true && error === signal.reason) throw error;
    // A connection that fails because the agent died closes before the process reports its exit.
    await awaitWithin(exited, EXIT_SETTLE_MS);
    const { exitCode, signalCode } = child;
    await stopProcess();
    throw new AgentRunError(
      {
        command: agent.command,
        exitCode: exitCode ?? undefined,
        signal: signalCode ?? undefined,
        stderrTail: stderrTail.toString('utf8'),
      },
      { cause: spawnError ?? error },
    );
  } finally {
    await stopProcess();
  }

  /** Closes the agent's stdin, then terminates it, escalating to `SIGKILL` after the grace period. */
  async function stopProcess(): Promise<void> {
    child.stdin.end();
    if (isRunning()) child.kill('SIGTERM');
    await awaitWithin(exited, TERMINATE_GRACE_MS);
    if (isRunning()) child.kill('SIGKILL');
    await exited;
  }

  /** Reports whether the agent process started and has not exited. */
  function isRunning(): boolean {
    return child.pid !== undefined && child.exitCode === null && child.signalCode === null;
  }
}

// region | Helpers
/** Waits for `promise` to settle or for `timeoutMs` to pass, whichever comes first, and clears its timer. */
async function awaitWithin(promise: Promise<void>, timeoutMs: number): Promise<void> {
  const { promise: timeout, resolve } = Promise.withResolvers<undefined>();
  const timer = setTimeout(() => {
    resolve(undefined);
  }, timeoutMs);
  try {
    await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
// endregion | Helpers
