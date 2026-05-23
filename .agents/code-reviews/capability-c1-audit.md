# Code Review — Capability C1 (Audit my repo)

**Scope:** Diff vs. `HEAD` plus 8 new files listed in `.agents/handoff/capability-c1-audit.md`. Compared against the plan at `.agents/plans/capability-c1-audit.md`, the non-negotiable constraints in `CLAUDE.md`, and the sibling references in `src/lib/github.ts`, `src/hooks/useRepo.ts`, and `src/components/RepoFetcher.tsx`.

**Stats:**

- Files Modified: 3 (`src/lib/storage-keys.ts`, `src/pages/Phase2.tsx`, `src/styles/globals.css`)
- Files Added: 8 (`src/lib/anthropic.ts`, `src/lib/audit-prompt.ts`, `src/lib/pricing.ts`, `src/lib/tree-denoise.ts`, `src/hooks/useAudit.ts`, `src/components/AuditCard.tsx`, `src/components/FindingCard.tsx`, `src/components/SeverityChip.tsx`)
- Files Deleted: 0
- New lines: ~700 (diffstat counts the CSS-only modify; new files add ~520 lines of TS/TSX)
- Deleted lines: ~2

**Pre-flight validation (Level 1):**

- `npx tsc -b` → exit 0
- `npm run lint` → exit 0
- `grep -rnE 'sk-ant-|x-api-key|Authorization|Bearer' src/` → 4 matches, all expected (`SettingsDialog.tsx` placeholder, `github.ts` Authorization header, `anthropic.ts` `x-api-key` header construction, `AuditCard.tsx` privacy explainer copy). No leakage outside intended sites.
- `grep -rn 'console\.' src/...` on the 8 new files → zero matches. The key-safety invariant holds.

Overall the diff matches the plan closely — the SSE parser, the `_key` forbidden-fruit marker on `mapAnthropicError`, the strict `parseStored` in `useAudit`, the four-state button machine, the abort-before-assign pattern in `onRun`, and the CSS-variable-only styling all mirror the references in `github.ts` / `useRepo.ts` / `RepoFetcher.tsx`. The handoff is accurate about deviations (`useRef` for stream text, the added "Clear audit" link-button).

---

## Findings

```
severity: medium
file: src/components/AuditCard.tsx
line: 202-213
issue: A successful empty audit ({"findings": []}) renders as the "couldn't structure this output" fallback instead of an empty state
detail:
  When the model returns valid JSON with no findings, `parsed = []` after `isFindingsArray([])` returns true, and `setAudit({ findings: [], rawText: '{"findings":[]}', ... })` runs. In render, `showFallback` is `findings.length === 0 && rawText.length > 0 && rawText.includes('{')` — all three are true, so the fallback block fires with the raw JSON on screen plus "We couldn't structure the audit output." The user paid tokens, got a legitimate "I have nothing to say" answer, and is told the model failed.
  The plan's task-8 gotcha tries to handle this via the `!rawText.includes('{')` branch on `showEmpty`, but that branch is unreachable for a model that returned a well-formed JSON body (which is the common case). The real signal — "JSON parsed cleanly to an empty array" vs. "JSON parse failed" — is lost in `onComplete` because both produce `parsed = []`.
suggestion:
  Track parse success explicitly. Either:
  (a) extend `Audit` with `parseOk: boolean` set by `onComplete` and switch `showFallback`/`showEmpty` on that flag, or
  (b) when JSON parse succeeds, write `rawText: ''` (so the empty-state branch fires because `rawText` is empty rather than because it lacks `{`).
  Option (b) is the smaller diff and matches the intent of "rawText is for the fallback path only."
```

```
severity: medium
file: src/lib/anthropic.ts
line: 341-348
issue: An in-stream `error` event triggers `onError` but the SSE loop keeps reading
detail:
  When Anthropic emits an `event: error` mid-stream, the switch case calls `callbacks.onError({ kind: 'invalid-response', ... })` and falls through. The outer `await parseSSEStream(...)` continues consuming the body — meaning subsequent `content_block_delta` or `message_stop` events could fire `onTextDelta` / `onComplete` *after* the error has already been surfaced. The component would then race: `onError` sets `status: 'idle'` and `error`, but a trailing `onComplete` would overwrite `status` and call `setAudit(...)`, persisting an audit the user just saw an error for.
  In practice Anthropic closes the stream right after `error`, so it's rare, but a misbehaving proxy or a partial transcript could exercise the path.
suggestion:
  After invoking `onError` for the stream-error case, set a `gotError = true` flag in `streamAudit`'s scope and guard the subsequent `content_block_delta` / `message_stop` cases on it. Alternatively, throw inside the switch case to break out of the SSE loop and let the existing outer catch swallow it (but the current catch maps to `invalid-response`, which double-fires `onError` — so flag-based short-circuit is cleaner).
```

```
severity: low
file: src/lib/audit-prompt.ts
line: 85
issue: `body.replace(denoisedTree, shorterTree)` interprets `$` in `shorterTree` as a replacement pattern
detail:
  `String.prototype.replace(stringPattern, stringReplacement)` does NOT treat the pattern as a regex, but it DOES treat the replacement as a pattern with `$&`, `$1`, `$$` etc. If a file path in the denoised tree contains a literal `$` (uncommon but legal — e.g. `webpack$.config.ts`), the result is mangled because `$` plus a following char gets interpreted (`$&` would expand to the whole matched substring).
  Real-world impact is minor — `$` in repo paths is rare — but the cap-busting branch only fires on huge repos, which is exactly the population most likely to have unusual files.
suggestion:
  Skip the round-trip: build `shorterTree` first, then construct `body` directly using `shorterTree`, instead of building `body` once and string-replacing. Or use the `String.prototype.replaceAll` overload with a function replacer (immune to `$` parsing).
```

```
severity: low
file: src/components/AuditCard.tsx
line: 138-145
issue: `onError` doesn't clear `streamFindings`, so a partial card render lingers alongside the error message
detail:
  When the stream fails mid-flight (e.g., a 429 received via headers after `message_start` but no actual valid `error` SSE — uncommon but possible if a load-balancer kills the connection), the component flips to `idle` and shows the error block, but any partial finding cards that already parsed remain on screen. The visual result is "here's an error" + "and also here are three half-baked cards from the run that just failed", which is confusing.
  This is the inverse of the `onStop` handler, which correctly clears both streamTextRef and streamFindings.
suggestion:
  In the `onError` callback, also reset `streamTextRef.current = ''` and `setStreamFindings([])`. Match `onStop`.
```

```
severity: low
file: src/components/AuditCard.tsx
line: 37-42
issue: `openSettings()` reaches across components by id — brittle and silently no-ops on mismatch
detail:
  The plan flags this as intentional and pragmatic for v1, which is fair — but the call site has no fallback when `getElementById` returns null (e.g., the `Topbar` is conditionally rendered, or a future refactor changes the id). The user clicks "Settings" in the hint, nothing happens, no log, no console message.
  The `instanceof HTMLButtonElement` narrowing additionally means that if the element ever becomes an `<a>` (router link) the check silently fails.
suggestion:
  Optional but cheap: if the lookup fails, fall back to scrolling to / focusing the topbar, or render a `<Link to="/?openSettings=1">` and have the topbar honor a query param. Defer to C2 if no other component needs it yet, but leave a `// TODO: lift Settings open-state into context` comment at the call site so the next maintainer doesn't have to derive the rationale.
```

```
severity: low
file: src/lib/pricing.ts
line: 22
issue: Silently returning 0 when `MODEL_RATES[model]` is undefined is unreachable as written, but the comment implies otherwise
detail:
  Because `MODEL_RATES` is typed `Record<GenerateModel | FastModel, ModelRate>` and the parameter is also `GenerateModel | FastModel`, TypeScript prevents any caller from passing an unknown model — and adding a new model literal to `models.ts` will fail compilation here until a rate is added. The `if (!rate) return 0; // TODO: add rate for new model` branch can never execute, making the TODO misleading: it suggests pricing.ts gracefully handles new models when in fact compilation forces the maintainer to update.
suggestion:
  Either widen the parameter to `string` (and keep the guard as a real defensive path), or remove the dead branch and replace the comment with: `// Adding a new GenerateModel/FastModel here is required — TS will fail to compile until you do.` The current form documents an invariant that doesn't exist.
```

```
severity: low
file: src/hooks/useAudit.ts
line: 22-45
issue: `parseStored` accepts a stored audit whose `repoFetchedAt` no longer matches the current `useRepo` blob
detail:
  Not a bug per se — the staleness banner in AuditCard handles the `repoOwner`/`repoName` mismatch case explicitly. But `repoFetchedAt` is stored without ever being read by the consumer: AuditCard only checks owner/name. If `useRepo` is refetched (same repo, fresh fetchedAt), the stored audit is now stale-against-current-tree but the UI shows it as fresh because owner/name match.
  This is a roadmap item, not a fix — but the field's presence implies it's used somewhere.
suggestion:
  Either consume it (extend the staleness check to compare `audit.repoFetchedAt < repo.fetchedAt` → "your repo was re-fetched since this audit ran. Refetch?"), or drop the field with a comment that it was intentionally deferred. Storing dead data invites later surprise.
```

```
severity: low
file: src/components/AuditCard.tsx
line: 150-151
issue: The `aborted` local + dead post-await branch reads as defensive code that can never fire
detail:
  `aborted` is only set to true inside `onComplete` / `onError` when `controller.signal.aborted` is true. But `controller.abort()` is called either from (a) the cleanup useEffect on unmount — in which case the component is gone and `if (aborted) return;` is moot, or (b) a fresh `onRun` invocation — in which case the new controller has replaced `abortRef.current` and the old `streamAudit` is racing to finish. In practice the abort causes the in-flight `fetch` to reject with `AbortError`, which `streamAudit` swallows at line 280 before any callback fires.
  Result: `aborted` rarely if ever flips true, and the post-await `if (aborted) return;` is essentially unreachable.
suggestion:
  Either remove the dead branch (and the `aborted` local), or document why the defensive check is kept. Reads cleaner without it.
```

```
severity: low
file: src/components/AuditCard.tsx
line: 200
issue: Mid-stream Refetch hides any previously cached findings until the first new finding parses
detail:
  `displayFindings = streaming ? streamFindings : (audit?.findings ?? [])`. When the user clicks "Refetch audit", `streaming` flips to true, `streamFindings` resets to `[]`, and the previous cached cards disappear for the ~1–2 seconds before the first new finding parses. The plan task-8 explicitly calls this out as one of two defensible options ("Refetch... existing cards stay rendered until the first new finding parses, then progressively replaced. (Alternative behavior: clear cards on click...)") so this is consciously the second option — but the handoff doc doesn't document which was chosen.
suggestion:
  No code change needed if intentional. Add one line to the handoff under "Deviations" noting the explicit choice (clear-on-click). If you want the gentler UX, change to `streaming && streamFindings.length > 0 ? streamFindings : (audit?.findings ?? [])` so the cache survives until the first new finding lands.
```

```
severity: low
file: src/lib/anthropic.ts
line: 96
issue: Trailing-fence strip is anchored to end-of-string — won't help during streaming
detail:
  `text.replace(/```$/i, '')` only matches at the literal end of the string. During streaming, `text` ends in the most recently-arrived token, not in a closing fence. The strip is harmless but contributes nothing to the progressive parse — it only does work on the final pass in `onComplete` (which is duplicated there). The leading-fence strip *does* matter during streaming.
suggestion:
  Drop the trailing-fence strip in `tryParsePartialFindings` (keep it in the `onComplete` cleanup), or change the regex to match a fence wherever it falls (`/\n```\s*$/`). Cosmetic — leaving as-is is fine.
```

```
severity: low
file: src/styles/globals.css
line: 1351 (audit-card__error)
issue: The error block uses `var(--accent)` text on `var(--accent-bg)` — same palette as the .severity-chip--high chip
detail:
  Visually fine on light mode (terracotta-on-cream). In dark mode, `--accent` is the same warm hue against a darker `--accent-bg`, but a sustained-paragraph block in the accent color reads as a "high-severity finding" rather than as an error, especially given the same chip styling on findings cards 12 lines below. Worth confirming in the dark-mode manual pass (Level 4 item, owner-deferred).
suggestion:
  No change required if owner approves the look. If not, swap to a dedicated `--danger`/`--err` token (the existing palette includes `--warn`, which would distinguish errors from severity chips).
```

---

## Re-verified per "Trust but verify"

- The CORS header `anthropic-dangerous-direct-browser-access: true` is correct per the handoff's January 2026 docs check. Owner should re-verify at first live call (Level 4, deferred).
- Anthropic SSE event field paths (`message_start.message.usage.input_tokens`, `content_block_delta.delta.{type, text}`, `message_delta.usage.output_tokens`) match handoff Appendix C and the plan's reference.
- Pricing in `pricing.ts` matches the plan's note for 2026-05.

---

## Not flagged (verified clean)

- API-key handling: key is read from `settings.anthropicKey`, sent only as the `x-api-key` header on `fetch('https://api.anthropic.com/v1/messages', ...)`, never logged, never included in `AnthropicError.message`/`.next`, never stored anywhere except `aiLayer.settings` (Capability A's territory). `mapAnthropicError(res, params.apiKey)` passes the key by symmetry only; the body of the function never reads `_key`.
- Race-safety: `onRun` calls `abortRef.current?.abort()` *before* assigning a fresh `AbortController`, matching the `RepoFetcher.tsx:36–38` pattern verbatim.
- Cleanup: `useEffect(() => () => { abortRef.current?.abort(); clearTimeout(copyTimeoutRef.current); }, [])` correctly aborts on unmount and clears the copy-state timer.
- React-key collisions: `<FindingCard key={f.id}>` relies on model-supplied ids being unique. The plan explicitly accepts this; not a v1 bug.
- Storage clear-all: `STORAGE_KEYS.audit` is included in `Object.values(STORAGE_KEYS)` which `SettingsDialog`'s clear-all loop iterates — confirmed by reading `storage-keys.ts:1–9`.
- Markdown table escaping: pipes (`\|`) and newlines (` `) escaped in body cells (`AuditCard.tsx:24–35`).
- UTF-8-safe README truncation (`tree-denoise.ts:54–61`).
- No new npm dependencies.
- Mobile breakpoint at 600px covers the 375px target.
- CSS uses vars-only, no literal hex (dark-mode-safe).

---

## Summary

Three medium-or-impactful issues:

1. **Empty `findings: []` falls into the fallback render branch** (`AuditCard.tsx:202`) — track parse success explicitly.
2. **Stream-internal `error` event doesn't short-circuit the SSE loop** (`anthropic.ts:341`) — add a flag so subsequent events don't double-fire.
3. **`$` in `body.replace(denoisedTree, shorterTree)`** (`audit-prompt.ts:85`) — replace-with-string-pattern footgun.

Everything else is either documented in the plan, cosmetic, or intentional. The capability is well-aligned with the plan's structure, the v3 constraints (no backend, no key leakage, mobile-first, vars-only CSS), and the patterns set by Capabilities A and B. Code review passes pending the three medium fixes.
