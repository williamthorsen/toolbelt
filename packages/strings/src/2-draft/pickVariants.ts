import type { Seed } from '@williamthorsen/toolbelt.numbers';

import { TextNode } from './TextNode.ts';
/**
 * Given a string that contains delimited variants [variant1|variant2|variant3], replaces the variants with a
 * randomly selected one and returns the new string.
 * TODO: Allow the delimiter to be customized.
 * @experimental
 * @stage draft
 */
export function pickVariants(text: string, options: Options = {}): string {
  return TextNode.create(text).pick(options);
}

interface Options {
  seed?: Seed | undefined;
}
