export interface ParsedCommit {
  workspace: string;
  workType: string;
  isBreaking: boolean;
  description: string;
}

export function parseCommitMessage(message: string): ParsedCommit | null {
  const match = message.match(/^([^|]+)\|([^!:]+)(!?): (.+)$/);
  if (!match) {
    console.warn(`Warning: Commit message does not match format: ${message}`);
    return null;
  }

  const [, workspace, workType, breakingFlag, description] = match;
  if (!workspace || !workType || !description) {
    return null;
  }
  return {
    workspace: workspace.trim(),
    workType: workType.trim(),
    isBreaking: breakingFlag === '!',
    description: description.trim(),
  };
}
