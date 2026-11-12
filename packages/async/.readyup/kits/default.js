/** @noformat -- @generated. Do not edit. Compiled by rdy. */
/* eslint-disable */
export const __readyupVersion = "0.46.0";


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
  assertCheckIdsAreUnique(spec);
  const cache = {};
  const adoptedPackage = { exportNames: spec.exportNames, packageName: spec.packageName };
  const kitScope = { noSourcesReason: spec.noSourcesReason, pathFilter: spec.pathFilter };
  const pathFiltersByKind = mapPathFiltersByKind(spec, kitScope);
  const sweptPathFilters = [
    .../* @__PURE__ */ new Set([spec.pathFilter, ...spec.checks.map((check) => resolveScope(check, kitScope).pathFilter)])
  ];
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
          skip: () => skipUnlessProjectHoldsSources(resolveScope(check, kitScope)),
          check: () => reportKinds(check.kinds),
          fix: check.fix
        }))
      }
    ]
  });
  function isSweptPath(path) {
    return sweptPathFilters.some((pathFilter) => pathFilter(path));
  }
  function loadSummary() {
    cache.summary ??= readProject();
    return cache.summary;
  }
  async function readProject() {
    const sources = await readTrackedSources(isSweptPath);
    if (sources === void 0) return void 0;
    return {
      adoptedCount: countPackageUsage(sources, adoptedPackage),
      findings: sources.flatMap(
        (source) => spec.detect(source.text).filter((site) => (pathFiltersByKind.get(site.kind) ?? spec.pathFilter)(source.path)).map((site) => ({ ...site, path: source.path }))
      ),
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
  async function skipUnlessProjectHoldsSources(scope) {
    const summary = await loadSummary();
    if (summary === void 0) return NOT_A_REPO;
    return summary.sources.some((source) => scope.pathFilter(source.path)) ? false : scope.noSourcesReason;
  }
}
function assertCheckIdsAreUnique(spec) {
  const seenIds = /* @__PURE__ */ new Set();
  const duplicateIds = /* @__PURE__ */ new Set();
  for (const { id } of spec.checks) {
    if (seenIds.has(id)) duplicateIds.add(id);
    seenIds.add(id);
  }
  if (duplicateIds.size === 0) return;
  const ids = [...duplicateIds].toSorted().join(", ");
  throw new Error(`${spec.packageName}'s kit gives one id to more than one check: ${ids}`);
}
function mapPathFiltersByKind(spec, kitScope) {
  const pathFilters = /* @__PURE__ */ new Map();
  const conflictingKinds = /* @__PURE__ */ new Set();
  for (const check of spec.checks) {
    const { pathFilter } = resolveScope(check, kitScope);
    for (const kind of check.kinds) {
      const assignedPathFilter = pathFilters.get(kind);
      if (assignedPathFilter !== void 0 && assignedPathFilter !== pathFilter) conflictingKinds.add(kind);
      pathFilters.set(kind, pathFilter);
    }
  }
  if (conflictingKinds.size > 0) {
    const kinds = [...conflictingKinds].toSorted().join(", ");
    throw new Error(`${spec.packageName}'s kit reads one kind through more than one path filter: ${kinds}`);
  }
  return pathFilters;
}
function resolveScope(check, kitScope) {
  return check.pathFilter === void 0 ? kitScope : { noSourcesReason: check.noSourcesReason, pathFilter: check.pathFilter };
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

// ../adoption/src/portable/listTopLevelArguments.ts
var CLOSERS = ")]}";
var OPENERS = "([{";
function listTopLevelArguments(inner) {
  const args = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < inner.length; index += 1) {
    const character = inner.charAt(index);
    if (OPENERS.includes(character)) depth += 1;
    else if (CLOSERS.includes(character)) depth -= 1;
    else if (character === "," && depth === 0) {
      args.push(inner.slice(start, index));
      start = index + 1;
    }
  }
  args.push(inner.slice(start));
  const last = args.at(-1);
  if (args.length > 1 && last !== void 0 && last.trim() === "") args.pop();
  return args;
}

// ../adoption/src/portable/readFunctionLiteral.ts
var BARE_PARAMETER_ARROW = /^(?<parameter>[\w$]+)\s*=>/;
var FUNCTION_KEYWORD = /^function\b/;
function readFunctionLiteral(text) {
  const trimmed = text.trimStart();
  const bare = BARE_PARAMETER_ARROW.exec(trimmed);
  if (bare?.groups?.["parameter"] !== void 0) {
    return { body: trimmed.slice(bare[0].length), parameters: bare.groups["parameter"] };
  }
  const isFunctionExpression = FUNCTION_KEYWORD.test(trimmed);
  const list = readBalancedGroup(trimmed, 0, PARENTHESES);
  if (list === void 0 || !isFunctionExpression && list.start !== 0) return void 0;
  const parameters = trimmed.slice(list.start + 1, list.end - 1);
  const bodyStart = isFunctionExpression ? findBlockStart(trimmed, list.end) : findArrowBodyStart(trimmed, list.end);
  return bodyStart === void 0 ? void 0 : { body: trimmed.slice(bodyStart), parameters };
}
function findArrowBodyStart(text, listEnd) {
  const arrow = text.indexOf("=>", listEnd);
  return arrow === -1 ? void 0 : arrow + 2;
}
function findBlockStart(text, listEnd) {
  return readBalancedGroup(text, listEnd, BRACES)?.start;
}

// ../adoption/src/mod.ts
import { blankNonCode, getLineAtOffset } from "readyup/check-utils";

// src/readiness/adoptedExports.ts
var ADOPTED_EXPORTS = ["debounce", "delay", "flushMicrotasks"];

// src/readiness/readExecutor.ts
var IDENTIFIER = /^[\w$]+$/;
var PARAMETER_TAIL = /[:=,]/;
function readExecutor(text) {
  const literal = readFunctionLiteral(text);
  if (literal === void 0) return void 0;
  const parameter = readFirstParameter(literal.parameters);
  return parameter === void 0 ? void 0 : { body: readBody(literal.body), parameter };
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

// src/readiness/listSleepSites.ts
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
  const args = listTopLevelArguments(argumentsText);
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

// .readyup/kits/default.ts
var PACKAGE_NAME = "@williamthorsen/toolbelt.async";
var README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/async#readme";
var default_default = defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listSleepSites,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: "the project contains no JavaScript or TypeScript sources outside its bootstrap wrappers",
  packageName: PACKAGE_NAME,
  // Tests are swept: A test that sleeps is sleeping rather than exhibiting a form, and tests are where this idiom
  // mostly lives, so a sweep exempting them would report nothing in most projects.
  pathFilter: isAdoptableSourceOrTest,
  checks: [
    {
      name: "No source sleeps by hand",
      id: "no-hand-rolled-sleep",
      kinds: ["hand-rolled-sleep"],
      severity: "recommend",
      fix: `Replace each promise named above with delay from ${PACKAGE_NAME}/candidate, whose promise comes with a cancel that clears the timer and settles at once. Because a hand-rolled sleep hands back no such handle, a caller that finishes early still waits out the whole delay, and in a test the pending timer holds the event loop open past the assertion that it was waiting for. Reference: ${README_URL}`
    }
  ]
});
export {
  default_default as default
};
