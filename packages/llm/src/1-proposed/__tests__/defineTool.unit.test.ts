import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import type { JobTool } from '../../types/job.ts';
import { defineTool } from '../defineTool.ts';

describe(defineTool, () => {
  it('returns the tool unchanged', () => {
    const tool = { description: 'Echoes.', inputSchema: z.object({ text: z.string() }), execute: () => 'ok' };

    expect(defineTool(tool)).toBe(tool);
  });

  it("types execute's input from the schema", () => {
    const tool = defineTool({
      description: 'Submits.',
      inputSchema: z.object({ value: z.string() }),
      execute: (input) => input.value.length,
    });

    expectTypeOf(tool).toEqualTypeOf<JobTool<{ value: string }, number>>();
    expectTypeOf(tool).toExtend<JobTool>();
  });

  it('rejects an input annotation that disagrees with the schema', () => {
    const mistyped = {
      description: 'Submits.',
      inputSchema: z.object({ value: z.string() }),
      execute: (input: { value: number }) => input.value,
    };

    // @ts-expect-error -- the schema's `value` is a string.
    const tool = defineTool(mistyped);

    // The compile error above is the assertion; at runtime the tool is still returned unchanged.
    expect(tool).toBe(mistyped);
  });
});
