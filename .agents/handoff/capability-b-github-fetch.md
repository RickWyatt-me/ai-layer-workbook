# Handoff: capability-b-github-fetch

**Plan:** `.agents/plans/capability-b-github-fetch.md`
**Built:** GitHub repo fetch flow. A new `<RepoFetcher>` card above `<PersonaCard>` on `/your-picture` accepts a GitHub URL (HTTPS, SSH, or bare `owner/repo`), calls four GitHub REST endpoints from the browser using the stored PAT if present, caches the result in `localStorage` as `aiLayer.repo`, and auto-populates the four persona fields so workbook templates reflect the user's actual repo. No backend, no proxy, no new dependencies.

**Files changed:** 4 modified, 3 added. Highlights:

- `src/lib/github.ts` — pure-function library: `parseRepoUrl`, `fetchRepo` (4 endpoints, AbortSignal aware), `mapGithubError` (PAT-safe), `derivePersonaFromRepo` (top-3 languages mapped to workbook enum, layout heuristic), `Repo` + `GithubError` types, `isGithubError` guard
- `src/hooks/useRepo.ts` — persisted-blob hook with strict `parseStored` (returns `null` on any structural mismatch), module-level `LISTENERS`, exposes `{ repo, setRepo, clear }`. Structural mirror of `usePersona.ts`
- `src/components/RepoFetcher.tsx` — composes `useSettings` + `useRepo` + `usePersona`, single `AbortController` ref for race-safe refetch, four render states (idle / fetching / error / sourced), inline link-style Refresh + Clear actions
- `src/components/PersonaCard.tsx` — additive `useEffect([persona])` that resyncs local form state when the hook broadcasts (so the GitHub fetch reaches the inputs, not just the templates)
- `src/lib/storage-keys.ts` — added `repo: 'aiLayer.repo'`; clear-all in `SettingsDialog` picks it up automatically via `Object.values(STORAGE_KEYS)`
- `src/styles/globals.css` — ~90 lines of `.repo-fetcher*` rules; uses `var(--bg-elev)` (less prominent than the persona card's `var(--bg-card)`); 600px breakpoint reduces padding
- `eslint.config.js` — added `@typescript-eslint/no-unused-vars` with `argsIgnorePattern: '^_'` so the deliberate `_pat` forbidden-fruit marker on `mapGithubError` lints clean

**Acceptance status:**

- ✓ `npx tsc -b`, `npm run lint`, `npm run format:check`, `npm run build` all clean
- ✓ No `console.*` calls in new code; `Bearer` only appears in the `Authorization` header construction at `github.ts:98`
- ⏸ Level 4 manual walkthrough (real fetch against `coleam00/helpline`, private-repo PAT path, each error kind, 375px layout, dark-mode contrast, mid-fetch AbortController cancellation) — needs a human at `npm run dev`

**Deviations from plan:** Added one rule to `eslint.config.js` so the `_pat` underscore marker honored project-wide instead of inline-disabling — minimal and a standard convention. Used `.repo-fetcher__link-btn` instead of a generic `.btn-link` since the plan offered both and the scoped class is easier to reason about. Plan steps for `ROADMAP.md` (Task 9) skipped — file doesn't exist yet; owner can add per the original handoff brief when v3.1+ work begins.
**TODOs left in code:** None.
