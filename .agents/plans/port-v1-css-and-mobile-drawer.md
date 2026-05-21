# Feature: Port v1 CSS verbatim + add working mobile drawer

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to class-name alignment between v1 CSS and current React JSX — there are a few intentional divergences documented below.

## Feature Description

The v1 prototype (`ai-layer-workbook-v1.html`) is the source of truth for the workbook's aesthetic — fonts, palette, typography rhythm, callouts, code-block treatment, tables, checklists, glossary popups, persona card, pager, etc. The current `src/styles/globals.css` (~378 lines) covers only the shell (sidebar, topbar, nav-item, brand, pager-link basics) and is missing every content-aesthetic rule the workbook needs.

This change ports the v1 `<style>` block (lines 11–203 of `ai-layer-workbook-v1.html`, ~192 lines of CSS) into `src/styles/globals.css` so when content begins landing in `src/pages/*` it renders with the v1 aesthetic without further CSS work.

On top of the verbatim port, we add **working mobile drawer behavior** that v1 only stubbed:

- Overlay backdrop (`.sidebar-scrim`) that darkens the page when the drawer is open and closes the drawer on tap.
- Close (✕) button inside the drawer header so users can dismiss the drawer without tapping outside it.
- Preserve existing Escape-to-close behavior in `App.tsx` (already implemented in `src/App.tsx:14-19`).

## User Story

As a reader on a phone, I want a clear, dismissable navigation drawer (tap the menu icon to open, tap outside or the close button or press Escape to dismiss) so I can move between workbook sections without losing my place — and as a desktop reader, I want the editorial field-guide aesthetic (Fraunces/Newsreader, terracotta accents, callouts, code-blocks with copy buttons) so the site reads like the v1 prototype it was modeled on.

## Problem Statement

1. `src/styles/globals.css` lacks ~80% of v1's CSS rules (callouts, kvgrid, tables, checklists, details/summary, glossary, persona-card, phase-meta, origin-block, section-num, pre/copy-btn, prism overrides, h2/h3/h4 typography). When porting v1 content section-by-section (step 4 onward), every section will render unstyled until the missing rules ship — blocking content work.
2. Current `.tag` rule (`globals.css:175-186`) maps to v1's `.tag.gray` semantics, not v1's primary `.tag`. After port, `<span className="tag gray">` (used in `Sidebar.tsx:35`) needs to still render gray — verbatim port achieves this because v1 has both `.tag` (accent) and `.tag.gray` (gray).
3. Mobile drawer in current globals.css (`globals.css:351-377`) uses `left: -300px` + `left: 0` transition (different from v1's `transform: translateX(-100%)` technique) and has no backdrop, no close button, and no scrim element. Tapping outside the drawer doesn't dismiss it; on a 375px-wide screen the drawer covers content with no obvious dismissal target except the menu icon (which is now obscured by the drawer itself).

## Solution Statement

1. **Replace `src/styles/globals.css` wholesale** with a port of v1's `<style>` block. Preserve the v1 ordering, comments (`/* layout */`, `/* mobile */`, `/* dark prism overrides */`), and exact values (colors, font-variation-settings, font sizes, padding/margin). Three deliberate divergences (documented in code comments) are required because current JSX uses class names that don't exist in v1:
   - **Mobile-drawer selector**: v1 uses `.sidebar.open`. Current JSX puts `drawer-open` on the `.app` wrapper (`App.tsx:22`). Adapt the v1 mobile rule to `.app.drawer-open .sidebar` (and keep v1's `transform: translateX(0)` technique — it's smoother than `left` animations).
   - **Pager classes**: v1's pager uses `.pager a`, `.pager a.next`, `.pager-label`. Current `Pager.tsx` uses `.pager-link`, `.pager-prev`, `.pager-next`, `.pager-direction`, `.pager-title`. Keep current JSX classes; write CSS rules against those names that match v1's visual treatment (border-top, individual card hover, mobile column).
   - **`.page` rules**: v1 uses `.page{display:none}` + `.page.active{display:block}` for single-page tab swapping. React renders one Section at a time, no `.active` toggle — omit `display:none` and the fadeIn animation (keyed on `.active`).
2. **Add `.sidebar-scrim` element and behavior**: render `<button className="sidebar-scrim shown" />` in `App.tsx` (or `<div>` with onClick) when `drawerOpen` is true. The verbatim v1 CSS already includes `.sidebar-scrim` rules — we just wire it.
3. **Add a `.drawer-close` button in `Sidebar.tsx`** rendered only at mobile widths (CSS `display: none` on desktop). Reuses `.icon-btn` aesthetic. Calls `onNavigate` (which already closes the drawer in `App.tsx:23`).
4. **Preserve `App.tsx`'s Escape-to-close handler** (`src/App.tsx:12-19`) — no changes needed there.

## Feature Metadata

**Feature Type**: Enhancement (port + mobile drawer)
**Estimated Complexity**: Medium (mechanical CSS port + a small interaction layer)
**Primary Systems Affected**: `src/styles/globals.css`, `src/App.tsx`, `src/components/Sidebar.tsx`
**Dependencies**: None (no new packages)

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `ai-layer-workbook-v1.html` (lines 11–203) — Source of truth for the CSS port. The entire `<style>` block. Read in full.
- `src/styles/globals.css` (lines 1–378) — The file being replaced wholesale. Note current rules and confirm nothing existing is silently dropped (everything reappears in the v1 port except the React-specific `.agent-picker`, `.agent-picker-label`, `.pager-link`, `.pager-prev`, `.pager-next`, `.pager-direction` blocks — those must be re-added after the verbatim port).
- `src/App.tsx` (full file, 60 lines) — Shell with `HashRouter`, drawer-open state, Escape handler. New scrim element wires in here.
- `src/components/Sidebar.tsx` (full file, 43 lines) — Where the close (✕) button mounts inside `.brand`.
- `src/components/Topbar.tsx` (full file, 55 lines) — Uses `.menu-btn`, `.agent-picker`, `.agent-picker-label`, `.picker`, `.icon-btn`. No changes; just confirm classes match.
- `src/components/Pager.tsx` (full file, 36 lines) — Uses `.pager-link`, `.pager-prev`, `.pager-next`, `.pager-direction`, `.pager-title`. CSS for these classes must be written (not present in v1).
- `src/components/Section.tsx` (full file, 23 lines) — Renders `<article className="page">` with no `.active`. Confirms why we skip v1's `.page{display:none}` rule.
- `CLAUDE.md` (full file) — Non-negotiable constraints: aesthetic preserved, no modernization, mobile-first to 375px, content ported verbatim.
- `ROADMAP.md` (lines 50–77) — Lists deferred CSS-adjacent items (font self-hosting, theme-init script, focus trap). Do not address these here; the focus-trap is explicitly deferred to "step 3" which this plan does **not** undertake.

### New Files to Create

None. This change edits three existing files only.

### Files Edited

- `src/styles/globals.css` — Wholesale replace with v1 port + scrim/close-button additions.
- `src/App.tsx` — Add `.sidebar-scrim` rendering when `drawerOpen` is true.
- `src/components/Sidebar.tsx` — Add `.drawer-close` button inside `.brand`.

### Relevant Documentation — YOU SHOULD READ THESE BEFORE IMPLEMENTING

- [MDN: `transform: translateX`](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/translateX) — v1 uses transform-based drawer (GPU-accelerated, doesn't trigger reflow). The current globals.css uses `left` animation which is slower; the port intentionally adopts v1's technique.
- [MDN: `backdrop-filter: blur()`](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter) — Used by `.topbar` and `.glossary-popup` for the editorial "frosted" feel. Safari needs `-webkit-backdrop-filter` (v1 includes the prefix).
- [MDN: `color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix) — Used in `.topbar` background and `a` border-bottom. Baseline browser support since 2023.
- [MDN: `font-variation-settings`](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variation-settings) — Used heavily for Fraunces opsz axis. Optional progressive enhancement.
- [`react-router-dom` v7 `NavLink`](https://reactrouter.com/start/library/navigating#navlink) — Already wired in `Sidebar.tsx:24`. `active` class applied automatically. No change.

### Patterns to Follow

**CSS variable naming and palette (verbatim from v1):**

```css
:root {
  --bg: #f4efe6;
  --bg-elev: #faf6ee;
  --bg-card: #fffbf3;
  --ink: #1f1a14;
  --ink-soft: #5a5048;
  --ink-mute: #8a7f73;
  --rule: #d9cfbe;
  --rule-soft: #e8decc;
  --accent: #b6452c;
  --accent-soft: #d67b5f;
  --accent-bg: rgba(182, 69, 44, 0.08);
  --ok: #3f6b3a;
  --warn: #8a6914;
  --shadow:
    0 1px 0 rgba(31, 26, 20, 0.04), 0 8px 24px -12px rgba(31, 26, 20, 0.12);
  --serif: 'Fraunces', Georgia, serif;
  --body: 'Newsreader', Georgia, serif;
  --mono: 'JetBrains Mono', ui-monospace, monospace;
}
```

Current `globals.css:1-15` is missing `--accent-soft`, `--ok`, `--warn`, `--shadow`. Port includes all of them.

**Mobile drawer (adapted v1 technique, current JSX selectors):**

```css
@media (max-width: 900px) {
  .app {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    z-index: 50;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: 8px 0 24px -8px rgba(0, 0, 0, 0.2);
  }
  .app.drawer-open .sidebar {
    transform: translateX(0);
  }
  .sidebar-scrim {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 40;
    border: none;
    padding: 0;
    cursor: pointer;
  }
  .drawer-close {
    display: inline-flex;
  }
  /* ...rest of v1's mobile block: .menu-btn{display:block}, .main padding, etc. */
}

.drawer-close {
  display: none; /* hidden on desktop */
}
```

**Pager rules (current JSX classes, v1-aesthetic visuals):**

```css
.pager {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 4rem;
  padding-top: 2rem;
  border-top: 1px solid var(--rule);
}
.pager-link {
  flex: 1;
  padding: 1rem 1.2rem;
  background: var(--bg-card);
  border: 1px solid var(--rule);
  border-radius: 6px;
  color: var(--ink);
  text-decoration: none;
  font-family: var(--body);
  transition:
    background 0.12s,
    border-color 0.12s;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}
.pager-link:hover {
  background: var(--accent-bg);
  border-color: var(--accent);
}
.pager-next {
  text-align: right;
}
.pager-direction {
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-mute);
}
.pager-title {
  font-family: var(--serif);
  font-weight: 500;
  font-size: 1rem;
  color: var(--ink);
}
```

Note: mobile rule needs `.pager{flex-direction:column}` (matches v1).

**Scrim element pattern (new in `App.tsx`):**

```tsx
{drawerOpen && (
  <button
    type="button"
    className="sidebar-scrim"
    aria-label="Close navigation menu"
    onClick={() => setDrawerOpen(false)}
  />
)}
```

Rendered inside the `.app` div, after `<ScrollToTop />`. Using `<button>` (not `<div role="button">`) so keyboard focus works without extra attributes.

**Close button pattern (new in `Sidebar.tsx`, inside `.brand`):**

```tsx
<button
  type="button"
  className="drawer-close icon-btn"
  aria-label="Close navigation menu"
  onClick={onNavigate}
>
  ✕
</button>
```

Use `.icon-btn` for visual reuse + `.drawer-close` for `display:none/inline-flex` toggling.

---

## IMPLEMENTATION PLAN

### Phase 1: CSS port

Replace `src/styles/globals.css` with the v1 `<style>` block content, adapted for the three documented JSX divergences. Add React-specific rules (`.agent-picker`, `.agent-picker-label`, pager classes, `.drawer-close`) that aren't in v1.

**Tasks:**

- Read v1 style block in full (lines 11–203).
- Write the new globals.css in v1 ordering: variables → globals (html/body/a/h*/code/pre/.copy-btn) → layout (.app/.sidebar/.brand/.nav-*) → main-wrap/topbar/menu-btn/picker/icon-btn → main/page → eyebrow/lede → callout → kvgrid → table → checklist → tag → details → glossary → persona-card → lang-grid → btn → phase-meta → pager → origin-block → section-num → mobile @media → prism dark/light overrides.
- Insert React-only blocks after each thematically adjacent v1 block (`.agent-picker` after `.topbar-right`, pager rules in place of v1's `.pager a` block, `.drawer-close` after `.icon-btn`).
- Adapt mobile drawer selector + add `.sidebar-scrim` rule positioning.

### Phase 2: Wire the scrim

Render the scrim in `App.tsx` when `drawerOpen` is true.

**Tasks:**

- Add `{drawerOpen && <button className="sidebar-scrim" aria-label="Close navigation menu" type="button" onClick={() => setDrawerOpen(false)} />}` inside the `.app` div, sibling to `<ScrollToTop />`.

### Phase 3: Add the close button

Add a `.drawer-close` button inside the brand block in `Sidebar.tsx`.

**Tasks:**

- Add the close button as a sibling of the brand title/sub, calling `onNavigate` on click. Hidden on desktop via CSS (no JS check needed).

### Phase 4: Validate

Run lint, format check, type-check, build, and manually verify in browser at 375px and 1280px.

---

## STEP-BY-STEP TASKS

Execute every task in order, top to bottom. Each task is atomic and independently testable.

### REPLACE `src/styles/globals.css`

- **IMPLEMENT**: Wholesale replace with a v1 `<style>` port (variables, typography, layout, callouts, kvgrid, table, checklist, tag, details, glossary, persona-card, lang-grid, btn, phase-meta, origin-block, section-num, prism dark/light overrides) PLUS three React-only blocks (`.agent-picker` + `.agent-picker-label`; pager classes against current JSX; `.drawer-close`) PLUS the mobile drawer block adapted to `.app.drawer-open .sidebar` selector with `.sidebar-scrim` styled.
- **PATTERN**: `ai-layer-workbook-v1.html:11-203` (verbatim port for everything except mobile drawer, pager, `.page` rules). React-only blocks follow the "Patterns to Follow" section above.
- **IMPORTS**: None (CSS file).
- **GOTCHA**:
  - **Do not include** `.page{display:none}` or `.page.active{display:block}` (React doesn't toggle `.active`). Keep `.page{max-width:760px;margin:0 auto}` only — drop the `display:none` and fadeIn keyframe. Optional: keep `@keyframes fadeIn` and apply to `.page` unconditionally if you want the section-transition feel; default is to omit.
  - **Do not** carry over `.pager a` selector — current `Pager.tsx` uses `Link` components with explicit `.pager-link` class, not bare `<a>`. Use the React pager block instead.
  - Keep `-webkit-backdrop-filter` prefix on `.topbar` (Safari).
  - Mobile selector divergence: v1 has `.sidebar.open` — use `.app.drawer-open .sidebar` to match `src/App.tsx:22`.
  - `.tag.ok` and `.tag.gray` are not in current JSX yet but Sidebar uses `<span className="tag gray">` (`src/components/Sidebar.tsx:35`) — verbatim port keeps that visually gray. ✓
  - The scrim is a `<button>`. Default browser styles add background/border — the CSS rule needs `border:none;padding:0;cursor:pointer` to defeat those (already in pattern above).
- **VALIDATE**:
  - `npm run format:check` (exits 0).
  - `npm run lint` (exits 0 — CSS isn't linted but JS/TS still must be clean).
  - `npm run build` (exits 0; bundle size delta logged in build output).

### UPDATE `src/App.tsx`

- **IMPLEMENT**: Render a `.sidebar-scrim` button when `drawerOpen` is true, inside the `.app` div, after `<ScrollToTop />`. Wire `onClick` to `setDrawerOpen(false)`. Keep all existing logic untouched (Escape handler, drawer state, routes).
- **PATTERN**: "Scrim element pattern" in "Patterns to Follow" above. Insert at `src/App.tsx:49-50` (between `<ScrollToTop />` and the closing `</div>`).
- **IMPORTS**: No new imports needed.
- **GOTCHA**:
  - Don't render the scrim unconditionally — that would block all interaction on desktop. Gate on `drawerOpen` so the element only exists when open.
  - Use `<button type="button">` not `<div onClick>` so keyboard focus + Enter/Space activation work natively. Add `aria-label="Close navigation menu"`.
  - Don't add a `role` attribute (it's already a button).
- **VALIDATE**:
  - `npm run build` (TypeScript compiles).
  - Manual: open browser at 375px width, tap menu → drawer opens, scrim appears; tap scrim → drawer closes.

### UPDATE `src/components/Sidebar.tsx`

- **IMPLEMENT**: Add a `.drawer-close .icon-btn` button as the last child of the `.brand` div. Calls `onNavigate` on click. ARIA label: "Close navigation menu". Text content: `✕`.
- **PATTERN**: "Close button pattern" in "Patterns to Follow" above. Insert at end of the `.brand` div block (`src/components/Sidebar.tsx:11-18`).
- **IMPORTS**: No new imports.
- **GOTCHA**:
  - The button is hidden on desktop via CSS (`.drawer-close{display:none}` desktop, `.drawer-close{display:inline-flex}` inside `@media (max-width: 900px)`). Do not gate visibility in React — keep CSS-only so SSR/static prerender works identically.
  - `onNavigate` may be `undefined` (the prop is optional). Use `onClick={onNavigate}` directly; if undefined, React treats it as no-op. Or use `onClick={() => onNavigate?.()}` to be explicit.
  - Visually: position the close button to the right side of the brand block. Either flex layout on `.brand` or absolute positioning — recommend a simple `.brand{display:flex;justify-content:space-between;align-items:flex-start}` only on mobile so the close button sits to the right of the brand text. (Update the `.brand` rule in the mobile @media block.)
- **VALIDATE**:
  - `npm run build` (TypeScript compiles).
  - Manual: at 375px, open drawer, tap close button → drawer closes.

### MANUAL VALIDATION

- **IMPLEMENT**: Run `npm run dev`, then verify in browser.
- **VALIDATE** (each must pass):
  1. Desktop (1280px): sidebar visible permanently, no menu button visible, no scrim, no close button visible. Topbar shows agent picker label "Your agent →" and theme toggle.
  2. Mobile (375px, DevTools device-toolbar): sidebar hidden, hamburger menu button visible in topbar.
  3. Mobile: tap menu → drawer slides in from left (transform animation), scrim darkens main area, close (✕) button visible in drawer brand.
  4. Mobile: tap scrim → drawer slides out, scrim disappears.
  5. Mobile: tap close button → drawer slides out.
  6. Mobile + drawer open: press Escape → drawer closes (preserved behavior from `App.tsx:14-19`).
  7. Click a nav item on mobile → drawer closes (preserved behavior; `onNavigate` already passed down `App.tsx:23` → `Sidebar.tsx:30`).
  8. Theme toggle: switch to dark → background goes deep brown, ink goes warm cream, accent goes salmon. Switch back: warm cream / deep ink / terracotta.
  9. Glossary popup, callouts, code blocks, etc. — these aren't rendered yet (Section.tsx is a placeholder), but the rules exist in globals.css ready for content step.

---

## TESTING STRATEGY

### Unit Tests

None. There's no test framework in this project yet (no jest/vitest in `package.json`). Adding one is out of scope for this change.

### Integration Tests

None — same reason.

### Edge Cases

- **Drawer open + window resize**: resizing from mobile to desktop while drawer is open should not leave the scrim mounted (it would block clicks on desktop). The scrim mounts on `drawerOpen` and `drawerOpen` doesn't auto-reset on resize. **Acceptable trade-off** for v3.0: scrim CSS is gated by `@media (max-width: 900px)` (`display:none` outside the media query — confirm this in the port), so even if React mounts the element, it's not visible/clickable on desktop. Verify this when manually testing.
- **Drawer open + Escape with focus inside a form input** (when content lands later): Escape should still close drawer. Current handler is `document.addEventListener('keydown', ...)` — captures even with input focus. ✓
- **Multiple rapid open/close taps**: React state batches; no jitter expected. v1 transition is 0.2s `ease` — overlapping clicks just retarget the transform.
- **No-JS (CSP / browser-script-disabled)**: the SPA doesn't render at all without JS, so the drawer never matters.
- **Reduced-motion preference**: v1 doesn't include `prefers-reduced-motion` overrides. **Out of scope** for this change; if the user is sensitive to motion, a 0.2s transform is mild. Note in plan; do not add `@media (prefers-reduced-motion: reduce){.sidebar{transition:none}}` here — keep the verbatim port discipline. Promote to ROADMAP if it surfaces in user feedback.

---

## VALIDATION COMMANDS

Execute every command. Zero regressions, zero errors.

### Level 1: Syntax & Style

```bash
npm run format:check
npm run lint
```

Both must exit 0.

### Level 2: Type-check + build

```bash
npm run build
```

`npm run build` first runs `tsc -b` (type-check) then `vite build`. Must exit 0. Bundle output goes to `dist/`. Compare CSS bundle size in the Vite build output before/after — expect ~3–4× growth (current globals.css ~6 KB → ~18–22 KB unminified ≈ ~6–8 KB gzipped).

### Level 3: Unit / integration tests

N/A — no test framework configured. Skip.

### Level 4: Manual validation

Run `npm run dev`, open http://localhost:5173.

1. **Desktop layout (resize browser to ≥1280px)**:
   - Sidebar permanent on left, ~280px wide.
   - Topbar visible at top with hamburger hidden, agent picker label visible.
   - Brand block renders "The AI Layer / Workbook" in Fraunces, with "A field guide · v1.0" eyebrow.
   - Nav items: hover shows soft background; active item shows accent background + accent text + accent nav-num.
2. **Mobile layout (DevTools → toggle device toolbar → 375 × 812 iPhone X, or resize to ≤900px)**:
   - Sidebar hidden, hamburger visible in topbar.
   - Tap hamburger: sidebar slides in from left (~200ms `transform: translateX(0)` from `-100%`), scrim appears (rgba(0,0,0,0.3)), close (✕) button visible at top-right of brand.
   - Tap scrim: drawer slides out, scrim disappears.
   - Tap close button: same.
   - Press Esc while drawer is open: same.
   - Tap a nav item: drawer closes AND route changes.
3. **Theme toggle**: click theme button in topbar → palette inverts. Confirm CSS variables override correctly (no flash beyond the existing first-paint).
4. **Lighthouse mobile run** (optional sanity check): no accessibility errors, no contrast violations.

### Level 5: Additional validation

None.

---

## ACCEPTANCE CRITERIA

- [ ] `src/styles/globals.css` is a faithful port of `ai-layer-workbook-v1.html` lines 11–203 with three documented divergences (mobile drawer selector, pager rules against React class names, omitted `.page{display:none}`).
- [ ] All CSS variables from v1 :root and `[data-theme="dark"]` are present (including `--accent-soft`, `--ok`, `--warn`, `--shadow`).
- [ ] Rules for all v1 components are present: `pre`, `.copy-btn`, `.callout` (+ ok, warn), `.kvgrid`, `.table-wrap` + `table/th/td`, `.checklist`, `.tag` (+ gray, ok), `details`/`summary`, `.glossary-term`/`.glossary-popup`, `.persona-card` + `.persona-field` + `.lang-grid`, `.btn` (+ ghost), `.phase-meta`, `.origin-block`, `.section-num`, prism dark + light token overrides.
- [ ] Mobile drawer (`@media (max-width:900px)`):
  - [ ] `.sidebar` uses `transform: translateX(-100%)` + transition.
  - [ ] `.app.drawer-open .sidebar` uses `transform: translateX(0)`.
  - [ ] `.sidebar-scrim` is positioned `fixed; inset:0` with `background: rgba(0,0,0,0.3)`, z-index below sidebar.
  - [ ] `.drawer-close` is `inline-flex` on mobile, `none` on desktop.
- [ ] `.app` renders a `<button class="sidebar-scrim">` when `drawerOpen` is true; clicking it closes the drawer.
- [ ] `.brand` in Sidebar renders a `<button class="drawer-close icon-btn">✕</button>` calling `onNavigate`.
- [ ] Escape-to-close handler in `App.tsx:12-19` is unchanged and still works.
- [ ] No console errors, no console warnings.
- [ ] `npm run build` succeeds; `npm run lint` and `npm run format:check` exit 0.
- [ ] Manual testing on 375px, 768px, and 1280px viewport widths confirms drawer behavior.
- [ ] No API keys/PATs accidentally exposed (no relevance here, but the constraint is global per CLAUDE.md).

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed:
  - [ ] Level 1: format:check, lint
  - [ ] Level 2: build (tsc + vite)
  - [ ] Level 4: manual mobile + desktop validation
- [ ] Full acceptance-criteria list checked
- [ ] No regressions visible at 375px / 768px / 1280px viewport widths
- [ ] No new dependencies added (verify `package.json` and `package-lock.json` unchanged)
- [ ] Code reviewed for quality and maintainability (consider `/code-review` before commit)

---

## NOTES

### Why three deliberate divergences from v1

The CLAUDE.md rule is "content is ported verbatim" with aesthetic preserved. The three divergences here are about class-name plumbing (React JSX uses different selectors than the v1 single-page DOM), not aesthetic changes. Document them inline in the CSS with `/* react: ... */` comments so future readers know why the file isn't a byte-for-byte copy of v1's `<style>` block.

Recommended in-file comments:

```css
/* react: v1 used `.sidebar.open` — adapted to current shell's `.app.drawer-open .sidebar` selector */
/* react: pager classes match Pager.tsx, not v1's `.pager a` */
/* react: `.page` does NOT toggle `.active` — React renders one section at a time */
```

### Bundle-size watch

The current globals.css gzipped is ~2 KB. After port, expect ~6–8 KB gzipped. Still well under the <200 KB total-bundle target. Vite's CSS-as-asset emits a single file; no per-route splitting needed.

### Things deliberately NOT in this change

- Self-host fonts (`@fontsource-variable/*`). Deferred to `ROADMAP.md`.
- Theme-init script in `<head>` (eliminates first-paint flash). Deferred.
- `matchMedia` listener for OS theme changes. Deferred.
- Focus trap when drawer is open (Tab cycles inside drawer). Deferred to "step 3" per `.agents/code-reviews/scaffold-and-shell-port.md`.
- `prefers-reduced-motion` overrides. Not in v1; reconsider if user feedback surfaces it.

### Confidence score

**8.5/10** for one-pass implementation. The CSS port is mechanical; the three React-side additions (scrim render, close button, drawer-close visibility CSS) are small and well-specified. Risk areas: (a) accidentally dropping a v1 rule during transcription — mitigated by porting in v1 ordering and using a final diff check; (b) the mobile `.brand` flex tweak for close-button positioning may need a follow-up styling pass; (c) `prefers-reduced-motion` is out of scope but may surface as accessibility feedback.
