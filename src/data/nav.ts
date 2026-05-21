export interface NavItem {
  slug: string;
  title: string;
  tag?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Orientation',
    items: [
      { slug: 'start', title: 'Start here' },
      { slug: 'mental-models', title: 'Mental models' },
      { slug: 'how-it-works', title: 'How Claude Code works' },
      { slug: 'your-picture', title: 'Your codebase picture' },
    ],
  },
  {
    label: 'Implementation',
    items: [
      { slug: 'phase-1', title: 'Phase 1 — Foundation' },
      { slug: 'phase-2', title: 'Phase 2 — Discovery' },
      { slug: 'phase-3', title: 'Phase 3 — Sub-CLAUDE.mds' },
      { slug: 'phase-4', title: 'Phase 4 — LSP' },
      { slug: 'phase-5', title: 'Phase 5 — Skills' },
      { slug: 'phase-6', title: 'Phase 6 — Hooks' },
      { slug: 'phase-7', title: 'Phase 7 — Subagent' },
      { slug: 'phase-8', title: 'Phase 8 — MCP', tag: 'advanced' },
      { slug: 'phase-9', title: 'Phase 9 — Plugin' },
    ],
  },
  {
    label: 'Reference',
    items: [
      { slug: 'maintenance', title: 'Maintenance' },
      { slug: 'prompt-library', title: 'Prompt library' },
      { slug: 'glossary', title: 'Glossary' },
    ],
  },
];

export const NAV_FLAT: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export const HOME_SLUG = NAV_FLAT[0].slug;

export function indexOfSlug(slug: string): number {
  return NAV_FLAT.findIndex((item) => item.slug === slug);
}

export function navNumber(index: number): string {
  return index.toString().padStart(2, '0');
}
