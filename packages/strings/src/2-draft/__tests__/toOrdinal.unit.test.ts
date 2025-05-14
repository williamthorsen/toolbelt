import { describe, expect, it } from 'vitest';

import { toOrdinal } from '../toOrdinal.ts';

describe(toOrdinal, () => {
  it('returns "1st" for 1', () => {
    expect(toOrdinal(1)).toBe('1st');
  });

  it('returns "2nd" for 2', () => {
    expect(toOrdinal(2)).toBe('2nd');
  });

  it('returns "3rd" for 3', () => {
    expect(toOrdinal(3)).toBe('3rd');
  });

  it('returns "4th" for 4', () => {
    expect(toOrdinal(4)).toBe('4th');
  });

  it('returns "11th" for 11', () => {
    expect(toOrdinal(11)).toBe('11th');
  });

  it('returns "12th" for 12', () => {
    expect(toOrdinal(12)).toBe('12th');
  });

  it('returns "13th" for 13', () => {
    expect(toOrdinal(13)).toBe('13th');
  });

  it('returns "21st" for 21', () => {
    expect(toOrdinal(21)).toBe('21st');
  });

  it('returns "22nd" for 22', () => {
    expect(toOrdinal(22)).toBe('22nd');
  });

  it('returns "23rd" for 23', () => {
    expect(toOrdinal(23)).toBe('23rd');
  });

  it('returns "100th" for 100', () => {
    expect(toOrdinal(100)).toBe('100th');
  });

  it('handles negative numbers correctly', () => {
    expect(toOrdinal(-1)).toBe('-1st');
    expect(toOrdinal(-2)).toBe('-2nd');
    expect(toOrdinal(-3)).toBe('-3rd');
    expect(toOrdinal(-4)).toBe('-4th');
    expect(toOrdinal(-11)).toBe('-11th');
    expect(toOrdinal(-12)).toBe('-12th');
    expect(toOrdinal(-13)).toBe('-13th');
  });

  it('handles zero correctly', () => {
    expect(toOrdinal(0)).toBe('0th');
  });
});
