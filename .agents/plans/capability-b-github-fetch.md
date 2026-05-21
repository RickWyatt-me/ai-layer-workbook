# Feature: Capability B — GitHub repo fetch

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Add a GitHub repo fetch flow to the "Your codebase picture" page (`YourPicture.tsx`). The user pastes a GitHub URL (`https://github.com/owner/repo`, `git@github.com:owner/repo`, or bare `owner/repo`). The browser calls the GitHub REST API directly (authenticated with the stored PAT if present), pulls metadata + languages + a 3-level recursive tree + README, caches the result in `localStorage`, and **auto-populates the four `usePersona` fields** so the workbook's `.tpl-repo`/`.tpl-agent` tokens and templates reflect the user's actual repo. The user can still edit every persona field by hand in the existing `<PersonaCard>` below the fetcher.

This is **Capability B** in the locked feature order (`CLAUDE.md` resolved decision 6). It ships standalone between Capability A (Settings — done in commit `b235e0c`) and C1 (Audit my repo). It produces the data L3 will reason over but performs no Anthropic calls.

## User Story

As a non-technical-but-capable builder
I want to paste my GitHub repo URL and have the workbook learn what's in my repo
So that the prompts, templates, and (later) the AI-powered features speak about *my* code — not a generic example

## Problem Statement

`PersonaCard.tsx` requires the user to type their repo name, hand-pick languages from a checkbox grid, choose a layout, and list top-level folders. For someone with a real GitHub repo, that's busywork — every one of those facts already exists on GitHub. Capability B replaces the busywork with a paste-the-URL flow that fills the fields automatically. It also produces the cached repo data (`description`, `tree`, `readme`, `languages`) that **C1 Audit**, **C2 Root CLAUDE.md draft**, **C3 Sub-CLAUDE.md draft**, and **C4 Skill draft** will consume in subsequent capabilities.

Three constraints make this non-trivial:

1. **No backend.** All GitHub calls must originate from the browser using only the user's PAT (if any), so error handling, rate-limit awareness, and CORS behaviour are the client's problem.
2. **Trust.** The PAT travels only to `api.github.com`. It must never appear in console, errors, ARIA labels, or any DOM attribute outside the password input's `value`. Mirrors Capability A's invariants.
3. **Don't stomp on the user.** If the user already personalised by hand, a fetch must not silently wipe their typing. The fetcher auto-applies but shows the source ("Filled from `owner/repo`") and the PersonaCard still owns the final value.

## Solution Statement

1. New `useRepo()` hook owns the new state — `{ url, owner, repo, defaultBranch, description, primaryLanguage, languages, tree, readme, fetchedAt }` — persisted to `localStorage` under `aiLayer.repo` as a single JSON blob. Mirrors `usePersona.ts` exactly (lazy init, listener set, `parseStored` per-field validator, silent `try/catch` around storage).
2. New `src/lib/github.ts` library: pure functions for URL parsing (`parseRepoUrl`), the four-endpoint fetch orchestration (`fetchRepo`), error mapping (`mapGithubError`), and persona derivation (`derivePersonaFromRepo`). No React. No hooks. Easy to reason about.
3. New `<RepoFetcher>` component renders **above** the existing `<PersonaCard>` on `YourPicture.tsx`. URL input + Fetch button + status line + "Refresh from GitHub" + "Clear repo data". Reads `settings.githubPat` from `useSettings` (no prop drilling).
4. After a successful fetch, the component computes the derived persona, calls `setPersona(...)`, and shows a one-line "Filled from `owner/repo` (refresh)" hint above PersonaCard so the source of truth is visible. The existing PersonaCard works unchanged — its `useEffect` re-syncs when `usePersona` broadcasts.
5. Errors render inline under the URL input with a one-sentence plain-language message and a clear next step (open Settings, check the URL, retry). Never includes the PAT or any token-shaped string.
6. Cache: one repo at a time (the current one) under `aiLayer.repo`. "Refresh" refetches; "Clear repo data" wipes the entry. This is the simplest interpretation of the brief's "cache aggressively" + "Refresh from GitHub" requirement and matches v3.0's one-repo-at-a-time mental model. Per-URL caching is a roadmap item if owner wants it.

No Anthropic calls. No proxy. No new npm dependencies (hand-rolled `fetch`; `octokit` is bundle-bloat for four endpoints).

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: `src/hooks/`, `src/lib/`, `src/components/`, `src/pages/YourPicture.tsx`, `src/styles/globals.css`
**Dependencies**: None new. Uses existing React 19, `useSettings` (Capability A), `usePersona`. No octokit.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `src/hooks/usePersona.ts` (full file, 88 lines) — **the persisted-blob pattern to mirror exactly**. Lazy `useState` with SSR guard, `LISTENERS` set + `broadcast`, `parseStored` per-field validation, silent `try/catch` around `localStorage`. `useRepo.ts` is a direct structural copy with a richer field set.
- `src/hooks/useSettings.ts` (full file, 128 lines) — **the second copy of that pattern**. Read both before writing `useRepo` so the conventions are obvious. `useSettings` exposes per-field setters via an internal `update(patch)` — `useRepo` exposes a `setRepo(next)` whole-blob setter and a `clear()` since callers always replace it whole-cloth after a fetch.
- `src/hooks/usePersona.ts:68–85` — the `setPersona` shape `RepoFetcher` invokes after a successful fetch.
- `src/components/PersonaCard.tsx` (full file, 147 lines) — **the form-input pattern**. `.persona-field` wrapper, controlled input, save-status `useState` + `useRef<number>` timeout cleanup. The new `RepoFetcher` reuses every one of these idioms.
  - Lines 19–24: how it derives initial state from `usePersona` (treats sentinel `'your-repo'` as empty).
  - Lines 28–34: timeout cleanup on unmount — copy this exactly.
  - Lines 42–53: status-message pattern (save → set status → schedule clear).
  - Lines 127–134: `.btn` primary button class.
- `src/components/SettingsDialog.tsx` (full file, 299 lines) — **how to consume `useSettings` from a sibling component**. The PAT field lives there; `RepoFetcher` only reads `settings.githubPat` (no setter). Note the silent-catch + privacy-explainer copy style.
- `src/pages/YourPicture.tsx` (full file, 64 lines) — **the page being modified**. Insert `<RepoFetcher />` immediately above `<PersonaCard />` (after the `<p className="lede">` block, before `<PersonaCard />` on line 36). Do **not** remove `<PersonaCard />`; the fetcher *populates* persona, the card still owns manual edits.
- `src/components/PersonaCard.tsx` languages list (lines 4–14) — `LANGUAGE_OPTIONS` is the enum the GitHub→persona mapper must produce values from. Same values: `swift | kotlin | typescript | python | go | rust | java | csharp | other`.
- `src/hooks/usePersona.ts` `RepoLayout` type (line 4) — `'single' | 'multi' | 'mono'`. The layout inference function in `github.ts` returns one of these three.
- `src/lib/storage-keys.ts` (full file, 9 lines) — add `repo: 'aiLayer.repo'`. Existing convention: `aiLayer.*` for new state, `workbook:*` for v1-portable state. Repo data is net-new → `aiLayer.`.
- `src/styles/globals.css`:
  - Lines 684–724 — `.persona-field` rules (input/textarea/select chrome). RepoFetcher reuses verbatim. Do not duplicate.
  - Lines 759–786 — `.btn` and `.btn.ghost` rules. "Fetch" is `.btn`, "Refresh" / "Clear repo data" are `.btn.ghost`.
  - Line 671 — `.persona-card` wrapper styles. RepoFetcher uses a new `.repo-fetcher` class with similar but distinguishable chrome (slightly less prominent — see Patterns section).
- `Docs/ai-layer-workbook-claude-code-handoff.md`:
  - §4 Capability B (lines 98–112) — **the spec.** Six bullets.
  - §6 GitHub fetching (lines 213–216) — rate limit notes.
  - Appendix D (lines 488–506) — the exact endpoints and headers. Copy verbatim into `github.ts`.
- `.agents/plans/capability-a-settings.md` — sibling plan, sets the precedent for tone, scope, and validation depth. **Mirror its structure.**
- `.agents/handoff/capability-a-settings.md` — describes what's already shipped from A. Note: `useTheme.setTheme/resetTheme` exist; the `clear-all` flow already removes every `aiLayer.*` / `workbook:*` key including the new `aiLayer.repo` automatically because it iterates `Object.values(STORAGE_KEYS)` (see `SettingsDialog.tsx:88–100`). **You don't need to plumb anything into clear-all** — just adding to `STORAGE_KEYS` is enough.

### New Files to Create

- `src/lib/github.ts` — pure-function library: `parseRepoUrl`, `fetchRepo`, `mapGithubError`, `derivePersonaFromRepo`, and the typed shapes `Repo`, `RepoTreeEntry`, `GithubError`. No React imports.
- `src/hooks/useRepo.ts` — persisted-blob hook returning `{ repo, setRepo, clear }`. Mirror of `usePersona.ts`.
- `src/components/RepoFetcher.tsx` — the UI: URL input, Fetch button, status/error line, "Refresh" / "Clear repo data" / "Filled from `owner/repo`" affordances.

### Files to Modify

- `src/lib/storage-keys.ts` — add `repo: 'aiLayer.repo'`.
- `src/pages/YourPicture.tsx` — render `<RepoFetcher />` immediately above `<PersonaCard />`. Add a one-line intro paragraph above it ("Have a real repo on GitHub? Paste the URL and the workbook fills in the personalize fields below.").
- `src/styles/globals.css` — append `.repo-fetcher`, `.repo-fetcher__status`, `.repo-fetcher__error`, `.repo-fetcher__source` rules. ~60–80 new lines.
- `README.md` — optional one-line update under "What v3 does" (after manual validation).

### Relevant Documentation — READ THESE BEFORE IMPLEMENTING

- [GitHub REST API — Get a repository](https://docs.github.com/en/rest/repos/repos#get-a-repository) — confirms `default_branch`, `description`, `language` fields are stable on `GET /repos/{owner}/{repo}`. The endpoint URL has not moved.
- [GitHub REST API — List repository languages](https://docs.github.com/en/rest/repos/repos#list-repository-languages) — returns `{ "Swift": 12345, "Kotlin": 6789 }`. Order is by byte count, descending.
- [GitHub REST API — Get a tree (recursive)](https://docs.github.com/en/rest/git/trees#get-a-tree) — `?recursive=1` returns up to 100k entries. Watch `truncated: true` in the response — display a soft warning if the repo is bigger than the API serves in one call.
- [GitHub REST API — Get a repository README](https://docs.github.com/en/rest/repos/contents#get-a-repository-readme) — returns base64-encoded content. Decode with `atob(content.replace(/\n/g, ''))` then `decodeURIComponent(escape(...))` for UTF-8 safety, or use `TextDecoder`. (`atob` alone breaks on non-ASCII bytes.) Note 404 is *expected* for repos without a README — do not surface as an error; just set `readme: null`.
- [GitHub REST API — Authentication](https://docs.github.com/en/rest/authentication/authenticating-to-the-rest-api#authenticating-with-a-personal-access-token) — `Authorization: Bearer <PAT>` header. The plan uses Bearer, not the older `token <PAT>` syntax.
- [GitHub REST API — Rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) — unauthenticated 60/hr by IP, authenticated 5000/hr by user. The `X-RateLimit-Remaining` and `X-RateLimit-Reset` response headers are how you detect rate limiting *before* failing.
- [GitHub PAT (fine-grained) creation](https://github.com/settings/tokens?type=beta) — already linked from Settings; reference only.
- [MDN — `fetch` AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) — used to cancel an in-flight fetch if the user clicks "Fetch" again or unmounts. Mandatory for Tasks 4–5.
- [MDN — `URL` constructor](https://developer.mozilla.org/en-US/docs/Web/API/URL) — used in `parseRepoUrl` for the HTTPS case. Handles trailing slashes, query strings, `/tree/branch` paths, the `.git` suffix.
- `CLAUDE.md` "Trust but verify" — header names and endpoint shapes have historically shifted on the GitHub API. Re-verify the four endpoint paths and the `X-GitHub-Api-Version` value at implementation time. Spec values below are correct as of January 2026.

### Patterns to Follow

**GitHub URL parser (the spec is exact, mirror this):**

```ts
// src/lib/github.ts
export interface ParsedRepoUrl {
  owner: string;
  repo: string;
}

const SLUG = /^[A-Za-z0-9._-]+$/;

export function parseRepoUrl(input: string): ParsedRepoUrl | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Strip a trailing .git and any trailing slashes
  const cleaned = trimmed.replace(/\.git$/, '').replace(/\/+$/, '');

  // SSH form: git@github.com:owner/repo
  const ssh = cleaned.match(/^git@github\.com:([^/]+)\/([^/]+)$/);
  if (ssh) {
    const [, owner, repo] = ssh;
    return SLUG.test(owner) && SLUG.test(repo) ? { owner, repo } : null;
  }

  // HTTPS form: https://github.com/owner/repo[...]
  if (/^https?:\/\//i.test(cleaned)) {
    try {
      const url = new URL(cleaned);
      if (url.hostname !== 'github.com') return null;
      const parts = url.pathname.replace(/^\//, '').split('/');
      if (parts.length < 2) return null;
      const [owner, repo] = parts;
      return SLUG.test(owner) && SLUG.test(repo) ? { owner, repo } : null;
    } catch {
      return null;
    }
  }

  // Bare form: owner/repo
  const bare = cleaned.match(/^([^/]+)\/([^/]+)$/);
  if (bare) {
    const [, owner, repo] = bare;
    return SLUG.test(owner) && SLUG.test(repo) ? { owner, repo } : null;
  }

  return null;
}
```

**GitHub fetch orchestration (one function, four endpoints):**

```ts
// src/lib/github.ts
const GH_HEADERS_BASE: HeadersInit = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

export interface RepoTreeEntry {
  path: string;
  type: 'blob' | 'tree';
}

export interface Repo {
  url: string;          // canonical https://github.com/owner/repo
  owner: string;
  repo: string;
  defaultBranch: string;
  description: string | null;
  primaryLanguage: string | null;
  languages: Record<string, number>;  // { Swift: 12345, Kotlin: 6789 }
  tree: RepoTreeEntry[];               // filtered to depth <= 3
  treeTruncated: boolean;              // true if GitHub truncated the tree
  readme: string | null;               // decoded UTF-8, null if no README
  fetchedAt: number;                   // Date.now()
}

export interface GithubError {
  kind: 'invalid-url' | 'unauthorized' | 'rate-limit' | 'not-found' | 'network' | 'unexpected';
  message: string;       // user-facing, plain language, no PAT in it
  next: string;          // one-sentence next step
}

export async function fetchRepo(
  parsed: ParsedRepoUrl,
  pat: string,
  signal?: AbortSignal,
): Promise<Repo> {
  const headers: HeadersInit = { ...GH_HEADERS_BASE };
  if (pat) headers.Authorization = `Bearer ${pat}`;

  const base = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;

  // 1. Metadata (needed for default_branch before we can request the tree)
  const metaRes = await fetch(base, { headers, signal });
  if (!metaRes.ok) throw mapGithubError(metaRes, pat);
  const meta = (await metaRes.json()) as {
    default_branch: string;
    description: string | null;
    language: string | null;
  };

  // 2-4. Languages, tree, README in parallel
  const [langRes, treeRes, readmeRes] = await Promise.all([
    fetch(`${base}/languages`, { headers, signal }),
    fetch(
      `${base}/git/trees/${meta.default_branch}?recursive=1`,
      { headers, signal },
    ),
    fetch(`${base}/readme`, { headers, signal }),
  ]);

  if (!langRes.ok) throw mapGithubError(langRes, pat);
  if (!treeRes.ok) throw mapGithubError(treeRes, pat);
  // README 404 is acceptable — repo has no README
  if (!readmeRes.ok && readmeRes.status !== 404) {
    throw mapGithubError(readmeRes, pat);
  }

  const languages = (await langRes.json()) as Record<string, number>;
  const treeJson = (await treeRes.json()) as {
    truncated?: boolean;
    tree: Array<{ path: string; type: 'blob' | 'tree' }>;
  };
  const readme =
    readmeRes.status === 404
      ? null
      : decodeBase64Readme(
          (await readmeRes.json()) as { content: string },
        );

  return {
    url: `https://github.com/${parsed.owner}/${parsed.repo}`,
    owner: parsed.owner,
    repo: parsed.repo,
    defaultBranch: meta.default_branch,
    description: meta.description ?? null,
    primaryLanguage: meta.language ?? null,
    languages,
    tree: filterToDepth(treeJson.tree, 3),
    treeTruncated: treeJson.truncated === true,
    readme,
    fetchedAt: Date.now(),
  };
}

function filterToDepth(
  entries: Array<{ path: string; type: 'blob' | 'tree' }>,
  maxDepth: number,
): RepoTreeEntry[] {
  return entries
    .filter((e) => e.path.split('/').length <= maxDepth)
    .map((e) => ({ path: e.path, type: e.type }));
}

function decodeBase64Readme(payload: { content: string }): string {
  // GitHub returns the README base64-encoded with embedded newlines
  const b64 = payload.content.replace(/\n/g, '');
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}
```

**Error mapper (the gate that keeps the PAT out of error strings):**

```ts
// src/lib/github.ts
export function mapGithubError(res: Response, _pat: string): GithubError {
  // Do not interpolate `_pat` anywhere. It is named with a leading underscore
  // specifically as a forbidden-fruit marker for code review: present in the
  // signature for symmetry, never used in a returned message.
  const remaining = res.headers.get('X-RateLimit-Remaining');
  const isRateLimited =
    res.status === 403 && remaining !== null && Number(remaining) === 0;

  if (res.status === 401) {
    return {
      kind: 'unauthorized',
      message: 'GitHub rejected your token.',
      next: 'Open Settings (gear icon) and check your GitHub token.',
    };
  }
  if (isRateLimited) {
    return {
      kind: 'rate-limit',
      message: 'GitHub rate limit hit.',
      next: 'Add a GitHub token in Settings to raise the limit (5000/hr), or wait an hour.',
    };
  }
  if (res.status === 403) {
    return {
      kind: 'unauthorized',
      message: 'GitHub blocked the request.',
      next: 'If the repo is private, add a fine-grained PAT with read access in Settings.',
    };
  }
  if (res.status === 404) {
    return {
      kind: 'not-found',
      message: 'Repo not found.',
      next: 'Check the URL — or if the repo is private, add a PAT in Settings.',
    };
  }
  return {
    kind: 'unexpected',
    message: `GitHub returned ${res.status}.`,
    next: 'Try again. If it keeps failing, the GitHub API may be having problems.',
  };
}
```

**Persona derivation (turn fetched data into the persona shape):**

```ts
// src/lib/github.ts
import type { Persona, RepoLayout } from '../hooks/usePersona';

const LANGUAGE_MAP: Record<string, string> = {
  Swift: 'swift',
  Kotlin: 'kotlin',
  TypeScript: 'typescript',
  JavaScript: 'typescript',  // close enough — workbook treats them together
  Python: 'python',
  Go: 'go',
  Rust: 'rust',
  Java: 'java',
  'C#': 'csharp',
};

export function derivePersonaFromRepo(repo: Repo): Persona {
  // Top 3 GitHub languages by bytes, mapped to workbook enum, deduped, with
  // 'other' as a fallback if any of the top 3 don't map.
  const sorted = Object.entries(repo.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const personaLanguages = Array.from(
    new Set(sorted.map(([name]) => LANGUAGE_MAP[name] ?? 'other')),
  );

  // Top-level directory list from the tree (entries of depth 1, type='tree')
  const topLevel = repo.tree
    .filter((e) => e.type === 'tree' && !e.path.includes('/'))
    .map((e) => e.path);

  // Layout inference:
  //  - mobile dual-platform: ios/ + android/ at root → 'multi'
  //  - monorepo: packages/ or services/ or apps/ at root → 'mono'
  //  - otherwise → 'single'
  let layout: RepoLayout = 'single';
  const hasIos = topLevel.includes('ios');
  const hasAndroid = topLevel.includes('android');
  const hasMonoMarker =
    topLevel.includes('packages') ||
    topLevel.includes('services') ||
    topLevel.includes('apps');
  if (hasIos && hasAndroid) layout = 'multi';
  else if (hasMonoMarker) layout = 'mono';

  return {
    repoName: repo.repo,
    languages: personaLanguages,
    layout,
    topLevelDirs: topLevel.join('\n'),
  };
}
```

**Persisted-blob hook (mirror `usePersona.ts` exactly):**

```ts
// src/hooks/useRepo.ts
import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../lib/storage-keys';
import type { Repo } from '../lib/github';

function parseStored(raw: string | null): Repo | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Repo>;
    if (
      typeof parsed.owner !== 'string' ||
      typeof parsed.repo !== 'string' ||
      typeof parsed.defaultBranch !== 'string' ||
      !Array.isArray(parsed.tree)
    ) {
      return null;
    }
    // Coerce field-by-field; on any mismatch return null (caller treats as
    // "no repo cached" — safer than a partial restore).
    return parsed as Repo;
  } catch {
    return null;
  }
}

const LISTENERS = new Set<(r: Repo | null) => void>();
function broadcast(r: Repo | null) {
  for (const fn of LISTENERS) fn(r);
}

export function useRepo(): {
  repo: Repo | null;
  setRepo: (next: Repo) => void;
  clear: () => void;
} {
  const [repo, setLocal] = useState<Repo | null>(() => {
    if (typeof window === 'undefined') return null;
    return parseStored(window.localStorage.getItem(STORAGE_KEYS.repo));
  });

  useEffect(() => {
    const handler = (next: Repo | null) => setLocal(next);
    LISTENERS.add(handler);
    return () => {
      LISTENERS.delete(handler);
    };
  }, []);

  const setRepo = useCallback((next: Repo) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEYS.repo, JSON.stringify(next));
      } catch {
        // ignore — storage unavailable
      }
    }
    setLocal(next);
    broadcast(next);
  }, []);

  const clear = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEYS.repo);
      } catch {
        // ignore — storage unavailable
      }
    }
    setLocal(null);
    broadcast(null);
  }, []);

  return { repo, setRepo, clear };
}
```

**Naming Conventions:**

- Files: `PascalCase.tsx` for components, `camelCase.ts` for hooks/lib (`useRepo`, `github`).
- Hooks: `use<Thing>` returning `{ <thing>, set<Thing>, clear? }`.
- Storage keys: dot-separated `aiLayer.` prefix for net-new state. `aiLayer.repo`.
- CSS classes: kebab-case, BEM-ish (`.repo-fetcher`, `.repo-fetcher__status`, `.repo-fetcher__source`).
- Error kinds: short kebab-case strings (`'invalid-url'`, `'rate-limit'`, `'not-found'`) — matches handoff brief phrasing.

**Error Handling:**

- All `localStorage` access in `useRepo` wrapped in `try/catch` with silent comments (`// ignore — storage unavailable`). Match `usePersona.ts:79–80`.
- `JSON.parse` in `parseStored` wrapped in `try/catch` returning `null`. Treat any parse failure as "no cache."
- `fetch` errors (network failures) throw `TypeError` — catch in the component, render as `{ kind: 'network', message: 'Could not reach GitHub.', next: 'Check your connection and try again.' }`.
- **AbortController**: every fetch flow runs under a single `AbortController` owned by the component. Aborting throws `AbortError`. Catch-and-ignore `AbortError` in the component — it means a newer fetch (or unmount) cancelled this one.
- **Never** `console.log`, `console.error`, `console.warn`, `console.debug` anything containing the PAT or the `Authorization` header.

**Form Inputs:**

```tsx
<div className="persona-field">
  <label htmlFor="repo-url">Your GitHub repo URL</label>
  <input
    id="repo-url"
    type="text"
    autoComplete="off"
    spellCheck={false}
    placeholder="https://github.com/owner/repo"
    value={url}
    onChange={(e) => setUrl(e.target.value)}
  />
</div>
```

- Reuse `.persona-field` class — already styled in globals.css:684–724.
- The URL input is `type="text"` (it's a public URL, not a secret). Only the PAT in Settings is `type="password"`.

**Component skeleton:**

```tsx
// src/components/RepoFetcher.tsx — abbreviated
export default function RepoFetcher() {
  const { settings } = useSettings();
  const { repo, setRepo, clear } = useRepo();
  const { setPersona } = usePersona();

  const [url, setUrl] = useState(repo?.url ?? '');
  const [status, setStatus] = useState<'idle' | 'fetching'>('idle');
  const [error, setError] = useState<GithubError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const onFetch = async () => {
    setError(null);
    const parsed = parseRepoUrl(url);
    if (!parsed) {
      setError({
        kind: 'invalid-url',
        message: "That doesn't look like a GitHub URL.",
        next: 'Use the form https://github.com/owner/repo (or git@github.com:owner/repo).',
      });
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setStatus('fetching');
    try {
      const fetched = await fetchRepo(parsed, settings.githubPat, abortRef.current.signal);
      setRepo(fetched);
      setPersona(derivePersonaFromRepo(fetched));
      setStatus('idle');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setStatus('idle');
      setError(isGithubError(err) ? err : {
        kind: 'network',
        message: 'Could not reach GitHub.',
        next: 'Check your connection and try again.',
      });
    }
  };
  // …render…
}
```

**Privacy / key-safety invariants (enforce in code review):**

- `console.log` / `console.error` / `console.warn` / `console.debug` of any expression containing `settings.githubPat`, `Authorization`, `Bearer`, or `pat` (the parameter name): **forbidden**.
- The PAT must never appear in any returned `GithubError.message` or `GithubError.next` string.
- No `aria-label`, `title`, `placeholder`, `data-*`, or error string containing the PAT value.
- No `throw new Error('… ${pat} …')`. The `_pat` parameter on `mapGithubError` exists for symmetry only.
- The README and tree are user-visible text — fine to render and to log if needed for debugging. The repo URL is also fine. Only the PAT is the secret.

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Types, the storage key, and the pure-function library. No UI, no hooks yet.

**Tasks:**

- Add `repo` to `STORAGE_KEYS`.
- Create `src/lib/github.ts` with `parseRepoUrl`, `fetchRepo`, `mapGithubError`, `derivePersonaFromRepo`, types, and the language map.

### Phase 2: Core Implementation

The persistence hook and the fetcher component.

**Tasks:**

- Create `src/hooks/useRepo.ts` (mirror `usePersona.ts`).
- Build `src/components/RepoFetcher.tsx`.
- Add CSS for `.repo-fetcher` and friends.

### Phase 3: Integration

Wire to the page; confirm existing personalize flow still works.

**Tasks:**

- Insert `<RepoFetcher />` above `<PersonaCard />` in `YourPicture.tsx`.
- Verify persona templates (`<TplRepo />` etc.) update after a fetch.

### Phase 4: Testing & Validation

No test framework. Validation is type-check + lint + format + manual.

**Tasks:**

- Run `npx tsc -b`, `npm run lint`, `npm run format:check`, `npm run build` — all must pass.
- Manual fetch against `coleam00/helpline` (public, BYO-PAT not required).
- Manual fetch against a private repo with PAT.
- Manual error walkthrough (each `GithubError.kind`).
- 375px width pass — no horizontal scroll, error lines wrap.
- Secret-grep on changed files: zero matches.

---

## STEP-BY-STEP TASKS

Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1 — UPDATE `src/lib/storage-keys.ts`

- **IMPLEMENT**: Add a `repo` entry.
- **PATTERN**: Existing entries on lines 2–6.
- **NEW VALUE**: `repo: 'aiLayer.repo'` — placed alphabetically next to `persona`.
- **GOTCHA**: Two prefixes already exist (`aiLayer.` for theme/agent/settings, `workbook:` for persona/checks). New state uses `aiLayer.` — matches Capability A's convention.
- **GOTCHA**: This single change automatically extends the "Clear all keys & settings" wipe in `SettingsDialog.tsx:88–100` because it iterates `Object.values(STORAGE_KEYS)`. No further plumbing needed.
- **VALIDATE**: `npx tsc -b` exits 0.

### Task 2 — CREATE `src/lib/github.ts`

- **IMPLEMENT**: Pure-function library. Exports in order:
  1. `interface ParsedRepoUrl`
  2. `interface RepoTreeEntry`
  3. `interface Repo`
  4. `interface GithubError` (with `isGithubError(v: unknown): v is GithubError` type guard for the component's catch block)
  5. `parseRepoUrl(input: string): ParsedRepoUrl | null` — see Patterns section for exact regex set.
  6. `fetchRepo(parsed: ParsedRepoUrl, pat: string, signal?: AbortSignal): Promise<Repo>` — see Patterns section.
  7. `mapGithubError(res: Response, _pat: string): GithubError` — note the underscore-prefixed unused param. See Patterns section.
  8. `derivePersonaFromRepo(repo: Repo): Persona` — see Patterns section. Imports `Persona` and `RepoLayout` from `../hooks/usePersona`.
  9. Private helpers: `filterToDepth`, `decodeBase64Readme`, `LANGUAGE_MAP` constant.
- **IMPORTS**: `import type { Persona, RepoLayout } from '../hooks/usePersona';` — type-only import. **No** React, **no** hooks. This file is pure logic.
- **GOTCHA — README decoding**: `atob` alone breaks on multi-byte UTF-8. Use the `TextDecoder` path in the Patterns section. Test with a repo whose README contains an em-dash or a non-Latin character.
- **GOTCHA — tree truncation**: `treeJson.truncated === true` means the recursive tree was too large to return in one response. The plan's `Repo.treeTruncated` field surfaces this; the component shows a soft warning ("This repo is large — only the first slice was indexed"). Do not retry with pagination in v1; flag in `ROADMAP.md` if needed.
- **GOTCHA — README 404**: A 404 on `GET /readme` means the repo has no README. This is **not** an error to surface — set `readme: null` and continue. Other 4xx/5xx on the README endpoint **are** errors.
- **GOTCHA — error mapping**: `mapGithubError` must inspect `X-RateLimit-Remaining` *before* deciding 403 is "unauthorized" vs "rate-limit". Both share the same HTTP status; only the header distinguishes them.
- **GOTCHA — language map**: `JavaScript` → `'typescript'` is intentional (workbook's `LANGUAGE_OPTIONS` doesn't have a separate JS entry, and "typescript" reasonably covers JS-stack work for the workbook's templates). If owner pushes back, swap to `'other'`.
- **GOTCHA — layout inference**: The three rules in `derivePersonaFromRepo` are heuristic. Don't add more without owner sign-off — false positives are worse than a `'single'` default the user can fix in `PersonaCard`.
- **VALIDATE**:
  - `npx tsc -b` exits 0.
  - In a scratch consumer, call `parseRepoUrl('https://github.com/coleam00/helpline')` → `{ owner: 'coleam00', repo: 'helpline' }`. Call with `'git@github.com:coleam00/helpline.git'` → same. Call with `'gibberish'` → `null`. (Delete scratch after.)

### Task 3 — CREATE `src/hooks/useRepo.ts`

- **IMPLEMENT**: Mirror `src/hooks/usePersona.ts`. Returns `{ repo: Repo | null, setRepo: (r: Repo) => void, clear: () => void }`. See Patterns section for the full file.
- **PATTERN**: `src/hooks/usePersona.ts` lines 1–88. Same structure: `parseStored` with `try/catch` and per-field validation (this hook's stricter — returns `null` on any mismatch rather than partial defaults, because partial repo data is misleading), module-level `LISTENERS`, `broadcast`, lazy `useState` initializer with `typeof window === 'undefined'` SSR guard, `useEffect` register/unregister.
- **IMPORTS**: `useCallback`, `useEffect`, `useState` from `react`; `STORAGE_KEYS` from `../lib/storage-keys`; `type { Repo }` from `../lib/github`.
- **GOTCHA**: `parseStored` rejects on any structural mismatch — this is intentional. A partially-corrupt `Repo` blob being restored would cause `derivePersonaFromRepo`'s assumptions to break downstream. Safer to start clean.
- **GOTCHA**: No per-field setters — only `setRepo(next: Repo)` and `clear()`. Callers always have the whole `Repo` after a fetch; per-field setters would be a footgun.
- **GOTCHA**: Don't add a `lastFetchedAt` setter — `repo.fetchedAt` is captured by `fetchRepo` at the moment of fetch and stays put in the cached blob.
- **VALIDATE**:
  - `npx tsc -b` exits 0.
  - In a scratch component, render `const { repo } = useRepo()`. With no cache present, `repo === null`. After `localStorage.setItem(STORAGE_KEYS.repo, JSON.stringify(stubRepo))` + reload, `repo` matches `stubRepo`. (Delete scratch after.)

### Task 4 — CREATE `src/components/RepoFetcher.tsx`

- **IMPLEMENT**: The UI component. Sections in render order:
  1. **Card chrome**: `<section className="repo-fetcher">`.
  2. **Heading**: `<h3>Fetch from GitHub</h3>` + 1-sentence intro: "Paste a GitHub URL. The workbook fills in the personalize fields below from your repo's metadata."
  3. **URL input**: `.persona-field` with `<input id="repo-url" type="text" ...>` (see Patterns).
  4. **Action row**: Primary `<button className="btn" onClick={onFetch} disabled={status === 'fetching' || !url.trim()}>Fetch</button>`. While `status === 'fetching'`, label becomes `'Fetching…'` and button is disabled.
  5. **Inline status / source line** (one of these, based on state):
     - If `error`: `<p className="repo-fetcher__error">{error.message} {error.next}</p>`.
     - Else if `status === 'fetching'`: `<p className="repo-fetcher__status">Fetching from GitHub…</p>`.
     - Else if `repo`: `<p className="repo-fetcher__source">Filled from <a href={repo.url} target="_blank" rel="noopener noreferrer">{repo.owner}/{repo.repo}</a>. <button className="btn ghost btn-link" onClick={onFetch}>Refresh</button> <button className="btn ghost btn-link" onClick={onClear}>Clear repo data</button></p>`.
     - Plus: if `repo?.treeTruncated`, append a small `<p className="repo-fetcher__warn">This repo is large — only the first slice was indexed. Detection may be partial.</p>`.
  6. **Hint**: small `.settings-dialog__hint`-style line: "Need a GitHub token for a private repo? Open Settings (gear icon)."
- **PROPS**: none. Reads from `useSettings()`, `useRepo()`, `usePersona()` directly.
- **STATE**: `url: string` (controlled), `status: 'idle' | 'fetching'`, `error: GithubError | null`, `abortRef: useRef<AbortController | null>(null)`.
- **EFFECTS**:
  - **Cleanup**: `useEffect(() => () => abortRef.current?.abort(), []);` — abort in-flight fetch on unmount.
  - **Pre-seed URL**: If `repo` is non-null on mount, `useState(repo?.url ?? '')` already seeds it; no additional effect required.
- **IMPORTS**: `useEffect`, `useRef`, `useState` from `react`; `useSettings` from `../hooks/useSettings`; `useRepo` from `../hooks/useRepo`; `usePersona` from `../hooks/usePersona`; `parseRepoUrl`, `fetchRepo`, `derivePersonaFromRepo`, `isGithubError`, `type GithubError` from `../lib/github`.
- **GOTCHA — re-fetch races**: Each click of Fetch / Refresh calls `abortRef.current?.abort()` *before* assigning a new `AbortController`. A slow first fetch + a fast second fetch must not overwrite the second's result.
- **GOTCHA — empty URL**: Disable the Fetch button when `url.trim() === ''`. Don't call `parseRepoUrl` on empty.
- **GOTCHA — persona override**: Calling `setPersona(derivePersonaFromRepo(fetched))` will **overwrite** whatever the user has typed in PersonaCard. The intro copy ("the workbook fills in the personalize fields below") makes that explicit. The PersonaCard re-reads from `usePersona` via its `useEffect`/state init — wait, look closely: PersonaCard's `useState` initializers (lines 19–24) only fire on mount. **PersonaCard does not auto-resync from `usePersona` after mount.** Two options:
  - **Option A (preferred)**: Add a `useEffect` to PersonaCard that resyncs its local state when `persona` changes (small change, surgical, see Task 5).
  - Option B: Force a remount of PersonaCard by keying it on `repo?.fetchedAt`. Hacky.
- **GOTCHA — PAT in error message**: `error.message` and `error.next` strings are *generated by* `mapGithubError` and *never* include the PAT. But the component must not append a debug suffix like `(token: …)`. Don't.
- **GOTCHA — link button styling**: `.btn.ghost` is the existing styled outline button (globals.css:778–786). It's chunky. For "Refresh" / "Clear repo data" inline on the source line, you want something visually lighter. Add a `.btn-link` modifier in Task 6 CSS (transparent background, smaller padding, accent color, underline on hover) — or rely on a new `.repo-fetcher__source button` selector. Either approach is fine; pick one and use it consistently.
- **VALIDATE**:
  - `npx tsc -b` exits 0.
  - Manual: render the component on `/your-picture`, paste `coleam00/helpline`, click Fetch. Persona fields auto-populate. Refresh button works. Clear button removes cache (verify in DevTools → Application → Local Storage).

### Task 5 — UPDATE `src/components/PersonaCard.tsx` — auto-resync local state when `usePersona` broadcasts

- **IMPLEMENT**: Add a `useEffect` that resyncs the four local `useState` fields (`repoName`, `languages`, `layout`, `topLevelDirs`) whenever `persona` (from `usePersona`) changes externally. Mirror the spirit of `useSettings.ts`'s `LISTENERS` pattern — but here we use a `useEffect([persona])` since the hook already broadcasts.
- **WHY**: Without this, the GitHub fetch updates `usePersona` storage but the PersonaCard inputs still show whatever the user typed before. The persona templates (`<TplRepo />` etc.) *do* update because they call `usePersona()` directly each render — but the manual form is stuck.
- **PATTERN**:

  ```tsx
  // Inside PersonaCard, after the existing useState declarations:
  useEffect(() => {
    setRepoName(persona.repoName === 'your-repo' ? '' : persona.repoName);
    setLanguages(persona.languages);
    setLayout(persona.layout);
    setTopLevelDirs(persona.topLevelDirs);
  }, [persona]);
  ```

- **GOTCHA — typing race**: A user actively typing in the repo-name field while a GitHub fetch resolves would have their typing yanked away. Acceptable for v1 because the GitHub fetch is user-initiated (they clicked Fetch) — they expect the fields to change. Document this in a code comment one-liner. Do not add a "have you typed recently?" guard.
- **GOTCHA — sentinel handling**: The existing init (line 20) treats `'your-repo'` as the empty-state sentinel. The new `useEffect` must do the same — see the conditional above.
- **GOTCHA — local-only Apply**: The existing PersonaCard has its own Apply button that calls `setPersona`. After this change, the local edits still survive the loop because the `useEffect` only re-fires when `persona` (the hook's broadcasted state) actually changes — which only happens via `setPersona`, which the Apply button itself calls. So Apply → broadcast → resync to the same values → no flicker.
- **VALIDATE**:
  - `npx tsc -b` exits 0.
  - Manual: type "manual-name" into the repo-name field. Open `<RepoFetcher>` (added in Task 4), paste a URL, click Fetch. PersonaCard's repo-name field updates to the fetched name. Reverse: type a manual override after fetch, click Apply, refresh page — manual override persists in `<TplRepo />`.

### Task 6 — UPDATE `src/styles/globals.css`

- **IMPLEMENT**: Append a `.repo-fetcher` section at the end of the file. Required rules:
  - `.repo-fetcher` — `padding: 1.4rem 1.5rem`, `background: var(--bg-elev)`, `border: 1px solid var(--rule)`, `border-radius: 6px`, `margin-block: 1.5rem`. Slightly tighter than `.persona-card` (which uses ~`1.8rem`/`var(--bg-card)`) so the visual hierarchy is "fetcher → personalize card" with the card as the primary surface.
  - `.repo-fetcher h3` — `var(--serif)`, `font-size: 1.1rem`, `margin: 0 0 0.4rem`.
  - `.repo-fetcher__intro` — `color: var(--ink-soft)`, `font-size: 0.9rem`, `margin-bottom: 1rem`.
  - `.repo-fetcher__status` — `font-size: 0.85rem`, `color: var(--ink-soft)`, `margin-top: 0.6rem`.
  - `.repo-fetcher__source` — `font-size: 0.85rem`, `color: var(--ink-soft)`, `margin-top: 0.6rem`. Contains a link and two action buttons.
  - `.repo-fetcher__source a` — accent color, inherits from existing link styling.
  - `.repo-fetcher__error` — `font-size: 0.9rem`, `color: var(--accent)`, `margin-top: 0.6rem`, `padding: 0.6rem 0.8rem`, `background: var(--accent-bg)`, `border-radius: 4px`. Single block — message + next-step in the same paragraph.
  - `.repo-fetcher__warn` — same chrome as `.repo-fetcher__error` but `color: var(--warn)` and `background: rgba(138, 105, 20, 0.08)` (warn color in semi-transparent form; matches the existing `--accent-bg` pattern).
  - `.btn-link` (or `.repo-fetcher__source button` if you prefer scoping) — `background: transparent`, `border: 0`, `color: var(--accent)`, `padding: 0`, `margin: 0 0.4rem`, `font-size: inherit`, `text-decoration: underline`, `cursor: pointer`. Hover/focus → `color: var(--accent-soft)`. This is the lighter inline-button style for Refresh / Clear repo data.
  - `.repo-fetcher__hint` — reuse `.settings-dialog__hint` styling if practical (`font-size: 0.82rem; color: var(--ink-mute)`) or duplicate the rules under a new selector.
- **PATTERN**: Existing `.persona-card`/`.persona-field` (lines 671–724) for input/card chrome. Reuse `.persona-field` for the URL input wrapper — don't duplicate.
- **GOTCHA — dark mode**: `var(--bg-elev)`, `var(--rule)`, `var(--accent)`, `var(--accent-bg)`, `var(--warn)` already adapt under `[data-theme="dark"]`. Don't add `[data-theme="dark"]` overrides.
- **GOTCHA — mobile**: At 375px, the `.repo-fetcher` card should be edge-to-edge inside the existing main container — `padding: 1rem` is enough. Add a `@media (max-width: 600px)` block reducing padding if visual check shows it's cramped.
- **VALIDATE**: `npm run format:check` passes (Prettier may not lint CSS — verify); visual check at 375px and at desktop in both themes.

### Task 7 — UPDATE `src/pages/YourPicture.tsx`

- **IMPLEMENT**: Insert `<RepoFetcher />` between the `<p className="lede">` block (line 35) and `<PersonaCard />` (line 36). Add a 1-line intro paragraph above `<RepoFetcher />`:
  > "Have a GitHub repo for this project? Paste the URL and we'll fill in the fields below from your repo's metadata. Otherwise, fill them in manually."
- **PATTERN**: The existing structure on lines 27–62 — no special wrappers; components stack directly under `<></>`.
- **IMPORTS**: Add `import RepoFetcher from '../components/RepoFetcher';`.
- **GOTCHA**: Do **not** remove `<PersonaCard />`. The fetcher is *additive* — the card still owns manual edits, and users without a GitHub URL (or with a private repo behind a corporate firewall) still need the manual form.
- **GOTCHA**: Don't change the section number (`03`) or the H1 — content is ported verbatim, this is only adding a new affordance.
- **VALIDATE**: `npm run build` passes. Manual: load `#/your-picture`, see the fetcher above the personalize card, see the lede paragraph unchanged.

### Task 8 — Manual validation pass

- **IMPLEMENT**: Full acceptance walk (see Validation Commands → Level 4). Document any deviations.
- **VALIDATE**: All Acceptance Criteria boxes below check.

### Task 9 — UPDATE `ROADMAP.md` (optional)

- **IMPLEMENT**: Add a single bullet under v3.1+ for "Multi-repo cache (per-URL keys)" — captures the future need without expanding v3.0 scope.
- **VALIDATE**: `npm run format:check`.

### Task 10 — Handoff doc (after validation passes)

- **IMPLEMENT**: Write `.agents/handoff/capability-b-github-fetch.md` mirroring the format of `.agents/handoff/capability-a-settings.md`. Cover: what was built, files changed, acceptance status, deviations from plan, TODOs.
- **VALIDATE**: Manual inspection.

### Task 11 — Commit

- **IMPLEMENT**: Per `CLAUDE.md` workflow tree, run `/code-review` first, then `/commit`. Suggested message: `feat: add GitHub repo fetch (Capability B)`.
- **VALIDATE**: `git status` shows clean working tree post-commit.

---

## TESTING STRATEGY

The project has no test framework wired (no `jest`, `vitest`, or test script in `package.json`). Validation for this feature is **type-check + lint + format + manual**. Adding a test framework is out of scope per `CLAUDE.md`.

### Unit Tests

None — no framework. (`parseRepoUrl` is unit-testable in spirit; if a future capability adds Vitest, this is the first function to test.)

### Integration Tests

None — no framework.

### Edge Cases (manual)

- **Public repo, no PAT**: Default. `coleam00/helpline` should fetch successfully and populate persona (Python primary, some TypeScript).
- **Private repo, valid PAT**: One of the owner's private repos. Fetch succeeds; persona populates.
- **Private repo, no PAT**: Error `kind: 'not-found'` (GitHub returns 404 for private repos to unauthenticated requests, intentionally). Message clear, next step says "add a PAT in Settings."
- **Invalid PAT**: Make the PAT non-empty but garbage. Error `kind: 'unauthorized'`. Message clear.
- **Rate limited**: Hard to trigger without 60+ unauthenticated calls. Manual: temporarily edit `mapGithubError` to short-circuit to `kind: 'rate-limit'`, verify the UI renders correctly, revert.
- **Invalid URL**: Empty string, `gibberish`, `https://gitlab.com/owner/repo`, `https://github.com/onlyowner`. Each rejected at parse time, error `kind: 'invalid-url'`.
- **Repo with no README**: One of the owner's repos without a README (or a freshly-init'd one). `readme: null` after fetch; no error surfaced.
- **Repo with non-ASCII README**: One whose README contains an em-dash, emoji, or non-Latin script. `decodeBase64Readme` returns valid UTF-8.
- **Tree truncation**: A very large repo. `repo.treeTruncated === true`; the soft warning renders.
- **`/tree/branch` suffix in URL**: `https://github.com/owner/repo/tree/main`. Parser strips correctly to `{ owner, repo }`.
- **`.git` suffix in URL**: `https://github.com/owner/repo.git`. Parser strips correctly.
- **SSH URL**: `git@github.com:owner/repo.git`. Parser handles.
- **Bare URL**: `owner/repo`. Parser handles.
- **Refresh stale cache**: With a cached repo, click Refresh. Network call fires; new `fetchedAt` written.
- **Clear repo data**: Wipes `aiLayer.repo`; persona stays whatever it was (don't clear persona on repo clear — that's a separate concern).
- **Settings clear-all**: From `SettingsDialog`, "Clear all keys & settings" must also wipe `aiLayer.repo` (it does, via the `Object.values(STORAGE_KEYS)` loop — verify).
- **Storage unavailable** (private browsing): Setter no-ops; in-memory state still updates for the session.
- **Corrupted cache blob**: Hand-edit `aiLayer.repo` to invalid JSON → reload → app boots with `repo === null`, fetcher shows the empty URL field.
- **Partial cache blob**: Hand-edit `aiLayer.repo` to `{"owner": "x"}` → reload → `parseStored` returns `null` (strict). Verify.
- **Mobile (375px)**: Fetcher card fits, URL input doesn't overflow, error block wraps, action buttons stack if needed.
- **Dark mode**: Every element legible; accent and warn colors visible.
- **Console hygiene**: Walk the entire flow with DevTools → Console open. Zero errors. Zero warnings. No PAT-shaped string in console history.
- **Network hygiene**: DevTools → Network → search for `Bearer` in request headers — only on requests to `api.github.com`. Zero leakage to any other host.

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

- [ ] Navigate to `#/your-picture`. RepoFetcher card visible above the existing Personalize card.
- [ ] Paste `https://github.com/coleam00/helpline` → click Fetch → status shows "Fetching from GitHub…" → resolves within ~3s → "Filled from coleam00/helpline" line appears with link, Refresh, and Clear repo data actions.
- [ ] PersonaCard fields auto-update: `repoName` = "helpline", `languages` contain Python (and likely TypeScript), `topLevelDirs` lists the root folders.
- [ ] Persona templates throughout the workbook (`<TplRepo />`) now show "helpline" wherever they appear. Visit a Phase page to confirm.
- [ ] Click Refresh. Network call fires. `repo.fetchedAt` updates in DevTools → Application → Local Storage → `aiLayer.repo`.
- [ ] Click "Clear repo data". `aiLayer.repo` removed from Local Storage. URL field empties. PersonaCard fields are *not* reset (they keep the last applied values — by design).
- [ ] Paste `gibberish` → Fetch button enabled (URL non-empty) → click → error `kind: 'invalid-url'` shown with next step.
- [ ] Paste `https://github.com/coleam00/this-repo-does-not-exist` → click → error `kind: 'not-found'` shown.
- [ ] In Settings, set GitHub PAT to a real but invalid string (e.g. `github_pat_xxxxx`). Try a private repo URL → error `kind: 'unauthorized'`. Message contains no part of the PAT.
- [ ] In Settings, set a valid PAT with `repo` scope. Try the same private repo → success.
- [ ] In Settings → "Clear all keys & settings" → Confirm. Reload. `aiLayer.repo` is gone alongside `aiLayer.settings`, etc.
- [ ] Both key inputs in Settings remain `type="password"`. URL input in RepoFetcher is `type="text"` (URL is not a secret).
- [ ] DevTools → Network → all `api.github.com` requests include `Authorization: Bearer …` only when a PAT is set; never include the PAT in the response or in any non-`api.github.com` host's request.
- [ ] DevTools → Console → after a full walk: search history for `Bearer`, `github_pat`, and the actual PAT value — zero matches outside the input element's masked `value`.
- [ ] DevTools → Application → Local Storage → `aiLayer.repo` blob contains the fetched repo data as plain JSON. Does NOT contain the PAT or the Authorization header.
- [ ] Resize to 375px. RepoFetcher card readable, no horizontal scroll, error block wraps.
- [ ] Toggle dark mode. Card visible, error and warn colors readable.
- [ ] Mid-fetch click Refresh again → previous fetch's AbortController fires (verify in Network tab: original request shows `(canceled)`).
- [ ] Mid-fetch navigate away from `#/your-picture` → fetch cancels cleanly (no console error from a setState-after-unmount).
- [ ] Console: zero errors and zero warnings during the full walkthrough.
- [ ] Zero regressions in Capability A (open Settings dialog, save keys, close, reopen — all still works).
- [ ] Zero regressions in PersonaCard manual edit: with no repo fetched, hand-type a repo name, click Apply, refresh page — `<TplRepo />` shows the manual name.

### Level 5: Additional Validation (Optional)

If `mcp__playwright__*` is available, automate the fetch + persona-sync walkthrough against `coleam00/helpline`. Not required for v1.

---

## ACCEPTANCE CRITERIA

From `Docs/ai-layer-workbook-claude-code-handoff.md` §4 + §14 + this plan:

- [ ] URL paste field accepts and parses `https://github.com/owner/repo`, `git@github.com:owner/repo`, bare `owner/repo`, with or without `.git` suffix, with or without `/tree/branch` suffix.
- [ ] Fetch pulls repo metadata, top languages, recursive tree (depth ≤ 3), and README — in one click — using the stored PAT if present.
- [ ] Persona fields (`repoName`, `languages`, `layout`, `topLevelDirs`) auto-populate from the fetched data on success.
- [ ] User can still override any persona field by hand in `<PersonaCard>`.
- [ ] Fetched data cached in `localStorage` under `aiLayer.repo` with a timestamp.
- [ ] "Refresh from GitHub" button refetches and updates the cache.
- [ ] "Clear repo data" button wipes only `aiLayer.repo` (not persona, not settings).
- [ ] "Clear all keys & settings" in Settings also wipes `aiLayer.repo` (via the existing `Object.values(STORAGE_KEYS)` loop).
- [ ] Errors are explicit and user-actionable: invalid URL, 401, 403/rate-limit, 403/private-no-PAT, 404, network.
- [ ] No PAT appears in console logs, network requests to any host other than `api.github.com`, thrown errors, ARIA labels, titles, placeholders, error messages, or any DOM attribute other than the controlled `value` of the password input in Settings.
- [ ] No new npm dependencies (no octokit).
- [ ] Mobile-usable at 375px: no horizontal scroll, every control reachable, error block wraps.
- [ ] `npx tsc -b`, `npm run lint`, `npm run format:check`, `npm run build` all exit 0.
- [ ] Zero regressions in Settings (Capability A), PersonaCard manual edits, persona templates, theme, agent picker, mobile drawer, glossary popup, navigation.

---

## COMPLETION CHECKLIST

- [ ] All 11 tasks completed in order.
- [ ] Each task's `VALIDATE` step passed before moving to the next.
- [ ] All Level 1 commands exit 0.
- [ ] Level 4 manual walkthrough — every checkbox green.
- [ ] All Acceptance Criteria met.
- [ ] No console errors or warnings.
- [ ] No new npm dependencies introduced.
- [ ] No `console.log`/`console.error`/`console.warn`/`console.debug` calls in new code.
- [ ] Secret-grep of changed files: `grep -rE "github_pat|Bearer .+[a-z0-9]" src/` returns ZERO matches outside the placeholder `github_pat_…` (Unicode ellipsis) in `SettingsDialog.tsx` (already shipped).
- [ ] Code reviewed via `/code-review`.
- [ ] `.agents/handoff/capability-b-github-fetch.md` written.
- [ ] Ready to commit with message `feat: add GitHub repo fetch (Capability B)`.

---

## NOTES

**Design decisions:**

1. **Why hand-rolled `fetch` instead of `octokit`** — Four endpoints, all GETs, simple JSON shapes. Octokit adds ~50KB to a static bundle for marginal ergonomic benefit. The handoff brief (§5) explicitly accepts hand-rolled.

2. **Why one cached repo, not per-URL caching** — v3.0's mental model is "the user has one repo right now." The brief's wording ("cache fetched data in localStorage with a per-repo key") could support either, but per-URL caching adds a stale-cache-eviction problem (when does the user's old repo get garbage-collected?). Single-slot cache with explicit "Refresh" and "Clear repo data" buttons is simpler and matches how the persona state works. Per-URL caching is in `ROADMAP.md` for v3.1+.

3. **Why `useRepo` separate from `usePersona`** — Two different lifecycles. Persona is hand-editable, survives forever, has a sentinel default (`'your-repo'`). Repo is fetched, snapshot-y, easily refreshed, and meaningfully `null` (no repo cached yet). One hook would force `null` semantics onto persona or sentinel semantics onto repo. Separate hooks are clearer.

4. **Why auto-populate persona on fetch, not "Apply detected values" gated** — The brief says "auto-populate" + "let the user override." The PersonaCard is right below and re-syncs (Task 5). The "Filled from owner/repo" line makes the source visible. A gated Apply button would be an extra click for the default case (which is "yes, please apply"). If owner pushes back, change `onFetch` to defer the `setPersona` call behind an "Apply detected values" button — trivial edit.

5. **Why `Authorization: Bearer <PAT>` not `Authorization: token <PAT>`** — Both are accepted by GitHub. `Bearer` is the modern form, matches OAuth 2.0 semantics, and is what current GitHub docs recommend. No functional difference; future-proof to write Bearer.

6. **Why `JavaScript → 'typescript'` in the language map** — `LANGUAGE_OPTIONS` (PersonaCard:4–14) doesn't separate them. JS-stack work in the workbook largely uses TypeScript patterns. Mapping JS to `'other'` would feel wrong for a Next.js or Express user. If owner objects, swap to `'other'` — one-line edit.

7. **Why no "Generate model" / "Fast model" UI here** — Those live in Settings (Capability A). RepoFetcher only consumes the PAT. Avoids cross-capability coupling.

8. **Why no PR-style code-review of `mapGithubError`'s `_pat` parameter at runtime** — TypeScript can't enforce "this string never appears in returns." The `_pat` prefix is the visual marker for code-review attention. A future change to grep CI could enforce it.

**Risks:**

- **GitHub API drift**: `X-GitHub-Api-Version: 2022-11-28` is current as of January 2026. Per `CLAUDE.md` "Trust but verify", confirm against [docs.github.com](https://docs.github.com/en/rest/about-the-rest-api/api-versions) at implementation time. Header name change → all four endpoints break uniformly with a clear error.
- **CORS**: `api.github.com` is browser-accessible by default; no opt-in header needed (unlike Anthropic's `anthropic-dangerous-direct-browser-access`). If GitHub ever tightens this, the proxy-less model breaks — a stop-the-world architecture decision for the project.
- **`atob` UTF-8 fragility**: `decodeBase64Readme` uses the `Uint8Array` + `TextDecoder` path because plain `atob(...)` mangles multi-byte chars. Test with a non-ASCII README before declaring done.
- **Persona over-write**: A fetch silently replaces whatever the user typed in PersonaCard. The intro copy makes this explicit but it's still a user-surprise risk. If owner objects, gate behind an Apply button (see Design Decision 4).
- **Tree truncation**: For repos >100k entries, GitHub's recursive tree endpoint returns `truncated: true` and a partial result. The plan surfaces this with a soft warning and doesn't paginate. If a Dynamous user has a monorepo bigger than that, the auto-detect for layout/folders is partial. Acceptable for v1; document in `ROADMAP.md` if needed.
- **README size**: GitHub returns the README inline. For huge READMEs (megabytes) the `localStorage` blob bloats. `localStorage` is typically 5–10MB per origin — single big README is fine. If C1 ever sends the full README to Anthropic, that's where the size constraint will bite, not here.

**Confidence score**: **8/10** for one-pass success. The unknowns are CSS judgment (fit of the new card next to the existing PersonaCard, mobile breakpoint at exactly 375px) and the small PersonaCard `useEffect` re-sync (Task 5) — there's a low but non-zero chance it interacts badly with the existing inline `useState(persona.repoName === 'your-repo' ? '' : persona.repoName)` initializer on a corner case. Everything else (fetch, parse, cache, error mapping, persona derivation, ARIA, integration) is paint-by-numbers off the cited patterns.
