/** The directories `nmr build` drops as entry points, which is what keeps a module inside one out of `dist`. */
export const SCAFFOLDING_DIRS: ReadonlySet<string> = new Set(['__fixtures__', '__mocks__', '__tests__', 'test-utils']);
