/*
 * Forwards newline-delimited JSON-RPC on stdin to the MCP endpoint that `TOOLBELT_ACP_MCP_URL` names, with the
 * bearer token in `TOOLBELT_ACP_MCP_TOKEN`, and writes the answers to stdout. An agent that accepts only stdio MCP
 * servers runs this module with Node. It imports only Node builtins, so that it runs from wherever the package is
 * installed.
 */

import { realpathSync } from 'node:fs';
import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';

/** The URL of this module, which the client passes to Node as the bridge's entry point. */
export const bridgeModuleUrl: string = import.meta.url;

/** The environment variable that names the endpoint. */
export const BRIDGE_URL_VARIABLE = 'TOOLBELT_ACP_MCP_URL';

/** The environment variable that contains the endpoint's bearer token. */
export const BRIDGE_TOKEN_VARIABLE = 'TOOLBELT_ACP_MCP_TOKEN';

/** Where the bridge reads messages, where it writes answers, and the endpoint between them. */
export interface McpStdioBridgeOptions {
  readonly input: Readable;
  readonly output: Writable;
  readonly url: string;
  readonly token: string;
}

const PARSE_ERROR = -32_700;
const INTERNAL_ERROR = -32_603;

/**
 * Posts each line of `input` to the endpoint and writes each JSON-RPC message of the answer to `output` as a line:
 * the body of a JSON answer, or each event of an event-stream answer. `initialize` is forwarded alone, and every
 * later message as soon as it is read, so that answers arrive in the order in which the endpoint gives them. A
 * `notifications/cancelled` aborts the post of the request that it names, which the endpoint serves as a request
 * of its own, and the cancelled request gets no answer. A line that is not JSON is answered with a parse error,
 * and a request that the endpoint fails without a JSON-RPC body is answered with an internal error. Resolves when
 * `input` ends and every answer is written, and rejects when the endpoint cannot be reached.
 *
 * Once the endpoint has answered `initialize` or set a session, later posts send back the negotiated
 * `MCP-Protocol-Version` and the `Mcp-Session-Id`, which a 2025-era MCP client cannot send over stdio.
 *
 * @internal
 */
export async function runMcpStdioBridge(options: McpStdioBridgeOptions): Promise<void> {
  const session: SessionHeaders = { protocolVersion: undefined, sessionId: undefined };
  const inFlight = new Map<number, Promise<void>>();
  let nextForwardingKey = 0;
  const cancellers = new Map<string | number, AbortController>();
  let failure: { readonly error: unknown } | undefined;

  const lines = createInterface({ input: options.input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (failure !== undefined) break;
    if (line.trim() === '') continue;
    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch {
      writeMessage(options.output, { jsonrpc: '2.0', id: null, error: { code: PARSE_ERROR, message: 'Parse error' } });
      continue;
    }

    const cancelledId = findCancelledRequestId(message);
    if (cancelledId !== undefined) {
      cancellers.get(cancelledId)?.abort();
      continue;
    }

    const requestId = findRequestId(message);
    const cancelling = new AbortController();
    if (requestId !== undefined) cancellers.set(requestId, cancelling);
    const forwardingKey = nextForwardingKey++;
    const forwarding = (async () => {
      try {
        await forwardMessage(line, requestId, cancelling.signal, session, options);
      } catch (error) {
        if (!cancelling.signal.aborted) {
          failure ??= { error };
          // Stop reading now, since the agent may send nothing more while it waits for this answer
          lines.close();
        }
      } finally {
        if (requestId !== undefined) cancellers.delete(requestId);
        inFlight.delete(forwardingKey);
      }
    })();
    inFlight.set(forwardingKey, forwarding);
    if (isRecord(message) && message['method'] === 'initialize') await forwarding;
  }
  lines.close();

  await Promise.all(inFlight.values());
  if (failure !== undefined) throw failure.error;
}

if (isEntryModule()) await runAsProcess();

// region | Helpers
/** The headers that the endpoint negotiated, which the bridge sends back on every later post. */
interface SessionHeaders {
  protocolVersion: string | undefined;
  sessionId: string | undefined;
}

/** Returns the id of the request that a `notifications/cancelled` names, and nothing for any other message. */
function findCancelledRequestId(message: unknown): string | number | undefined {
  if (!isRecord(message) || message['method'] !== 'notifications/cancelled' || !isRecord(message['params'])) {
    return undefined;
  }
  const requestId = message['params']['requestId'];
  return typeof requestId === 'string' || typeof requestId === 'number' ? requestId : undefined;
}

/** Returns the protocol version of an `initialize` result, when the message is one. */
function findNegotiatedVersion(message: unknown): string | undefined {
  if (!isRecord(message) || !isRecord(message['result'])) return undefined;
  const version = message['result']['protocolVersion'];
  return typeof version === 'string' ? version : undefined;
}

/** Posts one message to the endpoint and writes its answers, recording the headers that the endpoint negotiates. */
async function forwardMessage(
  line: string,
  requestId: string | number | undefined,
  signal: AbortSignal,
  session: SessionHeaders,
  options: McpStdioBridgeOptions,
): Promise<void> {
  const response = await fetch(options.url, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${options.token}`,
      'Content-Type': 'application/json',
      ...(session.protocolVersion !== undefined && { 'MCP-Protocol-Version': session.protocolVersion }),
      ...(session.sessionId !== undefined && { 'Mcp-Session-Id': session.sessionId }),
    },
    body: line,
    signal,
  });
  session.sessionId = response.headers.get('mcp-session-id') ?? session.sessionId;

  let wroteAnswer = false;
  for await (const answer of readMessages(response)) {
    session.protocolVersion = findNegotiatedVersion(answer) ?? session.protocolVersion;
    writeMessage(options.output, answer);
    wroteAnswer = true;
  }
  if (response.ok || wroteAnswer || requestId === undefined) return;
  const error = { code: INTERNAL_ERROR, message: `The MCP endpoint answered HTTP ${response.status}.` };
  writeMessage(options.output, { jsonrpc: '2.0', id: requestId, error });
}

/** Returns the id of a JSON-RPC request, and nothing for a notification or a response. */
function findRequestId(message: unknown): string | number | undefined {
  if (!isRecord(message) || typeof message['method'] !== 'string') return undefined;
  const id = message['id'];
  return typeof id === 'string' || typeof id === 'number' ? id : undefined;
}

/** Reports whether this module is the entry point of the Node process. */
function isEntryModule(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

/** Reports whether a value is a non-array object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parses a JSON body into its messages, accepting a single message or a batch, and nothing when it is empty. */
function parseJsonMessages(body: string): unknown[] {
  if (body.trim() === '') return [];
  try {
    const parsed: unknown = JSON.parse(body);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

/** Yields the JSON-RPC messages of an answer, each event of an event stream as soon as it is complete. */
async function* readMessages(response: Response): AsyncGenerator {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/event-stream')) {
    yield* parseJsonMessages(await response.text());
    return;
  }
  if (response.body === null) return;

  let pending = '';
  const chunks = response.body.pipeThrough(new TextDecoderStream());
  for await (const chunk of chunks) {
    pending += chunk.replaceAll('\r\n', '\n');
    let boundary = pending.indexOf('\n\n');
    while (boundary !== -1) {
      yield* parseJsonMessages(readEventData(pending.slice(0, boundary)));
      pending = pending.slice(boundary + 2);
      boundary = pending.indexOf('\n\n');
    }
  }
  yield* parseJsonMessages(readEventData(pending));
}

/** Joins the `data` fields of one server-sent event, which is empty for a comment such as a keepalive. */
function readEventData(event: string): string {
  return event
    .split('\n')
    .filter((field) => field.startsWith('data:'))
    .map((field) => field.slice('data:'.length).replace(/^ /, ''))
    .join('\n');
}

/** Runs the bridge on the process's stdio, exiting 2 when a variable is missing and 1 when the bridge fails. */
async function runAsProcess(): Promise<void> {
  const url = process.env[BRIDGE_URL_VARIABLE];
  const token = process.env[BRIDGE_TOKEN_VARIABLE];
  const missing = [url === undefined && BRIDGE_URL_VARIABLE, token === undefined && BRIDGE_TOKEN_VARIABLE].filter(
    (name) => name !== false,
  );
  if (url === undefined || token === undefined) {
    process.stderr.write(`The MCP stdio bridge needs ${missing.join(' and ')} in its environment.\n`);
    process.exitCode = 2;
    return;
  }

  try {
    await runMcpStdioBridge({ input: process.stdin, output: process.stdout, url, token });
  } catch (error) {
    process.stderr.write(`The MCP stdio bridge failed: ${String(error)}\n`);
    process.exitCode = 1;
  }
}

/** Writes one JSON-RPC message as a line. */
function writeMessage(output: Writable, message: unknown): void {
  output.write(`${JSON.stringify(message)}\n`);
}
// endregion | Helpers
