import type { Seed } from '@williamthorsen/toolbelt.numbers/candidate';

import { TextNode } from './TextNode.ts';
/**
 * Replaces each set of delimited variants, as in `[variant1|variant2|variant3]`, with one of them chosen at random.
 * TODO: Allow the delimiter to be customized.
 * @category String
 * @experimental
 * @stage draft
 */
export function pickVariants(text: string, options: Options = {}): string {
  return TextNode.create(text).pick(options);
}

interface Options {
  seed?: Seed | undefined;
}
