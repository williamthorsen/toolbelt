/*
 * Keeps a freshly scaffolded package's suite non-empty. `passWithNoTests` is set on every Vitest project, so a
 * package with no test file exits green rather than failing, and a new package has no API to test yet.
 *
 * Copy this file into the clone unchanged, and delete it once the package's first real tests land. It asserts
 * nothing about the scaffold: `__tests__/published-package-shape.app.unit.test.ts` and
 * `__tests__/package-registration.app.unit.test.ts` audit that at the repo root, over every published workspace
 * rather than over a freshly cloned one alone.
 */

import { describe, it } from 'vitest';

describe('Scaffolded package', () => {
  it.todo("replace with the package's first real test");
});
