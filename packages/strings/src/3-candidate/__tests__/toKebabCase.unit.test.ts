import { describe, expect, it } from 'vitest';

import { toCamelCase } from '../toCamelCase.ts';
import { toKebabCase } from '../toKebabCase.ts';

describe(toKebabCase, () => {
  it.each([
    ['dryRun', 'dry-run'],
    ['parseHTMLString', 'parse-html-string'],
    ['HELLO   WORLD', 'hello-world'],
    ['  snake_case and.dotted/path  ', 'snake-case-and-dotted-path'],
    ['Darcula (Custom)', 'darcula-custom'],
    ['überFlag', 'über-flag'],
    ['version2', 'version2'],
    ['', ''],
  ])('converts %j to %j', (input, expected) => {
    expect(toKebabCase(input)).toBe(expected);
  });

  it.each(['dryRun', 'output', 'skipChecks', 'ipv6Only', 'v2Beta'])(
    'round-trips the camelCase key %j through toCamelCase',
    (key) => {
      expect(toCamelCase(toKebabCase(key))).toBe(key);
    },
  );
});
