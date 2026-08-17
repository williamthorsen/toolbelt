import { condenseWhitespace } from './condenseWhitespace.ts';

export interface AnchoredWindow {
  /** The anchor and what follows it, condensed. */
  after: string;
  /** What precedes the anchor, condensed. */
  before: string;
}

export interface WindowLengths {
  lookahead: number;
  lookbehind: number;
}

/**
 * Reads the condensed text either side of an offset.
 *
 * Both windows are condensed because a real site wraps mid-expression under a formatter, and a line-oriented
 * pattern would walk past it. Each caller passes its own lengths: how far a detector must see is a property of
 * the idiom it matches, not of the reading.
 *
 * @internal
 */
export function readAnchoredWindow(source: string, offset: number, lengths: WindowLengths): AnchoredWindow {
  return {
    after: condenseWhitespace(source.slice(offset, offset + lengths.lookahead)),
    before: condenseWhitespace(source.slice(Math.max(0, offset - lengths.lookbehind), offset)),
  };
}
