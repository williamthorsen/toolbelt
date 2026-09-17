import { describe, expect, it } from 'vitest';

import { findAsdfInstall } from '../findAsdfInstall.ts';

describe(findAsdfInstall, () => {
  it('reads the data directory, plugin, and version out of an install path', () => {
    expect(findAsdfInstall('/Users/me/.asdf/installs/nodejs/24.20.0/bin/node')).toStrictEqual({
      dataDir: '/Users/me/.asdf',
      plugin: 'nodejs',
      version: '24.20.0',
    });
  });

  it('honours a custom data directory', () => {
    expect(findAsdfInstall('/opt/asdf-data/installs/nodejs/22.14.0/bin/node')?.dataDir).toBe('/opt/asdf-data');
  });

  it('matches the last installs segment, so a data directory named installs still resolves', () => {
    expect(findAsdfInstall('/srv/installs/installs/python/3.13.1/bin/python')).toStrictEqual({
      dataDir: '/srv/installs',
      plugin: 'python',
      version: '3.13.1',
    });
  });

  it.each([
    '/opt/homebrew/bin/node',
    '/usr/local/bin/node',
    '/Users/me/.asdf/installs/nodejs/24.20.0/node',
    '/Users/me/.asdf/shims/node',
    'installs/nodejs/24.20.0/bin/node',
  ])('returns undefined for an executable outside an asdf install: %s', (execPath) => {
    expect(findAsdfInstall(execPath)).toBeUndefined();
  });
});
