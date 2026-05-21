# Code Review — Scaffold + Shell Port

**Date:** 2026-05-21
**Scope:** Commit `8fa54d4` (Vite + React + TS scaffold + helpline-adapted `.claude/`) plus uncommitted working tree (step 2 shell port — Sidebar, Topbar, Pager, ScrollToTop, useTheme, useAgent, nav data, layout CSS placeholder).
**Method:** `/code-review` slash command at high effort, three parallel review agents (Reuse, Quality, Efficiency).
**Out of scope:** `.claude/hooks/*.py` (verbatim helpline), `package-lock.json` (machine-generated), `ai-layer-workbook-v1.html` (reference asset).

## Stats

- Files modified: 2 (`CLAUDE.md`, `.gitignore`)
- Files added: 23 (configs + src skeleton + .claude/ + docs)
- New lines: ~5,876 (incl. ~4,832 lines of `package-lock.json` which is out of scope)
- Authored TS / TSX lines: ~330

## Findings

### High severity

```
severity: high
file: vite.config.ts
line: 12
issue: Production source maps ship 1.3MB sourcemap to the CDN
detail: `sourcemap: true` emits dist/assets/index-*.js.map at ~1.37MB and appends a sourceMappingURL comment in the JS bundle. Browsers fetch only on devtools open, but the file is deployed. Against the <200KB gzipped budget and Cloudflare Pages bandwidth, this is pure waste.
suggestion: Set `sourcemap: false` for production (default), or `'hidden'` if you want them in dist/ without a reference from the bundle.
status: FIX
```

```
severity: high
file: package.json
line: 19-21
issue: react-router-dom v7 contributes ~20KB gzipped for 16 flat hash routes
detail: HashRouter + Routes + NavLink + Link + useLocation cover use cases a ~1KB hand-rolled hash router would handle. No nesting, no loaders.
suggestion: Defer to ROADMAP. Decision: keep react-router-dom for productivity until v3.0 ships; revisit if bundle becomes a real issue post-launch.
status: DEFER (ROADMAP entry added)
```

```
severity: high
file: package.json
line: 6-7
issue: react-markdown + remark-gfm declared but unused at runtime
detail: ~50–70KB minified once first imported. Currently tree-shaken so not in bundle.
suggestion: Keep declared (will be needed for C1 audit-result rendering). When first imported in C1, use React.lazy / dynamic import so the chunk loads only when the AI panel mounts.
status: DEFER (will be enforced at C1 — note added to CLAUDE.md)
```

### Medium severity

```
severity: medium
file: src/hooks/useTheme.ts, src/hooks/useAgent.ts
issue: Near-identical "validated-localStorage-backed useState" hooks (Reuse + Quality + Efficiency all flagged)
detail: Both: STORAGE_KEY constant, initial<X>() loader with window guard + validation against allowed set, useState, useEffect that writes back to storage. Theme adds matchMedia. CLAUDE.md flags 3rd + 4th persisted prefs incoming (Anthropic key, GitHub PAT).
suggestion: Extract usePersistedEnum<T extends string>(key, isValid, fallback). useTheme and useAgent become thin wrappers.
status: FIX
```

```
severity: medium
file: src/hooks/useTheme.ts (line 22-25), src/hooks/useAgent.ts (line 29-31)
issue: Effects write to localStorage on every mount even when value unchanged; StrictMode double-writes in dev
detail: First mount reads then re-writes the same value. With <StrictMode> it writes twice in dev. Pure no-op but pollutes debugging.
suggestion: Move write into setter (no effect-driven sync needed).
status: FIX (folded into usePersistedEnum extraction)
```

```
severity: medium
file: src/App.tsx
line: 16, 21-24
issue: Drawer state leaks via two prop drillings (Quality)
detail: drawerOpen read for className then passed as onNavigate to Sidebar and onMenuClick to Topbar. Sidebar/Topbar both know about the drawer.
suggestion: Acceptable as-is for two consumers. Keep current shape; revisit if a third consumer needs drawer state. (Extraction now is over-engineering.)
status: DISMISS (acceptable abstraction for current consumer count)
```

```
severity: medium
file: src/components/Sidebar.tsx
line: 9, 25-26
issue: Mutable `runningIndex` counter across nested .map iterations (all three agents flagged)
detail: `let runningIndex = 0; … runningIndex += 1` is render-time mutation. NAV_FLAT exists; precomputed per-item numbering is cleaner and avoids re-derivation on unrelated re-renders.
suggestion: Add NAV_NUMBERS: Record<slug, "00"|"01"|...> precomputed at module load in data/nav.ts. Sidebar (and Section) look up by slug.
status: FIX
```

### Low severity

```
severity: low
file: src/App.tsx
line: 18, 45
issue: Manual pathname-to-slug parsing + redundant key={currentSlug} on ScrollToTop (all three agents)
detail: ScrollToTop already depends on useLocation().pathname via useEffect. The key prop unmounts/remounts it on every nav for no extra effect. The currentSlug derivation exists only to feed this key.
suggestion: Drop both. ScrollToTop's own dep array handles it.
status: FIX
```

```
severity: low
file: src/components/ScrollToTop.tsx
line: 7
issue: behavior: 'instant' may not be in standard lib.dom ScrollBehavior union (Reuse + Efficiency)
detail: Historical aliasing makes this brittle; v1 likely used plain window.scrollTo(0, 0).
suggestion: window.scrollTo(0, 0).
status: FIX
```

```
severity: low
file: src/data/nav.ts
line: 54-56
issue: navNumber(-1) silently returns "-1" (Quality)
detail: indexOfSlug returns -1 on miss; Section.tsx passes that through. Eyebrow would render "Section -1".
suggestion: Replaced by NAV_NUMBERS lookup which has slug→number map; missing slug → undefined; Section guards.
status: FIX (folded into NAV_NUMBERS extraction)
```

```
severity: low
file: src/hooks/useAgent.ts (line 18), src/hooks/useTheme.ts (line 10)
issue: Hand-rolled type guards via ad-hoc `(AGENTS as readonly string[]).includes` cast / inline ===
detail: Two different patterns for the same job.
suggestion: Folded into usePersistedEnum's typed-validator parameter.
status: FIX (folded into usePersistedEnum extraction)
```

```
severity: low
file: src/hooks/useTheme.ts, src/hooks/useAgent.ts (Quality)
issue: Stringly-typed localStorage keys scattered across files
detail: CLAUDE.md flags upcoming API key + PAT keys — those must never leak. A central registry makes the surface auditable.
suggestion: src/lib/storage-keys.ts central export.
status: FIX
```

```
severity: low
file: src/styles/globals.css
line: 1-7, 235 (and around the mobile media query)
issue: Comments narrating task/step plan (Quality, against CLAUDE.md "default to writing no comments")
detail: "Step-2 minimal layout CSS… Step 3 will REPLACE…" and "v1 UX fix #1 — the agent picker is now labeled" reference the work plan, not the code. They will rot the moment step 3 lands.
suggestion: Delete. The handoff brief documents step 3.
status: FIX
```

```
severity: low
file: src/components/Section.tsx
line: 12
issue: Stray `active` class on .page (Quality)
detail: v1 carried `active` because pages were tab-switched; in the router model only one Section mounts at a time. Dead weight.
suggestion: Remove. (When step 3 ports v1 CSS, port `.page.active` selectors to `.page`.)
status: FIX
```

```
severity: low
file: src/main.tsx
line: 3
issue: import App from './App.tsx' explicit extension (Efficiency / cosmetic)
detail: `allowImportingTsExtensions: true` permits it, but inconsistent with rest of imports.
suggestion: Drop the .tsx extension.
status: FIX
```

```
severity: low
file: src/components/Sidebar.tsx, src/components/Topbar.tsx
issue: Drawer lacks aria-expanded + Escape-to-close (Quality)
detail: Menu button has no aria-expanded, drawer doesn't close on Escape, no focus management. Cheap wins.
suggestion: aria-expanded={drawerOpen} on menu button, document keydown listener for Escape while open. (Focus trap deferred to step 3.)
status: FIX (lightweight portions)
```

### Dismissed / deferred

| Finding | Agent | Reason |
|---|---|---|
| react-router-dom v7 bundle weight | Efficiency | Defer; revisit if bundle is a real issue post-v3.0 |
| react-markdown + remark-gfm declared but unused | Efficiency | Tree-shaken; will be lazy-loaded at C1 |
| Theme glyphs ◐/◑ similar at small sizes | Quality | Preserves v1 aesthetic per CLAUDE.md non-negotiable |
| No matchMedia listener for OS theme change | Efficiency | Out of scope per the agent; ROADMAP entry |
| Font self-host / FOUT mitigation | Quality + Efficiency | Step 3 (full v1 CSS port) is the right time |
| Manual chunk splitting in vite.config | Efficiency | Defer to C1 when AI deps land |
| Pager empty span flexbox spacer | Quality | Step 3 CSS port likely refactors |
| Topbar select onChange `as Agent` cast | Quality | Cast is acceptable; select options are typed; no runtime risk |
| Drawer focus trap | Quality | Heavier — defer to step 3 |
| `<html data-theme="light">` hardcoded → flash on system-dark | Inline analysis | Inline-script-in-head fix — ROADMAP |

## Fixes applied

### Source-map weight (high)

- `vite.config.ts`: `sourcemap: true` → `false`. The 1.37 MB
  `dist/assets/index-*.js.map` no longer ships to Cloudflare Pages.

### Persisted-state hook duplication (medium ×3)

- Added `src/hooks/usePersistedEnum.ts` — generic localStorage-backed enum
  state hook with type-narrowed validator. Writes to storage in the setter,
  not an effect — eliminates the unconditional re-write on mount and the
  StrictMode double-write.
- Added `src/lib/storage-keys.ts` — central registry (`STORAGE_KEYS.theme`,
  `STORAGE_KEYS.agent`). API key / PAT keys will land here in v3.
- Rewrote `src/hooks/useTheme.ts` and `src/hooks/useAgent.ts` to use the
  shared hook. `useTheme` keeps a separate `useEffect` for the
  `data-theme` DOM attribute (unrelated to persistence).

### Sidebar `runningIndex` mutation (medium)

- `src/data/nav.ts` now exports `NAV_NUMBERS: Record<slug, "00"|"01"|…>`
  precomputed at module load. Also exports `nextSlug` / `prevSlug`
  helpers, replacing the duplicate `indexOfSlug` scans Pager + Section
  did before.
- `src/components/Sidebar.tsx` looks up `NAV_NUMBERS[item.slug]` per item —
  no mutable counter, no derivation order assumption.
- `src/components/Section.tsx` reads `NAV_NUMBERS[slug]` directly and
  guards against missing slugs (returns no eyebrow).
- `src/components/Pager.tsx` uses `prevSlug` / `nextSlug` — no
  `indexOfSlug` calls.
- Removed `indexOfSlug` and `navNumber` exports from `src/data/nav.ts`.

### App.tsx slug parsing + redundant ScrollToTop key (low ×2)

- Dropped the `location.pathname.replace(/^\//, '')` derivation and the
  `<ScrollToTop key={currentSlug} />`. ScrollToTop's effect dep on
  `pathname` already fires correctly.
- Added `Escape`-to-close handler for the drawer in `App.tsx`.

### ScrollToTop scroll behavior (low)

- `src/components/ScrollToTop.tsx`: `window.scrollTo({ behavior: 'instant' })`
  → `window.scrollTo(0, 0)`. Matches v1, portable across DOM lib versions.

### Stray `active` class on `.page` (low)

- `src/components/Section.tsx`: `className="page active"` → `className="page"`.
  Step-3 v1 CSS port will need to drop the `.page.active` selectors at the
  same time.

### Task-narrating comments (low ×3)

- Removed three step/task-narrating comment blocks from
  `src/styles/globals.css` (file header narrating step 3, `v1 UX fix #1`
  inline, "step-2 placeholder" before the mobile media query). Project
  CLAUDE.md says "default to writing no comments."

### `import App from './App.tsx'` extension (low)

- `src/main.tsx`: dropped `.tsx` extension for consistency with the rest of
  the import graph.

### a11y for drawer (low)

- `<button className="menu-btn">` now sets `aria-expanded={drawerOpen}` and
  `aria-controls="sidebar-nav"`. `<aside>` in `Sidebar.tsx` has matching
  `id="sidebar-nav"`. Escape closes the drawer. (Full focus trap deferred to
  step 3 per ROADMAP.)

### ROADMAP entries added for deferred items

Updated `ROADMAP.md` with a "Performance / tech-debt watch items" section
covering: react-router-dom replacement, lazy markdown deps, font self-host,
inline theme-init script, matchMedia listener, vite manualChunks, drawer
focus trap.

## Validation after fixes

- `npm run build` ✅ — 237 KB JS / 76 KB gzipped, 5 KB CSS, **no sourcemap**
  (was 1.37 MB).
- `npm run lint` ✅ — clean.
- `npm run format:check` ✅ — clean.

Bundle JS size is flat (the `usePersistedEnum` extraction added a handful of
bytes; removed effects + comments paid them back). The real shipping win
is the sourcemap removal — 1.37 MB per deploy.

