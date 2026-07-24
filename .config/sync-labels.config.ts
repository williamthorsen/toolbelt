import type { SyncLabelsConfig } from '@williamthorsen/release-kit';

const config: SyncLabelsConfig = {
  presets: ['common'],
  labels: [
    { name: 'scope:root', color: '00ff96', description: 'Monorepo root configuration' },
    { name: 'scope:arrays', color: '00ff96', description: 'arrays package' },
    { name: 'scope:async', color: '00ff96', description: 'async package' },
    { name: 'scope:datetime', color: '00ff96', description: 'datetime package' },
    { name: 'scope:dstructs', color: '00ff96', description: 'dstructs package' },
    { name: 'scope:enums', color: '00ff96', description: 'enums package' },
    { name: 'scope:guards', color: '00ff96', description: 'guards package' },
    { name: 'scope:hof', color: '00ff96', description: 'hof package' },
    { name: 'scope:nodejs', color: '00ff96', description: 'nodejs package' },
    { name: 'scope:numbers', color: '00ff96', description: 'numbers package' },
    { name: 'scope:objects', color: '00ff96', description: 'objects package' },
    { name: 'scope:sets', color: '00ff96', description: 'sets package' },
    { name: 'scope:statistics', color: '00ff96', description: 'statistics package' },
    { name: 'scope:strings', color: '00ff96', description: 'strings package' },
    { name: 'scope:tools', color: '00ff96', description: 'tools package' },
  ],
};

export default config;
