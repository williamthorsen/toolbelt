import { type JobStreamRecord, parseJobStream } from '../internal/jobStream.ts';

/** Reads every server-sent event of a response's body. */
export async function readJobStream(response: Response): Promise<JobStreamRecord[]> {
  if (response.body === null) throw new Error('The response does not have a body.');
  return Array.fromAsync(parseJobStream(response.body));
}
