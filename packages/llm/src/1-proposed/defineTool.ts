import type { JobTool } from '../types/job.ts';

/**
 * Returns a tool unchanged, typing `execute`'s input from the tool's `inputSchema`, so that an input annotation that
 * disagrees with the schema fails to compile.
 *
 * @category LLM
 * @stage proposed
 * @experimental
 */
export function defineTool<Input, Output>(tool: JobTool<Input, Output>): JobTool<Input, Output> {
  return tool;
}
