import { normalizeStatusName } from '../internal/normalizeStatusName.ts';
import type { BoardFeatureRequest, ProjectSpec, SpecStatus, StatusCategory } from './ProjectSpec.ts';

const BOARD_FEATURE_REQUESTS: readonly string[] = ['DISABLED', 'ENABLED'];
const STATUS_CATEGORIES: readonly string[] = ['DONE', 'IN_PROGRESS', 'TODO'];

/**
 * Validates a project spec written as JSON, throwing on the first fault it finds. Text rather than a parsed
 * value, so a malformed file and a malformed schema are one function's business and the file read stays with the
 * caller. Faults name what is wrong and not where it was read from, which the caller knows and this does not.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export function parseProjectSpec(text: string): ProjectSpec {
  const document = parseJson(text);
  if (!isRecord(document)) throw new Error('A spec is a JSON object.');

  return {
    boardFeatures: readBoardFeatures(document['boardFeatures']),
    email: readOptionalString(document['email'], 'email'),
    site: readOptionalString(document['site'], 'site'),
    statuses: readStatuses(document['statuses']),
  };
}

// region | Helpers

/** Reports whether a value is a state a spec may request, which the two Jira also reports are not. */
function isBoardFeatureRequest(value: unknown): value is BoardFeatureRequest {
  return typeof value === 'string' && BOARD_FEATURE_REQUESTS.includes(value);
}

/** Reports whether a value is a JSON object, which neither an array nor null is. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reports whether a value is one of the three categories Jira sorts a status into. */
function isStatusCategory(value: unknown): value is StatusCategory {
  return typeof value === 'string' && STATUS_CATEGORIES.includes(value);
}

/** Parses the spec text, reporting the position the parser stopped at. */
function parseJson(text: string): unknown {
  try {
    const document: unknown = JSON.parse(text);
    return document;
  } catch (error) {
    throw new Error(`A spec is JSON: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
}

/** Reads the live names an entry also claims, which are optional and each a non-empty name. */
function readAliases(value: unknown, name: string): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error(`The aliases of status '${name}' are a list of names.`);

  const aliases: string[] = [];
  for (const alias of value) {
    if (typeof alias !== 'string' || alias.trim() === '') {
      throw new Error(`The aliases of status '${name}' are a list of names.`);
    }
    aliases.push(alias);
  }

  return aliases;
}

/** Reads the requested board-feature states, refusing one no spec may request. */
function readBoardFeatures(value: unknown): Readonly<Record<string, BoardFeatureRequest>> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) throw new Error('`boardFeatures` maps a feature key to the state it is requested in.');

  const features: Record<string, BoardFeatureRequest> = {};
  for (const [feature, state] of Object.entries(value)) {
    if (!isBoardFeatureRequest(state)) {
      throw new Error(`Board feature '${feature}' is requested as ${BOARD_FEATURE_REQUESTS.join(' or ')}.`);
    }
    features[feature] = state;
  }

  return features;
}

/** Reads an optional top-level string, refusing one present but empty. */
function readOptionalString(value: unknown, key: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`\`${key}\` is a non-empty string.`);

  return value;
}

/**
 * Reads the status list, refusing a name or alias that two entries claim. Both would resolve to the one live
 * status, and the write would carry the first and drop the second without a word.
 */
function readStatuses(value: unknown): readonly SpecStatus[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error('A spec needs a non-empty `statuses` array.');

  const claimants = new Map<string, string>();
  const statuses: SpecStatus[] = [];

  for (const entry of value) {
    if (!isRecord(entry)) throw new Error('Each status is an object carrying a name and a category.');

    const name = entry['name'];
    if (typeof name !== 'string' || name.trim() === '') throw new Error('Each status needs a name.');

    const category = entry['category'];
    if (!isStatusCategory(category)) {
      throw new Error(`Status '${name}' needs a category of ${STATUS_CATEGORIES.join(', ')}.`);
    }

    const aliases = readAliases(entry['aliases'], name);
    for (const claimed of [name, ...(aliases ?? [])]) {
      const claimant = claimants.get(normalizeStatusName(claimed));
      if (claimant !== undefined) {
        throw new Error(`'${claimed}' is claimed by both '${claimant}' and '${name}'.`);
      }
      claimants.set(normalizeStatusName(claimed), name);
    }

    statuses.push({ aliases, category, name });
  }

  return statuses;
}

// endregion | Helpers
