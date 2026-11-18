/** Matches a maturity-tier directory name, such as `3-candidate`, capturing the tier's name as `tier`. */
export const TIER_DIR_PATTERN = /^\d-(?<tier>[a-z]+)$/u;

/** The tier that no export subpath publishes and that the build drops. */
export const STRAWMAN_TIER = '0-strawman';
