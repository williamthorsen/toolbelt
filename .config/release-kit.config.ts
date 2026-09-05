import { defineConfig } from '@williamthorsen/release-kit/config';

const config = defineConfig({
  releaseNotes: {
    shouldInjectIntoReadme: true,
  },
  repoLabels: {
    extends: ['common'],
    labels: {
      'scope:root': { color: '00ff96' },
      'scope:adoption': { color: '00ff96' },
      'scope:arrays': { color: '00ff96' },
      'scope:async': { color: '00ff96' },
      'scope:atlassian': { color: '00ff96' },
      'scope:datetime': { color: '00ff96' },
      'scope:dstructs': { color: '00ff96' },
      'scope:enums': { color: '00ff96' },
      'scope:errors': { color: '00ff96' },
      'scope:filesystem': { color: '00ff96' },
      'scope:git': { color: '00ff96' },
      'scope:guards': { color: '00ff96' },
      'scope:hof': { color: '00ff96' },
      'scope:numbers': { color: '00ff96' },
      'scope:objects': { color: '00ff96' },
      'scope:packaging': { color: '00ff96' },
      'scope:secrets': { color: '00ff96' },
      'scope:sets': { color: '00ff96' },
      'scope:statistics': { color: '00ff96' },
      'scope:strings': { color: '00ff96' },
      'scope:testing': { color: '00ff96' },
      'scope:tools': { color: '00ff96' },
      'scope:vitest': { color: '00ff96' },
    },
  },
  // Historical tags predate the `toolbelt.`-scoped package names, so their prefixes (`arrays-v`, …) no longer match
  // the prefixes that release-kit derives from the names (`toolbelt.arrays-v`). Declare each prior prefix so
  // release-kit resolves a baseline tag and scans only post-release commits instead of rescanning full history.
  workspaces: [
    // Private scaffolding template: Exclude from release processing entirely.
    { dir: '_template', shouldExclude: true },
    // Private shared layer for the adoption kits: `private: true` keeps it out of publish and announce, but
    // tagging and changelog generation still reach a private workspace.
    { dir: 'adoption', shouldExclude: true },
    { dir: 'arrays', legacyIdentities: [{ name: '@williamthorsen/toolbelt.arrays', tagPrefix: 'arrays-v' }] },
    { dir: 'async', legacyIdentities: [{ name: '@williamthorsen/toolbelt.async', tagPrefix: 'async-v' }] },
    { dir: 'datetime', legacyIdentities: [{ name: '@williamthorsen/toolbelt.datetime', tagPrefix: 'datetime-v' }] },
    { dir: 'enums', legacyIdentities: [{ name: '@williamthorsen/toolbelt.enums', tagPrefix: 'enums-v' }] },
    { dir: 'guards', legacyIdentities: [{ name: '@williamthorsen/toolbelt.guards', tagPrefix: 'guards-v' }] },
    { dir: 'hof', legacyIdentities: [{ name: '@williamthorsen/toolbelt.hof', tagPrefix: 'hof-v' }] },
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
  retiredPackages: [
    // release-kit was born in this repo (release-kit-v0.1–0.2) before extraction to its own repo.
    { name: '@williamthorsen/release-kit', tagPrefix: 'release-kit-v' },
    {
      name: '@williamthorsen/toolbelt.nodejs',
      successor: '@williamthorsen/toolbelt.filesystem',
      tagPrefix: 'nodejs-v',
    },
    {
      name: '@williamthorsen/toolbelt.nodejs',
      successor: '@williamthorsen/toolbelt.filesystem',
      tagPrefix: 'toolbelt.nodejs-v',
    },
  ],
});

export default config;
