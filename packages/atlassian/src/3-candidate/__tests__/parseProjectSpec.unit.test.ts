import { describe, expect, it } from 'vitest';

import { parseProjectSpec } from '../parseProjectSpec.ts';
import { ProjectSpecError } from '../ProjectSpecError.ts';

describe(parseProjectSpec, () => {
  it('reads the statuses, their aliases, and the requested board features', () => {
    const spec = parseProjectSpec(JSON.stringify(prototypeSpec));

    expect(spec.statuses).toStrictEqual([
      { aliases: undefined, category: 'TODO', name: 'To Do' },
      { aliases: undefined, category: 'IN_PROGRESS', name: 'In Progress' },
      { aliases: ['Waiting for customer'], category: 'IN_PROGRESS', name: 'Waiting' },
      { aliases: ['Resolved'], category: 'DONE', name: 'Done' },
    ]);
    expect(spec.boardFeatures).toStrictEqual({ 'jsw.agility.backlog': 'ENABLED' });
  });

  it('reads the optional site and email', () => {
    const spec = parseProjectSpec(
      JSON.stringify({ ...prototypeSpec, email: 'me@example.com', site: 'acme.atlassian.net' }),
    );

    expect(spec.email).toBe('me@example.com');
    expect(spec.site).toBe('acme.atlassian.net');
  });

  it('reports no site and no email when the spec has neither', () => {
    const spec = parseProjectSpec(JSON.stringify(prototypeSpec));

    expect(spec.email).toBeUndefined();
    expect(spec.site).toBeUndefined();
  });

  it('reads the optional project key', () => {
    const spec = parseProjectSpec(JSON.stringify({ ...prototypeSpec, projectKey: 'PROJ' }));

    expect(spec.projectKey).toBe('PROJ');
  });

  it('reports no project key when the spec has none', () => {
    expect(parseProjectSpec(JSON.stringify(prototypeSpec)).projectKey).toBeUndefined();
  });

  it.each(['', '  ', 42])('refuses a project key of %j', (projectKey) => {
    expect(() => parseProjectSpec(JSON.stringify({ ...prototypeSpec, projectKey }))).toThrow(
      '`projectKey` is a non-empty string.',
    );
  });

  it('throws when the text is not JSON', () => {
    expect(() => parseProjectSpec('{ "statuses": [')).toThrow('A spec is JSON');
  });

  it('keeps the parser error as the cause when the text is not JSON', () => {
    expect(() => parseProjectSpec('{ "statuses": [')).toThrow(
      expect.objectContaining({ cause: expect.any(SyntaxError), name: 'ProjectSpecError' }),
    );
  });

  it.each([
    ['text that is not JSON', '{ "statuses": ['],
    ['a document that is not an object', '["To Do"]'],
    ['a blank optional string', '{ "site": "", "statuses": [{ "name": "To Do", "category": "TODO" }] }'],
    ['an absent statuses array', '{}'],
    ['a status that is not an object', '{ "statuses": ["To Do"] }'],
    ['a status without a name', '{ "statuses": [{ "category": "TODO" }] }'],
    ['an unknown category', '{ "statuses": [{ "name": "To Do", "category": "BACKLOG" }] }'],
    ['aliases that are not a list', '{ "statuses": [{ "name": "Done", "category": "DONE", "aliases": "Resolved" }] }'],
    ['an alias that is not a name', '{ "statuses": [{ "name": "Done", "category": "DONE", "aliases": [7] }] }'],
    [
      'a name claimed twice',
      '{ "statuses": [{ "name": "Done", "category": "DONE" }, { "name": "done", "category": "DONE" }] }',
    ],
    [
      'board features that are not an object',
      '{ "boardFeatures": [], "statuses": [{ "name": "To Do", "category": "TODO" }] }',
    ],
    [
      'a board feature in an unsupported state',
      '{ "boardFeatures": { "jsw.agility.backlog": "SOON" }, "statuses": [{ "name": "To Do", "category": "TODO" }] }',
    ],
  ])('throws ProjectSpecError for %s', (_fault, text) => {
    expect(() => parseProjectSpec(text)).toThrow(ProjectSpecError);
  });

  it('throws when the document is not an object', () => {
    expect(() => parseProjectSpec('["To Do"]')).toThrow('A spec is a JSON object');
  });

  it('throws when statuses are absent', () => {
    expect(() => parseProjectSpec('{}')).toThrow('non-empty `statuses`');
  });

  it('throws when statuses are empty', () => {
    expect(() => parseProjectSpec('{ "statuses": [] }')).toThrow('non-empty `statuses`');
  });

  it('throws when a status has no name', () => {
    expect(() => parseProjectSpec('{ "statuses": [{ "category": "TODO" }] }')).toThrow('Each status needs a name');
  });

  it('throws when a status declares an unknown category', () => {
    const text = '{ "statuses": [{ "name": "To Do", "category": "BACKLOG" }] }';

    expect(() => parseProjectSpec(text)).toThrow("Status 'To Do' needs a category of DONE, IN_PROGRESS, TODO");
  });

  it('throws when aliases are not a list of names', () => {
    const text = '{ "statuses": [{ "name": "Done", "category": "DONE", "aliases": [7] }] }';

    expect(() => parseProjectSpec(text)).toThrow("The aliases of status 'Done' are a list of names");
  });

  it('throws when two entries claim one name', () => {
    const text = JSON.stringify({
      statuses: [
        { category: 'DONE', name: 'Done' },
        { category: 'DONE', name: 'done' },
      ],
    });

    expect(() => parseProjectSpec(text)).toThrow("'done' is claimed by both 'Done' and 'done'");
  });

  it('throws when one entry claims a name that another claims as an alias', () => {
    const text = JSON.stringify({
      statuses: [
        { category: 'DONE', name: 'Done', aliases: ['Resolved'] },
        { category: 'DONE', name: 'resolved' },
      ],
    });

    expect(() => parseProjectSpec(text)).toThrow("'resolved' is claimed by both 'Done' and 'resolved'");
  });

  it('throws when a board feature is requested in an unsupported state', () => {
    const text = JSON.stringify({
      boardFeatures: { 'jsw.agility.backlog': 'COMING_SOON' },
      statuses: [{ category: 'TODO', name: 'To Do' }],
    });

    expect(() => parseProjectSpec(text)).toThrow(
      "Board feature 'jsw.agility.backlog' is requested as DISABLED or ENABLED",
    );
  });
});

const prototypeSpec = {
  boardFeatures: { 'jsw.agility.backlog': 'ENABLED' },
  statuses: [
    { category: 'TODO', name: 'To Do' },
    { category: 'IN_PROGRESS', name: 'In Progress' },
    { aliases: ['Waiting for customer'], category: 'IN_PROGRESS', name: 'Waiting' },
    { aliases: ['Resolved'], category: 'DONE', name: 'Done' },
  ],
};
