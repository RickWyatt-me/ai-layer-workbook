## Handoff: capability-a-settings

**Plan:** `.agents/plans/capability-a-settings.md`
**Built:** Settings panel — modal dialog opened from a new gear button in the Topbar. Stores Anthropic API key, GitHub PAT, generate/fast model picks, and centralizes the existing agent/theme/personalize controls. Keys live only in `localStorage`, never logged, never sent except by future L3 features. One-click "Clear all keys & settings" with inline confirm wipes every `aiLayer.*`/`workbook:*` entry and resets each hook to its default. No API calls; this is storage scaffolding for C1–C4.

**Files changed:** 4 modified, 5 added. Highlights:

- `src/components/SettingsDialog.tsx` — portal-mounted `role="dialog"` with focus trap mirroring `App.tsx:18–53`; composes `useSettings` + `useAgent` + `useTheme` + `usePersona`
- `src/hooks/useSettings.ts` — new persisted-blob hook with `parseStored` per-field validation and module-level `LISTENERS` set, structurally a copy of `usePersona.ts`
- `src/lib/models.ts` — `GENERATE_MODELS` (`claude-opus-4-7`, `claude-sonnet-4-6`) + `FAST_MODELS` (`claude-haiku-4-5-20251001`) constants, type guards, defaults
- `src/components/Topbar.tsx` — wrapped in fragment to mount `SettingsButton` after the theme toggle plus the sibling `SettingsDialog`
- `src/hooks/useTheme.ts` — additive: exposes `setTheme` + `resetTheme(systemPreference())` so clear-all can reset theme via a setter
- `src/styles/globals.css` — ~150 lines of `.settings-*` rules; mobile fills viewport at ≤600px

**Acceptance status:**

- ✓ `npx tsc -b`, `npm run lint`, `npm run format:check`, `npm run build` all clean
- ✓ Secret-grep: only the two acceptable Unicode-ellipsis placeholders (`sk-ant-…`, `github_pat_…`); zero `console.*` in new code
- ⏸ Level 4 manual walkthrough (375px layout, focus trap behavior, persistence across reload, clear-all, dark/light contrast) — needs a human at `npm run dev`

**Deviations from plan:** Added `setTheme`/`resetTheme` to `useTheme` (additive, ~4 LOC) — the plan said reset hooks via their setters but `useTheme` exposed only `toggleTheme`. Stayed within the plan's "additive, not a rewrite" framing. Also inlined `DEFAULT_PERSONA` in `SettingsDialog` because `usePersona` does not export it.
**TODOs left in code:** None.
