import { describe, expect, it } from 'vitest';

import { type BranchTicketRef, findBranchTicketRef } from '../findBranchTicketRef.ts';

describe(findBranchTicketRef, () => {
  const refCases: ReadonlyArray<{ branch: string; expected: BranchTicketRef | undefined; scenario: string }> = [
    { scenario: 'a bare number', branch: '123', expected: { id: '123', number: 123 } },
    {
      scenario: 'a bare number with a description',
      branch: '123-branch-description',
      expected: { id: '123', number: 123 },
    },
    {
      scenario: 'a bare number behind an author segment',
      branch: 'author/123-branch-description',
      expected: { id: '123', number: 123 },
    },
    {
      scenario: 'a bare number behind an underscore separator',
      branch: '232_add-widget',
      expected: { id: '232', number: 232 },
    },
    { scenario: 'a dotted sub-ID', branch: '123.4', expected: { id: '123', number: 123, revisit: 4 } },
    {
      scenario: 'a hyphenated sub-ID, which reads as a description',
      branch: '123-4',
      expected: { id: '123', number: 123 },
    },
    {
      scenario: 'an uppercase key with a description',
      branch: 'JIRA-123-branch-description',
      expected: { id: 'JIRA-123', key: 'JIRA', number: 123 },
    },
    {
      scenario: 'an uppercase key behind an author segment, with a sub-ID',
      branch: 'author/JIRA-123.4-branch-description',
      expected: { id: 'JIRA-123', key: 'JIRA', number: 123, revisit: 4 },
    },
    { scenario: 'a digit-bearing key', branch: 'AB2-123-fix', expected: { id: 'AB2-123', key: 'AB2', number: 123 } },
    { scenario: 'a rejected key ahead of a bare number', branch: 'feat-2/232', expected: { id: '232', number: 232 } },
    { scenario: 'a lowercase key with none declared', branch: 'mac-22/feat/x', expected: undefined },
    { scenario: 'a kebab-case word at the start', branch: 'feat-2', expected: undefined },
    { scenario: 'a kebab-case word after a separator', branch: 'feat/foo-2', expected: undefined },
    { scenario: 'a trailing number inside a description', branch: 'feat/add-widget-2', expected: undefined },
    { scenario: 'a single-letter key', branch: 'a-1', expected: undefined },
    { scenario: 'a name encoding no ticket', branch: 'main', expected: undefined },
  ];

  it.each(refCases)('finds the ref for $scenario', ({ branch, expected }) => {
    expect(findBranchTicketRef(branch)).toStrictEqual(expected);
  });

  describe('given a declared key', () => {
    it('matches that key in any casing', () => {
      expect(findBranchTicketRef('mac-22/feat/x', { key: 'mac' })).toStrictEqual({
        id: 'MAC-22',
        key: 'MAC',
        number: 22,
      });
      expect(findBranchTicketRef('MAC-22', { key: 'mac' })).toStrictEqual({ id: 'MAC-22', key: 'MAC', number: 22 });
    });

    it('rejects an uppercase key that is not the declared one', () => {
      expect(findBranchTicketRef('JIRA-123')).toStrictEqual({ id: 'JIRA-123', key: 'JIRA', number: 123 });
      expect(findBranchTicketRef('JIRA-123', { key: 'mac' })).toBeUndefined();
    });

    it('leaves the bare-numeric form active', () => {
      expect(findBranchTicketRef('232-add-widget', { key: 'mac' })).toStrictEqual({ id: '232', number: 232 });
    });

    it.each(['', 'a', 'a-b', '1ab', 'mac-'])('throws a RangeError for the malformed key %o', (key) => {
      expect(() => findBranchTicketRef('232', { key })).toThrow(RangeError);
    });
  });
});
