import type { Writer } from '@williamthorsen/toolbelt.cli/candidate';

import { runTbNode, type TbNodeEffects } from '../runTbNode.ts';

/** Runs the `tb-node` command line, collecting what it writes to each stream. */
export async function runWithBuffers(args: string[], effects: TbNodeEffects): Promise<BufferedRun> {
  const stdout = createTextBuffer();
  const stderr = createTextBuffer();
  const exitCode = await runTbNode(args, effects, { stderr, stdout });

  return { exitCode, stderr: stderr.text, stdout: stdout.text };
}

/** What a run wrote to each stream and exited with. */
export interface BufferedRun {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

// region | Helpers

/** Returns a writer that accumulates what is written to it. */
function createTextBuffer(): Writer & { readonly text: string } {
  let text = '';

  return {
    get text() {
      return text;
    },
    write(chunk: string) {
      text += chunk;
    },
  };
}

// endregion | Helpers
