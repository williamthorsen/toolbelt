import type { SessionUpdate } from '@agentclientprotocol/sdk/unstable';

import type { RunEvent, RunPromptOptions } from '../types/run.ts';
import type { FakeAgentConfig } from './createFakeAgent.ts';

/** The options of a minimal run: no instructions, tools, policy, or signal. */
export const OPTIONS: RunPromptOptions = { agent: { command: 'unused' }, cwd: '/work', prompt: 'hello' };

/** A permission request that offers one allow-once and one reject-once option. */
export const PERMISSION_REQUEST: NonNullable<FakeAgentConfig['permissionRequest']> = {
  toolCall: { toolCallId: 'call-1' },
  options: [
    { optionId: 'allow', name: 'Allow', kind: 'allow_once' },
    { optionId: 'reject', name: 'Reject', kind: 'reject_once' },
  ],
};

export const TEXT_UPDATE: SessionUpdate = {
  sessionUpdate: 'agent_message_chunk',
  content: { type: 'text', text: 'hi' },
};

/** Reads a run, aborting it once the first update arrives, so that the abort lands mid-turn. */
export async function collectAbortingOnFirstEvent(
  run: AsyncGenerator<RunEvent>,
  controller: AbortController,
): Promise<RunEvent[]> {
  const events: RunEvent[] = [];
  for await (const event of run) {
    events.push(event);
    if (events.length === 1) controller.abort(new Error('stop'));
  }
  return events;
}
