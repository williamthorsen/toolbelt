import { setDifference, setIntersection } from '@williamthorsen/toolbelt.sets/candidate';

import { deriveCaseTransformer } from '../internal/deriveCaseTransformer.ts';
import { validateDelimiters } from '../internal/validateDelimiters.ts';
import type { ValidationResult } from '../types/common.types.ts';

/**
 * A template whose brace-delimited placeholders are replaced with mapped values, each adapted to the case of its
 * placeholder.
 * @category String
 * @experimental
 * @stage candidate
 */
export class Interpolator {
  ifMissing: InterpolatorOptions['ifMissing'] = 'IGNORE';
  mapping: Map<RegExp | string, string> = new Map<string, string>();
  noAdaptCase = false;
  template: string;

  /** Validates the template and applies the options. */
  constructor(template: string, options: InterpolatorOptions = {}) {
    this.template = template;
    this.assertIsValidTemplate();
    this.setOptions(options);
  }

  /** Interpolates a mapping into a template in a single call. */
  static interpolate<T>(template: string, mapping: StringMapping<T>, options: InterpolatorOptions = {}): string {
    return new Interpolator(template, options).interpolate({ mapping });
  }

  /** Validates that the template's braces match and do not nest. */
  static validateTemplate(template: string): ValidationResult {
    const validationResult = validateDelimiters(template, { opening: '{', closing: '}', disallowNested: true });
    if (validationResult.isValid) {
      return validationResult;
    }
    return {
      isValid: false,
      errors: validationResult.errors.map((error) => ({
        ...error,
        message: error.message
          .replace('opening delimiter "{"', 'opening brace')
          .replace('closing delimiter "}"', 'closing brace'),
      })),
    };
  }

  /**
   * Returns the set of mapping keys in lowercase.
   */
  collectKeySet<T>(options?: { mapping?: StringMapping<T>; noValidation?: boolean | undefined }): Set<RegExp | string>;
  collectKeySet<T>(options: {
    excludeRegExp: true;
    mapping?: StringMapping<T>;
    noValidation?: boolean | undefined;
  }): Set<string>;
  collectKeySet<T>(
    options: { excludeRegExp?: boolean; mapping?: StringMapping<T>; noValidation?: boolean | undefined } = {},
  ): Set<RegExp | string> {
    const { excludeRegExp, mapping = this.mapping, noValidation } = options;

    const map = this.stringMappingToMap(mapping, { noValidation });
    const keys = new Set<RegExp | string>();
    for (const key of map.keys()) {
      if (typeof key === 'string') {
        keys.add(key.toLowerCase());
      } else if (!excludeRegExp) {
        keys.add(key);
      }
    }
    return keys;
  }

  /**
   * Returns the set of placeholders in lowercase.
   */
  extractPlaceholderSet(): Set<string> {
    const matcher = createDelimitedMatcher(/([^}]+)/, { caseInsensitive: true });
    const placeholderMatches = this.template.matchAll(matcher);
    const placeholderSet = new Set<string>();
    // The capture group always participates, but `noUncheckedIndexedAccess` types it as possibly undefined.
    for (const [_, placeholder = ''] of placeholderMatches) {
      placeholderSet.add(placeholder.toLowerCase());
    }
    return placeholderSet;
  }

  /** Partitions the string keys and the placeholders into those that match and those that do not. */
  partitionKeysAndPlaceholders<T>(options: { mapping?: StringMapping<T> } = {}): KeyPlaceholderPartition {
    const { mapping = this.mapping } = options;

    const keys = this.collectKeySet({ excludeRegExp: true, mapping });
    const placeholders = this.extractPlaceholderSet();

    const matches = setIntersection<string>(keys, placeholders);
    const unmatchedKeys = setDifference(keys, placeholders);
    const unmatchedPlaceholders = setDifference(placeholders, keys);

    return { matches, unmatchedKeys, unmatchedPlaceholders };
  }

  /** Replaces each placeholder with its mapped value, handling an unmatched one as `ifMissing` directs. */
  interpolate<T>(options: InterpolateOptions<T> = {}): string {
    const mergedOptions = {
      noAdaptCase: this.noAdaptCase,
      ifMissing: this.ifMissing,
      ...options,
    };
    const mapping = mergedOptions.mapping ? this.stringMappingToMap(mergedOptions.mapping) : this.mapping;

    const { ifMissing = 'IGNORE', noAdaptCase } = options;

    let newText = this.template;
    for (const [key, value] of mapping) {
      const matcher = createDelimitedMatcher(key);
      const insensitiveMatcher = createDelimitedMatcher(key, { caseInsensitive: true });

      newText = newText.replace(insensitiveMatcher, (delimitedPlaceholder): string => {
        const placeholder = delimitedPlaceholder.slice(1, -1);

        const isMatch = typeof key === 'string' ? placeholder === key : delimitedPlaceholder.match(matcher);

        // A case-sensitive match needs no transformation.
        if (isMatch) {
          return value;
        }

        const isInsensitiveMatch = typeof key === 'string' && placeholder.toLowerCase() === key;

        // Adapt the case only where the placeholder differs from the key in case alone.
        if (!noAdaptCase && typeof key === 'string' && isInsensitiveMatch) {
          // Apply to the value the transformation that recases the key to match the placeholder.
          const transform = deriveCaseTransformer(key, placeholder);
          if (transform !== undefined) {
            return transform(value);
          }
        }
        return delimitedPlaceholder;
      });
    }

    // Handle any placeholder that the mapping left unreplaced.
    if (ifMissing !== 'IGNORE') {
      const matcher = createDelimitedMatcher(/([^}]+)/);
      if (ifMissing === 'USE_KEY') {
        return newText.replace(matcher, (_, placeholder: string) => placeholder);
      }
      if (ifMissing === 'THROW') {
        const { unmatchedPlaceholders } = this.partitionKeysAndPlaceholders({ mapping });
        if (unmatchedPlaceholders.size > 0) {
          throw new Error(`Text has unmatched placeholders: ${[...unmatchedPlaceholders].join(', ')}`);
        }
      }
      if (typeof ifMissing === 'function') {
        return newText.replace(matcher, (_, placeholder: string) => ifMissing(placeholder));
      }
    }

    return newText;
  }

  /** Validates the mapping and replaces the current one with it. */
  setMapping<T>(mapping: StringMapping<T>): this {
    this.mapping = this.stringMappingToMap(mapping);
    return this;
  }

  /** Applies each defined option, leaving the others as they are. */
  setOptions<T>(options: InterpolateOptions<T> = {}): this {
    const { noAdaptCase, mapping, ifMissing } = options;
    if (ifMissing !== undefined) this.ifMissing = ifMissing;
    if (mapping !== undefined) this.setMapping(mapping);
    if (noAdaptCase !== undefined) this.noAdaptCase = noAdaptCase;
    return this;
  }

  /** Validates that the mapping's keys are unique regardless of case. */
  validateMapping<T>(options: { mapping?: StringMapping<T> | undefined } = {}): ValidationResult {
    const { mapping = this.mapping } = options;

    const keys = this.collectKeySet({ mapping, noValidation: true });
    if (keys.size === this.stringMappingToMap(mapping, { noValidation: true }).size) {
      return { isValid: true, errors: [] };
    }
    return {
      isValid: false,
      errors: [
        {
          code: 'CONFLICTING_KEYS',
          message: 'Mapping keys must be unique, ignoring case.',
        },
      ],
    };
  }

  /** Throws the mapping's first validation error, if it has one. */
  private assertIsValidMapping<T>(options: { mapping?: StringMapping<T> | undefined }): void | never {
    const { mapping = this.mapping } = options;
    const [validationError] = this.validateMapping({ mapping }).errors;
    if (validationError) throw new Error(validationError.message);
  }

  /** Throws the template's first validation error, if it has one. */
  private assertIsValidTemplate(): void | never {
    const [validationError] = Interpolator.validateTemplate(this.template).errors;
    if (validationError) throw new Error(validationError.message);
  }

  /** Converts a mapping to a `Map`, validating it unless `noValidation` is set. */
  private stringMappingToMap<T>(
    mapping: StringMapping<T>,
    options: { noValidation?: boolean | undefined } = {},
  ): Map<RegExp | string, string> | never {
    if (!options.noValidation) {
      this.assertIsValidMapping({ mapping });
    }
    return mapping instanceof Map ? mapping : new Map(Object.entries(mapping));
  }
}

/**
 * Replaces the brace-delimited placeholders in a template with mapped values.
 *
 * @category String
 * @experimental
 * @stage candidate
 */
export function interpolate<T>(
  template: string,
  substitutionMap: StringMapping<T>,
  options?: InterpolatorOptions,
): string {
  return Interpolator.interpolate(template, substitutionMap, options);
}

/**
 * Encloses a matcher in braces, so that only delimited placeholders are matched.
 *
 * @category String
 * @experimental
 * @stage candidate
 */
export function createDelimitedMatcher(matcher: RegExp | string, options: DelimitedMatcherOptions = {}): RegExp {
  const { caseInsensitive } = options;

  const matcherSource = typeof matcher === 'string' ? matcher : matcher.source;
  const matcherFlagsSet = new Set(typeof matcher === 'string' ? [] : matcher.flags.split(''));

  matcherFlagsSet.add('g');

  if (caseInsensitive) {
    matcherFlagsSet.add('i');
  }
  const matcherFlags = [...matcherFlagsSet].join('');

  return new RegExp(String.raw`\{${matcherSource}\}`, matcherFlags);
}

// region | Types
interface DelimitedMatcherOptions {
  caseInsensitive?: boolean | undefined;
}

export interface InterpolatorOptions {
  /** Determines how a placeholder that the mapping lacks is handled. */
  ifMissing?: 'IGNORE' | 'THROW' | 'USE_KEY' | ((placeholder: string) => string) | undefined;
  /** Keeps each mapping value's case as given, where otherwise it is adapted to match its placeholder. */
  noAdaptCase?: boolean | undefined;
}

export interface InterpolateOptions<T> extends InterpolatorOptions {
  mapping?: StringMapping<T> | undefined;
}

/**
 * The string mapping keys and the placeholders, split into matches and the unmatched of each. Regular-expression
 * keys take no part.
 */
export interface KeyPlaceholderPartition {
  matches: Set<string>;
  unmatchedKeys: Set<string>;
  unmatchedPlaceholders: Set<string>;
}

type StringIndexedMapping = Record<string, string> | string[];

type StringInterfaceMapping<O> = O extends { [K in keyof O]: string } ? O : never;

type StringMapping<T> = Map<RegExp | string, string> | StringIndexedMapping | StringInterfaceMapping<T>;
// endregion | Types
