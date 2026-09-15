import { type AdoptionSite, blankNonCode, getLineAtOffset } from '@williamthorsen/toolbelt.adoption';

export type StdioSpyKind = 'hand-rolled-stdio-capture';

const SPY = /\bvi\s*\.\s*spyOn\(\s*process\s*\.\s*std(?:err|out)\s*,\s*(['"])write\1\s*,?\s*\)/g;

/**
 * Lists every spy on `process.stdout.write` or `process.stderr.write` in a test file.
 *
 * Every spy is one site, whatever implementation follows it: `captureStdio` swaps `write` on both streams, which
 * covers a silencing mock, a capturing mock, and a bare spy alike. A read of a spy's recorded calls is no site of
 * its own, since the substitution at the spy retires it, and a test commonly reads one spy many times.
 *
 * Three neighbors are not read. An assignment to `write` is not, because an assignment anchor matches a restore as
 * readily as a mock. A spy on another member, `isTTY` included, is not, because substituting `captureStdio` would
 * also capture that stream's output. A bare `stdout` is not, because it may name the process's stream or any other.
 *
 * The anchor reads the spied method's name out of a string literal, which blanks like any other string, so it
 * matches the source and checks the blanked text at the same offset.
 *
 * @internal
 */
export function listStdioSpies(source: string): Array<AdoptionSite<StdioSpyKind>> {
  const code = blankNonCode(source);
  const sites: Array<AdoptionSite<StdioSpyKind>> = [];

  for (const match of source.matchAll(SPY)) {
    // The anchor's own first character survives blanking exactly where the spy is code that the runtime runs.
    if (code[match.index] !== source[match.index]) continue;

    sites.push({ kind: 'hand-rolled-stdio-capture', line: getLineAtOffset(code, match.index) });
  }

  return sites;
}
