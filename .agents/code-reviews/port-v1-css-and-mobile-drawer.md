# Code Review — Port v1 CSS + Mobile Drawer (Step 3)

**Date:** 2026-05-21
**Scope:** Commit `52f603a` — v1 `<style>` block ported into `src/styles/globals.css`, working mobile drawer (`.sidebar-scrim` in `App.tsx`, `.drawer-close` in `Sidebar.tsx`), `.mcp.json` for Playwright MCP at project scope, `.gitignore` additions, plan file under `.agents/plans/`.
**Method:** `/code-review` slash command, single-pass review against CLAUDE.md / handoff / prior review (`scaffold-and-shell-port.md`) / ROADMAP.
**Out of scope:** `.agents/plans/port-v1-css-and-mobile-drawer.md` (planning doc, not shipped code); `ai-layer-workbook-v1.html` (reference asset); `.mcp.json` semantics beyond version pinning.
**Validation:** `npm run lint` ✓, `npm run build` ✓ (CSS 13.98 KB raw / 3.47 KB gz; under plan's 6–8 KB gz prediction). Live-verified in Chromium via Playwright MCP at 375 × 812 and 1280 × 800 before commit.

## Stats

- Files modified: 4 (`.gitignore`, `src/App.tsx`, `src/components/Sidebar.tsx`, `src/styles/globals.css`)
- Files added: 2 shipped (`.mcp.json`, `.agents/plans/port-v1-css-and-mobile-drawer.md`)
- New lines: 1192
- Deleted lines: 45
- Authored TS/TSX delta: +28 / −7
- CSS delta: +732 / −37

## Findings

### High severity

None.

### Medium severity

```
severity: medium
file: ROADMAP.md, .agents/plans/port-v1-css-and-mobile-drawer.md
line: ROADMAP.md:75–77; plan §"Things deliberately NOT in this change"
issue: Drawer focus trap was committed to "step 3" in two places; step-3 ships without it
detail: Prior review (.agents/code-reviews/scaffold-and-shell-port.md:190) flagged the focus trap as "Heavier — defer to step 3." ROADMAP.md:75–77 says "a proper focus trap (Tab cycles inside drawer when open) is deferred to step 3." This commit IS step 3 (per commit subject and plan title), yet the plan re-defers the focus trap to an unnamed future step. Either the deferral target needs to move (ROADMAP rewrite to point at C1 or later), or the trap should land here — it's ~20 lines via a `useEffect` that captures `Tab` while `drawerOpen`.
suggestion: Pick one: (a) implement the focus trap now (sidebar-nav becomes the focus boundary while drawer is open; Tab+Shift+Tab cycle within `#sidebar-nav`; first focus moves to close button on open); or (b) update ROADMAP.md:75–77 to a new target (e.g., "deferred to first content step that introduces interactive form fields") so the promise stops chasing each commit.
```

```
severity: medium
file: src/components/Sidebar.tsx
line: 12
issue: Anonymous `<div>` wrapper inside `.brand` has no class — fragile if future CSS targets `.brand > div`
detail: To make the mobile-only flex layout work (title+sub on left, close ✕ on right), `brand-title` and `brand-sub` were wrapped in a bare `<div>`. The wrapper is structural; it has no semantic role and no class. Any future rule like `.brand > div { ... }` (a common pattern when styling immediate children) will silently catch this wrapper. The desktop brand block doesn't *need* the wrapper at all — `.brand` has no flex/grid on desktop — but it ships anyway.
suggestion: Give it a class (`.brand-text` or `.brand-meta`) so CSS intent stays explicit. Two-line change. If you prefer to drop the DOM node entirely on desktop, gate via JSX — but CSS-only is closer to the plan's "no JS check for visibility" rule, so a named wrapper is the right fix.
```

```
severity: medium
file: src/components/Sidebar.tsx
line: 24 (vs line 40)
issue: Inconsistent onClick style between close button and NavLinks
detail: Line 24 wraps the optional callback: `onClick={() => onNavigate?.()}`. Line 40 passes it raw: `onClick={onNavigate}`. Both work — React tolerates `undefined` event handlers. The wrapper at line 24 isn't doing any work (no extra args, no `preventDefault`, no early return); it's just an indirect call. Inconsistency invites future readers to wonder if there's a reason.
suggestion: Match line 40: `onClick={onNavigate}`. If a guard is wanted for safety, do it everywhere — but the prop is typed `onNavigate?: () => void` so React already handles `undefined`.
```

### Low severity

```
severity: low
file: src/styles/globals.css
line: (missing) — old globals.css:374–376 had `.agent-picker-label { display: none }` inside `@media (max-width:900px)`; not in the port
issue: Silent regression — agent picker label now eats topbar real estate at 375px
detail: Pre-port mobile rule hid the "YOUR AGENT →" label below 900px so the `<select>` could breathe. Port dropped the rule. Live test at 375px confirms the label is now visible alongside a compressed picker (`max-width: 120px` from the new `.topbar-right .picker` rule). Visually tolerable; functionally the topbar is tighter than before. Plan does not mention this rule, so it's an unintended diff, not a documented decision.
suggestion: Restore one rule inside the mobile media query: `.agent-picker-label { display: none; }`. Or, if the new behavior is preferred, document the choice in a `/* react: */` comment to match the file's other "react:" annotations.
```

```
severity: low
file: .mcp.json
line: 4
issue: Floating Playwright MCP version (`@latest`) — non-reproducible installs, mild supply-chain exposure
detail: `npx -y @playwright/mcp@latest` resolves the newest version on npm at session start. For a public, MIT-licensed repo where any contributor (or future agent) may clone and approve the MCP, a compromised npm publish would land directly in a tool with full filesystem and browser-driving access. Same risk applies to any future contributor running this on confidential repos via their global config. Cost of pinning is zero.
suggestion: Pin to a known-good version, e.g. `@playwright/mcp@0.0.x` (replace `x` with the version that worked in this session — `npx @playwright/mcp@latest --version` if available, or read from `~/.npm/_npx/*/node_modules/@playwright/mcp/package.json`). Renovate / dependabot can bump on a controlled cadence.
```

```
severity: low
file: src/styles/globals.css
line: 139–158, 982–1031
issue: ~1 KB of dead CSS for a Prism integration that isn't loaded
detail: `pre { background: ... !important }` (line 140) and the `[data-theme="dark"] .token.*` / `[data-theme="light"] .token.*` rules (lines 982–1031) only matter when Prism is loaded. `index.html` and `src/main.tsx` don't import Prism. The v1 prototype loaded Prism from a CDN; the React build does not. The rules are harmless (they match nothing), but they ship bytes for a future feature. Worth keeping if Prism is the next thing to land; worth deleting otherwise.
suggestion: Decide intent. If C1+ will introduce Prism for AI-output code blocks, leave it and add a TODO comment so future-you remembers. If not, delete the prism overrides and drop `!important` from `pre`. Trim is ~0.5 KB gzipped.
```

```
severity: low
file: src/components/Sidebar.tsx + src/styles/globals.css
line: Sidebar.tsx:20–27; globals.css:381–398 (.icon-btn)
issue: 34 × 34px close button is below the iOS HIG 44 × 44pt touch-target guideline
detail: `.icon-btn` (reused by `.drawer-close`) is 34px square. iOS Human Interface Guidelines recommend a minimum 44pt touch target. Live test at 375px showed the button is comfortably tappable for an adult thumb at the top-right of the drawer with margin to spare, but smaller / less-coordinated users may struggle. This is the same constraint the theme toggle has — fixing it touches `.icon-btn` globally, so it's a single change.
suggestion: Bump `.icon-btn` to `40px` (the v1 value reads as 34 in pixels, but v1 had this same constraint — the prior decision is "shipped that way"). Lowest-risk version: scope the bump to `.drawer-close` only inside the mobile media query: `.drawer-close { min-width: 40px; min-height: 40px; }`. Defer if the desktop icon button is sized for visual rhythm rather than touch.
```

```
severity: low
file: src/styles/globals.css
line: 908–918 (.sidebar-scrim) + 948–950 (mobile override)
issue: Scrim show/hide is asymmetric with the rest of the file's `.shown` toggle pattern
detail: `.nav-check.shown` (line 311–313) and `.glossary-popup.shown` (line 665–668) use a `.shown` class to flip `display`. The scrim uses media-query + React mount/unmount instead — `display: none` at base, `display: block` inside `@media (max-width:900px)`, and the React element only exists when `drawerOpen`. Both approaches work; the inline `/* react: */` comment explains the base rule's purpose, but a future reader scanning for "how to make the scrim appear" may look for `.sidebar-scrim.shown` and not find it.
suggestion: Extend the inline comment to mention the toggle approach explicitly, e.g. "/* react: scrim is React-mounted only when drawer is open AND visible only at mobile widths via media query — no `.shown` class needed */". Pure documentation; no behavior change.
```

```
severity: low
file: src/App.tsx
line: 49–56
issue: Scrim button could mount on desktop if `drawerOpen` is true at the moment a user resizes from mobile → desktop
detail: The button mounts on React state `drawerOpen`, which has no resize listener. If a mobile user opens the drawer, then a window resize crosses the 900px breakpoint, the scrim button stays in the DOM until they tap something that closes the drawer. CSS gates `display:none` outside `@media (max-width:900px)`, so it's invisible and non-clickable — but it's still in the accessibility tree (a hidden `<button>` is still announced by some screen readers depending on `display:none` handling). Plan explicitly accepts this trade-off; this is just flagging that the trade-off has an a11y dimension.
suggestion: Two options. (a) Add a `useEffect` that listens for `matchMedia('(min-width:901px)').addEventListener('change', ...)` and resets `drawerOpen` when the breakpoint crosses to desktop. (b) Render the scrim only when both `drawerOpen` AND a width check pass. Both are ~5 lines. Or: leave as-is (defer to ROADMAP) — `display:none` removes most screen readers from announcing it.
```

## Summary

No critical, security, or correctness defects. The CSS port is mechanical and faithful (v1 ordering preserved, three React-side divergences documented inline). The React additions are minimal and idiomatic. Build and lint pass; Playwright-verified visually in real Chromium at both viewports.

The two findings worth acting on before the next plan:
1. **Resolve the focus-trap deferral** — either implement it (the right scope for step 3 per ROADMAP) or rewrite ROADMAP.md so the promise points somewhere reachable.
2. **Restore `.agent-picker-label { display: none }` in mobile, or document the change** — silent diff from previous behavior.

Everything else is a low-priority polish item or a documented trade-off.
