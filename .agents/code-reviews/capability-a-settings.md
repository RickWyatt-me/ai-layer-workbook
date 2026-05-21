# Code Review — Capability A: Settings panel

Scope: working tree against `HEAD` (commit `15d731b`). Anchored against
`.agents/handoff/capability-a-settings.md` and the plan.

## Stats

- Files Modified: 5 (`README.md`, `src/components/Topbar.tsx`, `src/hooks/useTheme.ts`, `src/lib/storage-keys.ts`, `src/styles/globals.css`)
- Files Added: 5 source (`src/components/PrivacyExplainer.tsx`, `src/components/SettingsButton.tsx`, `src/components/SettingsDialog.tsx`, `src/hooks/useSettings.ts`, `src/lib/models.ts`) + 2 docs (`.agents/handoff/…`, `.agents/plans/…`)
- Files Deleted: 0
- New lines: 229 insertions in tracked diff + 520 source lines in new files
- Deleted lines: 37

Validation (per handoff): `npx tsc -b`, `npm run lint`, `npm run format:check`, `npm run build` all clean. Secret-grep clean. Manual L4 walk still pending.

## Findings

---

```
severity: high
file: src/hooks/usePersistedEnum.ts
line: 14-19
issue: useAgent / useTheme state does not sync across hook instances; Topbar will not reflect changes made inside SettingsDialog
detail: `usePersistedEnum.update` writes to localStorage and to the local component's state but has no cross-instance broadcast. Both Topbar and SettingsDialog mount their own `useAgent()` and `useTheme()` instances. When the user switches the agent or toggles the theme inside the dialog, only the dialog's local state updates — Topbar's `agent` and `theme` stay stale until the next full page reload. For `theme` the visible page styling still updates (because the dialog's `useEffect` writes `data-theme` to the root element), but the Topbar's ◐/◑ glyph desyncs and clicking it then toggles "back to" the value it's already on. This directly violates an acceptance criterion in `.agents/plans/capability-a-settings.md:436`: "change agent in dialog, close, see Topbar reflect new agent. Vice versa." `usePersona` and `useChecklist` already have a `LISTENERS`/`broadcast` pattern; `usePersistedEnum` is the outlier.
suggestion: Add the same module-level `LISTENERS` set + `broadcast` call inside `update` (~10 LOC). Each hook instance subscribes in a `useEffect` and unsubscribes on unmount. Mirror `usePersona.ts:45-66` exactly.
```

```
severity: medium
file: src/components/SettingsDialog.tsx
line: 92-111
issue: "Clear all" wipes localStorage but does not reset in-memory checklist state, so checked boxes remain visually checked until reload
detail: `onConfirmClear` resets `useSettings`, `useAgent`, `useTheme`, and `usePersona` via their setters, then removes every `STORAGE_KEYS.*` entry from localStorage. But `useChecklist` (a fifth persisted hook used across the workbook) has no reset path and isn't called here. Mounted Section components keep their `state` until the page reloads, so previously-checked items still render checked even though `workbook:checks` is gone from storage. Acceptance plan line 438: "every aiLayer.* and workbook:* key removed … resets every hook." The on-disk half is satisfied; the in-memory half is not.
suggestion: Either (a) export a `clearAll()` from `useChecklist` (mirroring the one just added to `useSettings`) and call it in `onConfirmClear`, or (b) the pragmatic alternative — after the localStorage loop, call `window.location.reload()`. The flow already requires a confirm step and is documented as no-undo, so a reload is acceptable UX and removes a class of "what about hook X?" maintenance.
```

```
severity: medium
file: src/components/SettingsDialog.tsx
line: 88
issue: focus-trap effect depends on the inline `onClose` callback, which is a fresh function each parent render
detail: Effect deps are `[open, onClose]`. Topbar passes `onClose={() => setSettingsOpen(false)}` — a new function identity every render. Today Topbar re-renders only when `settingsOpen` flips (the prereq `usePersistedEnum` hooks don't broadcast — see issue #1), so the effect happens to fire only on open/close transitions. The moment issue #1 gets fixed, every cross-instance broadcast will re-render Topbar → new `onClose` → effect re-runs → focus jumps back to the dialog's first focusable while the user is typing into another field. The pattern this was meant to mirror (`App.tsx:18-53`) depends only on `[drawerOpen]`.
suggestion: Either depend only on `[open]` and stash `onClose` in a ref (`onCloseRef.current = onClose` on every render, called inside the handler), or have the parent wrap with `useCallback`. The ref approach matches the App.tsx precedent more closely and avoids forcing every caller to memoize.
```

```
severity: medium
file: src/components/SettingsDialog.tsx
line: 92-111
issue: redundant clearing path makes the intent hard to follow and writes-then-deletes keys
detail: `onConfirmClear` calls `setAnthropicKey('')`, `setGithubPat('')`, `setGenerateModel(DEFAULT)`, `setFastModel(DEFAULT)` — each of which persists a JSON blob to `aiLayer.settings` and broadcasts — then `clearSettings()` (which already does `setLocal(DEFAULT_SETTINGS)` and removes the key), then a manual `Object.values(STORAGE_KEYS)` loop that removes every key again. Functionally fine, but the four pre-clear setters each write a copy of the blob to localStorage that gets removed two statements later. It's also hard to verify "no stale state" because three different paths touch the same data.
suggestion: Drop the four pre-clear `setAnthropic…`/`setGithub…`/`setGenerate…`/`setFast…` calls. `clearSettings()` already resets the in-memory blob and broadcasts. Keep `setAgent('Claude Code')`, `setPersona(DEFAULT_PERSONA)`, `resetTheme()` (their respective hooks have no `clearAll`), then the storage-key removal loop. Net: 4 fewer LOC, one path per concern.
```

```
severity: low
file: src/components/SettingsDialog.tsx
line: 24-29
issue: `DEFAULT_PERSONA` is duplicated from `src/hooks/usePersona.ts`
detail: `usePersona.ts:13-18` defines the canonical `DEFAULT_PERSONA` but does not export it, so this file re-declares the same literal. If the `Persona` shape changes (extra field, renamed field), the two copies will drift silently — TypeScript will catch a shape mismatch but not a value drift. The handoff already flagged this as a known deviation; worth resolving now while the surface is small.
suggestion: Export `DEFAULT_PERSONA` from `usePersona.ts` and import it here. Or — slightly more invasive but cleaner — add a `resetPersona()` method to `usePersona` and call it from `onConfirmClear`, eliminating the need for the constant outside the hook.
```

```
severity: low
file: src/components/SettingsDialog.tsx
line: 56-58
issue: initial focus lands on the close (✕) button, not the first form field
detail: The header's close button is rendered before the form sections, so `dialog.querySelector(FOCUSABLE_SELECTOR)` returns it. Users opening Settings to paste a key will land one Tab away from the input. Minor — the focus trap still works — but the UX intent of "open dialog, start typing" requires an extra Tab. The mobile drawer has the same pattern but its first focusable is the first nav link, which is what a user opening the menu wants.
suggestion: Either move the close button to render after the first section, or explicitly focus the Anthropic key input on open (e.g., `document.getElementById('anthropic-key')?.focus()` first, falling back to `firstFocusable`).
```

```
severity: low
file: src/hooks/useTheme.ts
line: 24-28
issue: `systemPreference()` is invoked on every render
detail: `usePersistedEnum`'s third argument is a `T`, not a thunk, so `systemPreference()` runs on every `useTheme` call. The lazy state initializer inside `usePersistedEnum` only consumes the value once (first mount), so subsequent calls are wasted. `matchMedia` is cheap, but it's also called on every render of Topbar and SettingsDialog now. Preexisting pattern — flagging because the new `resetTheme` makes the call site slightly hotter (any setting change now re-renders the dialog and recomputes).
suggestion: Either accept the cost (it really is cheap) or refactor `usePersistedEnum`'s third arg to also accept a `() => T` thunk and call it lazily inside the state initializer. Skip if untouched-by-this-PR is the rule.
```

---

## Notes / non-issues

- **Key handling.** Secret-grep is clean. Inputs are `type="password"`, `autoComplete="off"`, `spellCheck={false}`. Placeholders use Unicode ellipsis (`sk-ant-…`), no key value appears in any `aria-label`, `title`, error, or `console.*`. ✓
- **Storage hygiene.** All `localStorage` access is wrapped in `try/catch` with the documented "ignore — storage unavailable" comment, matching `usePersona.ts`. ✓
- **ARIA.** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` are all set. `PrivacyExplainer` is `<section aria-labelledby>`. ✓
- **Mobile.** CSS at `≤600px` fills the viewport (`width: 100%; height: 100vh; border-radius: 0`). Will need eye-on at 375px in the manual walk, but the rules are correct. ✓
- **Portal scope.** `createPortal(..., document.body)` correctly escapes the Topbar's `z-index: 10` stacking context (backdrop is `z-index: 100`). ✓
- **No new dependencies.** ✓
- **`useTheme` API surface widened additively.** `setTheme` and `resetTheme` are net-new exports; no existing caller used them, so the change is backward-compatible. ✓
