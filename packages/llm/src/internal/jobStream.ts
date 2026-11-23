import type { JobRefusalReason } from '../types/endpoint.ts';

/** The names of the server-sent events through which an endpoint streams a job. */
export type JobStreamEventName = 'failure' | 'job-event' | 'outcome';

/** One server-sent event, with its data parsed from JSON. */
export interface JobStreamRecord {
  readonly name: string;
  readonly data: unknown;
}

/** The JSON body of a refusal. */
export interface JobRefusalBody {
  readonly reason: JobRefusalReason;
  readonly message: string;
  readonly limit?: string;
  readonly details?: unknown;
}

/** The data of a `failure` event, and the body of a response to a job that failed before streaming. */
export const JOB_FAILURE_BODY = { message: 'The job failed at the endpoint.' } as const;

/** The HTTP status of each refusal. */
export const REFUSAL_STATUSES: Readonly<Record<JobRefusalReason, number>> = {
  'bot-check-failed': 403,
  'bot-check-unavailable': 503,
  'counter-unavailable': 503,
  'input-too-long': 413,
  'invalid-body': 400,
  'limit-reached': 429,
  'method-not-allowed': 405,
};

/**
 * Encodes one server-sent event whose data is one line of JSON.
 *
 * @internal
 */
export function encodeStreamEvent(name: JobStreamEventName, data: unknown): string {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Parses a stream of server-sent events, as `encodeStreamEvent` writes them, into records. Chunks may split an event
 * anywhere; comment lines and events without data are skipped. Throws a `SyntaxError` on data that is not JSON.
 *
 * @internal
 */
export async function* parseJobStream(body: ReadableStream<Uint8Array>): AsyncGenerator<JobStreamRecord> {
  const text = body.pipeThrough(new TextDecoderStream());
  let buffer = '';
  for await (const chunk of text) {
    buffer += chunk;
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const record = parseRecord(buffer.slice(0, boundary));
      if (record !== undefined) yield record;
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf('\n\n');
    }
  }
}

// region | Helpers
/** Parses the lines of one event, returning `undefined` for an event without data. */
function parseRecord(block: string): JobStreamRecord | undefined {
  let name = 'message';
  let data: string | undefined;
  for (const line of block.split('\n')) {
    if (line.startsWith('event: ')) name = line.slice('event: '.length);
    else if (line.startsWith('data: ')) data = line.slice('data: '.length);
  }
  return data === undefined ? undefined : { name, data: JSON.parse(data) };
}
// endregion | Helpers
