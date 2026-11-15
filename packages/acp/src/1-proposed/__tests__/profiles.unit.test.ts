import { homedir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { antigravityProfile } from '../antigravityProfile.ts';
import { claudeCodeProfile } from '../claudeCodeProfile.ts';
import { codexProfile } from '../codexProfile.ts';

describe(claudeCodeProfile, () => {
  it('starts the adapter on PATH in the asking mode, without the user settings or built-in tools', () => {
    expect(claudeCodeProfile()).toStrictEqual({
      command: 'claude-agent-acp',
      permissionModeId: 'default',
      sessionMeta: { claudeCode: { options: { settingSources: [], tools: [], strictMcpConfig: true } } },
    });
  });

  it('takes the command and the model', () => {
    const profile = claudeCodeProfile({ command: '/opt/bin/claude-agent-acp', model: 'sonnet' });

    expect(profile.command).toBe('/opt/bin/claude-agent-acp');
    expect(profile.sessionMeta).toStrictEqual({
      claudeCode: { options: { settingSources: [], tools: [], strictMcpConfig: true, model: 'sonnet' } },
    });
  });
});

describe(antigravityProfile, () => {
  it('starts agy on PATH with a configuration directory of its own, signed in personally, in the asking mode', () => {
    expect(antigravityProfile()).toStrictEqual({
      command: 'agy',
      args: ['acp', '--gemini-dir', path.join(homedir(), '.cache', 'toolbelt.acp', 'antigravity')],
      authMethodId: 'oauth-personal',
      permissionModeId: 'default',
    });
  });

  it('takes the command and the configuration directory', () => {
    const profile = antigravityProfile({ command: '/opt/bin/agy', geminiDir: '/var/app/gemini' });

    expect(profile.command).toBe('/opt/bin/agy');
    expect(profile.args).toStrictEqual(['acp', '--gemini-dir', '/var/app/gemini']);
  });
});

describe(codexProfile, () => {
  it('starts the adapter on PATH in the read-only mode', () => {
    expect(codexProfile()).toStrictEqual({ command: 'codex-acp', permissionModeId: 'read-only' });
  });

  it('takes the command', () => {
    expect(codexProfile({ command: '/opt/bin/codex-acp' }).command).toBe('/opt/bin/codex-acp');
  });
});
