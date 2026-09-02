import { blankNonCode, getLineAtOffset, readAnchoredWindow } from '@williamthorsen/toolbelt.adoption';

import { classifyConsoleMock, type ConsoleMockKind } from './classifyConsoleMock.ts';

export interface ConsoleSite {
  kind: ConsoleSiteKind;
  line: number;
}

export type ConsoleSiteKind = ConsoleMockKind | 'console-calls-read';

const SPY = /\bvi\s*\.\s*spyOn\(\s*console\s*,\s*(['"])(?:debug|error|info|log|warn)\1\s*\)/g;
const READ = /\.\s*mock\s*\.\s*(?:calls|lastCall)\b/g;
const SILENCE_BINDING = /\b(?:const|let|using|var)\s+([\w$]+)\s*=\s*silenceConsole\s*\(/g;
// The declaration keyword is optional, because a suite commonly declares the name in one scope and assigns
// the spy in a hook. The leading guard holds the name to one that an identifier read can resolve:
// `harness.spy = ` binds nothing, since a read written `spy.mock.calls` would not be reaching that property.
const BINDING_TAIL = /(?:^|[^.\w$])(?:(?:const|let|using|var) )?([\w$]+)(?:: [^=]+)? = $/;
const MEMBER_RECEIVER = /([\w$]+) ?\. ?(?:debug|error|info|log|warn) ?$/;
const IDENTIFIER_RECEIVER = /(?:^|[^.\w$])([\w$]+) ?$/;
// Long enough to span a binding broken across lines by a formatter, which is all either receiver form needs.
const WINDOW = { lookahead: 0, lookbehind: 64 };

/**
 * Lists every console spy in a test file and every read of a console spy's recorded calls, each named by what
 * it is doing.
 *
 * Only the five methods covered by `silenceConsole` are anchored, because they are the ones for which the
 * package has advice. The anchor is `vi.spyOn`, not an assignment to a console method: an assignment anchor
 * matches a restore as readily as a mock.
 *
 * The spy anchor reads the spied method's name out of a string literal, so like `listExitMocks` it matches the
 * source and takes its verdict from the blanked text at the same offsets. The read anchor is identifiers alone
 * and scans the blanked code directly.
 *
 * A read reports only once its receiver resolves to a console spy, either a name bound to one or a member of a
 * `silenceConsole` result. That is what keeps a read of some other spy's calls silent. A read chained straight
 * onto the spy call binds no name, so it reports at the spy's own site instead.
 *
 * @internal
 */
export function listConsoleSites(source: string): ConsoleSite[] {
  const code = blankNonCode(source);
  const sites: ConsoleSite[] = [];
  const spyBindings = new Set<string>();

  for (const match of source.matchAll(SPY)) {
    // The anchor's own first character survives blanking exactly where the spy is code the runtime runs.
    if (code[match.index] !== source[match.index]) continue;

    const binding = BINDING_TAIL.exec(readLookbehind(code, match.index))?.[1];
    if (binding !== undefined) spyBindings.add(binding);

    sites.push({
      kind: classifyConsoleMock(code.slice(match.index + match[0].length)),
      line: getLineAtOffset(code, match.index),
    });
  }

  const silenceBindings = listSilenceBindings(code);

  for (const match of code.matchAll(READ)) {
    const before = readLookbehind(code, match.index);
    if (!isConsoleSpy(before, { silenceBindings, spyBindings })) continue;

    sites.push({ kind: 'console-calls-read', line: getLineAtOffset(code, match.index) });
  }

  // Spies are collected ahead of reads, so a stable sort leaves a spy first where the two share a line.
  return sites.toSorted((a, b) => a.line - b.line);
}

// region | Helpers

/** Reports whether the text preceding a read names a console spy. */
function isConsoleSpy(before: string, bindings: { silenceBindings: Set<string>; spyBindings: Set<string> }): boolean {
  const owner = MEMBER_RECEIVER.exec(before)?.[1];
  if (owner !== undefined) return bindings.silenceBindings.has(owner);

  const name = IDENTIFIER_RECEIVER.exec(before)?.[1];
  return name !== undefined && bindings.spyBindings.has(name);
}

/**
 * Lists the names bound to a `silenceConsole` result. Nothing in the call is a literal, so this reads the
 * blanked code rather than matching the source the way the spy anchor has to.
 */
function listSilenceBindings(code: string): Set<string> {
  const names = new Set<string>();
  for (const match of code.matchAll(SILENCE_BINDING)) {
    if (match[1] !== undefined) names.add(match[1]);
  }

  return names;
}

/** Reads the condensed text preceding an offset, in which a wrapped binding reads as a written-out one. */
function readLookbehind(code: string, offset: number): string {
  return readAnchoredWindow(code, offset, WINDOW).before;
}

// endregion | Helpers
