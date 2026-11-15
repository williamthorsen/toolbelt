/*
 * Serves the fake agent over stdio, configured by the JSON in `FAKE_AGENT_CONFIG`. A test spawns this file with
 * `process.execPath`, which runs it through Node's type stripping.
 */

import { writeFileSync } from 'node:fs';
import { Readable, Writable } from 'node:stream';

import { ndJsonStream } from '@agentclientprotocol/sdk/unstable';

import { createFakeAgent, type FakeAgentConfig } from './createFakeAgent.ts';

const config = readConfig();

if (config.pidFile !== undefined) writeFileSync(config.pidFile, String(process.pid));

if (config.exitBeforeInitialize === undefined) {
  createFakeAgent(config).agent.connect(ndJsonStream(Writable.toWeb(process.stdout), Readable.toWeb(process.stdin)));
} else {
  process.stderr.write(config.exitBeforeInitialize.stderr);
  process.exit(config.exitBeforeInitialize.code);
}

// region | Helpers
function readConfig(): FakeAgentConfig {
  const raw = process.env['FAKE_AGENT_CONFIG'];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- test scaffolding; the test that spawns this file writes the config.
  return raw === undefined ? {} : JSON.parse(raw);
}
// endregion | Helpers
