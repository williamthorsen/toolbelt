import { getItemAtIndexOrThrow } from '@williamthorsen/toolbelt.arrays/candidate';
import { IntSeededRng, pickInteger, type SeedOptions } from '@williamthorsen/toolbelt.numbers/candidate';

import { segmentByDelimited } from '../internal/segmentByDelimited.ts';
import { splitDelimited } from '../internal/splitDelimited.ts';
import { validateDelimiters } from '../internal/validateDelimiters.ts';
import { enclose } from './enclose.ts';

const DELIMIT = {
  opening: '[',
  closing: ']',
  separator: '|',
};

const encloseInDelimiters = enclose(DELIMIT.opening, DELIMIT.closing);

/**
 * A node in an abstract syntax tree (AST) of static text nodes (tokens) and variants.
 * @category String
 * @experimental
 * @stage draft
 */
export abstract class TextNode {
  content: string;

  protected constructor(content: string) {
    this.content = content;
  }

  /** Parses content into a node tree, validating its delimiters. */
  static create(content: string): TextNode {
    if (TokenNode.hasDelimited(content)) {
      validateDelimiters(content, { ...DELIMIT, throwOnError: true });
    }
    return TokenNode.isDelimited(content) ? new VariantNode(content) : new TokenNode(content);
  }

  /** Decodes encoded or nested indices into a flat list, dropping any trailing seed. */
  static decodeIndices(encodedIndices: string | VariantIndices): Integer[] {
    if (typeof encodedIndices !== 'string') {
      if (isNumberArray(encodedIndices)) return encodedIndices;
      return flatten(encodedIndices);
    }

    // Remove the trailing seed, if any
    // `split` always returns a first element, but `noUncheckedIndexedAccess` types it as possibly undefined.
    const [deseededIndices = '', _seed] = encodedIndices.split(':', 2);

    const regex = /\d+/g;
    const indices = [];

    for (let match = regex.exec(deseededIndices); match !== null; match = regex.exec(deseededIndices)) {
      indices.push(Number(match[0]));
    }

    return indices;
  }

  /** Encloses content in the variant delimiters. */
  static delimit(content: string): string {
    return encloseInDelimiters(content);
  }

  /**
   * Returns a string representation of arbitrarily nested indices.
   */
  static encodeIndices(indices: VariantIndices, depth = 0): string {
    let encodedIndices = '';

    for (let i = 0; i < indices.length; i++) {
      const element = indices[i];
      if (typeof element === 'number') {
        encodedIndices += element.toString();
      } else if (Array.isArray(element)) {
        let encodedChildIndices = this.encodeIndices(element, depth + 1);
        if (depth) encodedChildIndices = this.delimit(encodedChildIndices);
        encodedIndices += encodedChildIndices;
      }
      const isNotLastElement = i < indices.length - 1;
      if (isNotLastElement && (depth === 0 || !Array.isArray(indices[i + 1]))) encodedIndices += DELIMIT.separator;
    }

    return encodedIndices;
  }

  /** Combines encoded indices and a seed into a whitespace-free fingerprint. */
  static fingerprint(seed: number, encodedIndices: string): string {
    return `${encodedIndices}:${seed}`.replaceAll(/\s/g, '');
  }

  /**
   * Returns a variant node for wholly delimited content, a token node for content that contains delimiters, or the
   * content itself.
   */
  static fromContent(content: string): TextNode | string {
    if (TokenNode.isDelimited(content)) return new VariantNode(content);
    if (TokenNode.hasDelimited(content)) return new TokenNode(content);
    return content;
  }

  /** Reports whether text contains an opening or a closing delimiter. */
  static hasDelimited(text: string): boolean {
    return text.includes(DELIMIT.opening) || text.includes(DELIMIT.closing);
  }

  /** Reports whether text opens and closes with the variant delimiters. */
  static isDelimited(text: string): boolean {
    return text.startsWith(DELIMIT.opening) && text.endsWith(DELIMIT.closing);
  }

  /** Returns a string child as is, or the text that a node child selects from the queue. */
  protected static consumeChildIndices(child: TextNode | string, queue: Integer[]): string {
    return typeof child === 'string' ? child : child.consumeIndices(queue);
  }

  /** Picks a variant at every choice and returns the text with the indices, seed, and fingerprint that reproduce it. */
  pickWithFingerprint(options: SeedOptions = {}): PickSummary {
    const seededRng = IntSeededRng.cloneOrCreate(options.seed);
    const seed = options.seed ?? seededRng;
    const initialSeed = seededRng.seed;

    const indices = this.pickIndices({ seed });
    const content = this.selectVariants(indices);

    return {
      content,
      encodedIndices: TextNode.encodeIndices(indices),
      fingerprint: TextNode.fingerprint(initialSeed, TextNode.encodeIndices(indices)),
      indices,
      seed: initialSeed,
    };
  }

  /**
   * Returns the text that the given indices select, consuming them depth-first. Throws if indices are too few to
   * resolve every variant or remain once all are resolved. The caller's array is not changed.
   */
  selectVariants(indices: string | VariantIndices): string {
    const decodedIndices = TextNode.decodeIndices(indices);
    const queue = [...decodedIndices];

    const content = this.consumeIndices(queue);

    if (queue.length > 0) {
      throw new Error(`Unused variant indices. Received ${decodedIndices.length}, leaving ${queue.length} unused.`);
    }
    return content;
  }

  /** Returns the text with a variant chosen at random at every choice. */
  abstract pick(options?: SeedOptions): string;

  /** Chooses a variant at random at every choice and returns the indices of the choices. */
  abstract pickIndices(options?: SeedOptions & { indices?: VariantIndices | undefined }): VariantIndices;

  /** Returns the delimited text that the node represents. */
  abstract toString(): string;

  /** Returns the text that the given indices select, shifting from the queue each index that the node consumes. */
  protected abstract consumeIndices(queue: Integer[]): string;
}

/**
 * A delimited set of alternatives, one of which is chosen when the text is picked.
 *
 * @category String
 * @experimental
 * @stage draft
 */
export class VariantNode extends TextNode {
  variants: (TextNode | string)[] = [];

  /** Splits the delimited content into its alternatives. */
  constructor(content: string) {
    super(content);
    this.variants = splitDelimited(content, DELIMIT).map((variant) => TextNode.fromContent(variant));
  }

  /** Chooses a variant at random and returns its picked text. */
  pick(options: SeedOptions = {}): string {
    const seed = IntSeededRng.spawn(options.seed);

    const index = pickInteger({ max: this.variants.length - 1, seed });

    const variant = getItemAtIndexOrThrow(this.variants, index);
    if (typeof variant === 'string') return variant;
    return variant.pick({ seed });
  }

  /** Chooses a variant at random and returns its index, followed by the indices picked within it. */
  pickIndices(options: SeedOptions = {}): VariantIndices {
    const seed = IntSeededRng.spawn(options.seed);

    const index = pickInteger({ max: this.variants.length - 1, seed });
    const nodeOrString = this.variants[index];

    const indices: VariantIndices = [index];

    if (nodeOrString instanceof TextNode) {
      const childIndices = nodeOrString.pickIndices({ seed });
      if (childIndices.length > 0) indices.push(childIndices);
    }

    return indices;
  }

  /** Joins the variants with the separator and encloses them in the delimiters. */
  toString(): string {
    return TextNode.delimit(this.variants.map((variant) => variant.toString()).join(DELIMIT.separator));
  }

  /** Resolves the variant named by the next index, passing the remaining indices to it. */
  protected consumeIndices(queue: Integer[]): string {
    const variantIndex = queue.shift();

    if (variantIndex === undefined) throw new Error('Not enough indices to resolve all variants.');

    const selectedVariant = this.variants[variantIndex];
    if (selectedVariant === undefined) {
      throw new RangeError(
        `Variant index exceeds maximum index. Expected maximum of ${this.variants.length - 1}, got ${variantIndex}.`,
      );
    }

    return TextNode.consumeChildIndices(selectedVariant, queue);
  }
}

// region | Helpers

/** Flattens nested indices into a single list. */
function flatten(indices: VariantIndices): number[] {
  let flatIndices: number[] = [];
  for (const index of indices) {
    if (Array.isArray(index)) {
      flatIndices = [...flatIndices, ...flatten(index)];
    } else {
      flatIndices.push(index);
    }
  }
  return flatIndices;
}

type Integer = number;

/** Reports whether every item is a number. */
function isNumberArray(items: unknown[]): items is number[] {
  return Array.isArray(items) && items.every((item) => typeof item === 'number');
}

interface PickSummary {
  content: string;
  encodedIndices: string;
  fingerprint: string;
  indices: VariantIndices;
  seed: Integer;
}

/** A run of text whose segments are static strings and nested variant nodes. */
class TokenNode extends TextNode {
  children?: (TextNode | string)[];

  /** Segments the content into static strings and child nodes. */
  constructor(content: string) {
    super(content);
    if (TextNode.hasDelimited(content)) {
      this.children = segmentByDelimited(content, DELIMIT).map((segment) => TextNode.fromContent(segment));
    }
  }

  /** Joins the text picked by each child. */
  pick(options: SeedOptions = {}): string {
    const seed = IntSeededRng.spawn(options.seed);
    if (this.children) {
      return this.children.map((child) => (typeof child === 'string' ? child : child.pick({ seed }))).join('');
    }
    return this.content;
  }

  /** Collects the indices picked by each variant child. */
  pickIndices(options: SeedOptions = {}): VariantIndices {
    const seed = IntSeededRng.spawn(options.seed);

    const children = this.children || [];
    const indices: VariantIndices = [];

    for (const child of children) {
      if (!(child instanceof VariantNode)) continue;

      const childIndices = child.pickIndices({ seed });
      indices.push(childIndices.length === 1 ? getItemAtIndexOrThrow(childIndices, 0) : childIndices);
    }

    // Avoid unnecessary nesting
    return indices.length === 1 && Array.isArray(indices[0]) ? indices[0] : indices;
  }

  /** Joins the delimited text of each child. */
  toString(): string {
    if (this.children) {
      return this.children.map((child) => child.toString()).join('');
    }
    return this.content;
  }

  /** Joins the text that the indices select from each child. */
  protected consumeIndices(queue: Integer[]): string {
    if (!this.children) return '';

    return this.children.map((child) => TextNode.consumeChildIndices(child, queue)).join('');
  }
}

type VariantIndices = (Integer | VariantIndices)[];

// endregion | Helpers
