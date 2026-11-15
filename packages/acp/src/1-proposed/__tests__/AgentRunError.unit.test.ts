import { describe, expect, it } from 'vitest';

import { AgentRunError } from '../AgentRunError.ts';

describe(AgentRunError, () => {
  it('names the command, its exit, and the cause, and quotes the end of stderr', () => {
    const error = new AgentRunError(
      { command: 'agy', exitCode: 3, stderrTail: 'not signed in\n' },
      { cause: new Error('connection closed') },
    );

    expect(error.message).toBe(
      'The agent `agy` failed (exited 3): connection closed\nIts stderr ended with:\nnot signed in',
    );
    expect(error).toMatchObject({ name: 'AgentRunError', command: 'agy', exitCode: 3, signal: undefined });
  });

  it('names the signal that ended the agent, and omits an empty stderr', () => {
    const error = new AgentRunError({ command: 'agy', signal: 'SIGSEGV', stderrTail: ' ' }, { cause: 'boom' });

    expect(error.message).toBe('The agent `agy` failed (killed by SIGSEGV): boom');
  });

  it('omits the exit when the agent was still running', () => {
    const error = new AgentRunError({ command: 'agy', stderrTail: '' }, { cause: new Error('bad version') });

    expect(error.message).toBe('The agent `agy` failed: bad version');
  });
});
