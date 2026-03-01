import type { ParsedCommit, WorkTypeConfig } from './types.ts';

/**
 * Parses a commit message into structured metadata.
 *
 * Supports both `type: description` and `workspace|type: description` formats.
 * Resolves aliases (e.g., 'feature' -> 'feat') using the provided work type configs.
 * Detects breaking changes via `type!:` or `BREAKING CHANGE:` in the message.
 *
 * @param message - The commit message (first line).
 * @param hash - The commit hash.
 * @param workTypes - The list of work type configurations to match against.
 * @returns A parsed commit, or undefined if the message does not match a known format.
 */
export function parseCommitMessage(
  message: string,
  hash: string,
  workTypes: readonly WorkTypeConfig[],
): ParsedCommit | undefined {
  // Match both `type: desc` and `workspace|type: desc` formats
  // The `!` before `:` indicates a breaking change
  const match = message.match(/^(?:([^|]+)\|)?(\w+)(!)?:\s*(.*)$/);
  if (!match) {
    return undefined;
  }

  const workspace = match[1];
  const rawType = match[2];
  const breakingMarker = match[3];
  const description = match[4];

  if (rawType === undefined || description === undefined) {
    return undefined;
  }

  // Resolve aliases
  const resolvedType = resolveType(rawType, workTypes);
  if (resolvedType === undefined) {
    return undefined;
  }

  const breaking = breakingMarker === '!' || message.includes('BREAKING CHANGE:');

  return {
    message,
    hash,
    type: resolvedType,
    description,
    breaking,
    ...(workspace !== undefined && { workspace }),
  };
}

/**
 * Resolves a raw type string to its canonical type name using aliases.
 */
function resolveType(rawType: string, workTypes: readonly WorkTypeConfig[]): string | undefined {
  const lowered = rawType.toLowerCase();

  for (const config of workTypes) {
    if (config.type === lowered) {
      return config.type;
    }
    if (config.aliases !== undefined) {
      for (const alias of config.aliases) {
        if (alias === lowered) {
          return config.type;
        }
      }
    }
  }

  return undefined;
}
