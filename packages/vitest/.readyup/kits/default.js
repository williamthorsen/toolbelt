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

// ../adoption/src/portable/readBalancedGroup.ts
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

// src/readiness/classifyExitMock.ts
var IMPLEMENTATION = /^\s*\.mockImplementation(?:Once)?\(/;
var THROWN_CLASS = /throw new (\w+)\(/;
var BARE_REFERENCE = /^[\w$.]+$/;
function classifyExitMock(after, source) {
  if (!IMPLEMENTATION.test(after)) return { kind: "unclassified" };
  const group = readBalancedGroup(after, 0, PARENTHESES);
  if (group === void 0) return { kind: "unclassified" };
  const body = after.slice(group.start + 1, group.end - 1);
  const symbol = THROWN_CLASS.exec(body)?.[1];
  if (symbol !== void 0) {
    const declared = new RegExp(String.raw`\bclass ${symbol}\b[^\n]*\bextends\b`);
    return declared.test(source) ? { kind: "sentinel-clone", symbol } : { kind: "throwing" };
  }
  if (/\bthrow\b/.test(body)) return { kind: "throwing" };
  return { kind: BARE_REFERENCE.test(body.trim()) ? "unclassified" : "non-throwing" };
}

// src/readiness/listExitMocks.ts
var SPY = /\bvi\s*\.\s*spyOn\(\s*process\s*,\s*(['"])exit\1\s*\)/g;
function listExitMocks(source) {
  const code = blankNonCode(source);
  const mocks = [];
  for (const match of source.matchAll(SPY)) {
    if (code[match.index] !== source[match.index]) continue;
    const after = code.slice(match.index + match[0].length);
    mocks.push({ ...classifyExitMock(after, code), line: getLineAtOffset(code, match.index) });
  }
  return mocks;
}

// .readyup/kits/default.ts
var PACKAGE_NAME = "@williamthorsen/toolbelt.vitest";
var README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/vitest#readme";
var default_default = defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listExitMocks,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: "the project holds no test files",
  packageName: PACKAGE_NAME,
  // The selection inverts the one `toolbelt.errors` makes, which exempts tests. A `process.exit` mock exists
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
    }
  ]
});
export {
  default_default as default
};
