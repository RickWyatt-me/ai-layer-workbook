# Feature: Capability A — Settings panel

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Add a persistent settings panel — opened from a gear button in the Topbar — where the user manages their Anthropic API key, GitHub PAT, and AI model choices (alongside the existing agent picker, theme, and personalize data). Keys are stored in `localStorage` only, sent only to their destination host, and never logged or surfaced in errors. The panel includes a plain-language "What gets stored locally vs sent over the network" explainer and a one-click "Clear all keys & settings" reset.

This is **Capability A** in the locked feature order (`CLAUDE.md` resolved decision 6). It ships standalone before Capability B (GitHub fetch). It does **not** call any API yet — it only stores values that future L3 features will consume.

## User Story

As a non-technical-but-capable builder
I want to paste my Anthropic API key and (optionally) my GitHub PAT into the workbook
So that the AI-powered features (C1–C4) can use them later — with full confidence that the keys never leave my browser except to their destination host

## Problem Statement

The L3 capabilities (C1 Audit, C2 Root CLAUDE.md, C3 Sub-CLAUDE.md, C4 Skill) require the user's Anthropic API key. Capability B (GitHub fetch) requires the GitHub PAT for private repos. Today the app has no UI for either. Building L3/L2 first would either hard-code keys or block on a settings flow — so settings ships first.

Beyond the storage mechanics, the *trust surface* is the real problem. The target reader is a non-technical builder being asked to paste a credential into a public website. The UI has to make the "no backend, BYOK only" reality legible — not just true, but *visibly* true.

## Solution Statement

1. New `useSettings()` hook owns the new state — `{ anthropicKey, githubPat, generateModel, fastModel }` — persisted to `localStorage` under `aiLayer.settings` as a single JSON blob (mirroring `usePersona`'s pattern with a listener set for cross-instance sync).
2. New `<SettingsDialog>` component is a modal dialog (portal, focus trap, `role="dialog"`, `aria-modal`, escape-to-close, scrim click-close) built from the existing form-input CSS. It composes `useSettings` + `useAgent` + `useTheme` + `usePersona` into one panel.
3. New gear icon (`⚙`) button in the Topbar, immediately after the theme toggle, opens the dialog.
4. New `<PrivacyExplainer>` block inside the dialog (plain-language, three bullets) makes the trust model legible.
5. New "Clear all keys & settings" button removes every `STORAGE_KEYS.*` entry and resets every hook to defaults.
6. Existing working hooks (`useTheme`, `useAgent`, `usePersona`) are reused unchanged — settings is **additive**, not a rewrite.

No API calls. No key validation (the brief explicitly defers error handling to actual L3 use). No backend.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: `src/hooks/`, `src/components/`, `src/styles/globals.css`, `src/lib/storage-keys.ts`, `src/components/Topbar.tsx`
**Dependencies**: None new. Uses existing React 19, no new npm packages.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `src/hooks/usePersona.ts` (full file, ~88 lines) — **the pattern to mirror exactly**. Complex-object persisted hook with `parseStored` validator, `try/catch` around `JSON.parse`, `try/catch` around `localStorage.setItem`, module-level `LISTENERS` set for cross-instance broadcast, lazy `useState` initializer with SSR guard, `useCallback` setter. `useSettings.ts` is a direct structural copy with different fields.
- `src/hooks/usePersistedEnum.ts` (lines 3–22) — simpler pattern for the model `<select>` values. Use it for `generateModel` and `fastModel` only if you split them out; otherwise the unified `useSettings` blob covers them.
- `src/hooks/useTheme.ts` and `src/hooks/useAgent.ts` — read both. The Settings dialog must invoke these hooks unchanged.
- `src/lib/storage-keys.ts` (full file, 8 lines) — add new `settings` key here. Do **not** inline string literals.
- `src/components/Topbar.tsx` (full file, 56 lines) — the gear button goes inside `.topbar-right`, immediately after the theme `icon-btn` (line 44–52). The existing button is the exact pattern to copy: `<button className="icon-btn" type="button" aria-label="…" title="…">`.
- `src/components/PersonaCard.tsx` — form input pattern reference (`.persona-field` wrapper, controlled input pattern, save-status feedback). Settings inputs use the same `.persona-field` class.
- `src/components/GlossaryPopup.tsx` (full file, ~80 lines) — overlay pattern reference, but **do not extend it**. It's `role="tooltip"`, not `role="dialog"`. Build `SettingsDialog` fresh.
- `src/App.tsx` (lines 18–53) — focus-trap pattern for the mobile drawer. Mirror this exactly in `SettingsDialog`: find first focusable, Tab/Shift+Tab cycle, Escape closes, restore focus on close.
- `src/styles/globals.css` lines 699–724 — `.persona-field input/textarea/select` rules. Settings form must reuse these classes verbatim. Lines 644–656 (`.glossary-popup`) show overlay positioning style; not directly applicable but informs aesthetic.
- `ai-layer-workbook-v1.html` lines 141–149 — original v1 form/button CSS (already ported to globals.css). Reference only if globals.css has drifted.
- `Docs/ai-layer-workbook-claude-code-handoff.md` §4 (lines 88–96), §6 (lines 184–211), §14 (lines 383–390), Appendix A (lines 407–442), Appendix C (lines 458–482) — **the spec.** Read all of these.

### New Files to Create

- `src/hooks/useSettings.ts` — persisted settings hook (the new state: keys + models). Direct structural copy of `usePersona.ts`.
- `src/components/SettingsDialog.tsx` — the modal dialog component. Renders all settings sections + privacy explainer + clear-all button.
- `src/components/SettingsButton.tsx` — the gear button for the Topbar. Tiny — could be inlined into Topbar instead. Keep separate for testability.
- `src/components/PrivacyExplainer.tsx` — plain-language "what gets stored locally vs sent over the network" block. Tiny but its own component because the copy will likely iterate.
- `src/lib/models.ts` — exported `GENERATE_MODELS` and `FAST_MODELS` constant arrays + type guards. Keeps the option lists out of the dialog component.

### Files to Modify

- `src/lib/storage-keys.ts` — add `settings: 'aiLayer.settings'` entry.
- `src/components/Topbar.tsx` — add the gear button + dialog mount.
- `src/styles/globals.css` — append new `.settings-*` rules (dialog, backdrop, sections, clear-all warning button). ~60–80 new lines.
- `README.md` — one-line note that Settings is shipped (optional, after manual validation).

### Relevant Documentation — READ THESE BEFORE IMPLEMENTING

- [Anthropic Messages API — request headers](https://docs.anthropic.com/en/api/messages) — confirm the `x-api-key` header name and that `sk-ant-` is the current key prefix. Spec values in this plan are from the handoff brief, dated; verify at build time per `CLAUDE.md` "Trust but verify."
- [Anthropic browser access header docs](https://docs.anthropic.com/en/api/getting-started) — search "dangerous-direct-browser-access" to confirm the CORS opt-in header name hasn't shifted. (Settings doesn't *use* it yet, but the model list is what the future L3 call will send.)
- [GitHub fine-grained PAT docs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token) — the dialog needs an external link to the PAT generation page. Confirm the URL still works.
- [W3C ARIA Authoring Practices — Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) — focus trap, `aria-modal`, focus return, scrim semantics. Reference for the dialog skeleton.
- [MDN — `<dialog>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) — **do not use** native `<dialog>` here. Browser support is fine but styling parity across light/dark + focus trap behavior is more controllable with a hand-rolled `<div role="dialog">`. The existing focus-trap pattern in `App.tsx:18–53` is the precedent.

### Patterns to Follow

**Persisted-blob hook (mirror `usePersona.ts` exactly):**

```ts
// src/hooks/useSettings.ts
import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../lib/storage-keys';
import {
  isGenerateModel,
  isFastModel,
  DEFAULT_GENERATE_MODEL,
  DEFAULT_FAST_MODEL,
  type GenerateModel,
  type FastModel,
} from '../lib/models';

export interface Settings {
  anthropicKey: string;     // '' = unset. Never null — keeps controlled inputs simple.
  githubPat: string;        // ''  = unset.
  generateModel: GenerateModel;
  fastModel: FastModel;
}

const DEFAULT_SETTINGS: Settings = {
  anthropicKey: '',
  githubPat: '',
  generateModel: DEFAULT_GENERATE_MODEL,
  fastModel: DEFAULT_FAST_MODEL,
};

function parseStored(raw: string | null): Settings { /* try/catch + per-field validate */ }

const LISTENERS = new Set<(s: Settings) => void>();
// ...same shape as usePersona
```

**Naming Conventions:**

- Files: `PascalCase.tsx` for components, `camelCase.ts` for hooks/lib (`useSettings`, `models`).
- Hooks: `use<Thing>` returning `{ <thing>, set<Field>, … }`. See `useAgent`, `usePersona`.
- Storage keys: dot-separated camelCase under `aiLayer.` for new state (the file mixes `aiLayer.` and `workbook:`; new entries use the `aiLayer.` form to match `theme`/`agent`).
- CSS classes: kebab-case, BEM-ish (`.settings-dialog`, `.settings-dialog__section`, `.settings-clear-btn`).

**Error Handling:**

- Wrap *every* `localStorage` access in `try/catch`. Inside the catch: comment `// ignore — storage unavailable` (matches `usePersona.ts:79–80`). **Do not** `console.error`, **do not** log anything containing the key.
- `JSON.parse` is wrapped in `try/catch` returning `DEFAULT_SETTINGS`. See `usePersona.ts:40–42`.

**Form Inputs:**

```tsx
<div className="persona-field">
  <label htmlFor="anthropic-key">Anthropic API key</label>
  <input
    id="anthropic-key"
    type="password"
    autoComplete="off"
    spellCheck={false}
    value={settings.anthropicKey}
    onChange={(e) => setAnthropicKey(e.target.value)}
    placeholder="sk-ant-…"
  />
</div>
```

- `type="password"` for both keys. A show/hide toggle button is **optional** for v1 — flag in the panel that the keys are hidden by default.
- `autoComplete="off"` and `spellCheck={false}` on both key inputs.
- Reuse `.persona-field` class — it's already styled in globals.css:699–724.

**Modal/Dialog skeleton:**

```tsx
// SettingsDialog.tsx — abbreviated
return createPortal(
  <div className="settings-backdrop" onClick={onClose}>
    <div
      className="settings-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 id="settings-dialog-title">Settings</h2>
      {/* sections */}
    </div>
  </div>,
  document.body,
);
```

- Use `createPortal` from `react-dom`. Mounts to `document.body` to escape the Topbar's `z-index: 10` stacking context.
- Focus trap: mirror `App.tsx:26–47` exactly (Tab/Shift+Tab cycle, Escape closes, restore focus on unmount).

**Privacy explainer copy (use this verbatim or close to it):**

> **What stays in your browser**
> Your Anthropic API key, your GitHub token, your settings, your checklist progress, and your repo notes are stored only in this browser's local storage. They never leave your machine *except* to the destination services below.
>
> **What gets sent over the network**
> - Your Anthropic API key is sent only to `api.anthropic.com` when you use a Draft button.
> - Your GitHub token is sent only to `api.github.com` when you fetch a repo.
> - Nothing else. There is no backend on this site to send anything to.
>
> **Clearing keys**
> Use "Clear all keys & settings" below — or your browser's local-storage tools — to wipe everything instantly.

**Key-safety invariants (enforce in code review):**

- `console.log`, `console.error`, `console.warn`, `console.debug` of any expression containing `anthropicKey` or `githubPat`: **forbidden**.
- No `aria-label`, `title`, `placeholder`, `data-*`, or error message containing the key value.
- No `throw new Error(...)` interpolating the key.
- Inputs are `type="password"`.

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Types, constants, and the storage key. No UI yet.

**Tasks:**

- Add `settings` to `STORAGE_KEYS`.
- Create `src/lib/models.ts` with the model constants and type guards.
- Create `src/hooks/useSettings.ts` (mirror `usePersona.ts`).

### Phase 2: Core Implementation

The dialog and its parts.

**Tasks:**

- Build `SettingsDialog.tsx`, `PrivacyExplainer.tsx`, `SettingsButton.tsx`.
- Add new CSS to `globals.css` for dialog/backdrop/sections/clear-button.

### Phase 3: Integration

Wire to Topbar; verify existing flows are untouched.

**Tasks:**

- Add gear button + dialog mount to `Topbar.tsx`.
- Verify theme toggle, agent picker, and persona persistence still work.

### Phase 4: Testing & Validation

Project has no test framework. Validation is type-check + lint + format + manual.

**Tasks:**

- Run `npm run lint`, `npm run format:check`, `npm run build` — all must pass.
- Manual: open dialog, fill both keys, refresh page, confirm persistence.
- Manual: 375px width — no horizontal scroll, dialog is full-screen-ish, every control reachable.
- Manual: focus trap (Tab cycles inside dialog), Escape closes, scrim click closes, focus returns to gear button on close.
- Manual: "Clear all keys & settings" wipes every `aiLayer.*` and `workbook:*` key, resets every hook.
- Manual: in DevTools, set Network throttling and search the network panel and console for `sk-ant-` and a fake PAT — neither should appear anywhere except in the input element's `value` (which is `type="password"` so masked in DOM inspector display).

---

## STEP-BY-STEP TASKS

Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1 — UPDATE `src/lib/storage-keys.ts`

- **IMPLEMENT**: Add a `settings` entry.
- **PATTERN**: Existing entries on lines 1–6.
- **NEW VALUE**: `settings: 'aiLayer.settings'`
- **GOTCHA**: Two prefix conventions already exist (`aiLayer.` for theme/agent, `workbook:` for persona/checks). Use `aiLayer.` for the new key — it's net-new state, not v1-portable.
- **VALIDATE**: `npx tsc --noEmit -p tsconfig.app.json` exits 0.

### Task 2 — CREATE `src/lib/models.ts`

- **IMPLEMENT**: Export `GENERATE_MODELS` and `FAST_MODELS` as `as const` tuples, derive types via `(typeof ...)[number]`, export type guards `isGenerateModel` / `isFastModel`, export `DEFAULT_GENERATE_MODEL` and `DEFAULT_FAST_MODEL`.
- **VALUES**:
  - `GENERATE_MODELS = ['claude-opus-4-7', 'claude-sonnet-4-6'] as const` — Opus is default per `CLAUDE.md`; Sonnet 4.6 is the second option (the next-cheapest capable model, per `CLAUDE.md` environment block).
  - `FAST_MODELS = ['claude-haiku-4-5-20251001'] as const` — only one option for now; settings still shows the select so the schema is forward-compatible.
  - `DEFAULT_GENERATE_MODEL = 'claude-opus-4-7'`
  - `DEFAULT_FAST_MODEL = 'claude-haiku-4-5-20251001'`
- **PATTERN**: `src/hooks/useAgent.ts` `AGENTS` constant + `isAgent` guard.
- **GOTCHA**: Do **not** invent new model IDs. The values above come from `CLAUDE.md` resolved decision 5 and the system context. If you want to add more, ask first.
- **VALIDATE**: `npx tsc --noEmit -p tsconfig.app.json` exits 0.

### Task 3 — CREATE `src/hooks/useSettings.ts`

- **IMPLEMENT**: Mirror `src/hooks/usePersona.ts` exactly. Replace fields, defaults, parseStored validators with the Settings shape from this plan's Patterns section.
- **PATTERN**: `src/hooks/usePersona.ts` lines 1–88. Same structure: `DEFAULT_SETTINGS`, `parseStored` with `try/catch`, module-level `LISTENERS`, `broadcast`, `useState` lazy initializer with `typeof window === 'undefined'` SSR guard, `useEffect` to register/unregister listener, `useCallback` setter wrapping `localStorage.setItem` in `try/catch`.
- **RETURN**: `{ settings, setAnthropicKey, setGithubPat, setGenerateModel, setFastModel, clearAll }`. Each setter takes the field value (not the whole blob) and internally merges + persists + broadcasts. `clearAll` resets to `DEFAULT_SETTINGS` and removes the localStorage entry.
- **IMPORTS**: `useCallback`, `useEffect`, `useState` from `react`; `STORAGE_KEYS` from `../lib/storage-keys`; types + defaults + guards from `../lib/models`.
- **GOTCHA**: Never log the settings object. Never include `anthropicKey` or `githubPat` in any thrown error. The setter's `catch` block must be silent (no `console.error`) — matches `usePersona.ts:79–80`.
- **GOTCHA**: `parseStored` must per-field validate. If `anthropicKey` is not a string in the parsed JSON, fall back to `''` — do not crash.
- **VALIDATE**:
  - `npx tsc --noEmit -p tsconfig.app.json` exits 0.
  - In a scratch component, call `useSettings()`, call `setAnthropicKey('test')`, refresh, verify `settings.anthropicKey === 'test'`. (Remove scratch after.)

### Task 4 — CREATE `src/components/PrivacyExplainer.tsx`

- **IMPLEMENT**: A small stateless component rendering the three-section privacy explainer (copy in this plan's Patterns section, under "Privacy explainer copy").
- **STRUCTURE**: `<section className="settings-privacy">` containing three `<h3>`/`<p>` pairs. Use `<code>` for hostnames and storage key names.
- **PATTERN**: `src/components/PersonaCard.tsx` for plain-content component structure.
- **GOTCHA**: The copy is plain-language and direct, matching the workbook's voice. Do not "modernize" it with jargon. Do not add a "Learn more" link — the explainer is the explanation.
- **VALIDATE**: Render in isolation in a scratch route; confirm no console errors.

### Task 5 — CREATE `src/components/SettingsDialog.tsx`

- **IMPLEMENT**: Modal dialog with focus trap, portal mount, scrim click-close, Escape close, ARIA dialog semantics. Composes `useSettings` + `useAgent` + `useTheme` + `usePersona`. Sections in order:
  1. Anthropic API key — `type="password"` input + small "Where this is stored" inline hint (1 line, "In this browser's local storage, sent only to api.anthropic.com").
  2. GitHub token — `type="password"` input + link to GitHub PAT generation page (`https://github.com/settings/tokens?type=beta`, `target="_blank"`, `rel="noopener noreferrer"`).
  3. AI models — two `<select>` dropdowns ("Generate model" → `GENERATE_MODELS`, "Fast model" → `FAST_MODELS`). Disable the Fast model select if `FAST_MODELS.length < 2` and add a hint "Only one fast model available — selectable when more land."
  4. Existing settings (agent picker, theme toggle) — mirror the Topbar controls so the dialog is a one-stop panel.
  5. Personalize summary — read-only summary of `usePersona` data with a "Edit" link to `/your-picture` (closes the dialog on click).
  6. `<PrivacyExplainer />`.
  7. Clear-all button — `<button className="settings-clear-btn">Clear all keys & settings</button>`. On click, show inline confirm ("Sure? This cannot be undone." with Cancel / Confirm). On confirm: `setAnthropicKey('')`, `setGithubPat('')`, `setGenerateModel(DEFAULT_GENERATE_MODEL)`, `setFastModel(DEFAULT_FAST_MODEL)`, reset agent + theme + persona to defaults via their setters, then `window.localStorage.removeItem` every `STORAGE_KEYS.*` value for good measure.
- **PROPS**: `{ open: boolean, onClose: () => void }`.
- **PORTAL**: `import { createPortal } from 'react-dom'; createPortal(<...>, document.body)`. Returns `null` when `!open`.
- **PATTERN — focus trap & Escape**: `src/App.tsx` lines 18–53. Copy that effect *almost verbatim*, swap `sidebar-nav` → `settings-dialog`, swap `menu-btn` → the gear button id. Same `FOCUSABLE_SELECTOR`.
- **PATTERN — scrim close**: `<div className="settings-backdrop" onClick={onClose}>` wrapping `<div className="settings-dialog" onClick={(e) => e.stopPropagation()}>`. Matches the existing scrim button pattern in `App.tsx:96–101`.
- **IMPORTS**: `createPortal` from `react-dom`; `useEffect`, `useRef`, `useState` from `react`; `useSettings`, `useAgent`, `useTheme`, `usePersona` from `../hooks/*`; `STORAGE_KEYS` from `../lib/storage-keys`; `GENERATE_MODELS`, `FAST_MODELS` from `../lib/models`; `PrivacyExplainer` from `./PrivacyExplainer`.
- **GOTCHA**: Never put the key value in `aria-label`, `title`, `placeholder`, or any error/status string. Placeholder is `sk-ant-…` (generic), nothing user-specific.
- **GOTCHA**: When clearing keys, do **not** assemble a log line listing what was cleared. Just clear it.
- **GOTCHA**: Personalize summary should not include the keys — only persona fields.
- **GOTCHA**: Form inputs must be controlled with `value={settings.anthropicKey}` (not `defaultValue`) so changes round-trip through the hook.
- **VALIDATE**: Manual — open dialog, Tab cycles inside, Shift+Tab cycles backward, Escape closes, scrim click closes, gear button regains focus on close.

### Task 6 — CREATE `src/components/SettingsButton.tsx`

- **IMPLEMENT**: A tiny `<button className="icon-btn" id="settings-btn" type="button" aria-label="Open settings" aria-expanded={open} aria-controls="settings-dialog" onClick={...}>⚙</button>` component.
- **PROPS**: `{ open: boolean, onClick: () => void }`.
- **PATTERN**: `src/components/Topbar.tsx` lines 44–52 (theme icon button). Identical shape, different glyph and aria.
- **GOTCHA**: The glyph is a Unicode gear `⚙` (U+2699), matching the existing single-character icons. Don't import an icon library — it'd be the only one in the project.
- **VALIDATE**: Visually identical to the theme button (same size, same border, same focus state).

### Task 7 — UPDATE `src/components/Topbar.tsx`

- **IMPLEMENT**: Add `useState<boolean>` for `settingsOpen`. Insert `<SettingsButton open={settingsOpen} onClick={() => setSettingsOpen(true)} />` immediately after the theme `icon-btn` inside `.topbar-right`. Mount `<SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />` after the `<header>` closes (still inside the component's returned fragment — wrap the header in a `<>` fragment so the dialog is a sibling at the same JSX level).
- **PATTERN**: Existing `<header className="topbar">` structure (lines 14–54). Only change: wrap in `<>...</>` fragment + add sibling dialog.
- **IMPORTS**: `useState` from `react`; `SettingsButton`, `SettingsDialog` from their new files.
- **GOTCHA**: Do **not** lift `settingsOpen` into `App.tsx`. The dialog is owned by the Topbar — symmetric with how `drawerOpen` is owned by the App shell. Cross-component state isn't needed.
- **GOTCHA**: Closing the dialog must restore focus to `#settings-btn`. The focus-trap effect in `SettingsDialog` already does this (mirroring `App.tsx:50–52`).
- **VALIDATE**: `npm run lint`, `npm run format:check`, `npm run build` all pass. Manual: gear visible in Topbar at desktop and mobile widths.

### Task 8 — UPDATE `src/styles/globals.css`

- **IMPLEMENT**: Append a `.settings-*` section at the end of the file. Required rules:
  - `.settings-backdrop` — fixed, full-viewport, `background: rgba(0,0,0,0.4)`, `z-index: 100` (above topbar's `z-index: 10`).
  - `.settings-dialog` — centered (`max-width: 560px`, `width: calc(100% - 2rem)`), `background: var(--bg-elev)`, `border: 1px solid var(--rule)`, `border-radius: 6px`, `padding: 1.5rem`, `max-height: 90vh`, `overflow-y: auto`, `position: relative` (for the close-X).
  - `.settings-dialog h2` — uses `var(--serif)`, `font-size: 1.4rem`, margin reset.
  - `.settings-dialog__section` — `margin-block: 1.25rem`, `padding-block-end: 1rem`, `border-bottom: 1px solid var(--rule-soft)` (except last-child).
  - `.settings-dialog__hint` — `font-size: 0.82rem`, `color: var(--ink-mute)`.
  - `.settings-clear-btn` — outline variant: `background: transparent`, `border: 1px solid var(--accent)`, `color: var(--accent)`. Hover swaps fill/text. (Reuses `--accent` for the destructive cue — see `port-v1-content` aesthetic; no `--danger` token exists and we're not introducing one for v1 of Settings.)
  - `.settings-privacy code` — `font-family: var(--mono)`, `font-size: 0.85em`, `background: var(--accent-bg)`, `padding: 0.1em 0.3em`, `border-radius: 3px`.
  - **Mobile (<= 600px)**: dialog fills the viewport (`width: 100%; max-width: none; height: 100vh; max-height: none; border-radius: 0; padding: 1rem`). Backdrop stays the same.
- **PATTERN**: Existing `.persona-field` (lines 699–724) for input chrome — those rules already apply, don't duplicate. Existing `.icon-btn` styles already cover the gear button — don't duplicate.
- **GOTCHA**: Don't add a `.settings-dialog__input` — use `.persona-field`. The dialog wraps each control in `<div className="persona-field">` so existing styles apply.
- **GOTCHA**: Test both themes. `var(--bg-elev)`, `var(--rule)`, etc. already darken correctly under `[data-theme="dark"]` — don't override.
- **VALIDATE**: `npm run lint` (CSS isn't linted by ESLint, but verify no JS lint regressions from importing nothing new); `npm run format:check`; visual check at 375px and at desktop in both themes.

### Task 9 — Manual validation pass

- **IMPLEMENT**: Full acceptance walk (see Validation Commands → Level 4). Document any deviations.
- **VALIDATE**: All Acceptance Criteria boxes below check.

### Task 10 — UPDATE `README.md` (optional, after Task 9 passes)

- **IMPLEMENT**: Add a single bullet under "Run locally" noting that the Settings panel exists and how to access it (gear button in the top bar). Mention "Keys are stored in localStorage only" — reinforces the trust model in publicly-visible docs.
- **GOTCHA**: Don't paste sample keys. Don't claim L3 features work yet — they don't; Settings just stores values for future capabilities.
- **VALIDATE**: `npm run format:check`.

---

## TESTING STRATEGY

The project has no test framework wired (no `jest`, `vitest`, or test script in `package.json`). Validation for this feature is **type-check + lint + format + manual**. Adding a test framework is out of scope per `CLAUDE.md` "Don't add features, refactor, or introduce abstractions beyond what the task requires."

### Unit Tests

None — no framework.

### Integration Tests

None — no framework.

### Edge Cases (manual)

- **Storage unavailable** (private browsing): hook setters should silently no-op the `localStorage.setItem`; UI still reflects the in-memory state for the current tab.
- **Corrupted blob**: hand-edit `aiLayer.settings` in DevTools to invalid JSON → reload → app should boot with defaults, not crash. (`parseStored` `try/catch` handles this.)
- **Partial blob**: hand-edit to `{"anthropicKey": "x"}` (missing other fields) → reload → other fields fall back to defaults. (per-field validation.)
- **Tab sync**: open the app in two tabs, change a setting in tab A — tab B does *not* auto-update (no `storage` event listener). Document this in a code comment and confirm it's acceptable for v1. The brief doesn't require multi-tab sync.
- **Wrong-type field**: hand-edit `aiLayer.settings` to `{"generateModel":"some-future-model"}` → reload → falls back to default. (Type guard catches it.)
- **Focus trap with single focusable**: dialog with all controls disabled (impossible in practice but verify) — focus stays put without crashing.
- **Mobile keyboard**: on a 375px-wide phone emulator, tapping the password input opens the keyboard; dialog content above the keyboard must still scroll. `max-height: 100vh` + `overflow-y: auto` handle this.
- **Dark mode**: every section legible. Inputs visible. Focus ring (`border-color: var(--accent)`) visible against dark background — accent in dark mode is the lighter `#E67A5C` so it pops.
- **Clear-all undo**: there is no undo. Confirm step is required.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

```bash
# Type check (strict)
npx tsc -b

# Lint
npm run lint

# Prettier formatting check
npm run format:check

# Production build (catches type + bundling issues)
npm run build
```

**Expected**: All commands exit code 0. `npm run build` produces a `dist/` directory.

### Level 2: Unit Tests

N/A — no test framework. Skip.

### Level 3: Integration Tests

N/A — no test framework. Skip.

### Level 4: Manual Validation

```bash
npm run dev   # http://localhost:5173
```

Walk through each item — every checkbox must be true:

- [ ] Gear button visible in Topbar at desktop width, after the theme toggle, same size/border as theme toggle.
- [ ] Gear button visible at 375px width (no overflow, no horizontal scroll on the page).
- [ ] Clicking gear opens the dialog. Background scrim appears.
- [ ] Dialog is centered at desktop; full-screen at 375px.
- [ ] Tab cycles through dialog controls. Shift+Tab cycles backward. Focus stays inside dialog.
- [ ] Escape closes dialog. Focus returns to gear button.
- [ ] Scrim click closes dialog. Focus returns to gear button.
- [ ] Click inside dialog does NOT close it.
- [ ] Type a fake key `sk-ant-test-123` into Anthropic field. Click outside the input, refresh page, reopen dialog — key value persists.
- [ ] Type a fake PAT `github_pat_test_123` into GitHub field. Refresh. Persists.
- [ ] Change Generate model select to Sonnet. Refresh. Persists.
- [ ] Both key inputs are `type="password"` — characters are masked.
- [ ] DevTools → Network tab: open dialog, type a key, close dialog → ZERO network requests fire. (Settings stores; doesn't send.)
- [ ] DevTools → Application → Local Storage: confirm `aiLayer.settings` blob contains both keys as plain JSON. Confirm no key value appears in `console.log` history.
- [ ] DevTools → Console: search history for `sk-ant`. Zero matches outside the input element's `value` attribute (which is the source of truth, not a log).
- [ ] Personalize summary in dialog reflects current `usePersona` state. "Edit" link closes dialog and routes to `/your-picture`.
- [ ] Agent picker and theme toggle in dialog work — change agent in dialog, close, see Topbar reflect new agent. Vice versa.
- [ ] Privacy explainer renders all three sections, code spans styled.
- [ ] "Clear all keys & settings" → confirm step appears → Confirm wipes everything: dialog inputs reset, theme resets to system preference / default, agent resets to default, persona resets, every `aiLayer.*` and `workbook:*` key removed from Local Storage in DevTools.
- [ ] Dark mode: dialog readable, inputs visible, focus ring visible.
- [ ] Light mode: dialog readable, inputs visible, focus ring visible.
- [ ] Refresh page on each route after typing a key — the rest of the app (sidebar, sections, glossary popup, theme, agent picker) behaves identically to before Capability A landed. Zero regressions.
- [ ] Console: zero errors and zero warnings during the full walkthrough.

### Level 5: Additional Validation (Optional)

If `mcp__playwright__*` is available, automate the focus-trap + persistence walkthrough. Not required for v1.

---

## ACCEPTANCE CRITERIA

From `Docs/ai-layer-workbook-claude-code-handoff.md` §14 + this plan:

- [ ] Settings panel exists with Anthropic key + GitHub PAT + generate model + fast model + agent + theme; settings persist across page reload and across routes.
- [ ] Mobile-usable at 375px: no horizontal scroll, every control reachable, dialog fills viewport with internal scroll if content overflows.
- [ ] No API key or PAT appears in console logs, network requests (there should be zero network requests from Settings), thrown errors, ARIA labels, titles, placeholders, or any DOM attribute other than the controlled `value` of the password input.
- [ ] One-click "Clear all keys & settings" wipes every `aiLayer.*` and `workbook:*` localStorage entry and resets every hook to defaults.
- [ ] Privacy explainer is present, plain-language, and visibly part of the dialog (not behind a tooltip or "Learn more" link).
- [ ] `npm run lint`, `npm run format:check`, `npm run build`, `npx tsc -b` all exit 0.
- [ ] Zero regressions in existing flows (theme, agent picker, persona, glossary popup, navigation, mobile drawer).
- [ ] Focus trap correct (Tab/Shift+Tab cycle, Escape closes, scrim closes, focus returns).
- [ ] `role="dialog"`, `aria-modal="true"`, `aria-labelledby` correctly set.

---

## COMPLETION CHECKLIST

- [ ] All 10 tasks completed in order.
- [ ] Each task's `VALIDATE` step passed before moving to the next.
- [ ] All Level 1 commands exit 0.
- [ ] Level 4 manual walkthrough — every checkbox green.
- [ ] All Acceptance Criteria met.
- [ ] No console errors or warnings.
- [ ] No new npm dependencies introduced.
- [ ] No `console.log`/`console.error` calls in the new code.
- [ ] Secret-grep of the new files: `grep -rE "sk-ant|github_pat" src/` returns ZERO matches (only the placeholder `sk-ant-…` ellipsis in the input placeholder is acceptable, and that's `sk-ant-…` not `sk-ant-` — i.e., a Unicode ellipsis character, not a real prefix match).
- [ ] Code reviewed via `/code-review` against this project's standards.
- [ ] `.agents/handoff/capability-a-settings.md` written (mirroring the format of `.agents/handoff/port-v1-content.md`).
- [ ] Ready to commit with message `feat: add Settings panel (Capability A)`.

---

## NOTES

**Design decisions:**

1. **Why a separate `useSettings` instead of one big `useEverything`** — the existing hooks (`useTheme`, `useAgent`, `usePersona`) work, are wired throughout the app, and persist to keys chosen for v1 schema portability (`workbook:persona`, `workbook:checks`). Rewriting them into a single hook would be ~3× the change surface for zero functional benefit. `useSettings` owns *only* the new state.

2. **Why hand-rolled `<div role="dialog">` instead of `<dialog>`** — the focus-trap pattern in `App.tsx:18–53` is already the project's precedent. Native `<dialog>` would require divergent code for the mobile drawer (which can't be a `<dialog>` because it isn't modal) and the settings dialog. Symmetric code is cheaper to maintain.

3. **Why store both keys in one blob** — fewer storage keys, atomic clear, single parse path. The downside (any one corrupted field reverts all to defaults) is mitigated by per-field validation in `parseStored`.

4. **Why no "test this key" button** — the handoff brief explicitly defers error handling to actual L3 call sites (`Docs/...handoff.md` line 149). A test-ping would also send the key over the network *before* the user has clicked any AI button, which weakens the "your key only goes where you explicitly send it" framing.

5. **Why `type="password"` without a show/hide toggle** — show/hide is nice-to-have; the brief doesn't require it; v1 of Settings should ship minimum and iterate. Track in `ROADMAP.md` if owner wants it.

6. **Why a `confirm` step instead of `window.confirm()`** — `window.confirm` is a blocking native dialog that breaks the focus trap and styling. Inline confirm matches the editorial aesthetic.

7. **Storage prefix mix is preserved** — `aiLayer.settings` (new) + `workbook:persona` (existing) is intentional. Don't migrate persona to a new prefix; the v1 state-portability rationale in `CLAUDE.md` still holds.

**Risks:**

- **Header-name drift**: `anthropic-dangerous-direct-browser-access` is correct as of January 2026 per `CLAUDE.md`. Settings doesn't use it yet, but C1 will. Re-verify against [Anthropic Messages API docs](https://docs.anthropic.com/en/api/messages) when C1 lands, not now.
- **Browser security around `localStorage`**: same-origin XSS would expose keys. Vite's static build doesn't include user-generated content, and the workbook content is all hardcoded TSX — there's no XSS sink today. A future capability that renders Anthropic streaming output into the DOM (C1–C4) is the moment to revisit (use `react-markdown` with a safe schema; don't `dangerouslySetInnerHTML`).
- **No tab-sync** is documented behavior, not a bug. If owner pushes back, add a `window.addEventListener('storage', ...)` in `useSettings`.

**Confidence score**: **9/10** for one-pass success. The dominant unknowns are CSS judgment calls (dialog spacing, mobile breakpoint behavior at exactly 375px) and the visual fit of the gear glyph next to the existing controls. Everything else (state, persistence, ARIA, focus, integration) is paint-by-numbers off the cited patterns. The one full point of risk is reserved for the inevitable manual-validation finding that requires a CSS tweak.
