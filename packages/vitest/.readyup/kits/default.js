/** @noformat — @generated. Do not edit. Compiled by rdy. */
/* eslint-disable */
export const __readyupVersion = "0.27.0";


// .readyup/kits/default.ts
import { defineRdyKit } from "readyup";
import { discoverWorkspaces, isGitRepo, readFile, runGit } from "readyup/check-utils";

// src/readiness/buildKindReport.ts
function buildKindReport(summary, kinds) {
  const named = summary.findings.filter((finding) => kinds.includes(finding.kind));
  const progress = {
    count: summary.adopted + summary.findings.length,
    passedCount: summary.adopted,
    type: "fraction"
  };
  if (named.length === 0) return { ok: true, progress };
  return { detail: named.map((finding) => describeFinding(finding)).join(", "), ok: false, progress };
}
function describeFinding(finding) {
  const location = `${finding.path}:${finding.line}`;
  return finding.symbol === void 0 ? location : `${finding.symbol} (${location})`;
}

// src/readiness/listTestFiles.ts
var TEST_FILE = /\.(?:spec|test)\.[cm]?[jt]sx?$/;
var EXCLUDED = /(?:^|\/)node_modules\//;
function listTestFiles(paths) {
  return paths.filter((path) => TEST_FILE.test(path) && !EXCLUDED.test(path));
}

// src/readiness/packageName.ts
var PACKAGE_NAME = "@williamthorsen/toolbelt.vitest";

// src/readiness/classifyExitMock.ts
var IMPLEMENTATION = /^\s*\.mockImplementation(?:Once)?\(/;
var THROWN_CLASS = /throw new (\w+)\(/;
var BARE_REFERENCE = /^[\w$.]+$/;
function classifyExitMock(after, source) {
  if (!IMPLEMENTATION.test(after)) return { kind: "unclassified" };
  const body = readImplementation(after);
  if (body === void 0) return { kind: "unclassified" };
  const symbol = THROWN_CLASS.exec(body)?.[1];
  if (symbol !== void 0) {
    const declared = new RegExp(String.raw`\bclass ${symbol}\b[^\n]*\bextends\b`);
    return declared.test(source) ? { kind: "sentinel-clone", symbol } : { kind: "throwing" };
  }
  if (/\bthrow\b/.test(body)) return { kind: "throwing" };
  return { kind: BARE_REFERENCE.test(body.trim()) ? "unclassified" : "non-throwing" };
}
function readImplementation(after) {
  const start = after.indexOf("(");
  let depth = 0;
  for (let index = start; index < after.length; index += 1) {
    if (after[index] === "(") depth += 1;
    else if (after[index] === ")") {
      depth -= 1;
      if (depth === 0) return after.slice(start + 1, index);
    }
  }
  return void 0;
}

// src/readiness/listExitMocks.ts
var SPY = /\bvi\s*\.\s*spyOn\(\s*process\s*,\s*(['"])exit\1\s*\)/g;
function listExitMocks(source) {
  const mocks = [];
  for (const match of source.matchAll(SPY)) {
    const after = source.slice(match.index + match[0].length);
    mocks.push({ ...classifyExitMock(after, source), line: countLines(source, match.index) });
  }
  return mocks;
}
function countLines(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source[index] === "\n") line += 1;
  }
  return line;
}

// src/readiness/summarizeSources.ts
var EXPORT_NAMES = "disposeOnTestFinished|makeFixture|silenceConsole|throwOnProcessExit";
var SPECIFIER = String.raw`${PACKAGE_NAME.replaceAll(".", String.raw`\.`)}(?:/[\w-]+)*`;
var CALL = new RegExp(String.raw`\b(?:${EXPORT_NAMES})\s*\(`, "g");
var PACKAGE_IMPORT = new RegExp(String.raw`(?:from|require\()\s*['"]${SPECIFIER}['"]`);
function summarizeSources(sources) {
  return {
    adopted: sources.reduce((total, source) => total + countAdoptedCalls(source.text), 0),
    findings: sources.flatMap((source) => listExitMocks(source.text).map((mock) => ({ ...mock, path: source.path }))),
    sourceCount: sources.length
  };
}
function countAdoptedCalls(text) {
  return PACKAGE_IMPORT.test(text) ? text.matchAll(CALL).toArray().length : 0;
}

// .readyup/kits/default.ts
var README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/vitest#readme";
var NOT_A_REPO = "the project is not a git working tree, and these checks read the files git tracks";
var NO_TESTS = "the project holds no test files";
var SELF = "this project publishes the package these checks are for";
var cache = {};
var default_default = defineRdyKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  defaultSeverity: "warn",
  checklists: [
    {
      name: "adoption",
      checks: [
        {
          name: "No test declares its own process-exit sentinel error",
          skip: skipUnlessProjectIsAccountable,
          check: () => reportKinds("sentinel-clone"),
          fix: `Delete the class named above and use throwOnProcessExit from ${PACKAGE_NAME}/candidate, whose ProcessExitError carries the code. One substitution retires the class and the mock together. Reference: ${README_URL}`
        },
        {
          name: "No test mocks process.exit without throwing",
          skip: skipUnlessProjectIsAccountable,
          check: () => reportKinds("non-throwing"),
          fix: `Replace each mock named above with throwOnProcessExit from ${PACKAGE_NAME}/candidate. A mock that returns lets execution continue past the exit, so the test asserts against a path the process never reaches, and nothing reports it.`
        },
        {
          name: "No test hand-rolls a throwing or unreadable process-exit mock",
          severity: "recommend",
          skip: skipUnlessProjectIsAccountable,
          check: () => reportKinds("throwing", "unclassified"),
          fix: `Replace each mock named above with throwOnProcessExit from ${PACKAGE_NAME}/candidate, and assert the code on the thrown ProcessExitError. An unclassified mock is one these checks could not read: an implementation given as a bare reference, attached away from the spy's own call chain, or whose parentheses never balance.`
        }
      ]
    }
  ]
});
function loadSummary() {
  cache.summary ??= readProject();
  return cache.summary;
}
async function listTrackedPaths() {
  if (!await isGitRepo(".")) return void 0;
  const tracked = await runGit(".", "ls-files", "-z");
  return tracked.split("\0").filter((path) => path !== "");
}
async function readProject() {
  const tracked = await listTrackedPaths();
  if (tracked === void 0) return void 0;
  return summarizeSources(
    listTestFiles(tracked).flatMap((path) => {
      const text = readFile(path);
      return text === void 0 ? [] : [{ path, text }];
    })
  );
}
async function reportKinds(...kinds) {
  const summary = await loadSummary();
  return summary === void 0 ? { ok: true } : buildKindReport(summary, kinds);
}
async function skipUnlessProjectIsAccountable() {
  if (discoverWorkspaces().some((workspace) => workspace.name === PACKAGE_NAME)) return SELF;
  const summary = await loadSummary();
  if (summary === void 0) return NOT_A_REPO;
  return summary.sourceCount === 0 ? NO_TESTS : false;
}
export {
  default_default as default
};
