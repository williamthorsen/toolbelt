/** @noformat -- @generated. Do not edit. Compiled by rdy. */
/* eslint-disable */
export const __readyupVersion = "0.37.0";


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

// ../adoption/src/conventions/site-handoffs.ts
function isManifestSearch(names) {
  return names.includes("package.json");
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
  const kitScope = { noSourcesReason: spec.noSourcesReason, pathFilter: spec.pathFilter };
  const pathFiltersByKind = mapPathFiltersByKind();
  const sweptPathFilters = [
    .../* @__PURE__ */ new Set([spec.pathFilter, ...spec.checks.map((check) => resolveScope(check).pathFilter)])
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
          skip: () => skipUnlessProjectHoldsSources(resolveScope(check)),
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
  function isSweptPath(path) {
    return sweptPathFilters.some((pathFilter) => pathFilter(path));
  }
  function loadSummary() {
    cache.summary ??= readProject();
    return cache.summary;
  }
  function mapPathFiltersByKind() {
    const pathFilters = /* @__PURE__ */ new Map();
    const conflicted = /* @__PURE__ */ new Set();
    for (const check of spec.checks) {
      const { pathFilter } = resolveScope(check);
      for (const kind of check.kinds) {
        const assigned = pathFilters.get(kind);
        if (assigned !== void 0 && assigned !== pathFilter) conflicted.add(kind);
        pathFilters.set(kind, pathFilter);
      }
    }
    if (conflicted.size > 0) {
      const kinds = [...conflicted].toSorted().join(", ");
      throw new Error(`${spec.packageName}'s kit reads one kind through more than one path filter: ${kinds}`);
    }
    return pathFilters;
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
  function resolveScope(check) {
    return check.pathFilter === void 0 ? kitScope : { noSourcesReason: check.noSourcesReason, pathFilter: check.pathFilter };
  }
  async function skipUnlessProjectHoldsSources(scope) {
    const summary = await loadSummary();
    if (summary === void 0) return NOT_A_REPO;
    return summary.sources.some((source) => scope.pathFilter(source.path)) ? false : scope.noSourcesReason;
  }
}

// ../adoption/src/portable/condenseWhitespace.ts
function condenseWhitespace(text) {
  return text.replaceAll(/\s+/g, " ");
}

// ../adoption/src/portable/listDirectoryAscents.ts
import { getLineAtOffset } from "readyup/check-utils";

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

// ../adoption/src/portable/listDirectoryAscents.ts
var ASSIGNED_TARGET = /(?<target>[A-Za-z_$][\w$]*) ?= ?$/;
var ASSIGNMENT_WINDOW = { lookahead: 0, lookbehind: 80 };
var BRACKET_CLOSERS = /* @__PURE__ */ new Set([")", "]", "}"]);
var BRACKET_OPENERS = /* @__PURE__ */ new Set(["(", "[", "{"]);
var DECLARATION = /\b(?:const|let|var)\s+(?<name>[A-Za-z_$][\w$]*)\s*(?::[^=;\n]*)?=(?![=>])/g;
var DECLARED_NAME = /\b(?:const|let|var)\s+(?<name>[A-Za-z_$][\w$]*)/g;
var DIRNAME_ASCENT = /(?:[A-Za-z_$][\w$]*\s*\.\s*)?\bdirname\s*\(\s*(?<subject>[A-Za-z_$][\w$]*)\s*\)/g;
var LEADING_SEPARATOR = /^[/\\]+/;
var LEVEL_PROBE = /\b(?:access|exists|lstat|readdir|readFile|stat)(?:Sync)?\s*\(/g;
var LOOP_KEYWORD = /\b(?<keyword>do|for|while)\b/g;
var PATH_TOKEN = /(?<quoted>(?<quote>['"])[^'"]*\k<quote>)|`|(?<![\w$.])(?<name>[A-Za-z_$][\w$]*)/g;
var REASSIGNMENT = /(?<![\w$.])(?<!\b(?:const|let|var)\s+)(?<name>[A-Za-z_$][\w$]*)\s*(?:\*\*|<<|>>>?|&&|\|\||\?\?|[-+*/%&|^])?=(?![=>])/g;
var SEPARATOR_RUN = /[/\\]+/g;
var SIMPLE_ASSIGNMENT = /(?<![\w$])(?<target>[A-Za-z_$][\w$]*)\s*=(?!=)\s*(?<value>[A-Za-z_$][\w$]*)(?![\w$.([])/g;
var STRING_CONSTANT = /\bconst\s+(?<name>[A-Za-z_$][\w$]*)\s*(?::\s*string\s*)?=\s*(?<literal>(?<quote>['"`])[^'"`$]*\k<quote>)\s*(?:as\s+const\s*)?(?=[;,)\n]|$)/dg;
var WHITESPACE = /\s/;
function listDirectoryAscents(code, source) {
  const constants = listStringConstants(code, source);
  const ascents = listLoops(code).flatMap((loop) => describeAscent(code, source, loop, constants) ?? []);
  return ascents.filter((ascent) => ascents.every((other) => other === ascent || !isNested(other.loop, ascent.loop))).map((ascent) => ({ line: getLineAtOffset(code, ascent.loop.start), probedNames: ascent.probedNames }));
}
function countMatchesByName(text, pattern) {
  const counts = /* @__PURE__ */ new Map();
  for (const match of text.matchAll(pattern)) {
    const name = match.groups?.["name"];
    if (name !== void 0) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return counts;
}
function describeAscent(code, source, loop, constants) {
  const subject = findAscendedBinding(code.slice(loop.start, loop.end));
  if (subject === void 0) return void 0;
  const scope = { bindings: listLoopBindings(code, source, loop, subject, constants), constants };
  return { loop, probedNames: listProbedNames(code, source, loop, subject, scope) };
}
function expandPathParts(parts, scope, subject) {
  return parts.flatMap((part) => {
    if (part.kind === "text" || part.name === subject) return [part];
    const constant = scope.constants.find((candidate) => candidate.name === part.name);
    if (constant !== void 0) return [{ kind: "text", text: constant.value }];
    return scope.bindings.find((candidate) => candidate.name === part.name)?.parts ?? [part];
  });
}
function findAscendedBinding(region) {
  const assignments = listSimpleAssignments(region);
  for (const match of region.matchAll(DIRNAME_ASCENT)) {
    const subject = match.groups?.["subject"];
    const target = readAssignedTarget(region, match.index);
    if (subject === void 0 || target === void 0) continue;
    if (target === subject) return subject;
    const isCarriedBack = assignments.some(
      (assignment) => assignment.target === subject && assignment.value === target
    );
    if (isCarriedBack) return subject;
  }
  return void 0;
}
function findBodyStart(code, afterKeyword, isDoLoop) {
  let index = afterKeyword;
  if (!isDoLoop) {
    const head = readBalancedGroup(code, index, PARENTHESES);
    if (head === void 0) return void 0;
    index = head.end;
  }
  while (index < code.length && WHITESPACE.test(code.charAt(index))) index += 1;
  return code.charAt(index) === "{" ? index : void 0;
}
function findExpressionEnd(code, from, limit) {
  let depth = 0;
  for (let index = from; index < limit; index += 1) {
    const character = code.charAt(index);
    if (BRACKET_OPENERS.has(character)) depth += 1;
    else if (BRACKET_CLOSERS.has(character)) {
      if (depth === 0) return index;
      depth -= 1;
    } else if ((character === "," || character === ";") && depth === 0) return index;
  }
  return limit;
}
function isNested(inner, outer) {
  return outer.start <= inner.start && inner.end <= outer.end;
}
function listLoopBindings(code, source, loop, subject, constants) {
  const region = code.slice(loop.start, loop.end);
  const declarationCounts = countMatchesByName(region, DECLARED_NAME);
  const reassignmentCounts = countMatchesByName(region, REASSIGNMENT);
  const bindings = [];
  for (const match of region.matchAll(DECLARATION)) {
    const name = match.groups?.["name"];
    if (name === void 0 || declarationCounts.get(name) !== 1 || reassignmentCounts.has(name)) continue;
    const valueStart = loop.start + match.index + match[0].length;
    const parts = readPathParts(code, source, valueStart, findExpressionEnd(code, valueStart, loop.end));
    if (parts === void 0) continue;
    bindings.push({ name, parts: expandPathParts(parts, { bindings, constants }, subject) });
  }
  return bindings;
}
function listLoops(code) {
  const loops = [];
  for (const match of code.matchAll(LOOP_KEYWORD)) {
    const bodyStart = findBodyStart(code, match.index + match[0].length, match.groups?.["keyword"] === "do");
    const body = bodyStart === void 0 ? void 0 : readBalancedGroup(code, bodyStart, BRACES);
    if (body !== void 0) loops.push({ end: body.end, start: match.index });
  }
  return loops;
}
function listProbedNames(code, source, loop, subject, scope) {
  const names = [];
  let isProbing = false;
  for (const match of code.slice(loop.start, loop.end).matchAll(LEVEL_PROBE)) {
    const argumentList = readBalancedGroup(code, loop.start + match.index + match[0].length - 1, PARENTHESES);
    if (argumentList === void 0) continue;
    const pathStart = argumentList.start + 1;
    const parts = readPathParts(code, source, pathStart, findExpressionEnd(code, pathStart, argumentList.end - 1));
    const expanded = parts === void 0 ? [] : expandPathParts(parts, scope, subject);
    const subjectIndex = expanded.findIndex((part) => part.kind === "read" && part.name === subject);
    if (subjectIndex === -1) continue;
    isProbing = true;
    const name = readProbedName(expanded.slice(subjectIndex + 1));
    if (name !== void 0) names.push(name);
  }
  return isProbing ? names : void 0;
}
function listSimpleAssignments(region) {
  const assignments = [];
  for (const match of region.matchAll(SIMPLE_ASSIGNMENT)) {
    const target = match.groups?.["target"];
    const value = match.groups?.["value"];
    if (target !== void 0 && value !== void 0) assignments.push({ target, value });
  }
  return assignments;
}
function listStringConstants(code, source) {
  const constants = [];
  const declarationCounts = countMatchesByName(code, DECLARED_NAME);
  for (const match of code.matchAll(STRING_CONSTANT)) {
    const name = match.groups?.["name"];
    const value = readLiteral(source, match.indices?.groups?.["literal"]);
    if (name === void 0 || value === void 0) continue;
    if (declarationCounts.get(name) === 1) constants.push({ name, value });
  }
  return constants;
}
function readAssignedTarget(region, offset) {
  const { before } = readAnchoredWindow(region, offset, ASSIGNMENT_WINDOW);
  return ASSIGNED_TARGET.exec(before)?.groups?.["target"];
}
function readPathParts(code, source, start, end) {
  const parts = [];
  let resumeAt = start;
  for (const match of code.slice(start, end).matchAll(PATH_TOKEN)) {
    const offset = start + match.index;
    if (offset < resumeAt) continue;
    const name = match.groups?.["name"];
    const quoted = match.groups?.["quoted"];
    if (name !== void 0) {
      parts.push({ kind: "read", name });
    } else if (quoted !== void 0) {
      parts.push({ kind: "text", text: source.slice(offset + 1, offset + quoted.length - 1) });
    } else {
      const template = readTemplateParts(code, source, offset, end);
      if (template === void 0) return void 0;
      parts.push(...template.parts);
      resumeAt = template.end;
    }
  }
  return parts;
}
function readProbedName(parts) {
  const segments = [];
  for (const part of parts) {
    if (part.kind === "read") return void 0;
    if (part.text !== "") segments.push(part.text);
  }
  const name = segments.join("/").replaceAll(SEPARATOR_RUN, "/").replace(LEADING_SEPARATOR, "");
  return name === "" ? void 0 : name;
}
function readTemplateParts(code, source, open, end) {
  const parts = [];
  let textStart = open + 1;
  for (; ; ) {
    const close = code.indexOf("`", textStart);
    if (close === -1 || close >= end) return void 0;
    const interpolation = code.indexOf("${", textStart);
    if (interpolation === -1 || interpolation > close) {
      parts.push({ kind: "text", text: source.slice(textStart, close) });
      return { end: close + 1, parts };
    }
    parts.push({ kind: "text", text: source.slice(textStart, interpolation) });
    const group = readBalancedGroup(code, interpolation + 1, BRACES);
    if (group === void 0 || group.end > end) return void 0;
    const interpolated = readPathParts(code, source, group.start + 1, group.end - 1);
    if (interpolated === void 0) return void 0;
    parts.push(...interpolated);
    textStart = group.end;
  }
}

// ../adoption/src/mod.ts
import { blankNonCode, getLineAtOffset as getLineAtOffset2 } from "readyup/check-utils";

// src/readiness/adoptedExports.ts
var ADOPTED_EXPORTS = ["findPackageRoot", "findProjectRoot", "resolveSelfVersion"];

// src/readiness/listManifestSearchSites.ts
function listManifestSearchSites(source) {
  return listDirectoryAscents(blankNonCode(source), source).filter(({ probedNames }) => probedNames !== void 0 && isManifestSearch(probedNames)).map(({ line }) => ({ kind: "manifest-search", line }));
}

// .readyup/kits/default.ts
var FILESYSTEM_PACKAGE_NAME = "@williamthorsen/toolbelt.filesystem";
var PACKAGE_NAME = "@williamthorsen/toolbelt.packaging";
var README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/packaging#readme";
var default_default = defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listManifestSearchSites,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: "the project holds no JavaScript or TypeScript sources outside the exempt paths",
  packageName: PACKAGE_NAME,
  // A test writes this walk deliberately, and a bootstrap wrapper hand-rolls what it reaches for so that its
  // build-first message survives an incomplete install.
  pathFilter: isAdoptableSource,
  checks: [
    {
      name: "No source searches the directory chain for package.json by hand",
      id: "no-hand-rolled-manifest-search",
      kinds: ["manifest-search"],
      severity: "recommend",
      fix: `Replace the loop named above with the function that matches what the loop looks for. Where it finds the package that owns the running module, call findPackageRoot(import.meta.url) from ${PACKAGE_NAME}/candidate, or resolveSelfVersion(import.meta.url) from the same subpath where the loop goes on to read the manifest's version. Both pass over a manifest that declares no name, such as the one that a dual-format build leaves in dist/, and both throw where no ancestor declares one. Where it finds the project that holds a directory, call findProjectRoot(dir) from ${PACKAGE_NAME}. It prefers .git and lockfiles to package.json, so in a monorepo it returns the repository root rather than the nearest package, and it returns the start directory rather than throwing where it finds neither. Where it needs the nearest manifest whatever that manifest declares, call findDirectoryChainMatch(dir, ['package.json']) from ${FILESYSTEM_PACKAGE_NAME}, since no function in this package returns it. Reference: ${README_URL}`
    }
  ]
});
export {
  default_default as default
};
