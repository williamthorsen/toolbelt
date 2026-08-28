import { hashString } from '@williamthorsen/toolbelt.strings/candidate';
import { describe, expect, it } from 'vitest';

import { deriveBranchNumber, type DeriveBranchNumberOptions } from '../deriveBranchNumber.ts';

const BUCKETED: DeriveBranchNumberOptions = { max: 999 };
const TICKETLESS = 'main';

describe(deriveBranchNumber, () => {
  it('returns the ticket number when the branch encodes one', () => {
    expect(deriveBranchNumber('232')).toBe(232);
    expect(deriveBranchNumber('author/JIRA-123.4-branch-description')).toBe(123);
  });

  it('wraps a ticket number that overruns the range', () => {
    expect(deriveBranchNumber('1232', BUCKETED)).toBe(232);
  });

  it('offsets a ticket number into a range that does not start at zero', () => {
    expect(deriveBranchNumber('1232', { min: 3_000, max: 3_999 })).toBe(3_232);
  });

  it('delegates to hashString when the branch encodes no ticket', () => {
    expect(deriveBranchNumber(TICKETLESS)).toBe(hashString(TICKETLESS));
    expect(deriveBranchNumber(TICKETLESS, BUCKETED)).toBe(hashString(TICKETLESS, BUCKETED));
    expect(deriveBranchNumber(TICKETLESS, { min: 3_000, max: 3_999, offset: 7 })).toBe(
      hashString(TICKETLESS, { min: 3_000, max: 3_999, offset: 7 }),
    );
  });

  it('honours a declared key, which no other key then matches', () => {
    expect(deriveBranchNumber('mac-22/feat/x', { key: 'mac' })).toBe(22);
    expect(deriveBranchNumber('mac-22/feat/x')).toBe(hashString('mac-22/feat/x'));
  });

  describe('offset', () => {
    it('rotates both branches by the same amount', () => {
      const rotatedRef = deriveBranchNumber('232', { ...BUCKETED, offset: 5 });
      const rotatedHash = deriveBranchNumber(TICKETLESS, { ...BUCKETED, offset: 5 });

      expect(rotatedRef).toBe((deriveBranchNumber('232', BUCKETED) + 5) % 1_000);
      expect(rotatedHash).toBe((deriveBranchNumber(TICKETLESS, BUCKETED) + 5) % 1_000);
    });

    it('wraps a negative offset', () => {
      expect(deriveBranchNumber('232', { ...BUCKETED, offset: -3 })).toBe(229);
    });
  });

  describe('given a bad option', () => {
    // The ref path does not reach hashString's own validation, so both paths are checked.
    it.each(['232', TICKETLESS])('rejects an inverted range for the branch %o', (branch) => {
      expect(() => deriveBranchNumber(branch, { min: 5, max: 1 })).toThrow(RangeError);
    });

    it.each(['232', TICKETLESS])('rejects a fractional bound for the branch %o', (branch) => {
      expect(() => deriveBranchNumber(branch, { max: 1.5 })).toThrow(RangeError);
    });

    it.each(['232', TICKETLESS])('rejects a fractional offset for the branch %o', (branch) => {
      expect(() => deriveBranchNumber(branch, { offset: 1.5 })).toThrow(RangeError);
    });

    it('rejects a malformed key', () => {
      expect(() => deriveBranchNumber('232', { key: 'a' })).toThrow(RangeError);
    });
  });
});
