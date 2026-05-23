# Handoff: capability-c1-audit

**Plan:** `.agents/plans/capability-c1-audit.md`
**Built:** Audit-my-repo card on Phase 2 that streams a structured JSON audit of the user's GitHub repo from Anthropic with their stored key, renders findings as severity-chipped cards as they materialize, persists the result to `localStorage`, and offers Copy-as-markdown + Refetch + mid-stream Stop. First L3 capability — the SSE parser, error mapper, pricing table, and prompt-builder are shared infrastructure C2/C3/C4 will reuse.

**Files changed:** 3 modified, 8 added. Highlights:
- `src/lib/anthropic.ts` — pure-function streaming wrapper: `streamAudit`, `parseSSEStream`, `mapAnthropicError(res, _key)`, `tryParsePartialFindings`, finding/error type guards. Hand-rolled fetch + SSE, no SDK.
- `src/lib/audit-prompt.ts` — `buildAuditSystemPrompt(agent)` + `buildAuditUserMessage(repo)` with a 20 KB body cap and tree-snip fallback.
- `src/lib/tree-denoise.ts` — `denoiseTree` blocklist (node_modules, dist, lockfiles, …) + UTF-8-safe `truncateReadme`.
- `src/lib/pricing.ts` — per-MTok rates for Opus/Sonnet/Haiku, `estimateCostUsd`, `formatUsd`. Header comment flags re-verify at every model addition.
- `src/hooks/useAudit.ts` — single-slot persisted cache mirroring `useRepo.ts`'s strict `parseStored` + `LISTENERS` broadcast.
- `src/components/AuditCard.tsx` — 4-state primary button, AbortController abort-before-assign, progressive partial-JSON render, raw-text fallback, staleness banner, Copy-as-markdown, model+cost line.
- `src/pages/Phase2.tsx` — inserted card between the discoveryPrompt CodeBlock and "Step 3" with a one-sentence intro; existing copy untouched.
- `src/lib/storage-keys.ts` — added `audit: 'aiLayer.audit'`; existing `Object.values(STORAGE_KEYS)` wipe in `SettingsDialog` picks it up automatically.
- `src/styles/globals.css` — appended `.audit-card*`, `.severity-chip*`, `.finding-card*` rules + 600px mobile breakpoint. Reused `.repo-fetcher__link-btn` selector to share styling with `.audit-card__link-btn`.

**Acceptance status:**
- ✓ Level-1 validation: `tsc -b`, `eslint`, `prettier --check`, `vite build` all exit 0.
- ✓ Secret-grep clean: only the `x-api-key` header construction in `src/lib/anthropic.ts`, the user-facing privacy explainer copy in `AuditCard.tsx`, and the pre-existing `Bearer ${pat}` in `github.ts`. No `console.*` in new code.
- ✓ CORS header re-verified against current Anthropic TypeScript SDK source — `anthropic-dangerous-direct-browser-access: true` is current.
- ✓ SSE event shape re-verified against docs.claude.com — `message_start.message.usage.input_tokens`, `content_block_delta.delta.{type:'text_delta',text}`, `message_delta.usage.output_tokens` (cumulative), `message_stop` terminal.
- ⏸ Level-4 manual walkthrough (live Anthropic call against `coleam00/helpline`, error walkthroughs, mobile + dark-mode passes) deferred to the next session — owner runs with their key.

**Deviations from plan:** `AuditCard` accumulates streamed text in a `useRef` (`streamTextRef`) instead of a `useState<string>` — the value is never read in render, only by the partial parser, so the ref avoids an unused-state TS error and a re-render per token. Also added a "Clear audit" link-button to the action row (not in the plan's render list) for symmetry with `RepoFetcher`'s "Clear repo data".

**Refetch UX choice:** Plan task 8 left "preserve old cards until first new finding arrives" vs. "clear immediately" as defensible alternatives. C1 picks **clear-on-click** — `displayFindings = streaming ? streamFindings : (audit?.findings ?? [])`, so the cache disappears for the ~1–2s before the first new finding parses. Reasoning: aligns with the "Stop" + "Clear audit" semantics (both wipe the in-flight UI), and the staleness banner already handles the "I want to see the old result alongside the new" case. Switch by gating on `streamFindings.length > 0` if the empty gap proves jarring.

**TODOs left in code:** One: `pricing.ts` carries a `// TODO: add rate for new model` reminder inside `estimateCostUsd` when `MODEL_RATES[model]` is undefined (it returns 0 rather than throwing).
