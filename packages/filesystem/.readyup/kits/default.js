/** @noformat -- @generated. Do not edit. Compiled by rdy. */
/* eslint-disable */
export const __readyupVersion = "0.35.1";


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
var BLANKED_LITERAL = /(?<quote>['"`])[^'"`]*\k<quote>/g;
var BRACKET_CLOSERS = /* @__PURE__ */ new Set([")", "]", "}"]);
var BRACKET_OPENERS = /* @__PURE__ */ new Set(["(", "[", "{"]);
var DIRNAME_ASCENT = /(?:[A-Za-z_$][\w$]*\s*\.\s*)?\bdirname\s*\(\s*(?<subject>[A-Za-z_$][\w$]*)\s*\)/g;
var IDENTIFIER = /(?<![\w$.])[A-Za-z_$][\w$]*/g;
var LEADING_SEPARATOR = /^[/\\]+/;
var LEVEL_PROBE = /\b(?:access|exists|lstat|readdir|readFile|stat)(?:Sync)?\s*\(/g;
var LOOP_KEYWORD = /\b(?<keyword>do|for|while)\b/g;
var SEPARATOR_RUN = /[/\\]+/g;
var SIMPLE_ASSIGNMENT = /(?<![\w$])(?<target>[A-Za-z_$][\w$]*)\s*=(?!=)\s*(?<value>[A-Za-z_$][\w$]*)(?![\w$.([])/g;
var WHITESPACE = /\s/;
function listDirectoryAscents(code, source) {
  const ascents = listLoops(code).flatMap((loop) => describeAscent(code, source, loop) ?? []);
  return ascents.filter((ascent) => ascents.every((other) => other === ascent || !isNested(other.loop, ascent.loop))).map((ascent) => ({ line: getLineAtOffset(code, ascent.loop.start), probedNames: ascent.probedNames }));
}
function describeAscent(code, source, loop) {
  const subject = findAscendedBinding(code.slice(loop.start, loop.end));
  if (subject === void 0) return void 0;
  return { loop, probedNames: listProbedNames(code, source, loop, subject) };
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
function isNested(inner, outer) {
  return outer.start <= inner.start && inner.end <= outer.end;
}
function listIdentifiers(text) {
  return text.match(IDENTIFIER) ?? [];
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
function listProbedNames(code, source, loop, subject) {
  const region = code.slice(loop.start, loop.end);
  const names = [];
  let isProbing = false;
  for (const match of region.matchAll(LEVEL_PROBE)) {
    const argumentList = readBalancedGroup(region, match.index + match[0].length - 1, PARENTHESES);
    if (argumentList === void 0) continue;
    const pathText = readFirstArgument(region.slice(argumentList.start + 1, argumentList.end - 1));
    const subjectRead = pathText.matchAll(IDENTIFIER).find((read) => read[0] === subject);
    if (subjectRead === void 0) continue;
    isProbing = true;
    const pathOffset = loop.start + argumentList.start + 1;
    const name = readProbedName(source, pathText, pathOffset, subjectRead.index + subject.length);
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
function readAssignedTarget(region, offset) {
  const { before } = readAnchoredWindow(region, offset, ASSIGNMENT_WINDOW);
  return ASSIGNED_TARGET.exec(before)?.groups?.["target"];
}
function readFirstArgument(argumentText) {
  let depth = 0;
  for (let index = 0; index < argumentText.length; index += 1) {
    const character = argumentText.charAt(index);
    if (BRACKET_OPENERS.has(character)) depth += 1;
    else if (BRACKET_CLOSERS.has(character)) depth -= 1;
    else if (character === "," && depth === 0) return argumentText.slice(0, index);
  }
  return argumentText;
}
function readProbedName(source, pathText, offset, from) {
  if (listIdentifiers(pathText.slice(from)).length > 0) return void 0;
  const segments = pathText.matchAll(BLANKED_LITERAL).filter((match) => match.index + match[0].length > from).map((match) => {
    const end = match.index + match[0].length;
    if (match.index >= from) return readLiteral(source, [offset + match.index, offset + end]) ?? "";
    const rest = source.slice(offset + from, offset + end - 1);
    return rest.slice(rest.indexOf("}") + 1);
  }).toArray();
  const name = segments.join("/").replaceAll(SEPARATOR_RUN, "/").replace(LEADING_SEPARATOR, "");
  return name === "" ? void 0 : name;
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
import { blankNonCode, getLineAtOffset as getLineAtOffset2 } from "readyup/check-utils";

// src/readiness/adoptedExports.ts
var ADOPTED_EXPORTS = [
  "findDirectoryChainMatch",
  "listDirectoryChain",
  "listDirectoryChainMatches",
  "loadConfigCascade",
  "reconcileFile",
  "reconcileFileFromFile",
  "replaceFileExtension",
  "writeAtomic"
];

// src/readiness/listAtomicWriteSites.ts
var BOUND_PATH_ARGUMENT = /^\s*(?<name>[A-Za-z_$][\w$]*)\s*(?:,|$)/;
var RENAME_CALL = /\brename(?:Sync)?\s*\(/g;
var WRITE_CALL = /\bwriteFile(?:Sync)?\s*\(/g;
function listAtomicWriteSites(code) {
  const claims = /* @__PURE__ */ new Map();
  for (const fn of listFunctionBodies(code)) {
    const body = code.slice(fn.bodyStart, fn.bodyEnd);
    const writes = listPathArguments(body, WRITE_CALL);
    const bodyLength = fn.bodyEnd - fn.bodyStart;
    for (const rename of listPathArguments(body, RENAME_CALL)) {
      const isPaired = writes.some((write) => write.name === rename.name && write.offset < rename.offset);
      if (!isPaired) continue;
      const offset = fn.bodyStart + rename.offset;
      const claimed = claims.get(offset);
      if (claimed !== void 0 && claimed.bodyLength <= bodyLength) continue;
      claims.set(offset, {
        bodyLength,
        offset,
        site: { kind: "temp-write-rename", line: getLineAtOffset2(code, offset), symbol: fn.name }
      });
    }
  }
  return claims.values().toArray().toSorted((a, b) => a.offset - b.offset).map((claim) => claim.site);
}
function listPathArguments(body, pattern) {
  const calls = [];
  for (const match of body.matchAll(pattern)) {
    const argumentList = readBalancedGroup(body, match.index + match[0].length - 1, PARENTHESES);
    if (argumentList === void 0) continue;
    const name = BOUND_PATH_ARGUMENT.exec(body.slice(argumentList.start + 1, argumentList.end - 1))?.groups?.["name"];
    if (name !== void 0) calls.push({ name, offset: match.index });
  }
  return calls;
}

// src/readiness/listChainWalkSites.ts
function listChainWalkSites(code, source) {
  return listDirectoryAscents(code, source).flatMap(({ line, probedNames }) => {
    if (probedNames === void 0) return [{ kind: "chain-walk", line }];
    return isManifestSearch(probedNames) ? [] : [{ kind: "chain-probe", line }];
  });
}

// src/readiness/listFilesystemIdioms.ts
function listFilesystemIdioms(source) {
  const code = blankNonCode(source);
  const sites = [
    ...listAtomicWriteSites(code),
    ...listChainWalkSites(code, source)
  ];
  return sites.toSorted((a, b) => a.line - b.line);
}

// .readyup/kits/default.ts
var PACKAGE_NAME = "@williamthorsen/toolbelt.filesystem";
var PACKAGING_README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/packaging#readme";
var README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/filesystem#readme";
var default_default = defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listFilesystemIdioms,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: "the project holds no JavaScript or TypeScript sources outside the exempt paths",
  packageName: PACKAGE_NAME,
  // A test writes these shapes deliberately, and a bootstrap wrapper hand-rolls what it reaches for so that its
  // build-first message survives an incomplete install.
  pathFilter: isAdoptableSource,
  checks: [
    {
      name: "No source writes a file atomically by hand",
      id: "no-hand-rolled-atomic-write",
      kinds: ["temp-write-rename"],
      severity: "recommend",
      fix: `Replace the write and rename named above with writeAtomic from ${PACKAGE_NAME}/candidate, called as await writeAtomic(filePath, content). Check where the temp file is staged before taking the substitution as cosmetic: rename is atomic only within one filesystem, so a temp file under the system temporary directory fails with EXDEV the moment the target lives on another volume. writeAtomic stages beside the target, creates missing parent directories, copies an existing target's permission bits onto the replacement, and removes the temp file on failure. It fsyncs nothing, so it promises no torn reads rather than survival of a power loss. Reference: ${README_URL}`
    },
    {
      name: "No source walks to the filesystem root by hand",
      id: "no-hand-rolled-directory-walk",
      kinds: ["chain-probe", "chain-walk"],
      severity: "recommend",
      fix: `Replace the loop named above with the directory-chain function that matches what it does, all three from ${PACKAGE_NAME}. A loop that only ascends takes listDirectoryChain, which returns the levels as strings and reads nothing from disk. A loop that probes each level for a name takes findDirectoryChainMatch where it stops at the nearest match, and listDirectoryChainMatches where every level's match matters; the first touches no level beyond the one that matches. All three take a stopAtDir that bounds the ascent, which a hand-rolled loop usually runs without. A loop probing for package.json is left to toolbelt.packaging, whose own kit reports it: ${PACKAGING_README_URL}. Reference: ${README_URL}`
    }
  ]
});
export {
  default_default as default
};
