/** @noformat -- @generated. Do not edit. Compiled by rdy. */
/* eslint-disable */
export const __readyupVersion = "0.35.0";


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
var NOT_A_REPO = "the project is not a git working tree, and these checks read the files that git tracks";
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
var ADOPTED_EXPORTS = ["captureError", "captureStdio", "pointArgvAt", "pointCwdAt"];

// src/readiness/listCaptureSites.ts
var CALLEE = /^[\w$]+(?:\??\.[\w$]+)*(?:\?\.)?(?:<[^<>()]*>)?$/;
var CALL_PREFIX = /^(?:await )?(?:new )?/;
var CATCH_CLAUSE = /^\s*catch\s*\(/;
var FINALLY_CLAUSE = /^\s*finally\b/;
var CAUGHT_ASSIGNMENT = /^(?<target>[\w$]+) ?= ?(?<caught>[\w$]+)(?: as .+)?$/;
var IDENTIFIER = /^[\w$]+$/;
var LOOKBEHIND_LENGTH = 400;
var TRAILING_SEMICOLON = /;$/;
var TRY_ANCHOR = /\btry\s*\{/g;
function listCaptureSites(source) {
  const code = blankNonCode(source);
  const sites = [];
  for (const match of code.matchAll(TRY_ANCHOR)) {
    const block = readBalancedGroup(code, match.index, BRACES);
    if (block === void 0) continue;
    if (!isSingleCall(condenseWhitespace(code.slice(block.start + 1, block.end - 1)))) continue;
    const target = readCaughtTarget(code.slice(block.end));
    if (target === void 0) continue;
    const { before } = readAnchoredWindow(code, match.index, { lookahead: 0, lookbehind: LOOKBEHIND_LENGTH });
    if (!hasOuterDeclaration(before, target)) continue;
    sites.push({ kind: "hand-rolled-error-capture", line: getLineAtOffset(code, match.index), symbol: target });
  }
  return sites;
}
function escapeIdentifier(name) {
  return name.replaceAll("$", String.raw`\$`);
}
function hasOuterDeclaration(before, name) {
  return new RegExp(String.raw`\b(?:let|var) ${escapeIdentifier(name)}\b`).test(before);
}
function isSingleCall(body) {
  const statement = body.trim().replace(TRAILING_SEMICOLON, "").trim().replace(CALL_PREFIX, "");
  const args = readBalancedGroup(statement, 0, PARENTHESES);
  if (args === void 0 || args.end !== statement.length) return false;
  return CALLEE.test(statement.slice(0, args.start).trim());
}
function readCaughtTarget(tail) {
  const clause = CATCH_CLAUSE.exec(tail);
  if (clause === null) return void 0;
  const bound = readBalancedGroup(tail, clause[0].length - 1, PARENTHESES);
  if (bound === void 0) return void 0;
  const parameter = tail.slice(bound.start + 1, bound.end - 1).split(":", 1)[0]?.trim() ?? "";
  if (!IDENTIFIER.test(parameter)) return void 0;
  const block = readBalancedGroup(tail, bound.end, BRACES);
  if (block === void 0 || tail.slice(bound.end, block.start).trim() !== "") return void 0;
  if (FINALLY_CLAUSE.test(tail.slice(block.end))) return void 0;
  const body = condenseWhitespace(tail.slice(block.start + 1, block.end - 1));
  const assignment = CAUGHT_ASSIGNMENT.exec(body.trim().replace(TRAILING_SEMICOLON, "").trim());
  return assignment?.groups?.["caught"] === parameter ? assignment.groups["target"] : void 0;
}

// .readyup/kits/default.ts
var PACKAGE_NAME = "@williamthorsen/toolbelt.testing";
var README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/testing#readme";
var default_default = defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listCaptureSites,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: "the project holds no test files",
  packageName: PACKAGE_NAME,
  // The selection follows `toolbelt.vitest` rather than the five source-oriented kits: this idiom lives only
  // in a test, so a sweep exempting tests would report nothing and say so as a pass. No hand-off rule is
  // needed against the two kits whose sweeps could meet this one, since neither claims a try block:
  // `toolbelt.errors` exempts tests altogether, and `toolbelt.vitest` reads mocks and disposal hooks.
  pathFilter: isTestFile,
  checks: [
    {
      name: "No test captures a thrown value by hand",
      id: "no-hand-rolled-error-capture",
      kinds: ["hand-rolled-error-capture"],
      severity: "recommend",
      fix: `Replace each capture named above with captureError from ${PACKAGE_NAME}/candidate, which runs the call, hands back what it threw or rejected with, and narrows that to a class the caller names. It fails the test where the call completes normally, so a regression that stops the failure reports itself instead of leaving a later assertion to report an absent value in its place, and the narrowing reaches the error's own fields without a second assertion to get there. Reference: ${README_URL}`
    }
  ]
});
export {
  default_default as default
};
