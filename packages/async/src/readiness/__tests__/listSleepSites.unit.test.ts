import { describe, expect, it } from 'vitest';

import { listSleepSites } from '../listSleepSites.ts';

// Every spelling of the same sleep. A kit reporting one of them and not the rest would report by shape rather
// than by what the executor does.
const CLAIMED = [
  'await new Promise((resolve) => setTimeout(resolve, 50));',
  'await new Promise(resolve => setTimeout(resolve, 50));',
  'await new Promise((resolve) => { setTimeout(resolve, 50); });',
  'await new Promise((resolve) => { return setTimeout(resolve, 50); });',
  'await new Promise(function (resolve) { setTimeout(resolve, 50); });',
  'await new Promise<void>((resolve) => setTimeout(resolve, 50));',
  'await new Promise((resolve: () => void) => setTimeout(resolve, 50));',
  'await new Promise((resolve, reject) => setTimeout(resolve, 50));',
  'await new Promise((resolve) => setTimeout(() => resolve(), 50));',
  'await new Promise((resolve) => setTimeout(() => { resolve(); }, 50));',
];

// Code that legitimately holds the anchor and is no sleep. Each line is declined for a reason of its own, and
// reporting any of them would send a consumer to a substitution that does not hold.
const DECLINED = [
  'await new Promise((resolve) => { timeoutId = setTimeout(resolve, 50); handle = timeoutId; });',
  'await new Promise((resolve) => { report(); setTimeout(resolve, 50); });',
  'await new Promise((resolve) => setTimeout(resolve, 50, token));',
  'await new Promise((resolve) => setTimeout(done, 50));',
  'await new Promise((resolve) => setTimeout(() => { report(); resolve(); }, 50));',
  'await new Promise((resolve) => setTimeout((tick) => resolve(tick), 50));',
  'await new Promise((resolve) => queue.push(resolve));',
  'await new Promise(executor);',
];

describe(listSleepSites, () => {
  it('claims every spelling of a bare sleep', () => {
    const unclaimed = CLAIMED.filter((source) => listSleepSites(source).length !== 1);

    expect(unclaimed).toStrictEqual([]);
  });

  it('reports the kind that the kit checks against', () => {
    expect(listSleepSites(CLAIMED[0] ?? '')).toStrictEqual([{ kind: 'hand-rolled-sleep', line: 1 }]);
  });

  it('declines a promise that sets a timer and does something else besides', () => {
    const claimed = DECLINED.filter((source) => listSleepSites(source).length > 0);

    expect(claimed).toStrictEqual([]);
  });

  it('names the line that holds the construction', () => {
    const source = ['const before = 1;', '', 'await new Promise((resolve) => setTimeout(resolve, 50));'].join('\n');

    expect(listSleepSites(source)).toStrictEqual([{ kind: 'hand-rolled-sleep', line: 3 }]);
  });

  it('spans a construction that a formatter broke across lines', () => {
    const source = ['await new Promise((resolve) =>', '  setTimeout(resolve, 50),', ');'].join('\n');

    expect(listSleepSites(source)).toStrictEqual([{ kind: 'hand-rolled-sleep', line: 1 }]);
  });

  it('reports each of several sleeps in one source', () => {
    const source = [
      'await new Promise((resolve) => setTimeout(resolve, 10));',
      'await new Promise((resolve) => setTimeout(resolve, 20));',
    ].join('\n');

    expect(listSleepSites(source).map((site) => site.line)).toStrictEqual([1, 2]);
  });

  it('does not claim the idiom written in a comment', () => {
    expect(listSleepSites('// await new Promise((resolve) => setTimeout(resolve, 50));')).toStrictEqual([]);
  });

  it('does not claim the idiom written in a string', () => {
    expect(listSleepSites("const sample = 'new Promise((resolve) => setTimeout(resolve, 50))';")).toStrictEqual([]);
  });
});
