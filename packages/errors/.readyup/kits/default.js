/** @noformat -- @generated. Do not edit. Compiled by rdy. */
/* eslint-disable */
export const __readyupVersion = "0.46.2";


// ../adoption/src/conventions/path-predicates.ts
var BIN_DIRECTORY = /(?:^|\/)bin\//;
var JS_TS_EXTENSION = /\.[cm]?[jt]sx?$/;
var TEST_DIRECTORY = /(?:^|\/)__tests__\//;
var TEST_SUFFIX = /\.(?:spec|test)\.[cm]?[jt]sx?$/;
function isAdoptableSource(path) {
  return isJsTsSource(path) && !isBinWrapper(path) && !isTestFile(path) && !isInTestDirectory(path);
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

// ../adoption/src/portable/readAnchoredWindow.ts
function readAnchoredWindow(source, offset, lengths) {
  return {
    after: condenseWhitespace(source.slice(offset, offset + lengths.lookahead)),
    before: condenseWhitespace(source.slice(Math.max(0, offset - lengths.lookbehind), offset))
  };
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

// ../adoption/src/portable/readLiteral.ts
function readLiteral(source, span) {
  const start = span?.[0];
  const end = span?.[1];
  return start === void 0 || end === void 0 ? void 0 : source.slice(start + 1, end - 1);
}

// ../adoption/src/portable/listFunctionBodies.ts
var FUNCTION_HEAD = /(?:function\s+(?<declared>\w+)\s*(?:<[^<>]*>\s*)?\(|(?:const|let|var)\s+(?<bound>\w+)[^=;]*=\s*(?:async\s+)?(?:function\s*)?(?:<[^<>]*>\s*)?\((?<arrowParameters>[^)]*)\)[^=;{]*=>)/g;
var PLAIN_PARAMETER = /^\s*(?<name>[A-Za-z_$][\w$]*)\s*(?=[,:=?]|$)/;
function listFunctionBodies(source) {
  const bodies = [];
  FUNCTION_HEAD.lastIndex = 0;
  let head = FUNCTION_HEAD.exec(source);
  while (head !== null) {
    const name = head.groups?.["declared"] ?? head.groups?.["bound"];
    const from = findBodySearchStart(source, head);
    const body = from === void 0 ? void 0 : readBalancedGroup(source, from, BRACES);
    if (name !== void 0 && from !== void 0 && body !== void 0 && !source.slice(from, body.start).includes(";")) {
      const firstParameter = findFirstParameterName(readParameterText(source, head));
      bodies.push({
        bodyEnd: body.end,
        bodyStart: body.start,
        ...firstParameter !== void 0 && { firstParameter },
        headStart: head.index,
        name
      });
    }
    head = FUNCTION_HEAD.exec(source);
  }
  return bodies;
}
function findBodySearchStart(source, head) {
  if (head.groups?.["declared"] === void 0) return head.index + head[0].length;
  return readBalancedGroup(source, head.index, PARENTHESES)?.end;
}
function findFirstParameterName(parameterText) {
  if (parameterText === void 0) return void 0;
  return PLAIN_PARAMETER.exec(parameterText)?.groups?.["name"];
}
function readParameterText(source, head) {
  const arrowParameters = head.groups?.["arrowParameters"];
  if (arrowParameters !== void 0) return arrowParameters;
  const group = readBalancedGroup(source, head.index, PARENTHESES);
  return group === void 0 ? void 0 : source.slice(group.start + 1, group.end - 1);
}

// ../adoption/src/mod.ts
import { blankNonCode, getLineAtOffset } from "readyup/check-utils";

// src/readiness/adoptedExports.ts
var ADOPTED_EXPORTS = [
  "assertIsError",
  "chainError",
  "describeError",
  "isError",
  "isMissingPathError"
];

// src/readiness/classifySite.ts
var DESCRIBE_TERNARY = /^instanceof Error \? [\w.]+\.message :/;
var DESCRIBE_STATEMENT = /^instanceof Error\)+ ?(?:\{ )?return [\w.]+\.message/;
var COERCE_TERNARY = /^instanceof Error \? [\w.]+ : new \w*Error\b/;
var NEGATED_OPERAND = /!\(\s*[\w.]+\s*$/;
function classifySite(before, after) {
  if (DESCRIBE_TERNARY.test(after) || DESCRIBE_STATEMENT.test(after)) return "describe-inline";
  if (COERCE_TERNARY.test(after)) return "coerce";
  if (NEGATED_OPERAND.test(before) && after.includes("throw")) return "assert";
  return "narrow";
}

// src/readiness/listDescribeClones.ts
function listDescribeClones(source) {
  return listFunctionBodies(source).filter((fn) => isDescribeBody(source.slice(fn.bodyStart, fn.bodyEnd))).map((fn) => ({ end: fn.bodyEnd, name: fn.name, start: fn.headStart }));
}
function isDescribeBody(body) {
  const collapsed = condenseWhitespace(body).trim();
  if (!collapsed.includes("instanceof Error") || !/return [\w.]+\.message/.test(collapsed)) return false;
  const statements = collapsed.replaceAll(/if \([^()]*\)/g, "").replaceAll(/else/g, "").replaceAll(/[{}]/g, " ").split(";").map((statement) => statement.trim()).filter((statement) => statement !== "");
  return statements.length > 0 && statements.every((statement) => statement.startsWith("return"));
}

// src/readiness/listMissingPathSites.ts
var MISSING_PATH_CODES = ["ENOENT", "ENOTDIR"];
var BLANKED_LITERAL = /(['"`]) *\1/dg;
var OPERATOR_BEFORE = /(?:===|==|!==|!=)\s*$/;
var OPERATOR_AFTER = /\s*(?:===|==|!==|!=)\s*/y;
var CHAINED_CODE_AFTER = /(?:[\w$]+\??\.)*code(?![\w$])/y;
var MEMBER_CODE_AFTER = /\??\.code(?![\w$])/y;
var MERGE_SEPARATOR = /^[\s()]*(?:\|\||&&)[\s()]*$/;
var IF_HEAD = /\bif\s*\(/;
var BOOLEAN_RETURN = /^return (?:true|false)$/;
var POSITIVE_COMPARISON = /(?<![!=<>])==/;
function listMissingPathSites(source, code) {
  const comparisons = listComparisons(source, code);
  const clones = listClones(code, comparisons);
  const inlineComparisons = comparisons.filter(
    (comparison) => clones.every((clone) => comparison.start < clone.start || comparison.end > clone.end)
  );
  const inlineSites = groupComparisons(code, inlineComparisons).map((group) => toInlineSite(code, group));
  return [...clones, ...inlineSites].toSorted((first, second) => first.start - second.start);
}
function coversBothCodes(comparisons) {
  return new Set(comparisons.map((comparison) => comparison.code)).size === MISSING_PATH_CODES.length;
}
function groupComparisons(code, comparisons) {
  const groups = [];
  for (const comparison of comparisons) {
    const group = groups.at(-1);
    const previous = group?.at(-1);
    const joins = previous !== void 0 && previous.operand === comparison.operand && MERGE_SEPARATOR.test(code.slice(previous.end, comparison.start));
    if (group !== void 0 && joins) group.push(comparison);
    else groups.push([comparison]);
  }
  return groups;
}
function isGuardedBooleanBody(body) {
  let text = body;
  for (let index = text.search(IF_HEAD); index !== -1; index = text.search(IF_HEAD)) {
    const condition = readBalancedGroup(text, index, PARENTHESES);
    if (condition === void 0) return false;
    text = `${text.slice(0, index)} ${text.slice(condition.end)}`;
  }
  const statements = condenseWhitespace(text).replaceAll(/\belse\b/g, " ").replaceAll(/[{}]/g, " ").split(";").map((statement) => statement.trim()).filter((statement) => statement !== "");
  return statements.length > 0 && statements.every(
    (statement) => BOOLEAN_RETURN.test(statement) || /^return\b/.test(statement) && POSITIVE_COMPARISON.test(statement)
  );
}
function isMissingPathCode(text) {
  return MISSING_PATH_CODES.some((code) => code === text);
}
function isParameterCode(operand, parameter) {
  const escaped = parameter.replaceAll("$", String.raw`\$`);
  return operand === `${parameter}.code` || new RegExp(String.raw`^\(\s*${escaped}(?![\w$])`).test(operand);
}
function listClones(code, comparisons) {
  return listFunctionBodies(code).flatMap((fn) => {
    const parameter = fn.firstParameter;
    if (parameter === void 0) return [];
    const inBody = comparisons.filter((comparison) => comparison.start >= fn.bodyStart && comparison.end <= fn.bodyEnd);
    const isClone = coversBothCodes(inBody) && inBody.every((comparison) => !comparison.isNegated && isParameterCode(comparison.operand, parameter)) && isGuardedBooleanBody(code.slice(fn.bodyStart, fn.bodyEnd));
    return isClone ? [
      {
        end: fn.bodyEnd,
        kind: "missing-path-clone",
        line: getLineAtOffset(code, fn.headStart),
        start: fn.headStart,
        symbol: fn.name
      }
    ] : [];
  });
}
function listComparisons(source, code) {
  const comparisons = [];
  for (const match of code.matchAll(BLANKED_LITERAL)) {
    const literal = readLiteral(source, match.indices?.[0]);
    if (!isMissingPathCode(literal)) continue;
    const literalStart = match.index;
    const literalEnd = literalStart + match[0].length;
    const comparison = readComparisonBefore(code, literalStart, literalEnd) ?? readComparisonAfter(code, literalStart, literalEnd);
    if (comparison !== void 0) comparisons.push({ ...comparison, code: literal });
  }
  return comparisons;
}
function normalizeOperand(text) {
  return condenseWhitespace(text).replaceAll("?.", ".");
}
function readComparisonAfter(code, literalStart, literalEnd) {
  OPERATOR_AFTER.lastIndex = literalEnd;
  const operator = OPERATOR_AFTER.exec(code);
  if (operator === null) return void 0;
  const operandStart = OPERATOR_AFTER.lastIndex;
  let operandEnd;
  if (code[operandStart] === "(") {
    const group = readBalancedGroup(code, operandStart, PARENTHESES);
    if (group === void 0) return void 0;
    MEMBER_CODE_AFTER.lastIndex = group.end;
    if (MEMBER_CODE_AFTER.test(code)) operandEnd = MEMBER_CODE_AFTER.lastIndex;
  } else {
    CHAINED_CODE_AFTER.lastIndex = operandStart;
    if (CHAINED_CODE_AFTER.test(code)) operandEnd = CHAINED_CODE_AFTER.lastIndex;
  }
  if (operandEnd === void 0) return void 0;
  return {
    end: operandEnd,
    isNegated: operator[0].includes("!"),
    operand: normalizeOperand(code.slice(operandStart, operandEnd)),
    start: literalStart
  };
}
function readComparisonBefore(code, literalStart, literalEnd) {
  const operator = OPERATOR_BEFORE.exec(code.slice(0, literalStart));
  if (operator === null) return void 0;
  const operandEnd = code.slice(0, operator.index).trimEnd().length;
  const operandStart = readOperandStart(code, operandEnd);
  if (operandStart === void 0) return void 0;
  return {
    end: literalEnd,
    isNegated: operator[0].includes("!"),
    operand: normalizeOperand(code.slice(operandStart, operandEnd)),
    start: operandStart
  };
}
function readOpeningParenthesis(code, close) {
  let depth = 0;
  for (let index = close; index >= 0; index -= 1) {
    if (code[index] === ")") depth += 1;
    else if (code[index] === "(") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return void 0;
}
function readOperandStart(code, end) {
  const nameStart = end - "code".length;
  if (code.slice(nameStart, end) !== "code") return void 0;
  let start = nameStart;
  if (code[start - 1] !== ".") return /[\w$.]/.test(code[start - 1] ?? "") ? void 0 : start;
  start -= code[start - 2] === "?" ? 2 : 1;
  if (code[start - 1] === ")") return readOpeningParenthesis(code, start - 1);
  while (/[\w$.?]/.test(code[start - 1] ?? "")) start -= 1;
  while (code[start] === "." || code[start] === "?") start += 1;
  return start < nameStart - 1 ? start : void 0;
}
function toInlineSite(code, group) {
  const start = group[0]?.start ?? 0;
  const end = group.at(-1)?.end ?? start;
  const kind = coversBothCodes(group) ? "missing-path-test" : "missing-path-partial";
  return { end, kind, line: getLineAtOffset(code, start), start };
}

// src/readiness/listErrorSites.ts
var OPERATOR = /\binstanceof\s+Error\b/g;
var WINDOW = { lookahead: 240, lookbehind: 80 };
var AND_AHEAD = /\s*&&/y;
function listErrorSites(source) {
  const code = blankNonCode(source);
  const clones = listDescribeClones(code);
  const missingPathSites = listMissingPathSites(source, code);
  const sites = missingPathSites.map(({ end: _end, start, ...site }) => ({
    ...site,
    offset: start
  }));
  const claimed = /* @__PURE__ */ new Set();
  for (const match of code.matchAll(OPERATOR)) {
    if (isClaimedByMissingPathSite(code, match.index + match[0].length, missingPathSites)) continue;
    const clone = clones.find((candidate) => match.index > candidate.start && match.index < candidate.end);
    const line = getLineAtOffset(code, match.index);
    if (clone === void 0) {
      const { after, before } = readAnchoredWindow(code, match.index, WINDOW);
      sites.push({ kind: classifySite(before, after), line, offset: match.index });
    } else if (!claimed.has(clone.name)) {
      claimed.add(clone.name);
      sites.push({ kind: "describe-clone", line, offset: match.index, symbol: clone.name });
    }
  }
  return sites.toSorted((first, second) => first.offset - second.offset).map(({ offset: _offset, ...site }) => site);
}
function findChainEnd(code, from) {
  let depth = 0;
  for (let index = from; index < code.length; index += 1) {
    const character = code[index];
    if (character === "(" || character === "[") depth += 1;
    else if (character === ")" || character === "]") {
      AND_AHEAD.lastIndex = index + 1;
      if (depth === 0 && !AND_AHEAD.test(code)) return index;
      depth = Math.max(0, depth - 1);
    } else if (depth === 0 && isChainBoundary(code, index)) return index;
  }
  return code.length;
}
function isAfterAnd(code, index) {
  let last = index - 1;
  while (last >= 0 && /\s/.test(code[last] ?? "")) last -= 1;
  return code[last] === "&" && code[last - 1] === "&";
}
function isChainBoundary(code, index) {
  const character = code[index];
  if (character === "?") return code[index + 1] !== ".";
  if (character === "\n") {
    AND_AHEAD.lastIndex = index;
    return !AND_AHEAD.test(code) && !isAfterAnd(code, index);
  }
  return character === ";" || character === "{" || character === "}" || character === "," || code.startsWith("||", index);
}
function isClaimedByMissingPathSite(code, anchorEnd, sites) {
  if (sites.some((site) => site.kind === "missing-path-clone" && anchorEnd > site.start && anchorEnd <= site.end)) {
    return true;
  }
  const chainEnd = findChainEnd(code, anchorEnd);
  return sites.some((site) => site.kind !== "missing-path-clone" && site.start >= anchorEnd && site.start < chainEnd);
}

// .readyup/kits/default.ts
var PACKAGE_NAME = "@williamthorsen/toolbelt.errors";
var README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/errors#readme";
var default_default = defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listErrorSites,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: "the project contains no JavaScript or TypeScript sources outside the exempt paths",
  packageName: PACKAGE_NAME,
  // A test constructs error shapes deliberately, and a bootstrap wrapper's hand-rolled handling keeps its
  // build-first message alive through an incomplete install.
  pathFilter: isAdoptableSource,
  checks: [
    {
      name: "No source defines its own description helper",
      id: "no-describe-clone",
      kinds: ["describe-clone"],
      fix: `Delete the function named above and import describeError from ${PACKAGE_NAME}. One import replaces the whole helper. Reference: ${README_URL}`
    },
    {
      name: "No source describes a thrown value inline",
      id: "no-inline-description",
      kinds: ["describe-inline"],
      fix: `Replace each expression named above with describeError, imported from ${PACKAGE_NAME}. A domain-literal fallback discards what was thrown; describeError keeps it.`
    },
    {
      name: "No source narrows a thrown value by hand",
      id: "no-instanceof-error",
      kinds: ["assert", "narrow"],
      severity: "recommend",
      fix: `Use isError from ${PACKAGE_NAME}, or assertIsError from ${PACKAGE_NAME}/candidate when the narrowing throws. Both recognize an Error crossing a realm boundary, which a bare instanceof test reports as false.`
    },
    {
      name: "No source coerces a thrown value to an Error by hand",
      id: "no-error-coercion",
      kinds: ["coerce"],
      severity: "recommend",
      fix: `${PACKAGE_NAME} publishes no coercer, so this reports an unmet need rather than a substitution. Raise it at ${README_URL} if the sites above are worth one.`
    },
    {
      name: "No source defines its own missing-path predicate",
      id: "no-missing-path-clone",
      kinds: ["missing-path-clone"],
      fix: `Delete the function named above and import isMissingPathError from ${PACKAGE_NAME}/candidate. One import replaces the whole helper.`
    },
    {
      name: "No source tests for a missing path by hand",
      id: "no-missing-path-test",
      kinds: ["missing-path-test"],
      severity: "recommend",
      fix: `Replace each test named above with isMissingPathError, imported from ${PACKAGE_NAME}/candidate.`
    },
    {
      name: "No source tests for ENOENT or ENOTDIR alone",
      id: "no-partial-missing-path-test",
      kinds: ["missing-path-partial"],
      severity: "recommend",
      fix: `isMissingPathError, from ${PACKAGE_NAME}/candidate, treats ENOENT and ENOTDIR alike, so adopting it at a site named above also treats the other code as a missing path. Adopt it where that is the intent, and silence a site that tests one code on purpose with a pragma naming this check.`
    }
  ]
});
export {
  default_default as default
};
