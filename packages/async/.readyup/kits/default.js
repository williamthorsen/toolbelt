/** @noformat -- @generated. Do not edit. Compiled by rdy. */
/* eslint-disable */
export const __readyupVersion = "0.35.0";


// ../adoption/src/conventions/path-predicates.ts
var BIN_DIRECTORY = /(?:^|\/)bin\//;
var JS_TS_EXTENSION = /\.[cm]?[jt]sx?$/;
var TEST_DIRECTORY = /(?:^|\/)__tests__\//;
var TEST_SUFFIX = /\.(?:spec|test)\.[cm]?[jt]sx?$/;
function isAdoptableSourceOrTest(path) {
  return isJsTsSource(path) && (!isBinWrapper(path) || isTestFile(path) || isInTestDirectory(path));
}
function isBinWrapper(path) {
  return BIN_DIRECTORY.test(path);
}
function isInTestDirectory(path) {
  return TEST_DIRECTORY.test(path);
}
function isJsTsSource(path) {
  return JS_TS_EXTENSION.test(path);
}
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

// ../adoption/src/mod.ts
import { blankNonCode, getLineAtOffset } from "readyup/check-utils";

// src/readiness/adoptedExports.ts
var ADOPTED_EXPORTS = ["debounce", "delay", "flushMicrotasks"];

// src/readiness/readExecutor.ts
var BARE_PARAMETER_ARROW = /^(?<parameter>[\w$]+)\s?=>/;
var FUNCTION_KEYWORD = /^function\b/;
var IDENTIFIER = /^[\w$]+$/;
var PARAMETER_TAIL = /[:=,]/;
function readExecutor(text) {
  const trimmed = text.trimStart();
  const bare = BARE_PARAMETER_ARROW.exec(trimmed);
  if (bare?.groups?.["parameter"] !== void 0) {
    return { body: readBody(trimmed.slice(bare[0].length)), parameter: bare.groups["parameter"] };
  }
  const isFunctionExpression = FUNCTION_KEYWORD.test(trimmed);
  const parameters = readBalancedGroup(trimmed, 0, PARENTHESES);
  if (parameters === void 0 || !isFunctionExpression && parameters.start !== 0) return void 0;
  const parameter = readFirstParameter(trimmed.slice(parameters.start + 1, parameters.end - 1));
  if (parameter === void 0) return void 0;
  const body = readTrailingBody(trimmed, parameters.end);
  return body === void 0 ? void 0 : { body, parameter };
}
function readBody(text) {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("{")) return trimmed;
  const block = readBalancedGroup(trimmed, 0, BRACES);
  return block === void 0 ? trimmed : trimmed.slice(block.start + 1, block.end - 1);
}
function readFirstParameter(parameters) {
  const trimmed = parameters.trim();
  if (trimmed === "") return "";
  const name = trimmed.split(PARAMETER_TAIL)[0]?.trim() ?? "";
  return IDENTIFIER.test(name) ? name : void 0;
}
function readTrailingBody(text, parametersEnd) {
  if (FUNCTION_KEYWORD.test(text)) {
    const block = readBalancedGroup(text, parametersEnd, BRACES);
    return block === void 0 ? void 0 : text.slice(block.start + 1, block.end - 1);
  }
  const arrow = text.indexOf("=>", parametersEnd);
  return arrow === -1 ? void 0 : readBody(text.slice(arrow + 2));
}

// src/readiness/listSleepSites.ts
var CLOSERS = ")]}";
var OPENERS = "([{";
var IDENTIFIER_CHARACTER = /[A-Za-z_$]/;
var PROMISE_CONSTRUCTION = /\bnew\s+Promise\s*(?:<[^<>()]*>\s*)?\(/g;
var RETURN_KEYWORD = /\breturn\b/g;
var TIMEOUT_CALL = /\bsetTimeout\s?\(/;
function listSleepSites(source) {
  const code = blankNonCode(source);
  const sites = [];
  for (const match of code.matchAll(PROMISE_CONSTRUCTION)) {
    const group = readBalancedGroup(code, match.index + match[0].length - 1, PARENTHESES);
    if (group === void 0) continue;
    const argument = condenseWhitespace(code.slice(group.start + 1, group.end - 1));
    if (!isSleepExecutor(argument)) continue;
    sites.push({ kind: "hand-rolled-sleep", line: getLineAtOffset(code, match.index) });
  }
  return sites;
}
function isSleepArguments(argumentsText, parameter) {
  const args = splitTopLevelArguments(argumentsText);
  if (args.length !== 2) return false;
  return resolvesParameter(args[0] ?? "", parameter);
}
function isSleepExecutor(argument) {
  const executor = readExecutor(argument);
  if (executor === void 0 || executor.parameter === "") return false;
  const call = TIMEOUT_CALL.exec(executor.body);
  if (call === null) return false;
  const group = readBalancedGroup(executor.body, call.index, PARENTHESES);
  if (group === void 0) return false;
  const residue = executor.body.slice(0, call.index) + executor.body.slice(group.end);
  if (IDENTIFIER_CHARACTER.test(residue.replaceAll(RETURN_KEYWORD, ""))) return false;
  return isSleepArguments(executor.body.slice(group.start + 1, group.end - 1), executor.parameter);
}
function resolvesParameter(text, parameter) {
  const trimmed = text.trim();
  if (trimmed === parameter) return true;
  const callback = readExecutor(trimmed);
  if (callback === void 0 || callback.parameter !== "") return false;
  const body = callback.body.replaceAll(/[\s;]/g, "");
  return body === `${parameter}()` || body === `return${parameter}()`;
}
function splitTopLevelArguments(text) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text.charAt(index);
    if (OPENERS.includes(character)) depth += 1;
    else if (CLOSERS.includes(character)) depth -= 1;
    else if (character === "," && depth === 0) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

// .readyup/kits/default.ts
var PACKAGE_NAME = "@williamthorsen/toolbelt.async";
var README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/async#readme";
var default_default = defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listSleepSites,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: "the project holds no JavaScript or TypeScript sources outside its bootstrap wrappers",
  packageName: PACKAGE_NAME,
  // The selection departs from the five source-oriented kits, which exempt tests on the ground that a test
  // writes their idioms deliberately. A test that sleeps is sleeping rather than exhibiting a form, and it is
  // where this idiom mostly lives, so a sweep exempting tests would report nothing in most projects.
  pathFilter: isAdoptableSourceOrTest,
  checks: [
    {
      name: "No source sleeps by hand",
      id: "no-hand-rolled-sleep",
      kinds: ["hand-rolled-sleep"],
      severity: "recommend",
      fix: `Replace each promise named above with delay from ${PACKAGE_NAME}/candidate, whose promise carries a cancel that clears the timer and settles at once. A hand-rolled sleep hands back no such handle, so a caller that finishes early still waits out the whole delay, and in a test the pending timer holds the event loop open past the assertion that it was waiting for. Reference: ${README_URL}`
    }
  ]
});
export {
  default_default as default
};
