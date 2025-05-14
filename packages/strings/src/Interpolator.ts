import { deriveCaseTransformer } from './deriveCaseTransformer.ts';
import { setDifference, setIntersection } from './set-functions.ts';
import type { StringMapping, ValidationResult } from './strings.types.ts';
import { validateDelimiters } from './validateDelimiters.ts';

export class Interpolator {
  ifMissing: InterpolatorOptions['ifMissing'] = 'IGNORE';
  mapping: Map<RegExp | string, string> = new Map<string, string>();
  noAdaptCase = false; // if true, don't adapt mapping values to the case of the placeholders
  template: string;

  static interpolate<T>(template: string, mapping: StringMapping<T>, options: InterpolatorOptions = {}): string {
    return new Interpolator(template, options).interpolate({ mapping });
  }

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

  constructor(template: string, options: InterpolatorOptions = {}) {
    this.template = template;
    this.assertIsValidTemplate();
    this.setOptions(options);
  }

  /**
   * Returns the set of mapping keys in lowercase.
   */
  getKeys<T>(options?: { mapping?: StringMapping<T>; noValidation?: boolean | undefined }): Set<RegExp | string>;
  getKeys<T>(options: {
    excludeRegExp: true;
    mapping?: StringMapping<T>;
    noValidation?: boolean | undefined;
  }): Set<string>;
  getKeys<T>(
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
  getPlaceholders(): Set<string> {
    const matcher = createDelimitedMatcher(/([^}]+)/, { caseInsensitive: true });
    const placeholderMatches = this.template.matchAll(matcher);
    const placeholderSet = new Set<string>();
    // TODO: `placeholder` needs a default or will be treated as possibly `undefined`. Is this actually possible?
    for (const [_, placeholder = ''] of placeholderMatches) {
      placeholderSet.add(placeholder.toLowerCase());
    }
    return placeholderSet;
  }

  getSets<T>(options: { mapping?: StringMapping<T> } = {}): Sets {
    const { mapping = this.mapping } = options;

    const keys = this.getKeys({ excludeRegExp: true, mapping });
    const placeholders = this.getPlaceholders();

    const matches = setIntersection<string>(keys, placeholders);
    const unmatchedKeys = setDifference(keys, placeholders);
    const unmatchedPlaceholders = setDifference(placeholders, keys);

    return { matches, unmatchedKeys, unmatchedPlaceholders };
  }

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

      // 1. Perform replacements
      newText = newText.replace(insensitiveMatcher, (delimitedPlaceholder): string => {
        const placeholder = delimitedPlaceholder.slice(1, -1);

        const isMatch = typeof key === 'string' ? placeholder === key : delimitedPlaceholder.match(matcher);
        const isInsensitiveMatch =
          typeof key === 'string' ? placeholder.toLowerCase() === key : delimitedPlaceholder.match(insensitiveMatcher);

        // The simplest case is that the placeholder is a case-sensitive match. No transformation is needed.
        if (isMatch) {
          return value;
        } // If the placeholder is not the same as the key, check whether its lowercase version is.
        // We don't try to automate any other conversions.
        else if (!noAdaptCase && typeof key === 'string' && isInsensitiveMatch) {
          // Identify the transformation that transforms the mapping key to have the same case as the placeholder.
          // We can then apply the same function to the mapping value.
          const transform = deriveCaseTransformer(key, placeholder);
          if (transform !== undefined) {
            return transform(value);
          }
        }
        return delimitedPlaceholder;
      });
    }

    // If ifMissing is defined, handle any remaining occurrences of the placeholder.
    if (ifMissing !== 'IGNORE') {
      const matcher = createDelimitedMatcher(/([^}]+)/);
      if (ifMissing === 'USE_KEY') {
        return newText.replace(matcher, (_, placeholder: string) => placeholder);
      }
      if (ifMissing === 'THROW') {
        const { unmatchedPlaceholders } = this.getSets({ mapping });
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

  setMapping<T>(mapping: StringMapping<T>): this {
    this.mapping = this.stringMappingToMap(mapping);
    return this;
  }

  setOptions<T>(options: InterpolateOptions<T> = {}): this {
    const { noAdaptCase, mapping, ifMissing } = options;
    if (ifMissing !== undefined) this.ifMissing = ifMissing;
    if (mapping !== undefined) this.setMapping(mapping);
    if (noAdaptCase !== undefined) this.noAdaptCase = noAdaptCase;
    return this;
  }

  validateMapping<T>(options: { mapping?: StringMapping<T> | undefined } = {}): ValidationResult {
    const { mapping = this.mapping } = options;

    const keys = this.getKeys({ mapping, noValidation: true });
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

  private assertIsValidMapping<T>(options: { mapping?: StringMapping<T> | undefined }): void | never {
    const { mapping = this.mapping } = options;
    const [validationError] = this.validateMapping({ mapping }).errors;
    if (validationError) throw new Error(validationError.message);
  }

  private assertIsValidTemplate(): void | never {
    const [validationError] = Interpolator.validateTemplate(this.template).errors;
    if (validationError) throw new Error(validationError.message);
  }

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

export function interpolate<T>(
  template: string,
  substitutionMap: StringMapping<T>,
  options?: InterpolatorOptions,
): string {
  return Interpolator.interpolate(template, substitutionMap, options);
}

/**
 * Encloses a matcher in braces, so that only delimited placeholders are matched.
 */
export function createDelimitedMatcher(matcher: RegExp | string, options: DelimitedMatcherOptions = {}): RegExp {
  const { caseInsensitive } = options;

  const matcherSource = typeof matcher === 'string' ? matcher : matcher.source;
  // eslint-disable-next-line unicorn/prefer-spread
  const matcherFlagsSet = new Set(typeof matcher === 'string' ? [] : matcher.flags.split(''));

  matcherFlagsSet.add('g');

  if (caseInsensitive) {
    matcherFlagsSet.add('i');
  }
  const matcherFlags = [...matcherFlagsSet].join('');

  return new RegExp(`\\{${matcherSource}\\}`, matcherFlags);
}

interface DelimitedMatcherOptions {
  caseInsensitive?: boolean | undefined;
}

/**
 * Ignores regular expressions.
 */
interface Sets {
  matches: Set<string>;
  unmatchedKeys: Set<string>;
  unmatchedPlaceholders: Set<string>;
}

export interface InterpolatorOptions {
  // what to do if a placeholder is not found in the mapping
  ifMissing?: 'IGNORE' | 'THROW' | 'USE_KEY' | ((placeholder: string) => string) | undefined;
  // if false, will try to adapt the case of the mapping value to match the placeholder
  noAdaptCase?: boolean | undefined;
}

export interface InterpolateOptions<T> extends InterpolatorOptions {
  mapping?: StringMapping<T> | undefined;
}
