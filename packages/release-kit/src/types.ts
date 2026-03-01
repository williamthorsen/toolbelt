/** Semver release type for version bumping. */
export type ReleaseType = 'major' | 'minor' | 'patch';

/** Configuration for a single work type used in commit categorization. */
export interface WorkTypeConfig {
  /** The work type identifier (e.g., 'feat', 'fix', 'refactor'). */
  type: string;
  /** Human-readable label for the section heading in changelogs. */
  header: string;
  /** The release bump this work type triggers. */
  bump: ReleaseType;
  /** Optional aliases that map to this work type (e.g., 'feature' -> 'feat'). */
  aliases?: string[];
}

/** A raw commit from the git log. */
export interface Commit {
  /** The full commit message (first line). */
  message: string;
  /** The commit hash. */
  hash: string;
}

/** A commit that has been parsed to extract structured metadata. */
export interface ParsedCommit {
  /** The original commit message. */
  message: string;
  /** The commit hash. */
  hash: string;
  /** The resolved work type (e.g., 'feat', 'fix'). */
  type: string;
  /** The commit description after the type prefix. */
  description: string;
  /** The workspace scope if the commit used `workspace|type:` format. */
  workspace?: string;
  /** Whether this is a breaking change. */
  breaking: boolean;
}

/** Configuration for the release workflow. */
export interface ReleaseConfig {
  /** The git tag prefix used to identify version tags (e.g., 'v'). */
  tagPrefix: string;
  /** Paths to package.json files to bump. */
  packageFiles: string[];
  /** Paths to directories in which to generate changelogs. */
  changelogPaths: string[];
  /** Ordered list of work type configurations. */
  workTypes: WorkTypeConfig[];
  /** Shell command to run after changelog generation (e.g., 'pnpm run fmt'). */
  formatCommand?: string;
  /** Path to the cliff.toml file; defaults to 'cliff.toml' when absent. */
  cliffConfigPath?: string;
}
