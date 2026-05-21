# Code review — Capability B (GitHub repo fetch)

**Handoff:** `.agents/handoff/capability-b-github-fetch.md`
**Plan:** `.agents/plans/capability-b-github-fetch.md`

## Stats

- Files Modified: 5 (`eslint.config.js`, `src/components/PersonaCard.tsx`, `src/lib/storage-keys.ts`, `src/pages/YourPicture.tsx`, `src/styles/globals.css`)
- Files Added: 3 (`src/components/RepoFetcher.tsx`, `src/hooks/useRepo.ts`, `src/lib/github.ts`)
- Files Deleted: 0
- New lines: ~575 (incl. ~88 CSS, ~250 TS lib, ~155 component, ~76 hook)
- Deleted lines: 0

## Verification run

- `npx tsc -b` — passes
- `npm run lint` — passes
- PAT leakage grep (`grep -nE "console\.|Bearer" src/...` and `pat` references) — clean. `Bearer` appears only at `src/lib/github.ts:98` where it's assigned to the `Authorization` header that is sent only to `api.github.com`. No `console.*` calls in new code. The privacy invariants from the plan (no PAT in error messages, ARIA, placeholders, throws) all hold.

## Issues

```
severity: medium
file: src/lib/github.ts
line: 57
issue: parseRepoUrl drops .git only before stripping trailing slashes, so `…/repo.git/` resolves to repo: "repo.git"
detail: The chained `.replace(/\.git$/, '').replace(/\/+$/, '')` only strips `.git` when it is at the very end of the string. For inputs like `https://github.com/owner/repo.git/` (which copy-paste from a `git clone` URL with an accidental trailing slash, or from some Git UIs), the first replace is a no-op because the `/` blocks the `.git$` anchor, and the second replace then strips the slash but leaves the suffix behind. Confirmed live: `parseRepoUrl("https://github.com/coleam00/helpline.git/")` returns `{ owner: "coleam00", repo: "helpline.git" }`. Downstream that becomes `GET https://api.github.com/repos/coleam00/helpline.git`, which GitHub returns 404 for — surfacing as a "Repo not found" error to the user on a URL they reasonably expect to work. The plan explicitly listed "`.git` suffix" as a parser-supported variant (Patterns section + acceptance criteria), so this is a spec deviation, not just polish.
suggestion: Either swap the order so trailing slashes are stripped first (`trimmed.replace(/\/+$/, '').replace(/\.git$/, '')`), or use a single combined regex such as `trimmed.replace(/(?:\.git)?\/*$/, '')`. Verify with the four cases I ran in node: `.git/`, `.git`, `/`, and bare — all should now produce `repo: "helpline"`.
```

```
severity: low
file: src/styles/globals.css
line: 1252
issue: .repo-fetcher__warn background uses a hardcoded rgba() instead of a CSS variable
detail: `background: rgba(138, 105, 20, 0.08)` matches the current `--warn: #8a6914` exactly, so visually it is correct *today*. But the project's pattern (see `--accent-bg` defined per theme on lines 18 and 39) is to express tinted backgrounds as a CSS variable so dark-theme overrides can adjust them. There's no `--warn` override in `[data-theme="dark"]` right now (only one definition exists, at line 20), so future-you adding a dark-mode warn color will silently produce a mismatched tint here. The plan called this out as "matches the existing `--accent-bg` pattern" but the implementation is the raw rgba, not the variable. Low because nothing breaks today.
suggestion: Add `--warn-bg: rgba(138, 105, 20, 0.08);` to the `:root` block (line 4) and the matching shade to the `[data-theme="dark"]` block (~line 25), then use `background: var(--warn-bg);` here. Keeps the tint in one place when dark-mode tuning happens.
```

```
severity: low
file: src/components/RepoFetcher.tsx
line: 18
issue: The URL input only seeds from cache on mount — if the repo blob updates from another tab/listener, the textarea stays empty
detail: `useState<string>(repo?.url ?? '')` uses `repo` as the initial value only. If a fetch completes in another instance of `<RepoFetcher>` (none exist today, but `useRepo` does broadcast across listeners) or storage is restored mid-session, the textbox doesn't pick that up. Today there is a single `<RepoFetcher>` on `/your-picture`, so this is theoretical, but the symmetric hook (`usePersona`) is used by multiple components and the same pattern would matter there. Low because there is no second caller right now.
suggestion: If a future capability adds another `<RepoFetcher>` instance, add a `useEffect(() => { if (repo?.url && !url) setUrl(repo.url); }, [repo?.url]);` — but explicitly conditional on `!url` so an in-progress typing session doesn't get clobbered. Not worth adding today; flagging so the future "two repos visible at once" change doesn't surprise.
```

```
severity: low
file: src/components/PersonaCard.tsx
line: 40
issue: The new useEffect resync runs on every persona broadcast, including the broadcast triggered by this component's own Apply button
detail: Click Apply → `setPersona(cleaned)` → broadcast → listener calls `setLocal(cleaned)` → `persona` changes → the new `useEffect` fires → `setRepoName(...)`, `setLanguages(...)`, etc. The values it writes are identical to what the user just typed (after the same `trim() || 'your-repo'` normalization that `setPersona` itself applied), so React bails out at the state-setter level and there is no visible flicker. But it's two redundant state-write passes per Apply click. Functionally correct, slightly wasteful. The plan explicitly noted "Apply → broadcast → resync to the same values → no flicker", so this is the intended trade-off — flagging only so future-you doesn't try to add a "user is mid-typing" guard and accidentally regress the RepoFetcher → PersonaCard flow.
suggestion: No change needed. If the redundancy ever shows up as a profiling concern, gate the resync by comparing against the current local state inside the effect.
```

```
severity: low
file: src/lib/github.ts
line: 196
issue: JavaScript → 'typescript' language mapping is a debatable default that the user can't opt out of without manually editing PersonaCard after the fetch
detail: For a JS-only repo (no TS files), the persona languages list will contain `'typescript'`, which silently changes which workbook templates render. The plan justifies this ("workbook treats them together") and the user can always uncheck TypeScript in PersonaCard, so this is a documented design choice, not a defect. Flagging here for the same reason the plan flagged it: if owner pushes back after testing against a real JS-only repo, swap to `'other'` — one-line edit at `LANGUAGE_MAP.JavaScript`. Low and intentional.
suggestion: No change unless owner objects on real-user feedback. If swapping, `JavaScript: 'other'` or remove the key entirely (it'll fall through to `'other'` via `LANGUAGE_MAP[name] ?? 'other'`).
```

## What I checked and verified clean

- **PAT trust model:** `Bearer` only at `src/lib/github.ts:98`, only on requests to `api.github.com`. `mapGithubError`'s `_pat` parameter is never interpolated into any returned `GithubError.message` or `next` string (lines 150–190 read verbatim and contain only static text + the HTTP status code). The forbidden-fruit naming convention is preserved and the new ESLint rule (`varsIgnorePattern: '^_'`) keeps lint clean without an inline-disable.
- **No console output in new code:** `grep -nE "console\." src/lib/github.ts src/hooks/useRepo.ts src/components/RepoFetcher.tsx` → zero hits.
- **Storage clear-all:** Adding `repo: 'aiLayer.repo'` to `STORAGE_KEYS` is enough — `SettingsDialog`'s "Clear all keys & settings" iterates `Object.values(STORAGE_KEYS)`, so the new key is picked up automatically. Verified by reading `SettingsDialog.tsx:88–100` is unchanged and no new plumbing was added.
- **AbortController hygiene:** `RepoFetcher` aborts the previous controller before assigning a new one (lines 36–38), and the cleanup effect aborts on unmount (line 23). `AbortError` is caught and ignored at the component level (line 50), so a slow first fetch followed by a fast second fetch will not overwrite the second's result.
- **README robustness:** `decodeBase64Readme` uses `Uint8Array` + `TextDecoder('utf-8')` rather than bare `atob`, so multi-byte chars are preserved (the README plan-listed gotcha). README 404 is treated as "no README" not as an error (lines 121–123, 130–133).
- **Tree truncation:** `treeJson.truncated` is captured into `Repo.treeTruncated` and surfaced via the `.repo-fetcher__warn` block on line 143 of `RepoFetcher.tsx`. Soft warning, not an error.
- **Persisted-blob hook strictness:** `useRepo`'s `parseStored` rejects any structural mismatch (`url`, `owner`, `repo`, `defaultBranch`, `tree`, `languages`, `fetchedAt` all checked) and returns `null` on failure — safer than restoring a partial blob that would crash `derivePersonaFromRepo` downstream.
- **PersonaCard resync correctness:** The new `useEffect([persona])` mirrors the same `'your-repo'` sentinel handling as the original `useState` initializer (line 41). A user who has just hand-typed an override and then re-applies it will not see a flicker (because the broadcast value equals the trimmed local value).
- **CSS variable usage:** Every new selector in `globals.css` uses themed variables (`--bg-elev`, `--rule`, `--ink-soft`, `--accent`, `--accent-bg`, `--ink-mute`, `--accent-soft`) except for the one rgba() noted in the Low issue above. The 600px mobile-padding breakpoint is appropriate for the 375px target since the existing `.persona-card` chrome is wider; verified by reading lines 671–724 of globals.css.

## Recommendation

Two fixes worth applying before commit:

1. **Medium:** swap the strip order in `parseRepoUrl` (one-line change, restores a documented input variant).
2. **Low:** introduce a `--warn-bg` variable for the hardcoded rgba() in `.repo-fetcher__warn` (three-line change, keeps the dark-mode escape hatch open).

The three remaining lows are documented design decisions from the plan; flagging only so future changes don't accidentally undo them. Everything else — privacy invariants, AbortController, README decoding, persona resync, clear-all integration — checks out.
