/** @noformat -- @generated. Do not edit. Compiled by rdy. */
/* eslint-disable */
export const __readyupVersion = "0.35.0";


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
var SUBSCRIPT_TAIL = /(?<token>[\w$]+|[)\]'"`])\s?(?:\?\.)?\s?\[\s?$/;
var EXPRESSION_KEYWORDS = /* @__PURE__ */ new Set([
  "await",
  "case",
  "delete",
  "in",
  "new",
  "of",
  "return",
  "typeof",
  "void",
  "yield"
]);
function isArraySubscript(before) {
  const token = SUBSCRIPT_TAIL.exec(before)?.groups?.["token"];
  return token !== void 0 && !EXPRESSION_KEYWORDS.has(token);
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
  "accumulateWeights",
  "arraify",
  "extractWeights",
  "findItemOrThrow",
  "findWeightedIndex",
  "getItemAtIndexOrThrow",
  "includes",
  "listDuplicateItems",
  "listUniqueItems",
  "makeNullishCompare",
  "makePickWeightedItemFromDistribution",
  "nullishCompare",
  "pickItem",
  "pickItems",
  "pickWeightedIndex",
  "pickWeightedItem",
  "Range",
  "shuffle",
  "shuffleInPlace",
  "toCumulativeValues"
];

// src/readiness/listArraifyLines.ts
var SUBJECT = String.raw`(?<subject>[\w$]+(?:\.[\w$]+)*)`;
var SUBJECT_AGAIN = String.raw`\k<subject>(?![\w$.])`;
var WRAPPED = String.raw`\[\s*\k<subject>\s*\]`;
var PASSED_THROUGH = String.raw`(?:${SUBJECT_AGAIN}|\[\s*\.\.\.\s*\k<subject>\s*\])`;
var IS_ARRAY_CALL = String.raw`Array\s*\.\s*isArray\s*\(\s*${SUBJECT}\s*\)`;
var ARRAIFY_TERNARY = new RegExp(
  String.raw`(?<![\w$.])${IS_ARRAY_CALL}\s*\?\s*${PASSED_THROUGH}\s*:\s*${WRAPPED}`,
  "g"
);
var NEGATED_ARRAIFY_TERNARY = new RegExp(
  String.raw`(?<![\w$.])!\s*${IS_ARRAY_CALL}\s*\?\s*${WRAPPED}\s*:\s*${PASSED_THROUGH}`,
  "g"
);
function listArraifyLines(source) {
  return [ARRAIFY_TERNARY, NEGATED_ARRAIFY_TERNARY].flatMap((pattern) => source.matchAll(pattern).toArray()).map((match) => getLineAtOffset(source, match.index)).toSorted((a, b) => a - b);
}

// src/readiness/listBiasedShuffleLines.ts
var SORT_CALL = /\.\s*(?:sort|toSorted)\s*\(/g;
var RANDOM_CALL = /Math\s*\.\s*random\s*\(\s*\)/g;
var RETURN_KEYWORD = /\breturn\b/g;
var BARE_PARAMETER_ARROW = /^[\w$]+\s?=>/;
var FUNCTION_KEYWORD = /^function\b/;
var IDENTIFIER_CHARACTER = /[A-Za-z_$]/;
function listBiasedShuffleLines(source) {
  const lines = [];
  for (const match of source.matchAll(SORT_CALL)) {
    const group = readBalancedGroup(source, match.index, PARENTHESES);
    if (group === void 0) continue;
    const argument = condenseWhitespace(source.slice(group.start + 1, group.end - 1));
    if (!isRandomComparator(argument)) continue;
    lines.push(getLineAtOffset(source, match.index));
  }
  return lines;
}
function findArrowOffset(text) {
  const parameters = readBalancedGroup(text, 0, PARENTHESES);
  if (parameters?.start === 0) {
    const arrow = text.indexOf("=>", parameters.end);
    return arrow === -1 ? void 0 : arrow;
  }
  return BARE_PARAMETER_ARROW.test(text) ? text.indexOf("=>") : void 0;
}
function isRandomComparator(argument) {
  const body = readComparatorBody(argument);
  if (body === void 0) return false;
  const withoutDraw = body.replaceAll(RANDOM_CALL, "");
  if (withoutDraw === body) return false;
  return !IDENTIFIER_CHARACTER.test(withoutDraw.replaceAll(RETURN_KEYWORD, ""));
}
function readComparatorBody(argument) {
  const text = stripWrappingGroup(argument.trimStart());
  if (FUNCTION_KEYWORD.test(text)) {
    const block = readBalancedGroup(text, 0, BRACES);
    return block === void 0 ? void 0 : text.slice(block.start + 1, block.end - 1);
  }
  const arrow = findArrowOffset(text);
  return arrow === void 0 ? void 0 : text.slice(arrow + 2);
}
function stripWrappingGroup(text) {
  let stripped = text;
  let group = readBalancedGroup(stripped, 0, PARENTHESES);
  while (group?.start === 0 && !stripped.includes("=>", group.end)) {
    stripped = stripped.slice(1, group.end - 1).trimStart();
    group = readBalancedGroup(stripped, 0, PARENTHESES);
  }
  return stripped;
}

// src/readiness/listRandomItemLines.ts
var FLOORED_RANDOM = /\bMath\.floor\s*\(\s*Math\.random\s*\(\s*\)\s*\*/g;
var WINDOW = { lookahead: 0, lookbehind: 80 };
function listRandomItemLines(source) {
  const lines = [];
  for (const match of source.matchAll(FLOORED_RANDOM)) {
    const { before } = readAnchoredWindow(source, match.index, WINDOW);
    if (!isArraySubscript(before)) continue;
    lines.push(getLineAtOffset(source, match.index));
  }
  return lines;
}

// src/readiness/listArrayIdioms.ts
function listArrayIdioms(source) {
  const code = blankNonCode(source);
  const sites = [
    ...toSites("arraify-inline", listArraifyLines(code)),
    ...toSites("biased-shuffle", listBiasedShuffleLines(code)),
    ...toSites("random-item", listRandomItemLines(code))
  ];
  return sites.toSorted((a, b) => a.line - b.line);
}
function toSites(kind, lines) {
  return lines.map((line) => ({ kind, line }));
}

// .readyup/kits/default.ts
var PACKAGE_NAME = "@williamthorsen/toolbelt.arrays";
var README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/arrays#readme";
var default_default = defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listArrayIdioms,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: "the project holds no JavaScript or TypeScript sources outside the exempt paths",
  packageName: PACKAGE_NAME,
  // A test writes these forms deliberately, and a bootstrap wrapper hand-rolls its array handling so that its
  // build-first message survives an incomplete install.
  pathFilter: isAdoptableSource,
  checks: [
    {
      name: "No source shuffles through a comparator",
      id: "no-biased-shuffle",
      kinds: ["biased-shuffle"],
      severity: "warn",
      fix: `Replace each call named above with shuffle from ${PACKAGE_NAME}/candidate, which walks the array backward swapping each item with one drawn at or before it, and takes a seed where a test needs the draw to repeat. A comparator deciding on a draw does not order consistently, and the engine sorting through it is free to produce any permutation, so the result is neither uniform nor the same across engines. Mind which method the site used: shuffle returns a new array, and shuffleInPlace is the one that mutates. Reference: ${README_URL}`
    },
    {
      name: "No source draws an array item by hand",
      id: "no-hand-rolled-random-item",
      kinds: ["random-item"],
      severity: "recommend",
      fix: `Replace each subscript named above with pickItem from ${PACKAGE_NAME}/candidate, which also takes a seed. It is not a silent substitution: pickItem throws on an empty array, where the subscript yields undefined and pushes the failure downstream. Where the bound is not the subject's own length, check the substitution before taking it: pickItem draws across the whole array, and a hand-written bound may have meant something narrower. Reference: ${README_URL}`
    },
    {
      name: "No source wraps a value in an array by hand",
      id: "no-hand-rolled-arraify",
      kinds: ["arraify-inline"],
      severity: "recommend",
      fix: `Replace each expression named above with arraify from ${PACKAGE_NAME}/candidate. Mind the aliasing: arraify always returns a new array, where a ternary handing the array branch straight back returns the caller's own array, and a later mutation of the result reaches it. The substitution is exact only where the array branch already spreads into a new array. Reference: ${README_URL}`
    }
  ]
});
export {
  default_default as default
};
