/** @noformat — @generated. Do not edit. Compiled by rdy. */
/* eslint-disable */
export const __readyupVersion = "0.32.0";


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
  discoverWorkspaces,
  readTrackedSources
} from "readyup/check-utils";
var NOT_A_REPO = "the project is not a git working tree, and these checks read the files git tracks";
var NOTHING_TO_REPORT = { findings: [] };
var SELF = "this project publishes the package these checks are for";
function defineAdoptionKit(spec) {
  assertCheckIdsAreUnique();
  const cache = {};
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
          skip: skipUnlessProjectIsAccountable,
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
      adoptedCount: countPackageUsage(sources, {
        exportNames: spec.exportNames,
        packageName: spec.packageName
      }),
      findings: sources.flatMap((source) => spec.detect(source.text).map((site) => ({ ...site, path: source.path }))),
      sourceCount: sources.length
    };
  }
  async function reportKinds(kinds) {
    const summary = await loadSummary();
    if (summary === void 0) return NOTHING_TO_REPORT;
    return buildFindingReport({
      adoptedCount: summary.adoptedCount,
      findings: summary.findings,
      shouldReport: (finding) => kinds.includes(finding.kind)
    });
  }
  async function skipUnlessProjectIsAccountable() {
    if (discoverWorkspaces().some((workspace) => workspace.name === spec.packageName)) return SELF;
    const summary = await loadSummary();
    if (summary === void 0) return NOT_A_REPO;
    return summary.sourceCount === 0 ? spec.noSourcesReason : false;
  }
}

// ../adoption/src/portable/condenseWhitespace.ts
function condenseWhitespace(text) {
  return text.replaceAll(/\s+/g, " ");
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
  "clamp",
  "generateRandom",
  "IntSeededRng",
  "isIntegerString",
  "isNumericString",
  "makeRng",
  "pickInteger",
  "round",
  "safeParseInteger",
  "safeParseNumber",
  "scale",
  "SeededRng"
];

// src/readiness/listClampNestLines.ts
var BOUNDING_CALL = /\bMath\.(?<name>max|min)\s*\(/g;
var CLOSERS = ")]}";
var OPENERS = "([{";
var NESTED_HEAD = { max: /^Math\.max\s*\(/, min: /^Math\.min\s*\(/ };
var OPPOSITE = { max: "min", min: "max" };
function listClampNestLines(source) {
  const lines = [];
  let claimedUntil = 0;
  for (const match of source.matchAll(BOUNDING_CALL)) {
    if (match.index < claimedUntil) continue;
    const name = readBoundingName(match.groups?.["name"]);
    if (name === void 0) continue;
    const group = readBalancedGroup(source, match.index, PARENTHESES);
    if (group === void 0) continue;
    const args = listTopLevelArguments(source.slice(group.start + 1, group.end - 1));
    if (args.length !== 2 || args.every((argument) => !isBoundingCall(argument, OPPOSITE[name]))) continue;
    claimedUntil = group.end;
    lines.push(getLineAtOffset(source, match.index));
  }
  return lines;
}
function isBoundingCall(argument, name) {
  const text = argument.trim();
  if (!NESTED_HEAD[name].test(text)) return false;
  const group = readBalancedGroup(text, 0, PARENTHESES);
  if (group === void 0 || group.end !== text.length) return false;
  return listTopLevelArguments(text.slice(group.start + 1, group.end - 1)).length === 2;
}
function listTopLevelArguments(inner) {
  const args = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < inner.length; index += 1) {
    const char = inner[index];
    if (char === void 0) continue;
    if (OPENERS.includes(char)) depth += 1;
    else if (CLOSERS.includes(char)) depth -= 1;
    else if (char === "," && depth === 0) {
      args.push(inner.slice(start, index));
      start = index + 1;
    }
  }
  args.push(inner.slice(start));
  const last = args.at(-1);
  if (args.length > 1 && last !== void 0 && last.trim() === "") args.pop();
  return args;
}
function readBoundingName(name) {
  return name === "max" || name === "min" ? name : void 0;
}

// src/readiness/listRandomIntegerLines.ts
var FLOORED_RANDOM = /\bMath\.floor\s*\(\s*Math\.random\s*\(\s*\)\s*\*/g;
var WINDOW = { lookahead: 0, lookbehind: 80 };
function listRandomIntegerLines(source) {
  const lines = [];
  for (const match of source.matchAll(FLOORED_RANDOM)) {
    const { before } = readAnchoredWindow(source, match.index, WINDOW);
    if (isArraySubscript(before)) continue;
    lines.push(getLineAtOffset(source, match.index));
  }
  return lines;
}

// src/readiness/listRoundScaleLines.ts
var POWER_OF_TEN = String.raw`10\s*\*\*\s*[\w$]+|10+`;
var ROUND_CALL = /\bMath\.round\s*\(/g;
var TRAILING_FACTOR = new RegExp(String.raw`\*\s*(?<factor>${POWER_OF_TEN})\s*,?\s*$`);
var LEADING_DIVISOR = new RegExp(String.raw`^\s*/\s*(?<divisor>${POWER_OF_TEN})(?![\w$.])`);
function listRoundScaleLines(source) {
  const lines = [];
  for (const match of source.matchAll(ROUND_CALL)) {
    const group = readBalancedGroup(source, match.index, PARENTHESES);
    if (group === void 0) continue;
    const factor = TRAILING_FACTOR.exec(source.slice(group.start + 1, group.end - 1))?.groups?.["factor"];
    if (factor === void 0) continue;
    const divisor = LEADING_DIVISOR.exec(source.slice(group.end))?.groups?.["divisor"];
    if (divisor === void 0 || !isSameFactor(factor, divisor)) continue;
    lines.push(getLineAtOffset(source, match.index));
  }
  return lines;
}
function isSameFactor(factor, divisor) {
  return factor.replaceAll(/\s+/g, "") === divisor.replaceAll(/\s+/g, "");
}

// src/readiness/listMathIdioms.ts
function listMathIdioms(source) {
  const code = blankNonCode(source);
  const sites = [
    ...toSites("clamp-nest", listClampNestLines(code)),
    ...toSites("random-integer", listRandomIntegerLines(code)),
    ...toSites("round-scale", listRoundScaleLines(code))
  ];
  return sites.toSorted((a, b) => a.line - b.line);
}
function toSites(kind, lines) {
  return lines.map((line) => ({ kind, line }));
}

// .readyup/kits/default.ts
var PACKAGE_NAME = "@williamthorsen/toolbelt.numbers";
var README_URL = "https://github.com/williamthorsen/toolbelt/tree/main/packages/numbers#readme";
var default_default = defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listMathIdioms,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: "the project holds no JavaScript or TypeScript sources outside the exempt paths",
  packageName: PACKAGE_NAME,
  // A test computes these values deliberately, and a bootstrap wrapper's hand-rolled arithmetic is what keeps
  // its build-first message alive through an incomplete install.
  pathFilter: isAdoptableSource,
  checks: [
    {
      name: "No source clamps a value by hand",
      id: "no-hand-rolled-clamp",
      kinds: ["clamp-nest"],
      severity: "recommend",
      fix: `Replace each expression named above with clamp from ${PACKAGE_NAME}/candidate, called as clamp(value, { min, max }). It is not a silent substitution: clamp throws a RangeError on a reversed range or a NaN bound, where the nested Math calls return a value for both. Reference: ${README_URL}`
    },
    {
      name: "No source rounds to decimal places by hand",
      id: "no-hand-rolled-round",
      kinds: ["round-scale"],
      severity: "recommend",
      fix: `Replace each expression named above with round from ${PACKAGE_NAME}/candidate, called as round(value, places). The substitution is exact: round scales by the same power of ten these sites write out. Reference: ${README_URL}`
    },
    {
      name: "No source derives a random integer by hand",
      id: "no-hand-rolled-random-integer",
      kinds: ["random-integer"],
      severity: "recommend",
      fix: `Replace each expression named above with pickInteger from ${PACKAGE_NAME}/candidate, which also takes a seed. Mind the bound: Math.floor(Math.random() * N) stops at N - 1, where pickInteger's max is inclusive, so the replacement is pickInteger({ max: N - 1 }). A site indexing an array is left to toolbelt.arrays, whose pickItem covers it. Reference: ${README_URL}`
    }
  ]
});
export {
  default_default as default
};
