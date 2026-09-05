import { describe, expect, it } from 'vitest';

import { parseProjectSpec } from '../parseProjectSpec.ts';

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

  it('reports no site and no email where the spec carries neither', () => {
    const spec = parseProjectSpec(JSON.stringify(prototypeSpec));

    expect(spec.email).toBeUndefined();
    expect(spec.site).toBeUndefined();
  });

  it('throws where the text is not JSON', () => {
    expect(() => parseProjectSpec('{ "statuses": [')).toThrow('A spec is JSON');
  });

  it('throws where the document is not an object', () => {
    expect(() => parseProjectSpec('["To Do"]')).toThrow('A spec is a JSON object');
  });

  it('throws where statuses are absent', () => {
    expect(() => parseProjectSpec('{}')).toThrow('non-empty `statuses`');
  });

  it('throws where statuses are empty', () => {
    expect(() => parseProjectSpec('{ "statuses": [] }')).toThrow('non-empty `statuses`');
  });

  it('throws where a status has no name', () => {
    expect(() => parseProjectSpec('{ "statuses": [{ "category": "TODO" }] }')).toThrow('Each status needs a name');
  });

  it('throws where a status carries an unknown category', () => {
    const text = '{ "statuses": [{ "name": "To Do", "category": "BACKLOG" }] }';

    expect(() => parseProjectSpec(text)).toThrow("Status 'To Do' needs a category of DONE, IN_PROGRESS, TODO");
  });

  it('throws where aliases are not a list of names', () => {
    const text = '{ "statuses": [{ "name": "Done", "category": "DONE", "aliases": [7] }] }';

    expect(() => parseProjectSpec(text)).toThrow("The aliases of status 'Done' are a list of names");
  });

  it('throws where two entries claim one name', () => {
    const text = JSON.stringify({
      statuses: [
        { category: 'DONE', name: 'Done' },
        { category: 'DONE', name: 'done' },
      ],
    });

    expect(() => parseProjectSpec(text)).toThrow("'done' is claimed by both 'Done' and 'done'");
  });

  it('throws where one entry claims a name that another claims as an alias', () => {
    const text = JSON.stringify({
      statuses: [
        { category: 'DONE', name: 'Done', aliases: ['Resolved'] },
        { category: 'DONE', name: 'resolved' },
      ],
    });

    expect(() => parseProjectSpec(text)).toThrow("'resolved' is claimed by both 'Done' and 'resolved'");
  });

  it('throws where a board feature is requested in a state that no spec may request', () => {
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
