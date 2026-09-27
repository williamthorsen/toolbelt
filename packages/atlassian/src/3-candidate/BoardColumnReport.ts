/** The column order implied by the spec, alongside the order that the board has. */
export interface ColumnOrderMismatch {
  readonly actual: readonly string[];
  readonly expected: readonly string[];
}

/** What the board's columns cover and in what order, neither of which the public API can set. */
export interface BoardColumnReport {
  readonly columns: readonly string[];
  /** The two orders when they differ, and `undefined` when the board already has the spec's order. */
  readonly order: ColumnOrderMismatch | undefined;
  /**
   * The spec's name for each status whose live status is mapped to no column, which is the name that the sibling
   * verification report contains too. Their work items are absent from the board and the backlog alike, so they
   * are reachable only through search.
   */
  readonly uncovered: readonly string[];
}
