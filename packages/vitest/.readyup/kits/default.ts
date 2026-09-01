/**
 * Adoption checks for a project consuming @williamthorsen/toolbelt.vitest.
 *
 * The kit ships inside the package, so it runs only where the package is installed and always at the version
 * the consumer has. Installing the package is the consent these checks rest on.
 *
 * The checks take inventory rather than banning a pattern, and severity carries the judgment. A defect is a
 * `warn`: an exit mock that does not throw lets a suite cover a path that the process never reaches, and a console
 * capture naming its arguments asserts on a message the console never wrote. A working hand-roll is a
 * `recommend`, being a substitution rather than a correction. Nothing here is `error`.
 *
 * The kit declares what to look for and what to advise. What it reports lives in `src/readiness/`, where the
 * package's own suite covers it, and how the looking is done lives in `packages/adoption`.
 */
import { defineAdoptionKit, isTestFile } from '@williamthorsen/toolbelt.adoption';

import { ADOPTED_EXPORTS } from '../../src/readiness/adoptedExports.ts';
import { listSites } from '../../src/readiness/listSites.ts';

const PACKAGE_NAME = '@williamthorsen/toolbelt.vitest';
const README_URL = 'https://github.com/williamthorsen/toolbelt/tree/main/packages/vitest#readme';

export default defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listSites,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: 'the project holds no test files',
  packageName: PACKAGE_NAME,
  // The selection inverts the one `toolbelt.errors` makes, which exempts tests. Each of these idioms exists
  // only in a test, so a sweep that skipped tests would report nothing and say so as a pass.
  pathFilter: isTestFile,
  checks: [
    {
      name: 'No test declares its own process-exit sentinel error',
      id: 'no-exit-sentinel-clone',
      kinds: ['sentinel-clone'],
      fix: `Delete the class named above and use throwOnProcessExit from ${PACKAGE_NAME}/candidate, whose ProcessExitError carries the code. One substitution retires the class and the mock together. Reference: ${README_URL}`,
    },
    {
      name: 'No test mocks process.exit without throwing',
      id: 'no-non-throwing-exit-mock',
      kinds: ['non-throwing'],
      fix: `Replace each mock named above with throwOnProcessExit from ${PACKAGE_NAME}/candidate. A mock that returns lets execution continue past the exit, so the test asserts against a path never reached by the process, and nothing reports it.`,
    },
    {
      name: 'No test hand-rolls a throwing or unreadable process-exit mock',
      id: 'no-hand-rolled-exit-mock',
      kinds: ['throwing', 'unclassified'],
      severity: 'recommend',
      fix: `Replace each mock named above with throwOnProcessExit from ${PACKAGE_NAME}/candidate, and assert the code on the thrown ProcessExitError. An unclassified mock is one these checks could not read: an implementation given as a bare reference, attached away from the spy's own call chain, or whose parentheses never balance.`,
    },
    {
      name: 'No test captures only part of a console call',
      id: 'no-lossy-console-capture',
      kinds: ['console-capture-lossy'],
      fix: `Silence each method named above with silenceConsole from ${PACKAGE_NAME}/candidate and read it with listConsoleLines, which renders every argument of a call. A capture whose parameter list names its arguments drops the ones past them, so console.error('failed:', reason) asserts as 'failed:' and the test passes on a message the console never wrote.`,
    },
    {
      name: 'No test hand-rolls a console capture',
      id: 'no-hand-rolled-console-capture',
      kinds: ['console-capture', 'console-unclassified'],
      severity: 'recommend',
      fix: `Replace each capture named above with silenceConsole from ${PACKAGE_NAME}/candidate and listConsoleLines, which renders each call's arguments through String and joins them on a space. An unclassified mock is one these checks could not read: a spy carrying no implementation, an implementation given as a bare reference, attached away from the spy's own call chain, or whose delimiters never balance.`,
    },
    {
      name: 'No test silences a console method by hand',
      id: 'no-hand-rolled-console-silence',
      kinds: ['console-silence'],
      severity: 'recommend',
      fix: `Replace each spy named above with silenceConsole from ${PACKAGE_NAME}/candidate, binding it with using so the methods are restored when the scope exits. It silences the methods it is given and hands back the spy behind each one. Reference: ${README_URL}`,
    },
    {
      name: "No test reads a console spy's recorded calls",
      id: 'no-console-calls-read',
      kinds: ['console-calls-read'],
      severity: 'recommend',
      fix: `Read each spy named above with listConsoleLines from ${PACKAGE_NAME}/candidate, which returns one line per call with every argument rendered. Reading mock.calls by hand leaves each project deciding how a multi-argument call renders, and no two decide alike.`,
    },
    {
      name: 'No test registers a disposal by hand',
      id: 'no-hand-rolled-test-disposal',
      kinds: ['disposal-hook'],
      severity: 'recommend',
      fix: `Wrap each resource named above in disposeOnTestFinished from ${PACKAGE_NAME}/candidate, which registers the disposal and returns the resource at the type it was given. Moving registration to the construction site retires the hook, and with it the unicorn/no-nonstandard-builtin-properties disable comment the hand-written disposal carries where that rule is enabled, since unicorn's Symbol allowlist omits Symbol.dispose. Reference: ${README_URL}`,
    },
  ],
});
