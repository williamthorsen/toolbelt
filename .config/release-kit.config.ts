import type { ReleaseKitConfig } from '@williamthorsen/release-kit';

// Historical tags predate the `toolbelt.`-scoped package names, so their prefixes (`arrays-v`, …) no longer match the
// prefixes release-kit derives from the names (`toolbelt.arrays-v`). Declare each prior prefix so release-kit resolves
// a baseline tag and scans only post-release commits instead of rescanning full history.
const config: ReleaseKitConfig = {
  releaseNotes: {
    shouldInjectIntoReadme: true,
  },
  workspaces: [
    // Private scaffolding template: Exclude from release processing entirely.
    { dir: '_template', shouldExclude: true },
    { dir: 'arrays', legacyIdentities: [{ name: '@williamthorsen/toolbelt.arrays', tagPrefix: 'arrays-v' }] },
    { dir: 'async', legacyIdentities: [{ name: '@williamthorsen/toolbelt.async', tagPrefix: 'async-v' }] },
    { dir: 'datetime', legacyIdentities: [{ name: '@williamthorsen/toolbelt.datetime', tagPrefix: 'datetime-v' }] },
    { dir: 'enums', legacyIdentities: [{ name: '@williamthorsen/toolbelt.enums', tagPrefix: 'enums-v' }] },
    { dir: 'guards', legacyIdentities: [{ name: '@williamthorsen/toolbelt.guards', tagPrefix: 'guards-v' }] },
    { dir: 'hof', legacyIdentities: [{ name: '@williamthorsen/toolbelt.hof', tagPrefix: 'hof-v' }] },
    { dir: 'nodejs', legacyIdentities: [{ name: '@williamthorsen/toolbelt.nodejs', tagPrefix: 'nodejs-v' }] },
    { dir: 'numbers', legacyIdentities: [{ name: '@williamthorsen/toolbelt.numbers', tagPrefix: 'numbers-v' }] },
    { dir: 'objects', legacyIdentities: [{ name: '@williamthorsen/toolbelt.objects', tagPrefix: 'objects-v' }] },
    { dir: 'sets', legacyIdentities: [{ name: '@williamthorsen/toolbelt.sets', tagPrefix: 'sets-v' }] },
    { dir: 'strings', legacyIdentities: [{ name: '@williamthorsen/toolbelt.strings', tagPrefix: 'strings-v' }] },
    {
      dir: 'tools',
      legacyIdentities: [{ name: '@williamthorsen/toolbelt.tools', tagPrefix: 'tools-v' }],
      shouldExclude: true,
    },
  ],
  // release-kit was born in this repo (release-kit-v0.1–0.2) before extraction to its own repo.
  retiredPackages: [{ name: '@williamthorsen/release-kit', tagPrefix: 'release-kit-v' }],
};

export default config;
