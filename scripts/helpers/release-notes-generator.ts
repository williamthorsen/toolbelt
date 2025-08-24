/**
 * Generate GitHub-style release notes from changeset data
 */

import type { PackageChanges } from './changeset-generator.js';

export interface ReleaseNotes {
  packageName: string;
  version: string;
  content: string;
  hasBreakingChanges: boolean;
}

/**
 * Categories that should appear in release notes (consumer-facing changes only)
 */
const RELEASE_NOTE_CATEGORIES = ['breaking', 'features', 'fixes', 'dependencies'] as const;

/**
 * Category display names for release notes
 */
const CATEGORY_NAMES: Record<string, string> = {
  breaking: '🚨 Breaking Changes',
  features: '✨ Features',
  fixes: '🐛 Fixes',
  dependencies: '📦 Dependencies',
};

function formatReleaseNoteSection(title: string, items: Array<{ description: string; hash: string }>): string {
  if (items.length === 0) {
    return '';
  }

  const formattedItems = items.map((item) => `- ${item.description}`).join('\n');
  return `## ${title}\n\n${formattedItems}\n\n`;
}

function generatePackageReleaseNotes(packageName: string, changes: PackageChanges, version: string): ReleaseNotes {
  const sections: string[] = [];
  let hasBreakingChanges = false;

  // Process each category in order
  for (const category of RELEASE_NOTE_CATEGORIES) {
    const items = changes[category];
    if (items.length > 0) {
      const categoryTitle = CATEGORY_NAMES[category];
      if (categoryTitle) {
        sections.push(formatReleaseNoteSection(categoryTitle, items));
      }

      if (category === 'breaking') {
        hasBreakingChanges = true;
      }
    }
  }

  // If no consumer-facing changes, create minimal release notes
  if (sections.length === 0) {
    sections.push('## 🔧 Internal Changes\n\nThis release contains internal improvements and maintenance updates.\n\n');
  }

  const content = sections.join('').trim();

  return {
    packageName,
    version,
    content,
    hasBreakingChanges,
  };
}

/**
 * Generate release notes for all packages with changes
 */
export function generateReleaseNotes(changes: Record<string, PackageChanges>, version: string): ReleaseNotes[] {
  return Object.entries(changes).map(([packageName, packageChanges]) =>
    generatePackageReleaseNotes(packageName, packageChanges, version),
  );
}

/**
 * Generate a summary release note for the monorepo (optional)
 */
export function generateMonorepoReleaseNotes(packageReleaseNotes: ReleaseNotes[], version: string): string {
  if (packageReleaseNotes.length === 0) {
    return `# Release ${version}\n\nNo published packages were updated in this release.\n`;
  }

  const sections: string[] = [`# Release ${version}\n`];

  // Add breaking changes warning if any package has them
  const hasAnyBreakingChanges = packageReleaseNotes.some((notes) => notes.hasBreakingChanges);
  if (hasAnyBreakingChanges) {
    sections.push(
      '⚠️ **This release contains breaking changes. Please review the changelog carefully before upgrading.**\n',
    );
  }

  // List updated packages
  if (packageReleaseNotes.length === 1) {
    const firstPackage = packageReleaseNotes[0];
    if (firstPackage) {
      sections.push(`Updated package: **${firstPackage.packageName}**\n`);
    }
  } else {
    const packageList = packageReleaseNotes.map((notes) => `- **${notes.packageName}**`).join('\n');
    sections.push(`Updated packages:\n\n${packageList}\n`);
  }

  // Add link to individual package changelogs
  sections.push('See individual package changelogs for detailed changes.\n');

  return sections.join('\n');
}
