import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function execCommand(command: string): string {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error instanceof Error ? error.message : String(error)}`);
  }
}

function isPackageJson(value: unknown): value is { name?: string } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  if (!('name' in value)) {
    return true; // Valid package.json without name field
  }
  
  return typeof value.name === 'string';
}

function getWorkspacePackageMapping(): Record<string, string> {
  const packagesDir = join(process.cwd(), 'packages');
  const workspacePackageMap: Record<string, string> = {};
  
  try {
    const workspaceDirs = execCommand('ls packages').split('\n').filter(Boolean);
    
    for (const workspaceDir of workspaceDirs) {
      // Skip template and other non-package directories
      if (workspaceDir.startsWith('_')) continue;
      
      try {
        const packageJsonPath = join(packagesDir, workspaceDir, 'package.json');
        const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
        const packageJsonData: unknown = JSON.parse(packageJsonContent);
        
        if (isPackageJson(packageJsonData) && packageJsonData.name) {
          workspacePackageMap[workspaceDir] = packageJsonData.name;
        }
      } catch {
        // Skip directories without valid package.json
        console.warn(`Warning: Could not read package.json for workspace ${workspaceDir}`);
      }
    }
  } catch (error) {
    console.error('Error reading workspace packages:', error);
  }
  
  return workspacePackageMap;
}

// Cache the mapping since it's expensive to compute
let _workspacePackageMapping: Record<string, string> | null = null;
export function getWorkspacePackages(): Record<string, string> {
  if (!_workspacePackageMapping) {
    _workspacePackageMapping = getWorkspacePackageMapping();
  }
  return _workspacePackageMapping;
}