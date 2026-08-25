/** @noformat — @generated. Do not edit. Compiled by rdy. */
/* eslint-disable */
export const __readyupVersion = "0.32.1";


// ../adoption/src/conventions/path-predicates.ts
var TEST_SUFFIX = /\.(?:spec|test)\.[cm]?[jt]sx?$/;
function isTestFile(path) {
  return TEST_SUFFIX.test(path);
}

// ../adoption/src/kits/defineAdoptionKit.ts
import { defineRdyKit } from "readyup";
import {
  buildFindingReport,
  countPackageUsage,
  readTrackedSources
} from "readyup/check-utils";
var NOT_A_REPO = "the project is not a git working tree, and these checks read the files git tracks";
var NOTHING_TO_REPORT = { findings: [] };
function defineAdoptionKit(spec) {
  assertCheckIdsAreUnique();
  const cache = {};
  const adoptedPackage = { exportNames: spec.exportNames, packageName: spec.packageName };
  return defineRdyKit({
    description: spec.description,
    defaultSeverity: "warn",
    checklists: [
      {
        name: "adoption",
        checks: spec.checks.map((check) => ({
          name: check.name,
          id: check.id,
          ...check.severity !== void 0 && { severity: check.severity },
          skip: skipUnlessProjectHoldsSources,
          check: () => reportKinds(check.kinds),
          fix: check.fix
        }))
      }
    ]
  });
  function assertCheckIdsAreUnique() {
    const seen = /* @__PURE__ */ new Set();
    const duplicated = /* @__PURE__ */ new Set();
    for (const { id } of spec.checks) {
      if (seen.has(id)) duplicated.add(id);
      seen.add(id);
    }
    if (duplicated.size > 0) {
      const ids = [...duplicated].toSorted().join(", ");
      throw new Error(`${spec.packageName}'s kit gives one id to more than one check: ${ids}`);
    }
  }
  function loadSummary() {
    cache.summary ??= readProject();
    return cache.summary;
  }
  async function readProject() {
    const sources = await readTrackedSources(spec.pathFilter);
    if (sources === void 0) return void 0;
    return {
      adoptedCount: countPackageUsage(sources, adoptedPackage),
      findings: sources.flatMap((source) => spec.detect(source.text).map((site) => ({ ...site, path: source.path }))),
      sources
    };
  }
  async function reportKinds(kinds) {
    const summary = await loadSummary();
    if (summary === void 0) return NOTHING_TO_REPORT;
    return buildFindingReport({
      adoptedCount: summary.adoptedCount,
      findings: summary.findings,
      ownImplementation: { ...adoptedPackage, sources: summary.sources },
      shouldReport: (finding) => kinds.includes(finding.kind)
    });
  }
  async function skipUnlessProjectHoldsSources() {
    const summary = await loadSummary();
    if (summary === void 0) return NOT_A_REPO;
    return summary.sources.length === 0 ? spec.noSourcesReason : false;
  }
}

// ../adoption/src/portable/condenseWhitespace.ts
function condenseWhitespace(text) {
  return text.replaceAll(/\s+/g, " ");
}

// ../adoption/src/portable/readBalancedGroup.ts
var BRACES = { close: "}", open: "{" };
var PARENTHESES = { close: ")", open: "(" };
function readBalancedGroup(source, from, delimiters) {
  const start = source.indexOf(delimiters.open, from);
  if (start === -1) return void 0;
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === delimiters.open) depth += 1;
    else if (source[index] === delimiters.close) {
      depth -= 1;
      if (depth === 0) return { end: index + 1, start };
    }
  }
  return void 0;
}

// ../adoption/src/portable/readAnchoredWindow.ts
function readAnchoredWindow(source, offset, lengths) {
  return {
    after: condenseWhitespace(source.slice(offset, offset + lengths.lookahead)),
    before: condenseWhitespace(source.slice(Math.max(0, offset - lengths.lookbehind), offset))
  };
}

// ../adoption/src/mod.ts
import { blankNonCode, getLineAtOffset } from "readyup/check-utils";

// src/readiness/adoptedExports.ts
var ADOPTED_EXPORTS = [
  "disposeOnTestFinished",
  "listConsoleLines",
  "makeFixture",
  "silenceConsole",
  "throwOnProcessExit"
];

// src/readiness/classifyConsoleMock.ts
var IMPLEMENTATION = /^\s*\.mockImplementation(?:Once)?\(/;
var BARE_REFERENCE = /^[\w$.]+$/;
var FUNCTION_HEAD = /^(?:async\s+)?function\b/;
var LEADING_ASYNC = /^async\s+/;
var SOLE_PARAMETER = /^([\w$]+)\s*=>/;
var REST_PARAMETER = /(?:^|,)\s*\.\.\./;
var EMPTY_EXPRESSION = /^(?:undefined|void 0)$/;
function classifyConsoleMock(after) {
  if (!IMPLEMENTATION.test(after)) return "console-unclassified";
  const group = readBalancedGroup(after, 0, PARENTHESES);
  if (group === void 0) return "console-unclassified";
  const implementation = after.slice(group.start + 1, group.end - 1).trim();
  if (BARE_REFERENCE.test(implementation)) return "console-unclassified";
  const head = readImplementationHead(implementation);
  if (head === void 0) return "console-unclassified";
  if (isNoOp(head.body)) return "console-silence";
  if (REST_PARAMETER.test(head.parameters)) return "console-capture";
  return head.parameters.trim() === "" ? "console-capture" : "console-capture-lossy";
}
function isNoOp(body) {
  const trimmed = body.trim();
  const block = trimmed.startsWith("{") ? readBalancedGroup(trimmed, 0, BRACES) : void 0;
  if (block !== void 0 && block.end === trimmed.length) return trimmed.slice(1, -1).trim() === "";
  return EMPTY_EXPRESSION.test(trimmed);
}
function readImplementationHead(implementation) {
  if (FUNCTION_HEAD.test(implementation)) return readParenthesizedHead(implementation, findBodyPastAnnotation);
  const arrow = implementation.replace(LEADING_ASYNC, "");
  if (arrow.startsWith("(")) return readParenthesizedHead(arrow, findBodyPastArrow);
  const sole = SOLE_PARAMETER.exec(arrow);
  return sole?.[1] === void 0 ? void 0 : { body: arrow.slice(sole[0].length), parameters: sole[1] };
}
function readParenthesizedHead(implementation, findBody) {
  const list = readBalancedGroup(implementation, 0, PARENTHESES);
  if (list === void 0) return void 0;
  const body = findBody(implementation.slice(list.end));
  if (body === void 0) return void 0;
  return { body, parameters: implementation.slice(list.start + 1, list.end - 1) };
}
function findBodyPastAnnotation(rest) {
  if (!rest.trimStart().startsWith(":")) return rest;
  const brace = rest.indexOf("{");
  return brace === -1 ? void 0 : rest.slice(brace);
}
function findBodyPastArrow(rest) {
  const arrow = rest.indexOf("=>");
  return arrow === -1 ? void 0 : rest.slice(arrow + 2);
}

// src/readiness/listConsoleSites.ts
var SPY = /\bvi\s*\.\s*spyOn\(\s*console\s*,\s*(['"])(?:debug|error|info|log|warn)\1\s*\)/g;
var READ = /\.\s*mock\s*\.\s*(?:calls|lastCall)\b/g;
var SILENCE_BINDING = /\b(?:const|let|using|var)\s+([\w$]+)\s*=\s*silenceConsole\s*\(/g;
var BINDING_TAIL = /\b(?:const|let|using|var) ([\w$]+) = $/;
var MEMBER_RECEIVER = /([\w$]+) ?\. ?(?:debug|error|info|log|warn) ?$/;
var IDENTIFIER_RECEIVER = /(?:^|[^.\w$])([\w$]+) ?$/;
var WINDOW = { lookahead: 0, lookbehind: 64 };
function listConsoleSites(source) {
  const code = blankNonCode(source);
  const sites = [];
  const spyBindings = /* @__PURE__ */ new Set();
  for (const match of source.matchAll(SPY)) {
    if (code[match.index] !== source[match.index]) continue;
    const binding = BINDING_TAIL.exec(readLookbehind(code, match.index))?.[1];
    if (binding !== void 0) spyBindings.add(binding);
    sites.push({
      kind: classifyConsoleMock(code.slice(match.index + match[0].length)),
      line: getLineAtOffset(code, match.index)
    });
  }
  const silenceBindings = listSilenceBindings(code);
  for (const match of code.matchAll(READ)) {
    const before = readLookbehind(code, match.index);
    if (!isConsoleSpy(before, { silenceBindings, spyBindings })) continue;
    sites.push({ kind: "console-calls-read", line: getLineAtOffset(code, match.index) });
  }
  return sites.toSorted((a, b) => a.line - b.line);
}
function isConsoleSpy(before, bindings) {
  const owner = MEMBER_RECEIVER.exec(before)?.[1];
  if (owner !== void 0) return bindings.silenceBindings.has(owner);
  const name = IDENTIFIER_RECEIVER.exec(before)?.[1];
  return name !== void 0 && bindings.spyBindings.has(name);
}
function listSilenceBindings(code) {
  const names = /* @__PURE__ */ new Set();
  for (const match of code.matchAll(SILENCE_BINDING)) {
    if (match[1] !== void 0) names.add(match[1]);
  }
  return names;
}
function readLookbehind(code, offset) {
  return readAnchoredWindow(code, offset, WINDOW).before;
}

// src/readiness/classifyExitMock.ts
var IMPLEMENTATION2 = /^\s*\.mockImplementation(?:Once)?\(/;
var THROWN_CLASS = /throw new (\w+)\(/;
var BARE_REFERENCE2 = /^[\w$.]+$/;
function classifyExitMock(after, source) {
  if (!IMPLEMENTATION2.test(after)) return { kind: "unclassified" };
  const group = readBalancedGroup(after, 0, PARENTHESES);
  if (group === void 0) return { kind: "unclassified" };
  const body = after.slice(group.start + 1, group.end - 1);
  const symbol = THROWN_CLASS.exec(body)?.[1];
  if (symbol !== void 0) {
    const declared = new RegExp(String.raw`\bclass ${symbol}\b[^\n]*\bextends\b`);
    return declared.test(source) ? { kind: "sentinel-clone", symbol } : { kind: "throwing" };
  }
  if (/\bthrow\b/.test(body)) return { kind: "throwing" };
  return { kind: BARE_REFERENCE2.test(body.trim()) ? "unclassified" : "non-throwing" };
}

// src/readiness/listExitMocks.ts
var SPY2 = /\bvi\s*\.\s*spyOn\(\s*process\s*,\s*(['"])exit\1\s*\)/g;
function listExitMocks(source) {
  const code = blankNonCode(source);
  const mocks = [];
  for (const match of source.matchAll(SPY2)) {
    if (code[match.index] !== source[match.index]) continue;
    const after = code.slice(match.index + match[0].length);
    mocks.push({ ...classifyExitMock(after, code), line: getLineAtOffset(code, match.index) });
  }
  return mocks;
}

// src/readiness/listSites.ts
function listSites(source) {
  return [...listExitMocks(source), ...listConsoleSites(source)].toSorted((a, b) => a.line - b.line);
}

// .readyup/kits/default.ts
var PACKAGE_NAME = "@williamthorsen/toolbelt.vitest";
var README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/vitest#readme";
var default_default = defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listSites,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: "the project holds no test files",
  packageName: PACKAGE_NAME,
  // The selection inverts the one `toolbelt.errors` makes, which exempts tests. A mock of either idiom exists
  // only in a test, so a sweep that skipped tests would report nothing and say so as a pass.
  pathFilter: isTestFile,
  checks: [
    {
      name: "No test declares its own process-exit sentinel error",
      id: "no-exit-sentinel-clone",
      kinds: ["sentinel-clone"],
      fix: `Delete the class named above and use throwOnProcessExit from ${PACKAGE_NAME}/candidate, whose ProcessExitError carries the code. One substitution retires the class and the mock together. Reference: ${README_URL}`
    },
    {
      name: "No test mocks process.exit without throwing",
      id: "no-non-throwing-exit-mock",
      kinds: ["non-throwing"],
      fix: `Replace each mock named above with throwOnProcessExit from ${PACKAGE_NAME}/candidate. A mock that returns lets execution continue past the exit, so the test asserts against a path the process never reaches, and nothing reports it.`
    },
    {
      name: "No test hand-rolls a throwing or unreadable process-exit mock",
      id: "no-hand-rolled-exit-mock",
      kinds: ["throwing", "unclassified"],
      severity: "recommend",
      fix: `Replace each mock named above with throwOnProcessExit from ${PACKAGE_NAME}/candidate, and assert the code on the thrown ProcessExitError. An unclassified mock is one these checks could not read: an implementation given as a bare reference, attached away from the spy's own call chain, or whose parentheses never balance.`
    },
    {
      name: "No test captures only part of a console call",
      id: "no-lossy-console-capture",
      kinds: ["console-capture-lossy"],
      fix: `Silence each method named above with silenceConsole from ${PACKAGE_NAME}/candidate and read it with listConsoleLines, which renders every argument of a call. A capture whose parameter list names its arguments drops the ones past them, so console.error('failed:', reason) asserts as 'failed:' and the test passes on a message the console never wrote.`
    },
    {
      name: "No test hand-rolls a console capture",
      id: "no-hand-rolled-console-capture",
      kinds: ["console-capture", "console-unclassified"],
      severity: "recommend",
      fix: `Replace each capture named above with silenceConsole from ${PACKAGE_NAME}/candidate and listConsoleLines, which renders each call's arguments through String and joins them on a space. An unclassified mock is one these checks could not read: a spy carrying no implementation, an implementation given as a bare reference, attached away from the spy's own call chain, or whose delimiters never balance.`
    },
    {
      name: "No test silences a console method by hand",
      id: "no-hand-rolled-console-silence",
      kinds: ["console-silence"],
      severity: "recommend",
      fix: `Replace each spy named above with silenceConsole from ${PACKAGE_NAME}/candidate, binding it with using so the methods are restored when the scope exits. It silences the methods it is given and hands back the spy behind each one. Reference: ${README_URL}`
    },
    {
      name: "No test reads a console spy's recorded calls",
      id: "no-console-calls-read",
      kinds: ["console-calls-read"],
      severity: "recommend",
      fix: `Read each spy named above with listConsoleLines from ${PACKAGE_NAME}/candidate, which returns one line per call with every argument rendered. Reading mock.calls by hand leaves each project deciding how a multi-argument call renders, and no two decide alike.`
    }
  ]
});
export {
  default_default as default
};
