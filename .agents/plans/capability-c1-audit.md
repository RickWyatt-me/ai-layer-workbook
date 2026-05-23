# Feature: Capability C1 — Audit my repo

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Add the first Level-3 (live AI) capability to the workbook: an "Audit my repo" card on Phase 2 — Discovery (`Phase2.tsx`). The user clicks one button; the browser calls the Anthropic Messages API directly with their stored key, streams a structured JSON discovery audit of their already-fetched GitHub repo, and renders the findings inline as severity-chipped cards as they materialize. Output is persisted to `localStorage` so a page refresh shows the same audit without re-spending tokens. A "Copy as markdown" button reproduces the v1-handoff-compatible discovery table (`Area | Severity | Body | Next step`). A "Refetch audit" button wipes the cache and re-runs.

This is **Capability C1** in the locked feature order (`CLAUDE.md` resolved decision 6). It ships standalone between Capability B (GitHub fetch — done in commit `b4a4f4e`) and C2 (Draft my root CLAUDE.md). It is the first capability to call the Anthropic API and therefore sets the patterns C2/C3/C4 will reuse: streaming SSE parser, key-safe error mapping, mid-stream abort, structured-output validation, token + cost display, prompt-builder library.

## User Story

As a non-technical-but-capable builder who's pasted my GitHub repo into the workbook
I want to click one button and have my agent's recommended CLAUDE.md placement audit appear in-page, tailored to **my** code
So that I don't have to leave the workbook, open my local agent, copy a generic prompt, paste my repo context by hand, and then come back to interpret the result — the workbook does the legwork and gives me a structured starting point I can take to my local agent for the actual file creation

## Problem Statement

After Capability B, the workbook *knows* the user's repo (description, languages, tree, README) but does nothing with it beyond auto-filling personalize fields. The v1 workbook's Phase 2 still tells the user to copy-paste a generic discovery prompt into their local agent. For a Level-3 product, that's a missed beat: the workbook has both the user's API key (Capability A) and the user's repo context (Capability B), so it should produce the discovery audit *right there in the page* and hand the user a structured result — not a recipe.

Three constraints make this non-trivial:

1. **No backend, ever.** Every byte of the Anthropic call originates in the browser. The Anthropic key never leaves `localStorage` except as an `x-api-key` header to `api.anthropic.com`. Error handling, streaming, abort, and cost display are all the client's problem.
2. **Trust.** The Anthropic key is more sensitive than the GitHub PAT (it directly costs money on misuse). It must never appear in console, errors, ARIA labels, or any DOM attribute outside the password input's `value` in `SettingsDialog`. Mirrors Capability A/B's invariants but with a higher bar — repo data is shareable; the key is not.
3. **Model drift.** Even with a strict system prompt, the model will occasionally return prose preamble, a markdown fence, an extra trailing comma, or a slightly different field name. The UI must (a) render progressively as the stream arrives, (b) be tolerant of partial / malformed-in-flight JSON, and (c) gracefully degrade to a "raw text fallback" card if the final output can't be parsed — without losing the work the user already paid for.

## Solution Statement

1. New `useAudit()` hook owns the persisted audit blob — `{ repoOwner, repoName, repoFetchedAt, model, agent, findings, usage, auditedAt, rawText }` — under `localStorage` key `aiLayer.audit`. Mirrors `useRepo.ts` exactly: lazy init with SSR guard, module-level `LISTENERS` set + `broadcast`, strict `parseStored` that returns `null` on any structural mismatch, silent `try/catch` around all storage access, exposes `{ audit, setAudit, clear }`.
2. New `src/lib/anthropic.ts` library: pure-function streaming wrapper. Exports `streamAudit(params, callbacks, signal)`, `mapAnthropicError(res, _key)`, `parseSSEStream(reader, onEvent)`, `tryParsePartialFindings(text)`, `isFinding`, `isFindingsArray`, plus the typed shapes `Finding`, `AnthropicError`, `AnthropicUsage`. No React. No hooks. The forbidden-fruit `_key` marker (matches `mapGithubError(res, _pat)`) signals to code review that the key is for symmetry only, never interpolated into a returned message.
3. New `src/lib/audit-prompt.ts`: exports `buildAuditSystemPrompt(agent)` and `buildAuditUserMessage(repo)`. Keeps prompt text out of the component. Imports the tree-denoiser + README truncator.
4. New `src/lib/tree-denoise.ts`: pure `denoiseTree(tree, opts)` and `truncateReadme(readme, maxBytes)` + the lockfile / vendor / build-output blocklist constants. Kept separate from `audit-prompt.ts` so future capabilities (C2/C3/C4) can reuse the denoiser without depending on the audit prompt.
5. New `src/lib/pricing.ts`: per-million-token rates for the two configured models + an `estimateCostUsd(model, usage)` helper. Hand-maintained constants; the file has a comment pointing to `anthropic.com/pricing` for updates.
6. New `<AuditCard />` component renders on `Phase2.tsx`, **immediately under the existing "Step 2 — Paste this discovery prompt" CodeBlock**. The existing prompt + CodeBlock stay (users without an API key still copy-paste into their local agent). The card is *additive*: the user picks one route or the other.
7. New `<SeverityChip />` and `<FindingCard />` presentational components: pure presentation, no hooks, no state.
8. `<AuditCard />` composes `useSettings` + `useRepo` + `useAudit` + `useAgent`. A single `abortRef = useRef<AbortController | null>(null)` owns mid-stream cancellation. The primary button is a four-state machine: `disabled-no-key`, `disabled-no-repo`, `idle-ready` ("Audit my repo" or "Refetch audit"), `streaming-stop` ("Stop"). Streamed deltas re-parse via `tryParsePartialFindings` on every tick, rendering chips progressively. On `message_stop`, the full text is validated via `isFindingsArray`; pass → persist; fail → render the raw-text fallback block. Token usage from the final `message_delta` / `message_stop` event surfaces a "Used 12,847 input + 1,203 output tokens · ~$0.0921" line below the cards.
9. "Copy as markdown" button renders the finalized `findings` array as a `| Area | Severity | Body | Next step |` table to the clipboard. Honors the handoff brief's "discovery table" affordance.
10. Errors render in a single `.audit-card__error` block under the action row with a plain-language `message` + `next` step. Never includes the API key or any key-shaped string.
11. Cache: one audit at a time under `aiLayer.audit`. If a cached audit exists but its `repoOwner+repoName !== currentRepo.owner+repo`, a `.audit-card__staleness` banner renders above the cards: "Audit was for `prevOwner/prevRepo`. Refetch for the current repo?" The cards still render — the user decides. Refetch wipes + re-runs.

**No new npm dependencies.** Hand-rolled `fetch` + SSE parser. Mirrors `github.ts` style.

## Feature Metadata

**Feature Type**: New Capability (first L3 / first Anthropic-API capability)
**Estimated Complexity**: Medium-High
**Primary Systems Affected**: `src/hooks/`, `src/lib/`, `src/components/`, `src/pages/Phase2.tsx`, `src/styles/globals.css`
**Dependencies**: None new. Uses existing React 19, `useSettings` (A), `useRepo` (B), `useAgent`, `useTheme`. No `@anthropic-ai/sdk`, no SSE library.

---

## CONTEXT REFERENCES

### Relevant Codebase Files — YOU MUST READ THESE BEFORE IMPLEMENTING

- `CLAUDE.md` — non-negotiable constraints. Especially: "No backend, ever", "Never log, persist, or transmit API keys", "Trust but verify" on the CORS header name (it has shifted historically), mobile-first to 375px, no console logging of keys even partially. **Read top-to-bottom.**
- `Docs/ai-layer-workbook-claude-code-handoff.md` §4 C1 (lines 121–126) — the spec for this capability. §6 (lines 213–223) — streaming + token accounting. Appendix C (lines 458–484) — the call shape. Appendix C ends with: "verify against Anthropic's current docs at build time in case it has changed." Treat that as a Task 11 gate.
- `.agents/plans/capability-b-github-fetch.md` (the sibling plan, 919 lines) — **the structural template**. Section ordering, GOTCHA density per task, VALIDATE blocks, Edge Cases exhaustiveness, NOTES depth all mirror this. C1's plan should feel like a sibling, not a cousin.
- `.agents/handoff/capability-b-github-fetch.md` — confirms what shipped: the `Object.values(STORAGE_KEYS)` clear-all loop in `SettingsDialog`, the `argsIgnorePattern: '^_'` eslint rule that makes `_key` a clean unused-param, the strict `parseStored` pattern, the `.repo-fetcher__link-btn` inline-button class.
- `src/lib/github.ts` (full file, 251 lines) — **the exact-mirror reference for `anthropic.ts`**. Same shape, same conventions, same `mapXError(res, _secret)` forbidden-fruit marker, same hand-rolled `fetch` style, same isXError type guard. Read end-to-end.
  - Lines 27–49: `GithubErrorKind` + `GithubError` + `isGithubError`. Replicate with `AnthropicErrorKind` / `AnthropicError` / `isAnthropicError`.
  - Lines 87–98: hand-rolled fetch with auth header construction. Replicate with `x-api-key`, `anthropic-version`, `anthropic-dangerous-direct-browser-access` headers.
  - Lines 150–190: `mapGithubError`. Replicate with `mapAnthropicError`: 401 / 429 (with `retry-after`) / 413 / 5xx / unknown.
- `src/hooks/useRepo.ts` (full file, 77 lines) — **the exact-mirror reference for `useAudit.ts`**. Same `parseStored` strictness (returns `null` on any field mismatch), same `LISTENERS` set + `broadcast`, same lazy `useState` SSR guard, same `useCallback` setters, same silent `try/catch` around storage.
- `src/components/RepoFetcher.tsx` (full file, 155 lines) — **the exact-mirror reference for `AuditCard.tsx`**. Same AbortController pattern, same race-safety semantics on re-click, same four-state button machine, same disabled-derivation, same isolated error block.
  - Lines 18–21: state + ref declarations.
  - Lines 23: cleanup useEffect that aborts on unmount.
  - Lines 25–62: `runFetch` — abort prior controller before assigning new one, try/catch with `AbortError` skip, error mapping fallback to `'network'`. Replicate exactly.
  - Lines 36–38: the three-line abort-before-assign pattern. **Copy verbatim semantics**.
  - Lines 80–82: `fetching` and `disabled` derivation. Replicate with a state-machine helper.
- `src/components/SettingsDialog.tsx` lines 88–100 — confirms the `STORAGE_KEYS` clear-all loop iterates `Object.values(STORAGE_KEYS)`, so adding `audit: 'aiLayer.audit'` is the only plumbing the "Clear all keys & settings" flow needs. **Do not modify SettingsDialog.tsx in this capability.**
- `src/components/SettingsDialog.tsx` lines 136–172 — the privacy hint copy style for keys: "Stored in this browser's local storage. Sent only to `api.anthropic.com` when you use a Draft button." Reuse this voice in `AuditCard`'s `.audit-card__hint` strings.
- `src/lib/storage-keys.ts` (full file, 11 lines) — add `audit: 'aiLayer.audit'`. Two prefixes already coexist (`aiLayer.` for net-new state, `workbook:` for v1-portable persona/checks). Audit is net-new → `aiLayer.`.
- `src/lib/models.ts` (full file, 25 lines) — exports `GenerateModel`, `FastModel`, `GENERATE_MODELS`, `FAST_MODELS`, defaults, type guards. `pricing.ts` keys its rate table on these exact string literals.
- `src/hooks/useSettings.ts` (full file, 128 lines) — `settings.anthropicKey` and `settings.generateModel` are what `AuditCard` reads (no setters). `AuditCard` never writes to `useSettings`.
- `src/hooks/useAgent.ts` — exports `useAgent` returning `{ agent, setAgent }` and the `AGENTS` union (`'Claude Code' | 'Codex' | 'Cursor' | 'Cline' | 'Other'`). `buildAuditSystemPrompt(agent)` interpolates the agent name into the system prompt so the model's recommendations name the right tool ("when you run Claude Code…", "when you run Cursor…").
- `src/pages/Phase2.tsx` (full file, 156 lines) — **the page being modified**. Insert `<AuditCard />` immediately *after* the `<CodeBlock lang="markdown">{discoveryPrompt}</CodeBlock>` block (currently around line 80) and immediately *before* the `<h2>Step 3 — Read the output critically</h2>` heading. Add a one-sentence lead-in paragraph between the CodeBlock and the AuditCard: "Or — if you've pasted your repo URL and added an Anthropic API key — run the audit right here:". Do **not** remove the existing prompt + CodeBlock; users without keys still need them.
- `src/components/PersonaCard.tsx` (full file, 147 lines) — pattern reference only. The `useEffect` resync pattern (lines added in B) is what makes hook broadcasts reach controlled inputs. `AuditCard` has no controlled inputs other than the optional regenerate-note (deferred), so this is informational only.
- `src/styles/globals.css`:
  - Lines 1246–1329 — `.repo-fetcher*` rules. **Mirror this style exactly** for `.audit-card*`. The `.repo-fetcher__error` / `.repo-fetcher__warn` / `.repo-fetcher__link-btn` rules are reused verbatim for `.audit-card__error` / `.audit-card__staleness` / `.audit-card__link-btn` (or you can reuse the existing classes — see Task 9 GOTCHAs).
  - Lines 685–724 — `.persona-field` rules. The `<textarea>` for the optional regenerate-note (deferred to C2 if/when added) would use this; not needed for C1's MVP.
  - Lines 797–824 — `.btn` and `.btn.ghost`. The primary action button on `AuditCard` is `.btn`. "Copy as markdown" is `.btn.ghost`.
  - Lines 1–47 — the CSS variables. Every new `.audit-card*` rule must use variables (`var(--bg-elev)`, `var(--ink)`, `var(--accent)`, `var(--warn)`, `var(--ok)`, `var(--accent-bg)`, `var(--warn-bg)`) so dark mode adapts automatically.
- `src/components/CopyButton.tsx` — existing copy-to-clipboard pattern. "Copy as markdown" can either reuse `<CopyButton text={…} />` if its API matches, or hand-roll a `navigator.clipboard.writeText(...)` call (~5 lines) inside `AuditCard`. Check the API at implementation time and pick the lower-friction option; flag in Task 8.
- `package.json` — `"build": "tsc -b && vite build"`, `"lint": "eslint ."`, `"format:check": "prettier --check ..."`, `"dev": "vite"`. No test script. Validation is type-check + lint + format + manual.
- `eslint.config.js` — already has `'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]` (added in B). The `_key` parameter on `mapAnthropicError` lints clean without further changes.

### New Files to Create

- `src/lib/pricing.ts` — per-million-token rates for `claude-opus-4-7` and `claude-haiku-4-5-20251001`; `estimateCostUsd(model, usage)` helper; `formatUsd(n)` helper. Hand-maintained.
- `src/lib/tree-denoise.ts` — `denoiseTree(tree, opts)`, `truncateReadme(readme, maxBytes)`, the `BLOCKLIST_PATH_SEGMENTS`, `BLOCKLIST_FILE_EXTENSIONS`, `BLOCKLIST_FILES` constants. No React.
- `src/lib/audit-prompt.ts` — `buildAuditSystemPrompt(agent)`, `buildAuditUserMessage(repo)`, `AUDIT_MAX_BODY_BYTES = 20_000`, `README_MAX_BYTES = 8_192`. Imports the denoiser. The system prompt is a ~1500-character string with a single inline example finding and explicit "respond with JSON only, no markdown fence, no preamble" instruction.
- `src/lib/anthropic.ts` — pure-function library: types (`Finding`, `Severity`, `AnthropicError`, `AnthropicErrorKind`, `AnthropicUsage`, `AuditRequestBody`), `isFinding`, `isFindingsArray`, `isAnthropicError`, `mapAnthropicError(res, _key)`, `parseSSEStream(reader, onEvent)`, `tryParsePartialFindings(text)`, `streamAudit(params, callbacks, signal)`. No React imports.
- `src/hooks/useAudit.ts` — persisted-blob hook returning `{ audit: Audit | null, setAudit: (a: Audit) => void, clear: () => void }`. Direct structural mirror of `useRepo.ts`. Strict `parseStored`.
- `src/components/SeverityChip.tsx` — `<SeverityChip severity={...} />`. Pure presentation. Maps `'high' | 'medium' | 'low'` to `.severity-chip--high|medium|low` modifier classes.
- `src/components/FindingCard.tsx` — `<FindingCard finding={...} />`. Pure presentation. Renders area heading, chip, body (whitespace-pre-wrap `<p>` — *not* react-markdown, see Task 7 GOTCHAs), suggested-next-step block.
- `src/components/AuditCard.tsx` — the main UI. Composes hooks, owns the AbortController, handles the four button states, renders the staleness banner / error / fallback / cards / usage line / Copy-as-markdown button.

### Files to Modify

- `src/lib/storage-keys.ts` — add `audit: 'aiLayer.audit'` (one line, placed alphabetically with the other `aiLayer.*` keys).
- `src/pages/Phase2.tsx` — import + render `<AuditCard />` between the discoveryPrompt CodeBlock and the "Step 3" `<h2>`. Add a one-sentence intro paragraph.
- `src/styles/globals.css` — append `.audit-card*`, `.severity-chip*`, `.finding-card*` rules (~140 lines). Dark-mode-safe via CSS variables. Mobile breakpoint at 600px.
- `README.md` — optional one-line update under "What v3 does" once manual validation passes.

### Relevant Documentation — READ THESE BEFORE IMPLEMENTING

- [Anthropic Messages API — Streaming](https://docs.anthropic.com/en/api/messages-streaming) — the canonical reference for SSE event shape. The event sequence is: `message_start` → 1+ × `content_block_start` → many × `content_block_delta` (with `delta.type === 'text_delta'` and `delta.text` containing the streamed token chunk) → `content_block_stop` → `message_delta` (with `usage` containing `output_tokens` running total) → `message_stop`. Final `usage` is on `message_delta` (and is the cumulative output count); `usage.input_tokens` is on `message_start`. Verify field locations against current docs — Anthropic has revised the event shape before.
- [Anthropic Messages API — Errors](https://docs.anthropic.com/en/api/errors) — confirms the status-code mapping: `400 invalid_request_error`, `401 authentication_error`, `403 permission_error`, `404 not_found_error`, `413 request_too_large`, `429 rate_limit_error`, `5xx api_error/overloaded_error`. The `retry-after` header is present on 429. Error response body shape: `{ "type": "error", "error": { "type": "...", "message": "..." } }`.
- [Anthropic Messages API — Direct browser access](https://docs.anthropic.com/en/api/messages) — the opt-in header. Currently `anthropic-dangerous-direct-browser-access: true` per handoff Appendix C. **Re-verify at Task 11 / build time** per CLAUDE.md "Trust but verify".
- [Anthropic — Pricing](https://www.anthropic.com/pricing) — current per-million-token rates. Used to seed `pricing.ts`. At time of writing (May 2026): `claude-opus-4-7` $15 in / $75 out per MTok, `claude-haiku-4-5-20251001` $1 in / $5 out per MTok. **Re-verify at implementation time** — pricing changes.
- [MDN — `ReadableStream.getReader()`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/getReader) — used by `parseSSEStream`. `fetch(...).body!.getReader()` returns a `ReadableStreamDefaultReader<Uint8Array>`. Decode with a `TextDecoder('utf-8', { stream: true })` to handle multi-byte chars split across chunks.
- [MDN — `TextDecoder`](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder) — `{ stream: true }` is mandatory in `decode(...)` calls except the final one.
- [MDN — Server-Sent Events format](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#event_stream_format) — event lines: `event: <name>\n`, `data: <json>\n`, blank line terminates an event. Anthropic emits both `event:` and `data:` lines per event.
- [MDN — `AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) — used to cancel mid-stream. `controller.abort()` causes the in-flight `fetch` to reject with `DOMException('AbortError')`, and an active `reader.read()` to reject with the same. Catch-and-ignore in the component.
- [MDN — `navigator.clipboard.writeText`](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) — for "Copy as markdown". Requires a user gesture (button click qualifies) and HTTPS / localhost. Falls back gracefully on insecure origins (won't be an issue on the production HTTPS subdomain).
- `CLAUDE.md` "Trust but verify" — re-verify the CORS header name and the SSE event field locations at implementation time. Anthropic has shifted both historically.

### Patterns to Follow

**Anthropic call shape (the spec, mirror this — verify header names against current docs):**

```ts
// src/lib/anthropic.ts
const ANTHROPIC_HEADERS_BASE: Record<string, string> = {
  'Content-Type': 'application/json',
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
};

export interface AuditRequestBody {
  model: GenerateModel;
  max_tokens: number;
  stream: true;
  system: string;
  messages: Array<{ role: 'user'; content: string }>;
}

export interface StreamAuditParams {
  apiKey: string;
  body: AuditRequestBody;
}

export interface StreamAuditCallbacks {
  onTextDelta: (text: string) => void;       // fires on every content_block_delta
  onUsage: (usage: AnthropicUsage) => void;  // fires once on message_delta with final cumulative usage
  onComplete: (fullText: string) => void;    // fires on message_stop; fullText = concatenated deltas
  onError: (err: AnthropicError) => void;    // fires on any non-Abort failure
}

export async function streamAudit(
  params: StreamAuditParams,
  callbacks: StreamAuditCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const headers: Record<string, string> = {
    ...ANTHROPIC_HEADERS_BASE,
    'x-api-key': params.apiKey,
  };

  let res: Response;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(params.body),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    callbacks.onError({
      kind: 'network',
      message: 'Could not reach Anthropic.',
      next: 'Check your connection and try again.',
    });
    return;
  }

  if (!res.ok) {
    callbacks.onError(await mapAnthropicError(res, params.apiKey));
    return;
  }

  if (!res.body) {
    callbacks.onError({
      kind: 'invalid-response',
      message: 'Anthropic returned an empty stream.',
      next: 'Try again. If it keeps failing, the API may be having problems.',
    });
    return;
  }

  let fullText = '';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    await parseSSEStream(res.body.getReader(), (event) => {
      switch (event.type) {
        case 'message_start': {
          const u = event.data?.message?.usage;
          if (u && typeof u.input_tokens === 'number') inputTokens = u.input_tokens;
          break;
        }
        case 'content_block_delta': {
          const t = event.data?.delta?.text;
          if (typeof t === 'string') {
            fullText += t;
            callbacks.onTextDelta(t);
          }
          break;
        }
        case 'message_delta': {
          const u = event.data?.usage;
          if (u && typeof u.output_tokens === 'number') outputTokens = u.output_tokens;
          break;
        }
        case 'message_stop': {
          callbacks.onUsage({ input_tokens: inputTokens, output_tokens: outputTokens });
          callbacks.onComplete(fullText);
          break;
        }
        case 'error': {
          callbacks.onError({
            kind: 'invalid-response',
            message: 'Anthropic returned a stream error.',
            next: 'Try again. If it keeps failing, the API may be having problems.',
          });
          break;
        }
      }
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    callbacks.onError({
      kind: 'invalid-response',
      message: 'The stream from Anthropic was malformed.',
      next: 'Try again. If it keeps failing, the API may be having problems.',
    });
  }
}
```

**SSE parser (hand-rolled, no library):**

```ts
// src/lib/anthropic.ts
export interface SSEEvent {
  type: string;          // from `event:` line
  data: unknown;         // JSON-parsed `data:` line
}

export async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: SSEEvent) => void,
): Promise<void> {
  const decoder = new TextDecoder('utf-8');
  let buf = '';
  let currentEventType = 'message';
  let currentDataLines: string[] = [];

  const flush = () => {
    if (currentDataLines.length === 0) {
      currentEventType = 'message';
      return;
    }
    const raw = currentDataLines.join('\n');
    let data: unknown = null;
    try {
      data = JSON.parse(raw);
    } catch {
      // Skip malformed events rather than failing the whole stream.
    }
    onEvent({ type: currentEventType, data });
    currentEventType = 'message';
    currentDataLines = [];
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    // Process complete lines; keep the partial trailing line in buf.
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).replace(/\r$/, '');
      buf = buf.slice(nl + 1);
      if (line === '') {
        flush();
      } else if (line.startsWith('event:')) {
        currentEventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        currentDataLines.push(line.slice(5).trim());
      }
      // Ignore other line types (id:, retry:, comments starting with `:`).
    }
  }
  // Flush any pending event at stream end.
  if (currentDataLines.length > 0) flush();
}
```

**Error mapper (the gate that keeps the key out of error strings):**

```ts
// src/lib/anthropic.ts
export type AnthropicErrorKind =
  | 'unauthorized'        // 401
  | 'rate-limit'          // 429
  | 'context-too-large'   // 413
  | 'invalid-request'     // 400
  | 'server'              // 5xx
  | 'network'             // fetch TypeError
  | 'invalid-response'    // stream/JSON malformed
  | 'unexpected';

export interface AnthropicError {
  kind: AnthropicErrorKind;
  message: string;
  next: string;
}

export async function mapAnthropicError(
  res: Response,
  _key: string,
): Promise<AnthropicError> {
  // _key is named with a leading underscore as a forbidden-fruit marker: it is
  // present in the signature for symmetry, never interpolated into a message.
  // Mirror of mapGithubError(res, _pat).
  if (res.status === 401) {
    return {
      kind: 'unauthorized',
      message: 'Anthropic rejected your API key.',
      next: 'Open Settings (gear icon) and check your Anthropic API key.',
    };
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    const wait = retryAfter ? ` Wait ${retryAfter}s and try again.` : '';
    return {
      kind: 'rate-limit',
      message: 'Anthropic rate limit hit.',
      next: `Wait a moment and try again.${wait}`,
    };
  }
  if (res.status === 413) {
    return {
      kind: 'context-too-large',
      message: 'Your repo is too large for one audit.',
      next: 'This is a known limit. We trim the tree and README; if it still fails, the repo may be unusually large.',
    };
  }
  if (res.status === 400) {
    return {
      kind: 'invalid-request',
      message: 'Anthropic rejected the request shape.',
      next: 'Try again. If it keeps failing, file an issue with the workbook.',
    };
  }
  if (res.status >= 500) {
    return {
      kind: 'server',
      message: `Anthropic returned ${res.status}.`,
      next: 'Try again in a moment.',
    };
  }
  return {
    kind: 'unexpected',
    message: `Anthropic returned ${res.status}.`,
    next: 'Try again. If it keeps failing, the API may be having problems.',
  };
}

export function isAnthropicError(v: unknown): v is AnthropicError {
  if (!v || typeof v !== 'object') return false;
  const e = v as Partial<AnthropicError>;
  return (
    typeof e.kind === 'string' &&
    typeof e.message === 'string' &&
    typeof e.next === 'string'
  );
}
```

**Finding shape + validators:**

```ts
// src/lib/anthropic.ts
export type Severity = 'high' | 'medium' | 'low';

export interface Finding {
  id: string;
  severity: Severity;
  area: string;
  body: string;
  suggested_next_step: string;
}

export function isFinding(v: unknown): v is Finding {
  if (!v || typeof v !== 'object') return false;
  const f = v as Partial<Finding>;
  return (
    typeof f.id === 'string' &&
    (f.severity === 'high' || f.severity === 'medium' || f.severity === 'low') &&
    typeof f.area === 'string' &&
    typeof f.body === 'string' &&
    typeof f.suggested_next_step === 'string'
  );
}

export function isFindingsArray(v: unknown): v is Finding[] {
  return Array.isArray(v) && v.every(isFinding);
}
```

**Tolerant progressive parser (for in-flight rendering):**

```ts
// src/lib/anthropic.ts
/**
 * Best-effort parse of partial streamed JSON of shape { "findings": [...] }.
 * Returns the finding objects whose closing brace has arrived; tolerates a
 * dangling comma + an unclosed array + an unclosed object at the tail. Returns
 * [] if the prefix isn't recognizable yet.
 */
export function tryParsePartialFindings(text: string): Finding[] {
  if (!text) return [];

  // Strip a leading ```json fence if the model added one despite instructions.
  const cleaned = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/```$/i, '');

  // Find the start of the findings array.
  const arrayStart = cleaned.indexOf('[');
  if (arrayStart < 0) return [];

  // Walk through, tracking brace depth, and collect complete object slices.
  const slice = cleaned.slice(arrayStart + 1);
  const objects: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < slice.length; i++) {
    const ch = slice[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        objects.push(slice.slice(start, i + 1));
        start = -1;
      }
    } else if (ch === ']' && depth === 0) {
      break;
    }
  }

  const out: Finding[] = [];
  for (const raw of objects) {
    try {
      const parsed = JSON.parse(raw);
      if (isFinding(parsed)) out.push(parsed);
    } catch {
      // Skip individual broken objects; they'll fix themselves on the next tick.
    }
  }
  return out;
}
```

**Persisted-blob hook (mirror `useRepo.ts` exactly):**

```ts
// src/hooks/useAudit.ts
import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../lib/storage-keys';
import type { Finding, AnthropicUsage } from '../lib/anthropic';
import { isFindingsArray } from '../lib/anthropic';
import type { GenerateModel } from '../lib/models';
import { isGenerateModel } from '../lib/models';

export interface Audit {
  repoOwner: string;
  repoName: string;
  repoFetchedAt: number;
  model: GenerateModel;
  agent: string;
  findings: Finding[];          // empty if rawText fallback only
  rawText: string;              // always populated, used for "Copy as markdown" + fallback
  usage: AnthropicUsage;
  auditedAt: number;
}

function parseStored(raw: string | null): Audit | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<Audit>;
    if (
      typeof p.repoOwner !== 'string' ||
      typeof p.repoName !== 'string' ||
      typeof p.repoFetchedAt !== 'number' ||
      !isGenerateModel(p.model) ||
      typeof p.agent !== 'string' ||
      !isFindingsArray(p.findings) ||
      typeof p.rawText !== 'string' ||
      !p.usage ||
      typeof p.usage.input_tokens !== 'number' ||
      typeof p.usage.output_tokens !== 'number' ||
      typeof p.auditedAt !== 'number'
    ) {
      return null;
    }
    return p as Audit;
  } catch {
    return null;
  }
}

const LISTENERS = new Set<(a: Audit | null) => void>();
function broadcast(a: Audit | null) {
  for (const fn of LISTENERS) fn(a);
}

export function useAudit(): {
  audit: Audit | null;
  setAudit: (next: Audit) => void;
  clear: () => void;
} {
  const [audit, setLocal] = useState<Audit | null>(() => {
    if (typeof window === 'undefined') return null;
    return parseStored(window.localStorage.getItem(STORAGE_KEYS.audit));
  });

  useEffect(() => {
    const handler = (next: Audit | null) => setLocal(next);
    LISTENERS.add(handler);
    return () => { LISTENERS.delete(handler); };
  }, []);

  const setAudit = useCallback((next: Audit) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEYS.audit, JSON.stringify(next));
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
        window.localStorage.removeItem(STORAGE_KEYS.audit);
      } catch {
        // ignore — storage unavailable
      }
    }
    setLocal(null);
    broadcast(null);
  }, []);

  return { audit, setAudit, clear };
}
```

**Tree denoiser:**

```ts
// src/lib/tree-denoise.ts
import type { RepoTreeEntry } from './github';

export const BLOCKLIST_PATH_SEGMENTS = new Set<string>([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  'target',
  'Pods',
  'vendor',
  '__pycache__',
  '.next',
  '.venv',
  '.nuxt',
  '.cache',
  '.turbo',
  'coverage',
]);

export const BLOCKLIST_FILES = new Set<string>([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'Cargo.lock',
  'Gemfile.lock',
  'composer.lock',
  'poetry.lock',
  'Podfile.lock',
]);

export const BLOCKLIST_EXTENSIONS = new Set<string>([
  '.lock',
]);

export function denoiseTree(entries: RepoTreeEntry[]): RepoTreeEntry[] {
  return entries.filter((e) => {
    const parts = e.path.split('/');
    if (parts.some((seg) => BLOCKLIST_PATH_SEGMENTS.has(seg))) return false;
    const base = parts[parts.length - 1];
    if (BLOCKLIST_FILES.has(base)) return false;
    const dot = base.lastIndexOf('.');
    if (dot > 0 && BLOCKLIST_EXTENSIONS.has(base.slice(dot))) return false;
    return true;
  });
}

export function truncateReadme(readme: string | null, maxBytes: number): string {
  if (!readme) return '(no README)';
  const enc = new TextEncoder();
  const bytes = enc.encode(readme);
  if (bytes.length <= maxBytes) return readme;
  // Find a UTF-8-safe slice boundary at or before maxBytes.
  let cut = maxBytes;
  while (cut > 0 && (bytes[cut] & 0xc0) === 0x80) cut--;
  const head = new TextDecoder('utf-8').decode(bytes.slice(0, cut));
  const totalKb = Math.round(bytes.length / 1024);
  return `${head}\n\n[…README truncated, ${totalKb} KB total…]`;
}
```

**Prompt builder:**

```ts
// src/lib/audit-prompt.ts
import type { Agent } from '../hooks/useAgent';
import type { Repo } from './github';
import { denoiseTree, truncateReadme } from './tree-denoise';

export const README_MAX_BYTES = 8_192;
export const AUDIT_MAX_BODY_BYTES = 20_000;

export function buildAuditSystemPrompt(agent: Agent): string {
  return `You are an audit assistant inside a workbook that teaches builders how to set up ${agent} in their codebase. The user has fetched their GitHub repo's metadata and you are receiving a denoised summary. Your job is to recommend where CLAUDE.md files should live in this repo, what's distinctive about each candidate area, and what its editor needs to know.

Respond with JSON only — no markdown fence, no preamble, no commentary. The exact shape is:

{
  "findings": [
    {
      "id": "kebab-case-stable-handle",
      "severity": "high" | "medium" | "low",
      "area": "path/in/repo or short descriptive name",
      "body": "2–4 short paragraphs in plain English explaining what makes this area distinct and what's likely to bite an editor who hasn't seen it before.",
      "suggested_next_step": "One concrete sentence the user can act on (e.g. 'Draft a CLAUDE.md here covering the test command and the import boundary with auth/').",
    }
  ]
}

Rules:
- Aim for 3–7 findings. Quality over quantity. If the repo only warrants 3, return 3.
- 'severity' maps to the v1 prompt's priority: high = essential (the editor will get something wrong without this CLAUDE.md), medium = valuable, low = nice-to-have.
- 'id' is a stable, URL-safe kebab-case slug derived from the area (e.g. 'ios-core', 'shared-network', 'root-claudemd'). Reuse the same id if the user re-runs against the same repo.
- 'area' may be a literal path (e.g. 'ios/Core') or a descriptive label (e.g. 'Shared networking layer') if no single path captures it.
- 'body' is plain English, no markdown headings, no bullet lists — short paragraphs only. Speak directly to the reader as 'you'.
- 'suggested_next_step' is one sentence, imperative voice.
- Do NOT include any prose outside the JSON. Do NOT wrap the JSON in a fence. Do NOT include trailing commas.

Example finding (for shape reference; do not echo verbatim):

{
  "id": "ios-core",
  "severity": "high",
  "area": "ios/Core",
  "body": "This is the iOS app's core business logic and persistence layer. It uses Swift Concurrency throughout and has its own protocol-oriented dependency injection that doesn't match anything in android/. Anyone editing here needs to know that the SwiftData migrations are gated behind a feature flag and that the unit tests run via 'xcodebuild test -scheme CoreTests'.",
  "suggested_next_step": "Draft a CLAUDE.md at ios/Core/CLAUDE.md that covers the Swift Concurrency conventions, the protocol-DI pattern, and the scoped test command."
}`;
}

export function buildAuditUserMessage(repo: import('./github').Repo): string {
  const denoisedTree = denoiseTree(repo.tree)
    .map((e) => `${e.type === 'tree' ? 'd' : 'f'} ${e.path}`)
    .join('\n');

  const languages = Object.entries(repo.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, bytes]) => `  ${name}: ${bytes}`)
    .join('\n');

  const readmeBlock = truncateReadme(repo.readme, README_MAX_BYTES);

  const body = `# Repo
${repo.owner}/${repo.repo}
Default branch: ${repo.defaultBranch}
Primary language: ${repo.primaryLanguage ?? '(unknown)'}
Description: ${repo.description ?? '(none)'}

# Languages (bytes)
${languages || '  (none reported)'}

# Tree (depth ≤ 3, denoised)
${denoisedTree || '(empty after denoise)'}

# README
${readmeBlock}
`;

  // Hard cap. If we're over, snip the tree first (least narrative value), then
  // re-truncate readme. Avoid silently shipping a 30KB prompt.
  if (new TextEncoder().encode(body).length <= AUDIT_MAX_BODY_BYTES) return body;
  const shorterTree = denoisedTree.split('\n').slice(0, 200).join('\n') + '\n…(tree truncated)';
  const fallback = body.replace(denoisedTree, shorterTree);
  return fallback.slice(0, AUDIT_MAX_BODY_BYTES);
}
```

**AuditCard skeleton:**

```tsx
// src/components/AuditCard.tsx — abbreviated
export default function AuditCard() {
  const { settings } = useSettings();
  const { repo } = useRepo();
  const { agent } = useAgent();
  const { audit, setAudit, clear } = useAudit();

  const [status, setStatus] = useState<'idle' | 'streaming'>('idle');
  const [error, setError] = useState<AnthropicError | null>(null);
  const [streamText, setStreamText] = useState<string>('');
  const [streamFindings, setStreamFindings] = useState<Finding[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const hasKey = settings.anthropicKey.trim().length > 0;
  const hasRepo = repo !== null;
  const streaming = status === 'streaming';

  const onRun = async () => {
    if (!hasKey || !hasRepo || streaming) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setStreamText('');
    setStreamFindings([]);
    setStatus('streaming');

    let finalUsage: AnthropicUsage = { input_tokens: 0, output_tokens: 0 };

    await streamAudit(
      {
        apiKey: settings.anthropicKey,
        body: {
          model: settings.generateModel,
          max_tokens: 4096,
          stream: true,
          system: buildAuditSystemPrompt(agent),
          messages: [{ role: 'user', content: buildAuditUserMessage(repo) }],
        },
      },
      {
        onTextDelta: (chunk) => {
          setStreamText((prev) => {
            const next = prev + chunk;
            setStreamFindings(tryParsePartialFindings(next));
            return next;
          });
        },
        onUsage: (u) => { finalUsage = u; },
        onComplete: (fullText) => {
          let parsed: Finding[] = [];
          try {
            const obj = JSON.parse(
              fullText.replace(/^\s*```(?:json)?\s*/i, '').replace(/```$/i, ''),
            );
            if (obj && isFindingsArray((obj as { findings?: unknown }).findings)) {
              parsed = (obj as { findings: Finding[] }).findings;
            }
          } catch {
            // Final parse failed — keep rawText for fallback render.
          }
          setStatus('idle');
          setAudit({
            repoOwner: repo.owner,
            repoName: repo.repo,
            repoFetchedAt: repo.fetchedAt,
            model: settings.generateModel,
            agent,
            findings: parsed,
            rawText: fullText,
            usage: finalUsage,
            auditedAt: Date.now(),
          });
        },
        onError: (err) => {
          setStatus('idle');
          setError(err);
        },
      },
      controller.signal,
    );
  };

  const onStop = () => {
    abortRef.current?.abort();
    setStatus('idle');
  };

  const onCopyMarkdown = async () => { /* …see Task 8… */ };

  // …render. See Task 8 for the full render tree.…
}
```

**Privacy / key-safety invariants (enforce in code review):**

- `console.log` / `console.error` / `console.warn` / `console.debug` of any expression containing `settings.anthropicKey`, `params.apiKey`, `apiKey`, `_key`, `'x-api-key'`, `'Authorization'`, `'Bearer'`, or `'sk-ant'`: **forbidden**.
- The Anthropic key must never appear in any returned `AnthropicError.message` or `AnthropicError.next` string.
- No `aria-label`, `title`, `placeholder`, `data-*`, or error string containing the key value.
- No `throw new Error(... ${apiKey} ...)`. The `_key` parameter on `mapAnthropicError` exists for symmetry only.
- The repo metadata and README ARE user-visible text — fine to render and log if needed for debugging. The Anthropic response stream IS user-visible text — fine to render. Only the API key is the secret.
- Network panel hygiene: every request to `api.anthropic.com` carries `x-api-key`; no request to any other host carries it. This is the same invariant Capability B enforces for the PAT.

**Naming Conventions:**

- Files: `PascalCase.tsx` for components (`AuditCard`, `SeverityChip`, `FindingCard`), `camelCase.ts` for hooks/lib (`useAudit`, `anthropic`, `pricing`, `tree-denoise`, `audit-prompt`). Dashes only where this repo already uses them (`tree-denoise.ts`, `audit-prompt.ts` — short multi-word lib files use kebab-case per the existing `storage-keys.ts` precedent).
- Hooks: `use<Thing>` returning `{ <thing>, set<Thing>, clear? }`.
- Storage keys: dot-separated `aiLayer.` prefix. `aiLayer.audit`.
- CSS classes: kebab-case, BEM-ish (`.audit-card`, `.audit-card__usage`, `.severity-chip`, `.severity-chip--high`).
- Error kinds: short kebab-case strings.

**Error Handling:**

- All `localStorage` access in `useAudit` wrapped in `try/catch` with silent comments (`// ignore — storage unavailable`). Match `useRepo.ts`.
- `JSON.parse` in `parseStored` wrapped in `try/catch` returning `null`. Treat any parse failure as "no cache." Strict — partial restore not allowed.
- `fetch` errors (network failures) throw `TypeError` — caught in `streamAudit`, surfaced as `kind: 'network'`.
- `AbortError` is caught and ignored in both `streamAudit` and the component — it means a newer run (or unmount) cancelled this one.
- Stream-decode failures (malformed SSE) → `kind: 'invalid-response'`. Whole-text JSON parse failure → render the raw-text fallback block (NOT an error — the API call succeeded, the model just drifted).
- **Never** `console.log`, `console.error`, `console.warn`, `console.debug` anything containing the API key, the `x-api-key` header, or any key-shaped string.

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Pure-function libraries and the storage key. No UI, no hooks yet.

**Tasks:**

- Add `audit` to `STORAGE_KEYS`.
- Create `src/lib/pricing.ts`.
- Create `src/lib/tree-denoise.ts`.
- Create `src/lib/audit-prompt.ts`.
- Create `src/lib/anthropic.ts`.

### Phase 2: Core Implementation

The persistence hook and the presentational components.

**Tasks:**

- Create `src/hooks/useAudit.ts` (mirror `useRepo.ts`).
- Create `src/components/SeverityChip.tsx` + `src/components/FindingCard.tsx`.
- Build `src/components/AuditCard.tsx`.
- Add CSS for `.audit-card*`, `.severity-chip*`, `.finding-card`.

### Phase 3: Integration

Wire to Phase2; confirm existing copy-paste flow still works.

**Tasks:**

- Insert `<AuditCard />` between the discoveryPrompt CodeBlock and the "Step 3" heading in `Phase2.tsx`.
- Verify the existing prompt + CodeBlock remain unchanged and the page still scrolls correctly.

### Phase 4: Testing & Validation

No test framework. Validation is type-check + lint + format + manual.

**Tasks:**

- Run `npx tsc -b`, `npm run lint`, `npm run format:check`, `npm run build` — all must pass.
- Verify the CORS header name (`anthropic-dangerous-direct-browser-access`) against current Anthropic docs (CLAUDE.md "Trust but verify" gate).
- Manual fetch against `coleam00/helpline` (public, with a valid Anthropic key) → cards render progressively, full audit persists to `aiLayer.audit`.
- Manual error walkthrough (invalid key → 401; oversized prompt simulation → 413 path; mid-stream stop; offline → network).
- 375px width pass — no horizontal scroll, severity chips legible, error block wraps.
- Dark mode pass.
- Secret-grep on changed files: `grep -rE 'sk-ant-|x-api-key|Authorization|Bearer' src/` returns ZERO matches outside the auth-header construction in `src/lib/anthropic.ts` and the existing `Bearer` in `src/lib/github.ts`.

---

## STEP-BY-STEP TASKS

Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Task 1 — UPDATE `src/lib/storage-keys.ts`

- **IMPLEMENT**: Add an `audit` entry.
- **PATTERN**: Existing entries on lines 2–7.
- **NEW VALUE**: `audit: 'aiLayer.audit'` — placed alphabetically next to `agent`.
- **GOTCHA**: Two prefixes already coexist (`aiLayer.` for theme/agent/repo/settings, `workbook:` for persona/checks). New state uses `aiLayer.` — matches the precedent set by A and B.
- **GOTCHA**: This single change automatically extends the "Clear all keys & settings" wipe in `SettingsDialog.tsx:88–100` because it iterates `Object.values(STORAGE_KEYS)`. No further plumbing needed.
- **VALIDATE**: `npx tsc -b` exits 0.

### Task 2 — CREATE `src/lib/pricing.ts`

- **IMPLEMENT**: Per-million-token rate table keyed on `GenerateModel | FastModel`. Export `estimateCostUsd(model, usage)` and `formatUsd(n)`. Exports in order:
  1. `interface ModelRate { inputPerMTok: number; outputPerMTok: number; }`
  2. `MODEL_RATES: Record<GenerateModel | FastModel, ModelRate>` — hand-maintained constant. Initial values (re-verify at `anthropic.com/pricing`): `claude-opus-4-7` `{ inputPerMTok: 15, outputPerMTok: 75 }`, `claude-haiku-4-5-20251001` `{ inputPerMTok: 1, outputPerMTok: 5 }`. Cover `claude-sonnet-4-6` too (it's in `GENERATE_MODELS`): `{ inputPerMTok: 3, outputPerMTok: 15 }`.
  3. `export function estimateCostUsd(model: GenerateModel | FastModel, usage: { input_tokens: number; output_tokens: number }): number` — returns USD as a number with 4 decimal precision.
  4. `export function formatUsd(n: number): string` — returns `"~$0.0921"` style (4 sig figs, leading tilde to signal estimate).
- **IMPORTS**: `import type { GenerateModel, FastModel } from './models';`
- **GOTCHA — pricing drift**: Anthropic adjusts pricing without warning. Add a header comment: `// Hand-maintained from anthropic.com/pricing as of YYYY-MM. Re-verify and update on every model addition.` Include the current date when this file is created.
- **GOTCHA — unknown model**: If `MODEL_RATES[model]` is `undefined` (e.g. a model literal was added to `models.ts` but not here), return `0` from `estimateCostUsd` rather than throwing — the cost display will quietly show $0 rather than crashing the audit display. Add a `// TODO: add rate for new model` style comment.
- **GOTCHA — sig figs**: `formatUsd(0.00012)` should produce `"~$0.0001"` not `"~$0.00"`. Use `n.toFixed(4)` and strip trailing zeros only past the third decimal. Cents-level audits ($0.02–0.20) should read cleanly.
- **VALIDATE**:
  - `npx tsc -b` exits 0.
  - In a scratch consumer, `estimateCostUsd('claude-opus-4-7', { input_tokens: 10000, output_tokens: 1000 })` → `(10000/1e6)*15 + (1000/1e6)*75 = 0.15 + 0.075 = 0.225`. (Delete scratch after.)

### Task 3 — CREATE `src/lib/tree-denoise.ts`

- **IMPLEMENT**: `denoiseTree(entries)`, `truncateReadme(readme, maxBytes)`, the three blocklist constants. See Patterns section for the full file.
- **IMPORTS**: `import type { RepoTreeEntry } from './github';`
- **GOTCHA — extension matching**: `BLOCKLIST_EXTENSIONS` matches by the last dot-segment, so `Cargo.lock` is hit by `BLOCKLIST_FILES` (exact basename) and `*.lock` is hit by `BLOCKLIST_EXTENSIONS` for things like `bun.lock`. Both checks exist on purpose — the explicit names are faster + clearer for common cases; the extension is the catch-all.
- **GOTCHA — UTF-8-safe truncation**: `truncateReadme` must not split a multi-byte UTF-8 character. The pattern in Patterns section walks back from `maxBytes` while the byte at `cut` is a continuation byte (`(byte & 0xc0) === 0x80`). Without this, a README with an em-dash at byte 8191 produces garbled output.
- **GOTCHA — empty/null readme**: `truncateReadme(null, ...)` returns the literal string `'(no README)'`. The prompt builder shouldn't have to null-check.
- **GOTCHA — segment match is per-component, not substring**: A path like `my-node_modules-cleaner/` must NOT be denoised. `denoiseTree` splits on `/` and checks each segment exactly — never `.includes('node_modules')`.
- **VALIDATE**:
  - `npx tsc -b` exits 0.
  - Scratch test: `denoiseTree([{path:'node_modules/foo',type:'tree'},{path:'src/x.ts',type:'blob'}])` → only `src/x.ts` survives. `truncateReadme('a'.repeat(20000), 8192)` → length around 8192 bytes + the `[…README truncated, 20 KB total…]` marker.

### Task 4 — CREATE `src/lib/audit-prompt.ts`

- **IMPLEMENT**: `AUDIT_MAX_BODY_BYTES`, `README_MAX_BYTES`, `buildAuditSystemPrompt(agent)`, `buildAuditUserMessage(repo)`. See Patterns section for both functions verbatim.
- **IMPORTS**: `import type { Agent } from '../hooks/useAgent';` `import type { Repo } from './github';` `import { denoiseTree, truncateReadme } from './tree-denoise';`
- **GOTCHA — strict JSON instruction**: The system prompt is the only thing standing between the model and a markdown fence. Be explicit: "no markdown fence, no preamble, no commentary". The example finding is shown as JSON-shaped text, not wrapped in a fence. Models still occasionally add fences anyway — that's why `tryParsePartialFindings` and the final-parse step both strip them.
- **GOTCHA — example finding leakage**: Models will sometimes echo the example finding verbatim. The "(for shape reference; do not echo verbatim)" clause helps but doesn't eliminate it. Plan-time mitigation: keep the example's `id` ("ios-core") distinctive enough that owners spot when the model is parroting. Implementation does not need to filter — code review will catch a parroted audit.
- **GOTCHA — body byte cap**: `AUDIT_MAX_BODY_BYTES = 20_000` (per the locked decision). If a denoised tree + README still busts the cap, the snip strategy is: trim the tree first (less narrative value than the README), then hard-slice the whole body to the cap. Document the truncation in the body itself if you snip (a `…(tree truncated)` line is enough).
- **GOTCHA — agent name in system prompt**: `buildAuditSystemPrompt(agent)` interpolates the agent name. `'Other'` is a real value — render as "your agent" not as the literal string `'Other'`. Add a small `displayAgent(agent: Agent): string` helper or branch inline.
- **GOTCHA — empty languages dict**: `Object.entries(repo.languages)` on a brand-new repo with no detected languages is `[]`. The user-message builder renders `(none reported)` in that case rather than an empty section.
- **GOTCHA — null readme**: Already handled by `truncateReadme` returning `'(no README)'`.
- **VALIDATE**:
  - `npx tsc -b` exits 0.
  - Scratch test: build the prompt against a known `Repo` shape, log the byte size — should be < 20KB for typical mid-size repos.

### Task 5 — CREATE `src/lib/anthropic.ts`

- **IMPLEMENT**: The pure-function library. Exports in order:
  1. Types: `Severity`, `Finding`, `AnthropicErrorKind`, `AnthropicError`, `AnthropicUsage`, `SSEEvent`, `StreamAuditParams`, `StreamAuditCallbacks`, `AuditRequestBody`.
  2. Constants: `ANTHROPIC_HEADERS_BASE` (no `x-api-key` — that's per-call).
  3. Type guards: `isFinding`, `isFindingsArray`, `isAnthropicError`.
  4. Pure parser: `tryParsePartialFindings(text)`. See Patterns section.
  5. SSE parser: `parseSSEStream(reader, onEvent)`. See Patterns section.
  6. Error mapper: `mapAnthropicError(res, _key)`. See Patterns section. Note the `_key` forbidden-fruit marker (eslint `argsIgnorePattern: '^_'` already covers it).
  7. Stream wrapper: `streamAudit(params, callbacks, signal)`. See Patterns section.
- **IMPORTS**: `import type { GenerateModel } from './models';` That's the only one. No React.
- **GOTCHA — CORS header verification**: `'anthropic-dangerous-direct-browser-access': 'true'` is correct per handoff Appendix C as of January 2026. Per CLAUDE.md "Trust but verify", check [docs.anthropic.com](https://docs.anthropic.com/en/api/messages) at implementation time. If the name has shifted, update in this one place. Header mismatch → CORS error in the browser console with a clear message.
- **GOTCHA — input_tokens location**: Per current Anthropic docs, `input_tokens` arrives on the `message_start` event (`event.data.message.usage.input_tokens`); `output_tokens` is updated cumulatively on `message_delta` (`event.data.usage.output_tokens`). The `message_stop` event does NOT carry usage in all SDK versions. Code captures both in closure variables and reports them via `onUsage` on `message_stop`. Re-verify the field path against current docs.
- **GOTCHA — empty body**: `res.body` can be `null` on some platforms / when the server responds with an empty body. Guard explicitly — surface as `kind: 'invalid-response'`.
- **GOTCHA — `await mapAnthropicError`**: The function returns `Promise<AnthropicError>` in case we want to read `res.text()` for richer error messages later. **Do not read the response body for the error message** — that would risk leaking the request payload (which contains the user's repo data) into the error. The 401/429/413 branches use only status + `retry-after` header. The body is intentionally ignored.
- **GOTCHA — race on abort**: `streamAudit` swallows `AbortError` silently. The component knows it aborted because the abort was its own action. Do not call `onError` on abort.
- **GOTCHA — SSE blank-line semantics**: An empty line dispatches a buffered event. SSE allows multi-line `data:` (rare in practice from Anthropic) — the parser joins with `\n`. SSE allows `:` comments — the parser ignores them.
- **GOTCHA — TextDecoder stream mode**: `decoder.decode(value, { stream: true })` is mandatory inside the loop; the final flush (after `done`) doesn't strictly need it but is harmless. Without `stream: true`, a multi-byte char split across two `read()` chunks decodes to `U+FFFD`.
- **GOTCHA — partial parser is best-effort**: `tryParsePartialFindings` returns `[]` on any prefix that doesn't yet contain a complete finding object — that's correct; the component re-renders with `[]` until the model commits the first closing `}`. Do not throw, do not log a warning.
- **GOTCHA — fence stripping**: Both `tryParsePartialFindings` and the component's final parse strip a leading ```` ```json ```` (or just ```` ``` ````) and a trailing ```` ``` ````. The system prompt forbids them but models are unreliable.
- **VALIDATE**:
  - `npx tsc -b` exits 0.
  - Scratch test: feed `tryParsePartialFindings` a half-streamed JSON ("findings": [{"id":"a","severity":"high","area":"x","body":"y","suggested_next_step":"z"},{"id":"b","sev) and confirm it returns the first complete finding only.

### Task 6 — CREATE `src/hooks/useAudit.ts`

- **IMPLEMENT**: Mirror `src/hooks/useRepo.ts`. Returns `{ audit: Audit | null, setAudit: (a: Audit) => void, clear: () => void }`. See Patterns section.
- **PATTERN**: `src/hooks/useRepo.ts` lines 1–77. Same structure: `parseStored` with strict per-field validation, module-level `LISTENERS`, `broadcast`, lazy `useState` initializer with SSR guard, `useEffect` register/unregister, `useCallback` setters.
- **IMPORTS**: `useCallback`, `useEffect`, `useState` from `react`; `STORAGE_KEYS` from `../lib/storage-keys`; `type { Finding, AnthropicUsage }` + `{ isFindingsArray }` from `../lib/anthropic`; `type { GenerateModel }` + `{ isGenerateModel }` from `../lib/models`.
- **GOTCHA — strict validation**: `parseStored` rejects on any field-shape mismatch including a model literal that's no longer in `GENERATE_MODELS`. A user who downgraded the workbook (or whose old audit was made with a model that got removed) will start with `audit === null` — they can re-run. Safer than partial restore.
- **GOTCHA — `findings: []` is valid**: A persisted audit with `findings: []` + `rawText: '...'` means the final JSON parse failed and the user saved the fallback. `parseStored` must accept `findings: []` (it does — `isFindingsArray([])` returns true since `[].every(...)` is true).
- **GOTCHA — no per-field setters**: Callers always have the whole `Audit` at write time (from `streamAudit`'s `onComplete`). Per-field setters would be a footgun.
- **VALIDATE**:
  - `npx tsc -b` exits 0.
  - Scratch component: `const { audit } = useAudit();` — with no cache, `audit === null`. After a manual `localStorage.setItem(STORAGE_KEYS.audit, JSON.stringify(stubAudit))` + reload, `audit` matches `stubAudit`. (Delete scratch after.)

### Task 7 — CREATE `src/components/SeverityChip.tsx` and `src/components/FindingCard.tsx`

- **IMPLEMENT TWO FILES**:

  `SeverityChip.tsx`:
  ```tsx
  import type { Severity } from '../lib/anthropic';
  const LABELS: Record<Severity, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  export default function SeverityChip({ severity }: { severity: Severity }) {
    return (
      <span className={`severity-chip severity-chip--${severity}`}>
        {LABELS[severity]}
      </span>
    );
  }
  ```

  `FindingCard.tsx`:
  ```tsx
  import type { Finding } from '../lib/anthropic';
  import SeverityChip from './SeverityChip';
  export default function FindingCard({ finding }: { finding: Finding }) {
    return (
      <article className="finding-card" aria-labelledby={`finding-${finding.id}`}>
        <header className="finding-card__header">
          <h4 id={`finding-${finding.id}`}>{finding.area}</h4>
          <SeverityChip severity={finding.severity} />
        </header>
        <p className="finding-card__body">{finding.body}</p>
        <p className="finding-card__next">
          <strong>Next:</strong> {finding.suggested_next_step}
        </p>
      </article>
    );
  }
  ```

- **GOTCHA — no markdown rendering**: The model is instructed to produce plain English in `body`, no markdown. Render with a plain `<p>` and `white-space: pre-wrap` in CSS so paragraph breaks (`\n\n`) survive. **Do not** use `react-markdown` here — it would invite the model to start emitting headings and lists despite instructions, and would import a transitive dependency tree we don't need. (`react-markdown` is in `package.json` for the prompt-library page; it's not a new import here, but routing it through this surface is the wrong precedent.)
- **GOTCHA — aria id collisions**: `finding-${id}` — relies on the model producing unique ids. The system prompt asks for stable kebab-case ids; if the model fails, two findings could collide. Acceptable for v1 (visual; not functional). Roadmap: dedupe-with-suffix in the component if it becomes a real bug.
- **GOTCHA — empty body / next-step**: A model that returns `body: ""` or `suggested_next_step: ""` should still render the card (the chip + heading are useful). Don't conditionally hide.
- **VALIDATE**:
  - `npx tsc -b` exits 0.
  - In a scratch host, render `<FindingCard finding={stubFinding} />` and check the DOM renders the chip class, the heading, the body, and the "Next:" line.

### Task 8 — CREATE `src/components/AuditCard.tsx`

- **IMPLEMENT**: The main UI component. Sections in render order:
  1. **Card chrome**: `<section className="audit-card" aria-labelledby="audit-card-title">`.
  2. **Heading**: `<h3 id="audit-card-title">Audit my repo</h3>` + 1-sentence intro: "We send your repo's denoised tree, languages, and README to Anthropic with your stored key. The audit takes ~10–30 seconds and costs a few cents."
  3. **Staleness banner** (only if `audit && repo && (audit.repoOwner !== repo.owner || audit.repoName !== repo.repo)`): `<p className="audit-card__staleness">Cached audit was for <code>{audit.repoOwner}/{audit.repoName}</code>. <button onClick={onRun} className="audit-card__link-btn">Refetch for {repo.owner}/{repo.repo}</button></p>`.
  4. **Action row**: a single primary `<button className="btn">` whose label + handler + `disabled` derive from the state machine:
     - `!hasKey` → label "Audit my repo", `disabled`, no handler.
     - `!hasRepo` → label "Audit my repo", `disabled`, no handler.
     - `streaming` → label "Stop", handler `onStop`, NOT disabled.
     - `audit && !streaming` → label "Refetch audit", handler `onRun`.
     - else → label "Audit my repo", handler `onRun`.
     Plus a secondary "Copy as markdown" `<button className="btn ghost">` shown whenever there's something to copy (`audit?.findings.length > 0 || audit?.rawText`).
  5. **Inline hint or error** (mutually exclusive):
     - If `error`: `<p className="audit-card__error" role="alert">{error.message} {error.next}</p>`.
     - Else if `!hasKey`: `<p className="audit-card__hint">Add your Anthropic API key in Settings to enable in-page audit.</p>` — *the word "Settings" is a `<button>` styled like a link that opens `SettingsDialog`*. The page already mounts `SettingsButton` in `Topbar` — easiest path is to lift the dialog's open state via a ref on the gear button or via a small `dispatchEvent('open-settings')` pattern. **Simpler alternative for v1**: render `<Link to="/your-picture">` is wrong (that's for repo). Render a plain anchor `<a href="#" onClick={openSettings}>Settings</a>` where `openSettings` clicks `document.getElementById('settings-btn')` to trigger the existing button. *Pick whichever is more idiomatic at implementation time — flag in the handoff.*
     - Else if `!hasRepo`: `<p className="audit-card__hint">Paste your GitHub repo URL on the <Link to="/your-picture">Your codebase picture</Link> page first.</p>` (use `react-router-dom`'s `Link`, mirrors `SettingsDialog.tsx` lines 251–256).
  6. **Streamed findings list**: when `streaming || (audit && audit.findings.length > 0)`:
     ```tsx
     <div className="audit-card__findings">
       {(streaming ? streamFindings : audit.findings).map((f) => (
         <FindingCard key={f.id} finding={f} />
       ))}
     </div>
     ```
  7. **Fallback raw-text block**: when `!streaming && audit && audit.findings.length === 0 && audit.rawText`:
     ```tsx
     <div className="audit-card__fallback">
       <p>We couldn't structure the audit output. Here's the raw text — copy it into your agent or click Refetch.</p>
       <pre>{audit.rawText}</pre>
     </div>
     ```
  8. **Usage + cost line**: when `audit && !streaming`:
     ```tsx
     <p className="audit-card__usage">
       Used {audit.usage.input_tokens.toLocaleString()} input + {audit.usage.output_tokens.toLocaleString()} output tokens · {formatUsd(estimateCostUsd(audit.model, audit.usage))} · model: {audit.model}
     </p>
     ```
  9. **Privacy hint** (always): `<p className="audit-card__hint">Your API key never leaves your browser except as an <code>x-api-key</code> header to <code>api.anthropic.com</code>.</p>` — mirrors `SettingsDialog`'s voice (lines 146–149, 165–171).

- **PROPS**: none. Reads from `useSettings()`, `useRepo()`, `useAgent()`, `useAudit()`.
- **STATE**: `status: 'idle' | 'streaming'`, `error: AnthropicError | null`, `streamText: string`, `streamFindings: Finding[]`. Refs: `abortRef: useRef<AbortController | null>(null)`.
- **EFFECTS**:
  - Cleanup: `useEffect(() => () => abortRef.current?.abort(), []);` — abort in-flight stream on unmount.
- **IMPORTS**: `useEffect`, `useRef`, `useState` from `react`; `Link` from `react-router-dom`; `useSettings` from `../hooks/useSettings`; `useRepo` from `../hooks/useRepo`; `useAgent` from `../hooks/useAgent`; `useAudit` from `../hooks/useAudit`; `buildAuditSystemPrompt`, `buildAuditUserMessage` from `../lib/audit-prompt`; `streamAudit`, `tryParsePartialFindings`, `isAnthropicError`, `isFindingsArray`, type `AnthropicError`, type `AnthropicUsage`, type `Finding` from `../lib/anthropic`; `estimateCostUsd`, `formatUsd` from `../lib/pricing`; `FindingCard` from `./FindingCard`.
- **GOTCHA — race semantics**: Every `onRun` invocation calls `abortRef.current?.abort()` *before* assigning a new `AbortController`. Mirror `RepoFetcher.tsx:36–38` verbatim. A slow first stream + a fast Refetch must not write the slow result over the fast result.
- **GOTCHA — abort vs error**: Aborted streams must NOT call `onError` and must NOT write to `useAudit`. Manual stop resets `status` to `'idle'` and clears `streamText`/`streamFindings`. The previous `audit` (if any) survives.
- **GOTCHA — Copy as markdown content**: Build a markdown table from `audit.findings`. If `audit.findings.length === 0` but `audit.rawText`, copy the raw text. Header row: `| Area | Severity | Body | Next step |`. Body cells must escape pipes (`replace(/\|/g, '\\|')`) and newlines (`replace(/\n/g, ' ')`). One-line "Copied" status flip is nice but not required; if added, use a 1.5s `setTimeout` cleanup mirror of `PersonaCard.tsx:42–53`.
- **GOTCHA — disabled vs hidden**: The Audit button stays *visible* when no key / no repo, just `disabled`. Hiding it would make the hint feel orphaned. Match the visual hierarchy of `RepoFetcher.tsx:104–111`.
- **GOTCHA — settings-dialog open trigger**: The cleanest path is `document.getElementById('settings-btn')?.click()` — `SettingsButton.tsx` already exposes that id (verify at implementation time). If it doesn't, add an `id` there as a one-line modification. Avoid pulling SettingsDialog state up into context — over-engineering for v1.
- **GOTCHA — streaming render storm**: `setStreamText` + `setStreamFindings` fire on every `onTextDelta`. React 19 batching makes this fine, but `tryParsePartialFindings` walks the whole text on every tick — for a 20KB final output that's ~O(n²). Acceptable in practice (audits are small) but flag in the NOTES section as a future optimization (incremental parser).
- **GOTCHA — empty findings + rawText collision**: When the model produces valid JSON but with `findings: []` (a legitimate "I have nothing to say" response), the UI shows no cards, no fallback block (since `rawText` exists but `findings` is also valid). Add an explicit empty state: if `audit && !streaming && audit.findings.length === 0 && !audit.rawText.includes('{')`, render `<p className="audit-card__hint">The audit returned no findings. Try Refetch.</p>`. Edge case — flag in tests.
- **GOTCHA — Anthropic key check**: Treat `settings.anthropicKey.trim().length === 0` as "no key" — a user who pastes `"  "` should see the disabled state, not a 401.
- **VALIDATE**:
  - `npx tsc -b` exits 0.
  - Manual: load `#/phase-2` without an API key → button disabled, hint shows. Add a key, no repo fetched → still disabled, different hint. Fetch a repo, click → cards stream in. Click Stop mid-stream → stream halts; previous cached audit (if any) intact.

### Task 9 — UPDATE `src/styles/globals.css`

- **IMPLEMENT**: Append `.audit-card*` + `.severity-chip*` + `.finding-card*` rules at the end of the file. Required rules:
  - `.audit-card` — `padding: 1.4rem 1.5rem`, `background: var(--bg-card)`, `border: 1px solid var(--rule)`, `border-radius: 6px`, `margin: 1.5rem 0`. Slightly more prominent than `.repo-fetcher` (which uses `var(--bg-elev)`) — the audit is *the* primary affordance on this page.
  - `.audit-card h3` — `var(--serif)`, `font-size: 1.15rem`, `margin: 0 0 0.4rem`.
  - `.audit-card__intro` — `color: var(--ink-soft)`, `font-size: 0.9rem`, `margin: 0 0 1rem`.
  - `.audit-card__actions` — `display: flex`, `gap: 0.6rem`, `flex-wrap: wrap`, `margin: 1rem 0 0.6rem`.
  - `.audit-card__hint` — `font-size: 0.85rem`, `color: var(--ink-mute)`, `margin: 0.6rem 0 0`.
  - `.audit-card__error` — same chrome as `.repo-fetcher__error` (you can use `@extend`-style by appending to the existing rule selector, but plain duplication is fine for ~7 lines).
  - `.audit-card__staleness` — `font-size: 0.85rem`, `color: var(--warn)`, `margin: 0.6rem 0`, `padding: 0.6rem 0.8rem`, `background: var(--warn-bg)`, `border-radius: 4px`.
  - `.audit-card__fallback` — `margin-top: 1rem`. Contains a `<pre>` — style with `max-height: 24rem`, `overflow: auto`, `padding: 0.8rem 1rem`, `background: var(--bg-elev)`, `border: 1px solid var(--rule)`, `border-radius: 4px`, `font-family: var(--mono)`, `font-size: 0.8rem`, `white-space: pre-wrap`, `word-break: break-word`.
  - `.audit-card__usage` — `font-size: 0.82rem`, `color: var(--ink-mute)`, `margin: 1rem 0 0`, `font-family: var(--mono)`.
  - `.audit-card__findings` — `display: flex`, `flex-direction: column`, `gap: 0.8rem`, `margin-top: 1rem`.
  - `.audit-card__link-btn` — reuse the existing `.repo-fetcher__link-btn` styling; either add `.repo-fetcher__link-btn, .audit-card__link-btn` to the existing rule (preferred — single source of truth) or duplicate.
  - `.severity-chip` — `display: inline-block`, `padding: 0.15rem 0.55rem`, `border-radius: 999px`, `font-size: 0.72rem`, `font-weight: 600`, `font-family: var(--body)`, `letter-spacing: 0.02em`, `text-transform: uppercase`.
  - `.severity-chip--high` — `background: var(--accent-bg)`, `color: var(--accent)`.
  - `.severity-chip--medium` — `background: var(--warn-bg)`, `color: var(--warn)`.
  - `.severity-chip--low` — `background: var(--rule-soft)`, `color: var(--ink-mute)`.
  - `.finding-card` — `padding: 1rem 1.1rem`, `background: var(--bg-elev)`, `border: 1px solid var(--rule-soft)`, `border-radius: 5px`.
  - `.finding-card__header` — `display: flex`, `align-items: center`, `gap: 0.6rem`, `margin-bottom: 0.4rem`. The `<h4>` inside: `var(--serif)`, `font-size: 1rem`, `margin: 0`, `flex: 1`.
  - `.finding-card__body` — `white-space: pre-wrap`, `margin: 0.3rem 0`, `color: var(--ink)`, `font-size: 0.92rem`, `line-height: 1.5`.
  - `.finding-card__next` — `font-size: 0.88rem`, `color: var(--ink-soft)`, `margin: 0.4rem 0 0`. The `<strong>`: `color: var(--ink)`, `font-weight: 600`.
  - `@media (max-width: 600px) { .audit-card { padding: 1rem; } .finding-card { padding: 0.8rem 0.9rem; } .audit-card__actions { gap: 0.5rem; } }`.
- **PATTERN**: `.repo-fetcher*` block at lines 1246–1329. Mirror tone, spacing, and dark-mode strategy (vars-only, no `[data-theme="dark"]` overrides).
- **GOTCHA — dark mode**: All colors come from CSS variables defined in lines 1–47 of globals.css. Do not introduce literal hex codes. Severity-chip backgrounds use the existing `--accent-bg`, `--warn-bg`, `--rule-soft` — which all adapt under `[data-theme="dark"]`. Verify chip contrast in dark mode at Task 11.
- **GOTCHA — `.btn` hover on disabled**: `.btn:hover` (line 812) doesn't gate on `:not(:disabled)` in v1. Verify a disabled audit button doesn't show a hover transform; if it does, add `:disabled` styles. (Mirror what RepoFetcher already does — its disabled state currently works visually, so the existing `.btn` rules likely already handle it.)
- **GOTCHA — `<pre>` overflow on mobile**: The fallback `<pre>` must `overflow: auto` AND `word-break: break-word` AND `white-space: pre-wrap` — without all three, a long raw-text payload bursts out of the viewport at 375px. Test explicitly.
- **GOTCHA — wrap on action row**: `.audit-card__actions` is `flex-wrap: wrap` — at 375px the "Copy as markdown" button wraps to the next line under the primary button. That's correct.
- **VALIDATE**: `npm run format:check` passes; visual check at 375px and at desktop in both themes; severity chips legible in dark mode against `.finding-card`'s `--bg-elev`.

### Task 10 — UPDATE `src/pages/Phase2.tsx`

- **IMPLEMENT**: Insert `<AuditCard />` between the existing `<CodeBlock lang="markdown">{discoveryPrompt}</CodeBlock>` (around line 80) and the existing `<h2>Step 3 — Read the output critically</h2>` (around line 82). Add a one-sentence intro paragraph above `<AuditCard />`:
  > "Or — if you've pasted your repo URL and added an Anthropic API key — run the audit right here:"
- **PATTERN**: The existing structure on lines 25–155 — components stack directly inside `<>`. No special wrappers.
- **IMPORTS**: Add `import AuditCard from '../components/AuditCard';`.
- **GOTCHA**: Do **not** remove the existing discoveryPrompt CodeBlock or any of the surrounding copy. The card is *additive* — users without an Anthropic key (or who prefer their local agent) still copy-paste the prompt.
- **GOTCHA**: Do not change the section number (`05`) or the H1 — content is ported verbatim, this is only adding a new affordance.
- **GOTCHA — Checklist integration**: The existing checklist (lines 137–152) has items like "Ran the discovery prompt against my repo". The in-page audit also satisfies this — but **do not auto-tick checklist items**. The user's local-agent workflow is what the checklist tracks; the in-page audit is a complement. Document this as a deliberate non-change in the handoff.
- **VALIDATE**: `npm run build` passes. Manual: load `#/phase-2`, see the new card between the CodeBlock and the Step 3 heading; existing copy unchanged.

### Task 11 — Manual validation pass

- **IMPLEMENT**: Full acceptance walk (see Validation Commands → Level 4). Before the first real API call: re-verify the CORS header name at <https://docs.anthropic.com/en/api/messages> and the SSE event field locations at <https://docs.anthropic.com/en/api/messages-streaming>. If either has shifted, update in `src/lib/anthropic.ts` only.
- **VALIDATE**: All Acceptance Criteria boxes below check.

### Task 12 — Handoff doc + commit

- **IMPLEMENT**: Write `.agents/handoff/capability-c1-audit.md` mirroring the format of `.agents/handoff/capability-b-github-fetch.md`. Cover: what was built, files changed, acceptance status, deviations from plan, TODOs.
- **IMPLEMENT**: Run `/code-review` first, then `/commit`. Suggested message: `feat: add audit-my-repo (Capability C1)`.
- **VALIDATE**: `git status` clean post-commit.

---

## TESTING STRATEGY

The project has no test framework wired (no `jest`, `vitest`, or test script in `package.json`). Validation is **type-check + lint + format + manual**. Adding a test framework is out of scope per `CLAUDE.md`.

### Unit Tests

None — no framework. (`tryParsePartialFindings`, `denoiseTree`, `truncateReadme`, `mapAnthropicError`, `parseSSEStream`, `estimateCostUsd` are all unit-testable in spirit; if a future capability adds Vitest, these are the first functions to test.)

### Integration Tests

None — no framework.

### Edge Cases (manual)

- **No API key, no repo**: Card renders, button disabled, hint says "Add your Anthropic API key in Settings…".
- **No API key, repo fetched**: Same hint.
- **API key present, no repo**: Hint says "Paste your GitHub repo URL on the Your codebase picture page first."
- **API key present, repo fetched, fresh run**: Button enabled. Click → cards stream in progressively. Severity chips render as findings materialize. Usage line + cost appear after `message_stop`. Audit persists to `localStorage`.
- **Refetch with existing audit**: Button label is "Refetch audit". Click → existing cards stay rendered until the first new finding parses, then progressively replaced. (Alternative behavior: clear cards on click. Both are defensible; pick whichever feels less jarring at Task 8 implementation and document.)
- **Mid-stream Stop**: Button label flips to "Stop" during streaming. Click → fetch aborts. Previous audit (if any) remains in cache. New partial stream is discarded.
- **Mid-stream unmount**: Navigate away during stream. No console errors. No "Can't perform a React state update on an unmounted component" warnings.
- **Mid-stream click Audit again**: Prior controller aborts before new one starts. Network panel shows the prior request as `(canceled)`.
- **Invalid API key**: Set key to `'sk-ant-bogus'`. Error `kind: 'unauthorized'`, message "Anthropic rejected your API key.", next step "Open Settings (gear icon) and check your Anthropic API key." No part of the key value appears in the message or anywhere in the DOM.
- **Rate limit**: Hard to trigger; manual: temporarily edit `mapAnthropicError` to short-circuit to 429, confirm the `retry-after` interpolation works (the header may be absent, in which case the message is "Anthropic rate limit hit. Wait a moment and try again." without the seconds count). Revert.
- **Context too large**: Hard to trigger; manual: temporarily edit `buildAuditUserMessage` to skip the byte cap and feed a 200KB body. Confirm the `kind: 'context-too-large'` path renders with the user-friendly message. Revert.
- **Network failure**: Disable network in DevTools. Click Audit. Error `kind: 'network'`, message "Could not reach Anthropic.", next step "Check your connection and try again."
- **Model returns invalid JSON**: Hard to trigger reliably; manual: temporarily replace the `onComplete` body with a literal "the model said hello" string. Confirm the fallback block renders with the raw text and the "Couldn't structure this output" copy. Revert.
- **Model returns valid JSON but with `findings: []`**: Manual: stub `onComplete` to feed `'{"findings":[]}'`. Confirm the empty-state hint renders.
- **Model adds a markdown fence around the JSON**: Manual: stub `onComplete` to feed ```` "```json\n{\"findings\":[...]}\n```" ````. Confirm the fence is stripped and findings render.
- **Model includes a non-`high|medium|low` severity**: One bad finding is rejected by `isFinding`; `isFindingsArray` returns `false`; fallback block renders. Verify with a stubbed `onComplete`.
- **Stale cached audit (repo changed)**: With a cached audit for `repo-A` and `useRepo` switched to `repo-B`, load `#/phase-2`. Staleness banner renders ("Audit was for `repo-A`. Refetch for `repo-B`?"). Cards still visible. Click Refetch → wipe + re-run.
- **Cached audit on cold load**: Reload the browser with an existing `aiLayer.audit`. Cards render from cache instantly; usage line + cost line render. No network call until user clicks Refetch.
- **Cleared by Settings clear-all**: From `SettingsDialog`, "Clear all keys & settings" wipes `aiLayer.audit` (it does, via `Object.values(STORAGE_KEYS)` — verify in DevTools → Application → Local Storage).
- **Cleared by Refetch**: Refetch wipes + replaces cleanly; the partial-stream state is cleared, not appended.
- **localStorage unavailable** (private browsing on some browsers): `setAudit` no-ops; in-memory `audit` still surfaces during the session. Verify no console errors.
- **Corrupted cache**: Hand-edit `aiLayer.audit` to invalid JSON or to a structure missing a field → reload → `audit === null` (strict parseStored).
- **Mobile (375px)**: Card padding fits, finding cards stack, severity chips legible, action row wraps cleanly, fallback `<pre>` does not horizontal-scroll.
- **Dark mode**: Every element legible. Severity chip backgrounds visible against `.finding-card`'s `--bg-elev`. Fallback `<pre>` background distinguishable from card.
- **Console hygiene**: Walk the entire flow with DevTools → Console open. Zero errors, zero warnings, no PAT- or key-shaped string in console history.
- **Network hygiene**: DevTools → Network → search for `x-api-key` in request headers — only on requests to `api.anthropic.com`. Zero leakage to any other host. The request body to Anthropic does NOT contain the key.
- **Copy as markdown**: Click → clipboard contains a valid markdown table with `| Area | Severity | Body | Next step |` header and one row per finding. Pipes in body cells are escaped. Newlines in body cells are flattened.
- **Copy with fallback**: When `findings` is empty but `rawText` exists, Copy copies the raw text (not a header-only table).
- **Settings dialog open from hint**: Click the "Settings" link in the no-key hint. SettingsDialog opens. Verify focus moves to the dialog (matches existing `SettingsDialog` behavior).

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

**Before the first real call:** open <https://docs.anthropic.com/en/api/messages> and confirm the CORS header name is still `anthropic-dangerous-direct-browser-access`. Open <https://docs.anthropic.com/en/api/messages-streaming> and confirm the SSE event names and field paths. Update `src/lib/anthropic.ts` if anything has shifted.

Walk through each item — every checkbox must be true:

- [ ] Navigate to `#/phase-2`. AuditCard visible between the discovery-prompt CodeBlock and the "Step 3" heading. Existing copy untouched above and below.
- [ ] No Anthropic key set, no repo fetched → Audit button is `disabled`. Hint reads "Add your Anthropic API key in Settings to enable in-page audit."
- [ ] Click "Settings" in the hint → SettingsDialog opens, focus moves into it.
- [ ] Add an Anthropic key. Hint switches to "Paste your GitHub repo URL on the Your codebase picture page first." Audit button still disabled.
- [ ] Navigate to `/your-picture`, fetch `coleam00/helpline`. Return to `#/phase-2`. Audit button enabled.
- [ ] Click Audit. Within ~1–2 seconds the first finding card appears. More findings stream in over ~10–30 seconds. Severity chips render as they materialize.
- [ ] After `message_stop`, usage line appears: "Used X input + Y output tokens · ~$0.0Z · model: claude-opus-4-7".
- [ ] DevTools → Application → Local Storage → `aiLayer.audit` blob contains the parsed Audit object. Does NOT contain the API key.
- [ ] Reload the page. Audit cards render from cache instantly. No network call until user clicks Refetch.
- [ ] Click "Refetch audit". Old cards either persist until first new finding parses or clear immediately (per Task 8 choice). Stream proceeds.
- [ ] Mid-stream, click "Stop". Stream halts. Previous cached audit (if any) intact in storage.
- [ ] Click Audit twice quickly (race). DevTools → Network → only one in-flight Anthropic request; the prior one shows `(canceled)`.
- [ ] Click "Copy as markdown". Paste into a markdown viewer — valid table with all findings.
- [ ] Set Anthropic key to a garbage value (`sk-ant-bogus`). Click Audit. Error renders: "Anthropic rejected your API key. Open Settings (gear icon) and check your Anthropic API key." No part of the key value appears anywhere in the DOM or the message.
- [ ] DevTools → Console → search history for `sk-ant`, `x-api-key`, `Authorization`, `Bearer`. Zero matches outside the masked password input value.
- [ ] DevTools → Network → all `api.anthropic.com` requests include `x-api-key`. Zero requests to any other host include it.
- [ ] DevTools → Network → request body to Anthropic contains the system prompt, repo summary, and README — but NOT the API key.
- [ ] In Settings, change generate model to `claude-sonnet-4-6`. Click Refetch. Usage line shows the new model and the Sonnet-rate cost.
- [ ] In Settings, "Clear all keys & settings" → Confirm. Reload. `aiLayer.audit` gone alongside `aiLayer.settings` and `aiLayer.repo`.
- [ ] Resize to 375px. Card padding tighter, action row wraps, finding cards stack, severity chips legible, fallback `<pre>` (if visible) does not horizontal-scroll.
- [ ] Toggle dark mode. Card visible, chip contrast acceptable, fallback `<pre>` background distinguishable from card background.
- [ ] Zero regressions in Capability A (open Settings dialog, save keys, close, reopen — all still works).
- [ ] Zero regressions in Capability B (fetch a repo, persona auto-populates).
- [ ] Console: zero errors and zero warnings during the full walkthrough.

### Level 5: Additional Validation (Optional)

If `mcp__playwright__*` is available, automate the no-key-disabled / key-only-disabled / repo-fetched-enabled / mid-stream-stop walkthrough. Not required for v1.

---

## ACCEPTANCE CRITERIA

From `Docs/ai-layer-workbook-claude-code-handoff.md` §4 C1 + §6 + §14 + this plan:

- [ ] AuditCard renders on Phase 2 between the discoveryPrompt CodeBlock and the "Step 3" heading; existing copy unchanged.
- [ ] Audit button is `disabled` with a clear hint when Anthropic key or repo is missing; enabled otherwise.
- [ ] Click Audit streams a structured JSON audit of the user's repo, rendering severity-chipped finding cards as the response arrives.
- [ ] Findings persist to `aiLayer.audit` in `localStorage`; the cache survives reload and renders instantly on cold load.
- [ ] "Refetch audit" wipes the cache and re-runs.
- [ ] Mid-stream "Stop" aborts cleanly; previous audit cache (if any) is preserved.
- [ ] Race-safety: clicking Audit/Refetch repeatedly aborts the prior controller before issuing a new fetch.
- [ ] Stream errors are explicit and user-actionable: 401 unauthorized, 429 rate-limit (with retry-after), 413 context-too-large, 5xx server, network, invalid-response.
- [ ] If the final JSON parse fails, a raw-text fallback block renders; usage + cost still surface.
- [ ] Usage line displays input tokens, output tokens, estimated cost in USD, and the model used.
- [ ] "Copy as markdown" button copies a valid markdown table of the findings (or the raw text in fallback mode).
- [ ] Staleness banner renders when cached audit's repo doesn't match `useRepo`'s current repo; cards still visible; Refetch wipes + re-runs.
- [ ] Settings "Clear all keys & settings" also wipes `aiLayer.audit` (via existing `Object.values(STORAGE_KEYS)` loop).
- [ ] No Anthropic key appears in console logs, network requests to any host other than `api.anthropic.com`, thrown errors, ARIA labels, titles, placeholders, error messages, or any DOM attribute other than the controlled `value` of the password input in Settings.
- [ ] No new npm dependencies (no `@anthropic-ai/sdk`, no SSE library).
- [ ] Mobile-usable at 375px: no horizontal scroll, every control reachable, fallback `<pre>` wraps.
- [ ] Dark mode legible: severity chips, fallback `<pre>`, error block, staleness banner.
- [ ] `npx tsc -b`, `npm run lint`, `npm run format:check`, `npm run build` all exit 0.
- [ ] Zero regressions in Settings (Capability A), GitHub fetch (Capability B), PersonaCard manual edits, persona templates, theme, agent picker, mobile drawer, glossary popup, navigation.
- [ ] CORS header name re-verified against current Anthropic docs at implementation time.

---

## COMPLETION CHECKLIST

- [ ] All 12 tasks completed in order.
- [ ] Each task's `VALIDATE` step passed before moving to the next.
- [ ] All Level 1 commands exit 0.
- [ ] Level 4 manual walkthrough — every checkbox green.
- [ ] All Acceptance Criteria met.
- [ ] No console errors or warnings.
- [ ] No new npm dependencies introduced.
- [ ] No `console.log`/`console.error`/`console.warn`/`console.debug` calls in new code.
- [ ] Secret-grep of changed files: `grep -rE "sk-ant-|x-api-key" src/` returns ZERO matches outside the `'x-api-key'` header construction in `src/lib/anthropic.ts`.
- [ ] CORS header name verified against current Anthropic docs.
- [ ] Code reviewed via `/code-review`.
- [ ] `.agents/handoff/capability-c1-audit.md` written.
- [ ] Ready to commit with message `feat: add audit-my-repo (Capability C1)`.

---

## NOTES

**Design decisions:**

1. **UI placement on Phase 2, not `/your-picture`** — The handoff brief (§4 C1) places C1 on Phase 2 — Discovery. `/your-picture` is persona territory (Capability B). Phase 2 is where the discovery audit conceptually belongs in the workbook's narrative. The card is *additive* — the existing copy-paste prompt + CodeBlock stay so users without a key still have a path forward.

2. **Empty-state hints, not error blocks** — When the API key or repo is missing, the user hasn't *attempted* anything yet, so an error block would be misleading. A neutral hint underneath a disabled button matches the visual language of `RepoFetcher.tsx`'s "Need a GitHub token? Open Settings" line. The error slot is reserved for actual fetch failures.

3. **Hand-rolled fetch + SSE parser, no `@anthropic-ai/sdk`** — The SDK's browser story is currently `dangerouslyAllowBrowser: true` with the same CORS-opt-in header we'd set manually. The library would add ~150KB to the bundle for one endpoint and one streaming pattern. Hand-rolled mirrors the precedent set by `github.ts` (handoff §5 explicitly accepts hand-rolled), keeps the dependency surface zero, and makes the key-safety invariants auditable in one file.

4. **Forbidden-fruit `_key` parameter on `mapAnthropicError`** — Identical pattern to `_pat` on `mapGithubError` (Capability B). TypeScript can't enforce "this string never appears in returns"; the leading-underscore + lint rule (`argsIgnorePattern: '^_'` already configured) is the visual marker for code-review attention. A future grep-based CI step could enforce it.

5. **Severity scale: `'high' | 'medium' | 'low'`** — The v1 prompt's "Priority 1/2/3" maps cleanly to severity. Chips read better than numbers; the mapping is explicit in the system prompt. If owner pushes back, a one-line edit in `buildAuditSystemPrompt` plus a chip-label swap restores numeric labels.

6. **Two-track JSON validation: progressive render + final validate** — Streaming UX requires *something* on screen before `message_stop`. A tolerant prefix parser (`tryParsePartialFindings`) renders complete-so-far findings as the model emits closing braces; the strict final parse runs once on `message_stop` and decides whether to persist structured findings or the raw-text fallback. This costs ~30 lines of parsing code but turns a 30-second wait into a progressively-revealing UX.

7. **Cached audit on cold load, no auto-refetch** — The user paid tokens for the prior audit. A cold load that silently triggered a new run would be a surprising cost. Cached cards render instantly; the user clicks Refetch when they want a new pass. The staleness banner handles the "repo changed" case without forcing a re-run.

8. **`aiLayer.audit` is a single-slot cache, not per-repo** — Matches `aiLayer.repo`'s single-slot model and the v3.0 mental model ("the user has one repo right now"). Per-repo or per-finding caching is a roadmap item; the audit object's `repoOwner+repoName` fields make migration straightforward later.

9. **No "Send to next step" button** — The handoff brief mentions "pre-populates Phase 3" but Phase 3 is C3 (sub-CLAUDE.md drafts). That's a forward dependency. The `audit.findings[].id` field is the stable handle C3 will key its per-finding "Draft this one" buttons on — included now so C3 doesn't have to migrate the cache shape. Left as a TODO in NOTES rather than wiring a stub.

10. **"Copy as markdown" is the v1-compatible affordance** — The handoff brief's "Returns: the discovery table" is honored by Copy-as-markdown: same column structure as the v1 prompt's expected output (`Path | Domain/language | Gotchas | Scoped test command | Priority` → `Area | Severity | Body | Next step`). The richer in-page UI (cards + chips) is the additive Level-3 affordance.

11. **Pricing constants in `pricing.ts`, hand-maintained** — Pricing changes; an over-engineered "fetch the price catalog" path would couple the workbook to a flaky external endpoint. Hand-maintained constants with a "re-verify on each model addition" header comment is the lowest-effort, highest-clarity option. Cost is displayed with `~` prefix to signal estimate.

12. **AuditCard reads `useAgent()` to interpolate the agent name into the system prompt** — Mirrors the workbook's voice (every prompt is phrased in terms of "your agent" — Claude Code, Cursor, etc.). Without this, the audit would say "your agent" generically; with it, the audit says "when you run Claude Code" / "when you run Cursor" etc., which makes the next-step copy actionable.

13. **No `react-markdown` for finding bodies** — The system prompt forbids markdown in `body`. Adding a markdown renderer would invite the model to start emitting headings + lists despite instructions and would expand the surface area where the model can drift. Plain `<p>` with `white-space: pre-wrap` is enough.

14. **The body byte cap is preventive, not protective** — Anthropic's actual context limit is far higher than 20KB. The cap is to keep the cost predictable and the audit fast. A massive repo (whose tree alone exceeds the cap after denoising) gets a snipped tree; the model is told (by virtue of the `…(tree truncated)` line in the body) that the input is incomplete. Acceptable for v1.

15. **`message_stop` decides persistence, not `message_delta`** — Some streams emit `message_delta` multiple times; `message_stop` is the canonical "I'm done" signal. The `onUsage` callback fires there with the final running total. Verify against current docs at Task 11.

**Risks:**

- **Anthropic API drift**: The CORS header name and SSE event field paths have shifted historically. `streamAudit` and `mapAnthropicError` are the only places that need to change. CLAUDE.md "Trust but verify" gate at Task 11 catches this before the first real call.
- **Model JSON drift**: Even with a strict system prompt, the model will occasionally produce malformed output. The two-track validation (progressive parse + final-validate-or-fallback) keeps the UX from failing closed. Worst case: the user sees a "We couldn't structure this output" block with the raw text and clicks Refetch.
- **Bundle-size discipline**: A future temptation to pull in `@anthropic-ai/sdk` "for ergonomics" should be resisted — the hand-rolled path is ~250 lines and is auditable in one file. If a future capability needs tool-use or multi-turn, revisit then.
- **Cost runaway**: A user with an Opus key who clicks Refetch repeatedly could rack up a non-trivial bill. v1 mitigation: prominent cost display + "Refetch wipes the cache" warning copy. v3.1+ option: a "spent this session" rolling counter.
- **Race-safety on rapid clicks**: AbortController + abort-before-assign covers the common case. A user clicking Audit 10× in 100ms generates 10 controllers, 9 aborts, 1 in-flight request. React 19 batching makes this fine; no rate-limiter needed.
- **Progressive parser correctness**: `tryParsePartialFindings` is brace-depth-aware but assumes balanced quotes within strings. A model that emits an unescaped quote inside a string would confuse the parser until the closing brace arrives, at which point the next tick recovers. Worst-case visual: a finding card disappears for one tick and reappears. Acceptable.
- **Cache schema drift between C1 and C3**: `Audit.findings[].id` is the contract C3 will key its "Draft this one" buttons on. If C3 changes the schema, parseStored's strictness will reject older blobs cleanly — users will lose their cached audit, not crash the app.
- **`document.getElementById('settings-btn')?.click()` as the open-settings trigger**: Brittle if `SettingsButton`'s id changes. Add a comment at the call site and consider lifting the dialog state into context in C2 or later if more components need it. Pragmatic for v1.
- **Pricing accuracy**: Hand-maintained constants drift from reality between Anthropic price changes. The `~` prefix on the displayed cost signals "estimate"; the header comment in `pricing.ts` reminds maintainers to update.

**Forward dependencies surfaced for future capabilities:**

- **C2 (Draft my root CLAUDE.md)**: Will reuse `streamAudit`'s shape (rename or generalize to `streamGenerate`), `mapAnthropicError`, `parseSSEStream`, `pricing.ts`, and the `audit-card`-style four-state button machine. The prompt-builder pattern (`audit-prompt.ts`) should generalize to a `prompts/` directory or a single `prompts.ts` with named exports — flag at C2 planning time.
- **C3 (Draft this sub-CLAUDE.md)**: Will key its "Draft this one" buttons on `audit.findings[].id`. The handoff brief mentions "Send to next step" — that's where it lives. C3's plan should describe how a per-finding click navigates to Phase 3 with the finding id in URL state or hash.
- **C4 (Draft this skill)**: Free-text input + same streaming + same render shape (likely a single long markdown output, not a findings array). The "Copy as markdown" pattern transfers.
- **Roadmap**: incremental partial-JSON parser (currently O(n²) on tick); per-repo audit cache; "Refresh from GitHub" inside the audit card; cost rollup across all capabilities; abandon-stream telemetry.

**Confidence score**: **7.5/10** for one-pass success.

The unknowns are:
- The exact SSE event field paths against current Anthropic docs (Task 5 verification gate).
- The CORS header name (same gate).
- The `document.getElementById('settings-btn')?.click()` shortcut for opening Settings from the hint — may need a small `SettingsButton.tsx` id addition.
- The progressive-render storm on `tryParsePartialFindings` (~O(n²)) — likely fine but unverified at the upper end of 20KB outputs.
- The empty-`findings`-with-`rawText` collision in the fallback render branch — covered by an explicit branch in Task 8 but easy to forget.

Everything else (fetch, error mapping, persistence, race semantics, dark mode, mobile) is paint-by-numbers off the patterns shipped by Capabilities A and B.
