import { describe, expect, it } from 'vitest';

import { releaseConfigScript, releasePrepareScript, releaseWorkflow } from '../templates.ts';

describe(releasePrepareScript, () => {
  it('imports runReleasePrepare from release-kit', () => {
    const script = releasePrepareScript();

    expect(script).toContain("import { runReleasePrepare } from '@williamthorsen/release-kit'");
  });

  it('imports the config from release.config.ts', () => {
    const script = releasePrepareScript();

    expect(script).toContain("import { config } from './release.config.ts'");
  });

  it('calls runReleasePrepare with the config', () => {
    const script = releasePrepareScript();

    expect(script).toContain('runReleasePrepare(config)');
  });
});

describe(releaseConfigScript, () => {
  it('generates a MonorepoReleaseConfig for monorepo type', () => {
    const script = releaseConfigScript('monorepo');

    expect(script).toContain('MonorepoReleaseConfig');
    expect(script).toContain('DEFAULT_WORK_TYPES');
    expect(script).toContain('component(');
    expect(script).toContain('components:');
    expect(script).toContain('// TODO:');
  });

  it('generates a ReleaseConfig for single-package type', () => {
    const script = releaseConfigScript('single-package');

    expect(script).toContain('ReleaseConfig');
    expect(script).toContain('DEFAULT_WORK_TYPES');
    expect(script).toContain("tagPrefix: 'v'");
    expect(script).toContain('// TODO:');
    expect(script).not.toContain('MonorepoReleaseConfig');
    expect(script).not.toContain('components');
  });
});

describe(releaseWorkflow, () => {
  it('generates a monorepo workflow with only input and monorepo flag', () => {
    const workflow = releaseWorkflow('monorepo');

    expect(workflow).toContain('release-pnpm.yaml@v1');
    expect(workflow).toContain('monorepo: true');
    expect(workflow).toContain('only:');
    expect(workflow).toContain('inputs.only');
  });

  it('generates a single-package workflow without only input', () => {
    const workflow = releaseWorkflow('single-package');

    expect(workflow).toContain('release-pnpm.yaml@v1');
    expect(workflow).not.toContain('monorepo:');
    expect(workflow).not.toContain('inputs.only');
  });

  it('includes TODO for node and pnpm versions in both types', () => {
    const mono = releaseWorkflow('monorepo');
    const single = releaseWorkflow('single-package');

    expect(mono).toContain('# TODO:');
    expect(single).toContain('# TODO:');
    expect(mono).toContain('node-version:');
    expect(single).toContain('node-version:');
  });
});
