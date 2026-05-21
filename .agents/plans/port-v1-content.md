# Feature: Port v1 section content into per-section React TSX components

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils, types, and models. Import from the right files. **This plan is a content port, not a redesign — every word, code block, callout, and ordering from v1 stays exactly as written.**

## Feature Description

Replace the placeholder body in `src/components/Section.tsx` with 16 real per-section React components, ported verbatim from `ai-layer-workbook-v1.html`. Each section becomes a TSX module under `src/pages/`, content authored as JSX. Two interactive widgets from v1 — the persona-card form (`#page-your-picture`) and the glossary popup (used inside `#page-mental-models`) — become small React components colocated under `src/components/`. The persistent per-phase checklist becomes a tiny shared component as well. Existing CSS (already ported verbatim) carries all styling. No new dependencies, no renderer, no MDX.

This is **step 1 of the locked feature order** (CLAUDE.md §"Resolved decisions" item 6): Port → Cap A (Settings) → Cap B (GitHub fetch) → C1 Audit → C2 Root CLAUDE.md → C3 Sub-CLAUDE.md → C4 Skill. Ship this port for owner feedback before Cap A begins. Do not parallel-track.

## User Story

As a non-technical-but-capable builder visiting `ai-layer.roipros.com`
I want to read the full v1 workbook content — all 16 sections, including the personalize form, the glossary popups, the persistent per-phase checklists, and the Python hook scripts — in the v3 shell that's already live (sidebar, topbar, pager, scroll-to-top, mobile drawer, dark mode)
So that the deployed v3 site delivers the same L1 experience v1 did, before the L2/L3 capabilities (Settings, GitHub fetch, AI buttons) are layered on top.

## Problem Statement

`src/components/Section.tsx` currently renders identical placeholder text for every slug. The v3 shell is complete (commits 8fa54d4, b599f5c, b89da60, 52f603a, 2422337) — sidebar, topbar, pager, scroll-to-top, mobile drawer, focus trap, and the full v1 CSS palette/typography. But there is no readable content. The site cannot ship for owner feedback until the v1 content is in place.

## Solution Statement

For each of the 16 slugs in `src/data/nav.ts`, create one TSX page module under `src/pages/<slug>.tsx`. Each module exports a default React component that renders the section's body content as JSX, copied verbatim from the matching `<section class="page" id="page-<slug>">…</section>` block in `ai-layer-workbook-v1.html`. Rewire `Section.tsx` to look up the right page module by slug and render it inside the existing `<article class="page">` shell (which already supplies the eyebrow/section-num/h1/lede framing only when the page doesn't render its own — see "Routing/wiring" below for the exact pattern), followed by the existing `<Pager>`.

Two interactive widgets and one persistence helper get extracted into shared components:

- `src/components/PersonaCard.tsx` — the form on `your-picture`, with `repoName`, `languages[]`, `layout`, `topLevelDirs`, persisted to `localStorage` under `workbook:persona`.
- `src/components/GlossaryTerm.tsx` + `src/components/GlossaryPopup.tsx` — a `<span class="glossary-term">` that, on hover (desktop) or tap (mobile), shows a positioned popup with the term's definition from a registry in `src/data/glossary.ts`. Esc closes; click-outside closes.
- `src/components/Checklist.tsx` + `src/components/ChecklistItem.tsx` — `<ul class="checklist">` + `<li><input type="checkbox" id="…"><label for="…">…</label></li>`, with checked state persisted to `localStorage` under `workbook:checks` keyed by checkbox id (matches v1's keying so v1 users' state survives if they ever visit v1 and v3 at the same origin — unlikely, but free).
- `src/components/TplRepo.tsx` + `src/components/TplAgent.tsx` — placeholder components that render `your-repo` and the current agent name. They read from a no-op default for this port; Cap A wires them to the real settings store. **Critical**: these must exist in every location v1 used `.tpl-repo` / `.tpl-agent` so Cap A doesn't have to chase them down later.

A small `src/components/CopyButton.tsx` is wired into a `<CodeBlock>` wrapper that any TSX page can use to wrap a `<pre><code className="language-X">…</code></pre>`. Prism is **not** wired in this port (the TODO comment in `src/styles/globals.css:139` notes this) — code blocks render as plain monospaced text styled by the existing `pre`/`code` CSS rules. Wiring Prism is a Cap A concern, not this port's.

## Feature Metadata

**Feature Type**: Enhancement (content port — completes the v1→v3 shell migration)
**Estimated Complexity**: Medium (high volume, low conceptual complexity; the risks live in code-block fidelity and the two interactive widgets, not the prose)
**Primary Systems Affected**: `src/pages/` (new), `src/components/Section.tsx`, `src/components/` (additions for PersonaCard, GlossaryTerm, GlossaryPopup, Checklist, CodeBlock, CopyButton, TplRepo, TplAgent), `src/data/` (additions for glossary and persona defaults), `src/hooks/` (additions for `usePersona`, `useChecklist`), `src/lib/storage-keys.ts` (additions)
**Dependencies**: None new. Uses only existing `react`, `react-router-dom`, and the existing hook/storage utilities.

---

## CONTEXT REFERENCES

### Relevant codebase files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

- `ai-layer-workbook/ai-layer-workbook-v1.html` (entire file, 2274 lines) — **source of truth for all content**. The 16 sections live at the following line ranges (confirmed via `grep -nE 'class="page" id="page-'`):
  - `start` — lines 261–298
  - `mental-models` — lines 301–337
  - `how-it-works` — lines 340–407
  - `your-picture` — lines 410–487
  - `phase-1` — lines 490–652
  - `phase-2` — lines 655–731
  - `phase-3` — lines 734–840
  - `phase-4` — lines 841–923
  - `phase-5` — lines 924–1059
  - `phase-6` — lines 1060–1503 *(largest; contains two multi-hundred-line Python scripts)*
  - `phase-7` — lines 1504–1594
  - `phase-8` — lines 1595–1674
  - `phase-9` — lines 1675–1792
  - `maintenance` — lines 1793–1841
  - `prompt-library` — lines 1842–1951
  - `glossary` — lines 1952–1985
  The glossary registry the popup reads is the JS object `glossaryDefs` at lines 2212–2220.
  The persona-card form behavior is at lines 2161–2207.
  The checklist persistence behavior is at lines 2082–2103.

- `ai-layer-workbook/Docs/ai-layer-workbook-claude-code-handoff.md` — **the spec**. §3 (lines 47–82) lists exactly what v1 does that must be preserved. §8 (lines 286–298) is the content-port discipline. §11 (lines 328–335) is the owner's hot buttons. §12 (lines 338–351) is the credit block; it must appear verbatim on `start` (and the README, but that's already done).

- `ai-layer-workbook/CLAUDE.md` — non-negotiable constraints. The Port section repeats them inline, but read this file in full before touching code.

- `ai-layer-workbook/src/components/Section.tsx` (lines 1–23) — **current placeholder**. The plan replaces the placeholder paragraph and keeps the surrounding `<article class="page">` + `<Pager>` chrome. Pattern to mirror: it already reads `NAV_NUMBERS[slug]` and renders `<div class="eyebrow">Section NN</div>` + `<h1>{title}</h1>` + `<p class="lede">…</p>`. **v1 sections render their own eyebrow, section-num, h1, and lede** — so the per-page TSX modules must own all of those, and `Section.tsx` becomes a thin dispatcher that renders only the per-page module + `<Pager>` (no shared chrome). See "Routing/wiring" task below.

- `ai-layer-workbook/src/data/nav.ts` (lines 1–63) — **canonical slug list**. All 16 slugs match v1's `id="page-<slug>"`. Use `NAV_NUMBERS[slug]` if a page wants to render the leading `<span class="section-num">NN</span>` — but the simpler path is to hardcode the two-digit string per page (e.g. `<span className="section-num">00</span>` on `Start.tsx`) because that's what v1 does and it's verbatim.

- `ai-layer-workbook/src/components/Sidebar.tsx`, `Topbar.tsx`, `Pager.tsx`, `ScrollToTop.tsx`, `App.tsx` — shell. **Do not modify.** The Routes in `App.tsx:79–85` already pass `slug` + `title` to `<Section>`; this port keeps that contract.

- `ai-layer-workbook/src/hooks/usePersistedEnum.ts` (lines 1–22) — existing localStorage-backed state pattern. The new `usePersona` and `useChecklist` hooks should mirror this shape: read on mount, write on update, never throw, gracefully degrade if `window` is unavailable.

- `ai-layer-workbook/src/hooks/useAgent.ts` (lines 1–28) — current source of the agent name. `TplAgent` reads `useAgent().agent` to populate `.tpl-agent` slots.

- `ai-layer-workbook/src/lib/storage-keys.ts` (lines 1–7) — central key registry. Add `workbook:persona`, `workbook:checks`, and (deferred to Cap A) `workbook:visited` here. v1 used those exact keys (see v1 lines 2069, 2102, 2171); reuse them.

- `ai-layer-workbook/src/styles/globals.css` (entire file, 1039 lines) — **already complete**. Every class the v1 sections use is defined. Confirmed present: `.page`, `.section-num`, `.eyebrow`, `.lede`, `.callout`, `.callout.ok`, `.callout.warn`, `.callout-title`, `.kvgrid`, `.table-wrap`, `.checklist` + `.checklist li.done label`, `.tag`, `.tag.gray`, `.tag.ok`, `.glossary-term`, `.glossary-popup`, `.glossary-popup.shown`, `.persona-card`, `.persona-field`, `.lang-grid`, `.btn`, `.btn.ghost`, `.phase-meta`, `.pager*`, `.origin-block`, `.copy-btn`, `details/summary` styling, `.tpl-repo`/`.tpl-agent` are not directly styled (they're just `<span>`s that get their text content replaced — render them with `<span>` only, no class, unless v1 puts a class on them). The TODO at globals.css:139 about Prism is **out of scope for this port** — leave it as-is.

- `ai-layer-workbook/.agents/plans/port-v1-css-and-mobile-drawer.md` — the most recent prior plan; mirror its structure and discipline.

- `ai-layer-workbook/.agents/code-reviews/port-v1-css-and-mobile-drawer.md` — review of the prior step. Worth reading to see how findings are formatted and the kind of regressions to avoid (notably: don't add modernization classes; don't introduce shadows; don't change the column width).

### New files to create

Page modules (one per nav slug, 16 total):
- `src/pages/Start.tsx` — section 00, includes `<div class="origin-block">` with the four credit links verbatim
- `src/pages/MentalModels.tsx` — section 01, contains 7 `<span class="glossary-term">` markers → use `<GlossaryTerm>`
- `src/pages/HowItWorks.tsx` — section 02, contains the lifecycle table (`<div class="table-wrap"><table>…</table></div>`) and 1 `.callout`
- `src/pages/YourPicture.tsx` — section 03, contains `<PersonaCard>` + 1 `<pre>` ASCII tree with embedded `<TplRepo />`
- `src/pages/Phase1.tsx` — section 04, contains `<div class="phase-meta">`, 3 `<pre>` code blocks (markdown, bash, json), 1 `.callout.warn`, 1 `<Checklist>` with 5 items (ids `p1-a`..`p1-e`)
- `src/pages/Phase2.tsx` — section 05, contains `<div class="phase-meta">`, 1 `<pre>` markdown block, 1 `.callout`, 1 `<Checklist>` with 4 items (`p2-a`..`p2-d`), 1 `<TplAgent />`
- `src/pages/Phase3.tsx` — section 06, contains `<div class="phase-meta">`, code blocks, callouts, `<Checklist>` (read v1 for exact ids/count)
- `src/pages/Phase4.tsx` — section 07, contains `<div class="phase-meta">`, code blocks, `<Checklist>`
- `src/pages/Phase5.tsx` — section 08, contains `<div class="phase-meta">`, code blocks (skill examples), `<Checklist>`
- `src/pages/Phase6.tsx` — section 09, contains `<div class="phase-meta">` and **the two Python hook scripts as `<pre><code className="language-python">` blocks** + `<Checklist>` with ids `p6-a`..`p6-e`. This is the highest-risk file for verbatim fidelity (see "Code-block fidelity" risks below).
- `src/pages/Phase7.tsx` — section 10, contains `<div class="phase-meta">`, code blocks, `<Checklist>`
- `src/pages/Phase8.tsx` — section 11 (tagged `advanced`), contains `<div class="phase-meta">`, code blocks, `<Checklist>`
- `src/pages/Phase9.tsx` — section 12, contains `<div class="phase-meta">`, code blocks, `<Checklist>`
- `src/pages/Maintenance.tsx` — section 13, contains `<Checklist>`
- `src/pages/PromptLibrary.tsx` — section 14, prose-heavy, code blocks
- `src/pages/Glossary.tsx` — section 15, renders the `<dl class="kvgrid" id="glossaryList">` from `src/data/glossary.ts` (single source of truth shared with `<GlossaryPopup>`)

Shared components:
- `src/components/PersonaCard.tsx` — form, persists to `workbook:persona` via `usePersona`
- `src/components/GlossaryTerm.tsx` — wraps content in `<span class="glossary-term" data-term={term}>`, attaches the hover/click handlers that talk to the popup
- `src/components/GlossaryPopup.tsx` — single instance mounted at the app root (mount via `App.tsx` next to `<ScrollToTop />`); listens to a tiny context or DOM event for "show popup at coords with this term"
- `src/components/Checklist.tsx` + `src/components/ChecklistItem.tsx` — list + item with persisted checked state
- `src/components/CodeBlock.tsx` — wraps `<pre><code className={`language-${lang}`}>{children}</code><CopyButton text={…} /></pre>`. The `text` to copy is the raw string (without the `tpl-repo`/`tpl-agent` interpolations — see "Copy semantics" gotcha)
- `src/components/CopyButton.tsx` — clicks `navigator.clipboard.writeText(text)`, shows "Copy" → "Copied ✓" → "Copy" with the `.copy-btn.copied` class
- `src/components/TplRepo.tsx` — renders `<span>{repoName}</span>` (no class; v1 used the class only for the JS textContent swap, which we don't need in React)
- `src/components/TplAgent.tsx` — renders `<span>{agentName}</span>`

Hooks:
- `src/hooks/usePersona.ts` — `{ persona, setPersona }` keyed at `workbook:persona`, shape `{ repoName: string; languages: string[]; layout: 'single'|'multi'|'mono'; topLevelDirs: string }`. Default `repoName` is `'your-repo'` (matches v1 line 2162).
- `src/hooks/useChecklist.ts` — `{ checked: Record<string, boolean>; toggle: (id: string) => void }` keyed at `workbook:checks`.

Data:
- `src/data/glossary.ts` — exports `GLOSSARY_DEFS: Record<string, { term: string; definition: string }>` for the popup, and the full `GLOSSARY_DL` array (term + definition pairs) for the Glossary page. Single source. Seed from v1 lines 2212–2220 (popup defs — 7 terms) and v1 lines 1959–1981 (full dl — 22 terms). **Reconcile**: the popup terms are a strict subset of the full glossary; render the full list on the Glossary page, and the popup only fires when `data-term` matches a key in `GLOSSARY_DEFS`. Preserve v1's behavior: a `glossary-term` whose term isn't in the popup dict (none currently exist in v1's content, but defensively) renders the underline but no popup.

Updates to existing files:
- `src/components/Section.tsx` — rewrite to dispatch by slug to the right page module; render only `<article class="page" id={\`page-${slug}\`}><PageModule /><Pager slug={slug} /></article>`. The page module owns the eyebrow/section-num/h1/lede.
- `src/lib/storage-keys.ts` — add `persona: 'workbook:persona'` and `checks: 'workbook:checks'` to the registry.
- `src/App.tsx` — mount `<GlossaryPopup />` once at the app root, alongside `<ScrollToTop />`.

### Relevant documentation — YOU SHOULD READ THESE BEFORE IMPLEMENTING

- React docs — [Rendering Lists](https://react.dev/learn/rendering-lists) and [Conditional Rendering](https://react.dev/learn/conditional-rendering) — for the Checklist component.
- React docs — [Manipulating the DOM with Refs](https://react.dev/learn/manipulating-the-dom-with-refs) — for the GlossaryPopup positioning (needs `getBoundingClientRect` on the trigger).
- MDN — [`navigator.clipboard.writeText`](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) — secure context behavior; v1 already handles the failure case with a "Failed" label.
- MDN — [Escape sequences in JSX text content](https://react.dev/reference/react-dom/components/common#common-props) — read the section on `dangerouslySetInnerHTML` first to understand why we are **not** using it. JSX-escape rules: curly braces in code-block text need `{'{'}` / `{'}'}`, backticks are fine literal in template strings, angle brackets in text content are fine but inside `<pre><code>` they get parsed as JSX if unescaped — use string literals or a single backtick template per pre-block.
- MDN — [`<details>`/`<summary>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details) — present in globals.css but **verify whether v1 actually uses any `<details>` elements** before adding handling; quick `grep '<details' ai-layer-workbook-v1.html` will answer. (Phase 8 may; if not, no work needed.)

### Patterns to follow

Pull from the existing codebase. Don't invent new patterns.

**Naming conventions** (observed in `src/components/`):
- React components: PascalCase file + default export (`Sidebar.tsx`, `Topbar.tsx`, `Pager.tsx`)
- Hooks: camelCase file starting with `use` (`useAgent.ts`, `useTheme.ts`, `usePersistedEnum.ts`)
- Data modules: lowercase descriptive (`nav.ts`)
- Page modules under `src/pages/`: PascalCase matching `<slug>` → `MentalModels.tsx`, `HowItWorks.tsx`, `YourPicture.tsx`, `Phase1.tsx`…`Phase9.tsx`, `PromptLibrary.tsx`, `Glossary.tsx`, `Maintenance.tsx`, `Start.tsx`. Default export. No props.

**Persisted state pattern** — mirror `src/hooks/usePersistedEnum.ts:3–22`:
```ts
// Read once on mount with try/catch around storage; write on update; never throw.
const [value, setValue] = useState<T>(() => {
  if (typeof window === 'undefined') return fallback;
  const stored = window.localStorage.getItem(key);
  return isValid(stored) ? stored : fallback;
});
```
Use this exact shape for `usePersona` (with JSON parse instead of enum check) and `useChecklist`.

**Storage key access** — always via `STORAGE_KEYS.<name>` from `src/lib/storage-keys.ts`. **Do not** inline string literals. Pattern from `useTheme.ts:3, 23`.

**Routing wiring** — `App.tsx:79–85` already maps every nav slug to a `<Section slug=… title=…>`. **Do not change `App.tsx` routes.** Modify only `Section.tsx` to dispatch internally.

**Per-page chrome ownership** — v1 sections render their own `<span class="section-num">NN</span>`, `<div class="eyebrow">…</div>`, `<h1>…</h1>`, and `<p class="lede">…</p>`. Each TSX page module owns these. `Section.tsx` becomes:
```tsx
const PAGES: Record<string, () => JSX.Element> = {
  start: Start, 'mental-models': MentalModels, /* …16 entries… */
};
export default function Section({ slug }: SectionProps) {
  const Page = PAGES[slug];
  if (!Page) return null; // route guard already prevents this
  return (
    <article className="page" id={`page-${slug}`}>
      <Page />
      <hr />
      <Pager slug={slug} />
    </article>
  );
}
```
Drop the `title` prop forwarding — pages own their own `<h1>`. Keep the prop on the signature for now (used by Routes), just ignore it inside.

**Code-block JSX-escape convention** — for every `<pre>` block, prefer template-literal children to dodge JSX-escape friction:
```tsx
<CodeBlock lang="markdown">{`# ${'${tpl-repo}'}-style content...`}</CodeBlock>
```
Where literal `{` or `}` appear in code (e.g. JSON), wrap the whole code body as a string. For Python f-strings (Phase 6), `{` and `}` inside the string are fine when the whole code body is one template literal. Embedded `<TplRepo />` inside a `<pre>` block is **not allowed** because the pre body must be a string for the CopyButton to capture the raw text — see "Copy semantics" gotcha. Where v1 has `<span class="tpl-repo">your-repo</span>` inside a `<pre>`, the TSX page passes `text={renderedString}` to the CodeBlock and the visible body interpolates the repo name into the string at render time using the `usePersona` hook. The CopyButton then copies the rendered string (which is what v1 does too — clipboard gets the substituted text).

**Glossary trigger usage** — wherever v1 has `<span class="glossary-term" data-term="X">label</span>`, the TSX writes `<GlossaryTerm term="X">label</GlossaryTerm>`. The component renders `<span className="glossary-term" data-term={term} onMouseEnter={…} onMouseLeave={…} onClick={…}>{children}</span>`.

**Checklist usage** — wherever v1 has `<ul class="checklist">…</ul>`, the TSX writes:
```tsx
<Checklist items={[
  { id: 'p1-a', label: <>Root <code>CLAUDE.md</code> created, lean, with pointers + gotchas</> },
  { id: 'p1-b', label: <><code>.claudeignore</code> created with platform-specific exclusions</> },
  /* … */
]} />
```
The `id`s match v1 (`p1-a` through `p1-e`, `p2-a` through `p2-d`, etc.) so persisted state is keyed identically.

**Origin block** — wherever v1 has `<div class="origin-block">…</div>`, render the JSX verbatim with the four anchor tags (Cole's video, Anthropic article, helpline, Dynamous) **exactly as in handoff §12**. The version in the v1 HTML at lines 284–295 is the canonical source. Use `target="_blank" rel="noopener"` on every external link (matches v1).

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation (shared components + hooks)

Build the reusable pieces first so the 16 page modules can import them cleanly.

**Tasks:**

- Add `persona` and `checks` keys to `src/lib/storage-keys.ts`.
- Build `src/hooks/usePersona.ts` and `src/hooks/useChecklist.ts`, mirroring `usePersistedEnum.ts`.
- Build `src/data/glossary.ts` with the 22-entry `GLOSSARY_DL` array and the 7-entry `GLOSSARY_DEFS` map (subset; popup uses this).
- Build `src/components/TplRepo.tsx` and `src/components/TplAgent.tsx`.
- Build `src/components/CopyButton.tsx` (clipboard + visual state, mirror v1 lines 2138–2155).
- Build `src/components/CodeBlock.tsx` (wraps `<pre><code>` + `<CopyButton>`, accepts `lang` prop).
- Build `src/components/Checklist.tsx` + `ChecklistItem.tsx` (consume `useChecklist`).
- Build `src/components/GlossaryTerm.tsx` + `src/components/GlossaryPopup.tsx`, plus a tiny `useGlossaryPopup` hook or React Context to glue them. Mount `<GlossaryPopup />` once in `App.tsx` next to `<ScrollToTop />`.
- Build `src/components/PersonaCard.tsx` (form + status line; consume `usePersona`).

### Phase 2: Page modules — Orientation (4 pages)

Port in this order so you can spot-check the dispatcher early:

**Tasks:**
- `src/pages/Start.tsx` (lines 261–298) — section-num 00, eyebrow "Begin here", lede, h2 "How to use this workbook", ol, `.callout`, `.origin-block` with the four credits.
- `src/pages/MentalModels.tsx` (lines 301–337) — section-num 01, eyebrow "Concepts before code", 7 `<h2>` sections each with 1 `<p>` body containing exactly one `<GlossaryTerm>` (terms: CLAUDE.md, Hook, Skill, Subagent, LSP, MCP, Plugin), ending `<hr>` + closing paragraph.
- `src/pages/HowItWorks.tsx` (lines 340–407) — section-num 02, eyebrow "Mechanics", h2 sections, the hook lifecycle `<table>` wrapped in `<div class="table-wrap">`, 1 `.callout` ("Stop doesn't mean what you'd think"), final `<ol>` with the end-to-end session flow.
- `src/pages/YourPicture.tsx` (lines 410–487) — section-num 03, eyebrow "Personalize", `<PersonaCard />`, h2 "What you'll see throughout the workbook", h2 "If you have a native mobile app", 1 `<CodeBlock lang="bash">` with the ASCII tree using `<TplRepo />` for the repo name (render-time interpolation as per the "Copy semantics" gotcha).

After this batch lands, **spot-check at `npm run dev`**: visit `#/start`, `#/mental-models`, `#/how-it-works`, `#/your-picture`. Verify glossary popups work on `mental-models`, persona form saves on `your-picture`, table renders on `how-it-works`. Confirm pager works between them.

### Phase 3: Page modules — Implementation phases (9 pages)

The bulk of the content. Port phase-by-phase, validating each before moving on. Each phase TSX file contains: section-num + eyebrow `Phase N` + h1 + lede + `<div class="phase-meta">` (Time/Prereq/Outcome) + body + `<Checklist>`.

**Tasks:**
- `src/pages/Phase1.tsx` (lines 490–652)
- `src/pages/Phase2.tsx` (lines 655–731) — contains 1 `<TplAgent />`
- `src/pages/Phase3.tsx` (lines 734–840)
- `src/pages/Phase4.tsx` (lines 841–923)
- `src/pages/Phase5.tsx` (lines 924–1059)
- `src/pages/Phase6.tsx` (lines 1060–1503) — **highest risk**. Two Python scripts. Read the entire phase-6 block in one Read pass before transcribing. Use a single template literal per script; do not edit indentation, comments, docstring whitespace, or trailing newlines. After porting, copy-paste the rendered code back into a terminal and run `python -c "$(pbpaste)"` (or paste into a temp file and `python -m py_compile <file>`) to confirm it still parses. If it doesn't, the port is broken — fix transcription, don't fix Python.
- `src/pages/Phase7.tsx` (lines 1504–1594)
- `src/pages/Phase8.tsx` (lines 1595–1674) — section has the `advanced` tag in nav; the page itself does not display the tag (the sidebar shows it via nav.ts).
- `src/pages/Phase9.tsx` (lines 1675–1792)

Spot-check after Phase 1, after Phase 6, and after Phase 9.

### Phase 4: Page modules — Reference (3 pages)

**Tasks:**
- `src/pages/Maintenance.tsx` (lines 1793–1841)
- `src/pages/PromptLibrary.tsx` (lines 1842–1951)
- `src/pages/Glossary.tsx` (lines 1952–1985) — renders the `<dl class="kvgrid" id="glossaryList">` from `GLOSSARY_DL` in `src/data/glossary.ts`. **Verbatim**: the order of entries matches v1 alphabetically.

### Phase 5: Dispatcher rewire

**Tasks:**
- Rewrite `src/components/Section.tsx` to dispatch by slug to the 16 page modules. Drop the placeholder eyebrow/h1/lede. Render `<article class="page" id={…}>` → `<Page />` → `<hr />` → `<Pager slug={slug} />`. Use eager imports (see "Routing/wiring" risks for the rationale).
- Mount `<GlossaryPopup />` in `App.tsx` next to `<ScrollToTop />`.

### Phase 6: Validation & visual diff

**Tasks:**
- Run `npm run lint`, `npm run format:check`, `npm run build` and resolve any failures.
- Open the dev server, walk all 16 sections top-to-bottom; check the browser console for errors (must be zero).
- Resize the browser to 375px and walk a representative subset (Start, YourPicture, Phase 1, Phase 6, Glossary) to confirm mobile readability. Check the persona-card form fits, the glossary popup positions correctly when triggered on small screens, the table on HowItWorks scrolls horizontally without breaking the layout, and code blocks scroll horizontally without overflowing the page.
- Visual diff: open `ai-layer-workbook-v1.html` directly in a second browser tab (it's a static file — `file:///…/ai-layer-workbook-v1.html`) and compare side-by-side for Start, Phase 1, and Phase 6. Look for missing paragraphs, dropped callouts, changed checklist ids, or any text difference.
- Run `grep -nE "sk-ant-|github_pat_|console\.log\([^)]*key" src/` — must return zero matches. (Defensive — there should be no key handling anywhere yet.)

---

## STEP-BY-STEP TASKS

Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE `src/lib/storage-keys.ts` (update)

- **IMPLEMENT**: add `persona: 'workbook:persona'` and `checks: 'workbook:checks'` to the `STORAGE_KEYS` object literal.
- **PATTERN**: `src/lib/storage-keys.ts:1–7` (existing shape).
- **IMPORTS**: none new.
- **GOTCHA**: keys must be the literal strings `'workbook:persona'` and `'workbook:checks'` — these are v1's keys (see v1 lines 2069, 2102, 2171), and matching them gives free state portability.
- **VALIDATE**: `npm run lint && npm run build`

### CREATE `src/hooks/usePersona.ts`

- **IMPLEMENT**: hook returning `{ persona, setPersona }`. `persona` is `{ repoName: string; languages: string[]; layout: 'single'|'multi'|'mono'; topLevelDirs: string }`. Default: `{ repoName: 'your-repo', languages: [], layout: 'single', topLevelDirs: '' }`. Read from `STORAGE_KEYS.persona` on mount via try/catch JSON.parse; persist via JSON.stringify on update. `repoName` of empty string falls back to `'your-repo'` (matches v1 lines 2186, 2192).
- **PATTERN**: `src/hooks/usePersistedEnum.ts:3–22`.
- **IMPORTS**: `useState` from `react`; `STORAGE_KEYS` from `../lib/storage-keys`.
- **GOTCHA**: do not throw if JSON.parse fails — fall through to default (matches v1 line 2171).
- **VALIDATE**: `npm run lint && npm run build`

### CREATE `src/hooks/useChecklist.ts`

- **IMPLEMENT**: hook returning `{ checked: Record<string, boolean>, toggle: (id: string) => void, isChecked: (id: string) => boolean }`. Read from `STORAGE_KEYS.checks` on mount via JSON.parse; persist on every toggle.
- **PATTERN**: same as `usePersona`.
- **IMPORTS**: `useState` from `react`; `STORAGE_KEYS` from `../lib/storage-keys`.
- **GOTCHA**: v1 stores `state[id] = true` for checked, omits entry for unchecked (v1 lines 2098–2101). Mirror this — keeps storage smaller and matches v1 schema.
- **VALIDATE**: `npm run lint && npm run build`

### CREATE `src/data/glossary.ts`

- **IMPLEMENT**: export `GLOSSARY_DEFS: Record<string, string>` (7 popup terms from v1 lines 2212–2220) and `GLOSSARY_DL: Array<{ term: string; definition: string }>` (22 entries from v1 lines 1959–1981, in v1's order). Definitions are HTML-free strings; if a definition contains inline `<code>` (e.g. "Path glob" mentions `<code>ios/**</code>"), use plain text or pre-process via a small `definition: ReactNode` field — **prefer**: keep `definition: string` and accept that the dl entries lose their inline `<code>` formatting. (v1 renders them with `<code>` inside `<dd>`; if you want to preserve that exactly, change to `ReactNode`. Recommendation: use `ReactNode` for `GLOSSARY_DL` entries that have inline code — six entries do — and keep `GLOSSARY_DEFS` strings because the popup is plain text in v1 anyway.)
- **PATTERN**: `src/data/nav.ts` (typed exports, no logic).
- **IMPORTS**: `ReactNode` from `react` (if you go with the recommendation above).
- **GOTCHA**: verbatim ordering matters — v1's glossary list is alphabetical, with one near-pair ("Standard input / output / error" before "Subagent" because v1 sorted by the literal first character including punctuation; preserve that order even if your editor wants to "fix" it).
- **VALIDATE**: `npm run lint && npm run build`

### CREATE `src/components/TplRepo.tsx`

- **IMPLEMENT**: `export default function TplRepo() { const { persona } = usePersona(); return <>{persona.repoName || 'your-repo'}</>; }`. No wrapper element (use a Fragment) so it can be inlined inside `<code>` and `<h1>` cleanly.
- **PATTERN**: small functional component, no props.
- **IMPORTS**: `usePersona` from `../hooks/usePersona`.
- **GOTCHA**: do **not** add a `className="tpl-repo"` — v1 uses that class only for the JS textContent swap; in React it's noise.
- **VALIDATE**: `npm run lint && npm run build`

### CREATE `src/components/TplAgent.tsx`

- **IMPLEMENT**: `export default function TplAgent() { const { agent } = useAgent(); return <>{agent}</>; }`.
- **PATTERN**: same as TplRepo.
- **IMPORTS**: `useAgent` from `../hooks/useAgent`.
- **GOTCHA**: same — no className.
- **VALIDATE**: `npm run lint && npm run build`

### CREATE `src/components/CopyButton.tsx`

- **IMPLEMENT**: button with className `copy-btn`, initial label "Copy", on click runs `await navigator.clipboard.writeText(props.text)`, swaps to "Copied ✓" with className `copy-btn copied`, reverts after 1800ms. On error, swaps to "Failed".
- **PATTERN**: mirror v1 lines 2138–2155.
- **IMPORTS**: `useState` from `react`.
- **GOTCHA**: `navigator.clipboard.writeText` rejects in non-secure contexts — the catch must not throw; v1's catch just sets the label to "Failed" with no class change.
- **GOTCHA**: never log the text — `props.text` may contain CLAUDE.md content; not sensitive today, but the no-secret-logging discipline starts now.
- **VALIDATE**: `npm run lint && npm run build`

### CREATE `src/components/CodeBlock.tsx`

- **IMPLEMENT**: `function CodeBlock({ lang, children }: { lang: string; children: string }) { return <pre><code className={`language-${lang}`}>{children}</code><CopyButton text={children} /></pre>; }`. `children` is constrained to `string` (not `ReactNode`) so CopyButton's `text` is exact.
- **PATTERN**: matches v1's `<pre><code class="language-X">…</code></pre>` shape; adds the CopyButton as a sibling inside `<pre>` (matches v1 line 2154 which `pre.appendChild(btn)`).
- **IMPORTS**: `CopyButton` from `./CopyButton`.
- **GOTCHA**: every code block in v1 has a `language-…` class — preserve them. The languages observed: `bash`, `json`, `markdown`, `python`, `swift`, `kotlin`, (occasionally none — use `text` as the lang for those). Without Prism wired, the language class is cosmetic for now — but Cap A will wire Prism, so getting the classes right now saves work later.
- **GOTCHA**: where v1 has `<span class="tpl-repo">your-repo</span>` inside a `<pre><code>`, **do not** embed `<TplRepo />` directly — the child must be a string. Instead, build the body as a string with template-literal interpolation: `<CodeBlock lang="bash">{\`cd ios && xcodebuild test -scheme ${repoName}\`}</CodeBlock>`. Read `repoName` from `usePersona()` at the top of the page module. v1's clipboard behavior copies the substituted string (the JS swap runs before clipboard read at v1 line 2141), so this is faithful.
- **VALIDATE**: `npm run lint && npm run build`

### CREATE `src/components/ChecklistItem.tsx`

- **IMPLEMENT**: renders one `<li>` with `<input type="checkbox" id={id}>` + `<label htmlFor={id}>{label}</label>`. The `<li>` gets className `done` when checked. `label` is `ReactNode` (so callers can include inline `<code>` etc.).
- **PATTERN**: matches v1 markup line 644 + style at globals.css:542–567.
- **IMPORTS**: none beyond React.
- **GOTCHA**: keep the `id` attribute on the input (matches v1's `p1-a`, `p1-b`, etc.) — `useChecklist` keys storage by this id.
- **VALIDATE**: `npm run lint && npm run build`

### CREATE `src/components/Checklist.tsx`

- **IMPLEMENT**: renders `<ul class="checklist">{items.map(…)}</ul>`. Each item gets one `<ChecklistItem>` wired through `useChecklist`.
- **PATTERN**: matches v1 line 643 markup + style at globals.css:536–540.
- **IMPORTS**: `ChecklistItem` from `./ChecklistItem`; `useChecklist` from `../hooks/useChecklist`.
- **GOTCHA**: do **not** rely on `<label htmlFor>` to toggle the checkbox — also wire `onChange` on the input directly. Both work; both are needed for the React state round-trip.
- **VALIDATE**: `npm run lint && npm run build`

### CREATE `src/components/GlossaryPopup.tsx` and `src/components/GlossaryTerm.tsx`

- **IMPLEMENT (popup)**: `<div class="glossary-popup">` rendered at the document root. Internal state: `{ visible: boolean; term: string | null; x: number; y: number }`. Listens to a tiny context (`GlossaryContext`) for `show({ term, x, y })` and `hide()`. Renders `<strong>{term}</strong>{definition}` when visible. Adds `.shown` class for CSS.
- **IMPLEMENT (term)**: wraps children in `<span class="glossary-term" data-term={term}>`. `onMouseEnter` and `onClick` call `glossary.show({ term, x, y })` with `x, y` from `event.currentTarget.getBoundingClientRect()` (matches v1 lines 2228–2234). `onMouseLeave` calls `glossary.hide()`. Document-level `keydown` listener on the popup component for Esc (close + return focus to the trigger if it was opened via click).
- **PATTERN**: v1 lines 2222–2255.
- **IMPORTS (popup)**: `useState`, `useEffect`, `createContext`, `useContext` from `react`; `GLOSSARY_DEFS` from `../data/glossary`.
- **IMPORTS (term)**: `useContext` from `react`; `GlossaryContext` from `./GlossaryPopup`.
- **GOTCHA**: positioning math from v1: `const x = Math.min(r.left, window.innerWidth - 300); const y = r.bottom + 6;` — preserve. The CSS at globals.css:643–656 already does `position: fixed`, `max-width: 280px`.
- **GOTCHA**: on mobile (touch), `mouseover` doesn't fire — `onClick` handles it. v1 already covers this (lines 2240–2255). Also: a second click anywhere outside a `.glossary-term` should close the popup (v1 lines 2242–2245 — the document-level click listener with the fall-through `if (!term)` branch). Mirror this.
- **GOTCHA**: globals.css:655 sets `.glossary-popup { pointer-events: none; }` and `.shown` flips to `auto`. Don't override.
- **GOTCHA**: pass the popup mount up to `App.tsx`'s `<Shell>` JSX so it's rendered exactly once and lives outside the `<main>` (matches v1 line 1990 — `<div class="glossary-popup" id="glossaryPopup">` lives outside the page sections).
- **VALIDATE**: `npm run lint && npm run build`, then dev-server check on `#/mental-models`: hover each of the 7 glossary terms and confirm popup shows; click one, then click elsewhere to dismiss.

### CREATE `src/components/PersonaCard.tsx`

- **IMPLEMENT**: form with the four fields from v1 lines 416–456 (`repoName` input, `langGrid` checkboxes for 9 languages — exact values: `swift`, `kotlin`, `typescript`, `python`, `go`, `rust`, `java`, `csharp`, `other`, in v1's order — `layout` select with three options, `topLevelDirs` textarea, "Apply & save" button, status line). On click, write to `usePersona`. After save, show "✓ Saved. Workbook updated." for 3 seconds, then clear.
- **PATTERN**: v1 markup lines 416–456 + behavior lines 2191–2201.
- **IMPORTS**: `useState` from `react`; `usePersona` from `../hooks/usePersona`.
- **GOTCHA**: the `repoName` placeholder is literally `"vox"` in v1 (line 422). Preserve.
- **GOTCHA**: the label text including punctuation (e.g. "Swift (iOS)") is verbatim from v1.
- **GOTCHA**: the inline style on the explanatory paragraph (v1 line 418: `style="color:var(--ink-soft);font-size:.9rem;margin-bottom:1.2rem"`) — port verbatim. React inline styles use `{ color: 'var(--ink-soft)', fontSize: '.9rem', marginBottom: '1.2rem' }`.
- **GOTCHA**: the empty-string case: when `repoName` is `""` on save, persist as `'your-repo'` (v1 line 2192).
- **VALIDATE**: `npm run lint && npm run build`, then dev-server check: type "vox", check Swift + Kotlin, set layout to "Monorepo", apply, refresh, confirm values are restored, confirm the visible `<TplRepo />` instances throughout the workbook show "vox".

### CREATE `src/pages/Start.tsx` through `src/pages/Glossary.tsx` (16 files)

Port one at a time, in the order listed under Phase 2/3/4 of the implementation plan. For each file:

- **IMPLEMENT**: open the v1 section at the line range listed, transcribe into TSX. Start with the section-num span, eyebrow div, h1, lede. Then body content. Use the shared components (CodeBlock, Checklist, GlossaryTerm, TplRepo, TplAgent, PersonaCard, origin-block as inline JSX).
- **PATTERN**: each section in v1 — see "Section-by-section breakdown" above for exact line ranges.
- **IMPORTS**: per-page, depending on which shared components are used.
- **GOTCHA (verbatim discipline)**:
  - Every word matches. No paraphrase, no "tightening."
  - Every `<h2>`, `<h3>`, `<h4>` matches text and ordering.
  - Every `<code>` inline matches, including the precise term inside.
  - Every `<strong>` / `<em>` matches, including the precise span.
  - Every external link matches URL **and** anchor text **and** `target="_blank" rel="noopener"`.
  - HTML entities in v1 (`&amp;`, `&#10;`, etc.) get decoded in JSX: `&amp;&amp;` becomes `&&` in a template literal; `&#10;` becomes `\n`. **Do not** leave entities in TSX prose — JSX won't decode them in `{string}` contexts.
- **GOTCHA (typo discipline)**: if you spot a typo or stale fact, **do not fix it**. Add a comment `{/* TODO(content): v1 typo — '<exact text>' — confirm with owner */}` and move on. Surface the list at hand-off.
- **GOTCHA (code-block fidelity)**: every `<pre>` becomes a `<CodeBlock lang="…">{…}</CodeBlock>` with the body as a template-literal string. Where v1 used `<span class="tpl-repo">your-repo</span>` inside the code, interpolate `${repoName}` into the template literal. Where v1 used a literal repo name (e.g. line 422's `"vox"` placeholder), keep the literal. Preserve every newline, every indentation character, every trailing whitespace **unless** the trailing whitespace is just before a closing `</pre>` — that's safe to trim.
- **GOTCHA (Python scripts in Phase 6)**: the two scripts (`session_start_context.py` and `propose_claude_md.py` + `reflect_claude_md.py`) are reviewed working code. The handoff explicitly forbids "modernization." Transcribe character-for-character. After porting, copy the rendered code from the browser (use the CopyButton) and run `python -m py_compile` against it; if it doesn't compile, the transcription is broken. Do not edit Python to make it compile — edit the TSX to match v1.
- **GOTCHA (Pager removal in page modules)**: v1 has a `<div class="pager">…</div>` at the bottom of each section. **Do not port the pager into the TSX page module** — `Section.tsx` already renders `<Pager slug={slug} />` after the page. Drop the pager from each per-page transcription.
- **GOTCHA (section terminator)**: v1 wraps everything in `<section class="page" id="…">…</section>`. **Do not** put a `<section>` wrapper inside the TSX page — `Section.tsx` already renders an `<article class="page" id="page-…">`. The TSX page renders only the inner content.
- **GOTCHA (table-wrap)**: tables in v1 use `<div class="table-wrap"><table>…</table></div>`. Preserve the wrapper — it's what enables mobile horizontal scrolling.
- **VALIDATE (per page)**: `npm run lint && npm run build`, then dev-server: navigate to that slug, confirm the page renders with no console errors, and that the pager prev/next links match the nav order.

### UPDATE `src/components/Section.tsx`

- **IMPLEMENT**: replace the placeholder body with a static slug→Component lookup. Drop the `title` prop usage (pages own their h1). Keep the route guard pattern: if `PAGES[slug]` is undefined, return `null` — the existing `App.tsx` catch-all route redirects unknowns to HOME_SLUG, so the null branch is defensive only.
- **PATTERN**: see "Per-page chrome ownership" under "Patterns to follow."
- **IMPORTS**: 16 page modules (eager imports — see Routing/wiring risks for why); `Pager` from `./Pager`.
- **GOTCHA**: do not lazy-load. With 16 small page modules and a static Cloudflare Pages SPA, the total bundle stays under ~150KB gzipped; lazy chunks would force a flash on every navigation, which contradicts v1's "everything always available" experience and is bad UX on slow connections.
- **GOTCHA**: keep the `<article class="page" id={\`page-${slug}\`}>` outer wrapper — the `page-` id is referenced in CSS and may be referenced by future deep-link anchors.
- **GOTCHA**: remove the `<hr />` from `Section.tsx`'s current body. The pages themselves include `<hr>` at the appropriate spot (some do, some don't — match v1 exactly per page); inserting one in `Section.tsx` would add a stray rule.
- **VALIDATE**: `npm run lint && npm run build`, then dev-server walk all 16 slugs and confirm each renders.

### UPDATE `src/App.tsx`

- **IMPLEMENT**: import `GlossaryPopup` and render it once inside `<Shell>` JSX, alongside `<ScrollToTop />`. No other changes to `App.tsx`.
- **PATTERN**: `App.tsx:101` already has the pattern (`<ScrollToTop />` as a no-render side-effect component at app root).
- **IMPORTS**: `GlossaryPopup` from `./components/GlossaryPopup`.
- **GOTCHA**: place inside `<HashRouter>` so the popup can hide on route change if desired (not required by v1, but cheap).
- **VALIDATE**: `npm run lint && npm run build`, dev-server check.

---

## TESTING STRATEGY

The project has no test framework configured (no `vitest`, no `jest`, no `package.json` test script). **Do not add one for this port.** Validation is via the validation commands and manual mobile/visual diff per the handoff §11.

### Manual validation (replaces unit tests for this port)

Each shared component (PersonaCard, GlossaryPopup, Checklist) and each page module is hand-validated against v1 behavior on the dev server. The validation steps appear inside each STEP-BY-STEP task above.

### Edge cases that must be hand-tested

- **PersonaCard**: empty `repoName` on save → falls back to `'your-repo'`. Check by clearing the field, clicking Apply, refreshing — confirm UI shows `'your-repo'` and `<TplRepo />` instances all show `'your-repo'`.
- **PersonaCard**: deselect all languages, save, refresh — `languages: []` survives.
- **Checklist**: check three items on Phase 1, refresh page — they stay checked. Open Phase 2, check items — Phase 1's items are still checked (different ids).
- **GlossaryPopup hover**: hover each of the 7 terms on `mental-models`; popup positions below and to the left, max-width 280px.
- **GlossaryPopup click (mobile sim)**: in DevTools mobile mode (375px), tap a glossary term — popup opens. Tap outside — popup closes.
- **GlossaryPopup Esc**: keyboard focus on a glossary term, press Enter (no-op for `<span>`, but click via mouse opens popup), then press Esc — popup closes.
- **GlossaryPopup positioning at right edge**: scroll a term that's near the right edge of the column (none currently exist in v1's prose, but if one does after reflow at 375px) — the `Math.min(r.left, window.innerWidth - 300)` formula must keep the popup on-screen.
- **CodeBlock copy**: on every page with a `<CodeBlock>`, hover the block, click Copy. Confirm the label flips to "Copied ✓", paste the clipboard into a scratch buffer and verify byte equality with v1's pre body (after entity decode). On Phase 6, verify the copied Python compiles via `python -m py_compile`.
- **Pager regression**: every page's prev/next pager links go to the correct slug per `nav.ts`. Existing `Pager` is untouched, but verify because page modules are new.
- **ScrollToTop regression**: clicking a sidebar nav item should scroll the main column to the top (the existing `ScrollToTop.tsx` handles this; verify it still fires when changing slugs).

---

## VALIDATION COMMANDS

Execute every command at the end of each implementation phase, and at the end of the full port. Zero errors required.

### Level 1: Lint and format

```bash
npm run lint
npm run format:check
```

**Expected**: both exit 0. If `format:check` complains, run `npm run format` to fix (it edits in place; review the diff before committing).

### Level 2: Type-check + build

```bash
npm run build
```

**Expected**: exit 0. The `build` script runs `tsc -b && vite build` so it covers TypeScript type errors and Vite production build (catches missing imports, syntax errors in JSX, and unresolved module specifiers).

### Level 3: Dev-server walkthrough

```bash
npm run dev
```

Then in a browser at `http://localhost:5173` (or whatever Vite reports):

- Walk all 16 slugs via the sidebar; for each, confirm: page renders, no console errors, no console warnings about hydration/key/etc., pager prev/next links present and correct.
- Open DevTools → Application → Local Storage → `http://localhost:5173`. Confirm only `aiLayer.theme`, `aiLayer.agent`, `workbook:persona`, `workbook:checks` keys appear (after interaction). **No key starting with `sk-ant-`, `github_pat_`, or anything resembling an API token.**
- Resize the viewport to 375px (or use DevTools mobile mode). Walk Start, YourPicture, Phase 1, Phase 6, Glossary. Confirm no horizontal scroll on the body, code blocks scroll horizontally as expected, the table on HowItWorks scrolls horizontally inside its `.table-wrap`, the persona-card form is readable, the glossary popup opens on tap.

### Level 4: Visual diff against v1

In a second browser tab, open `file:///<absolute-path>/ai-layer-workbook-v1.html` (no server needed — it's static). Side-by-side compare:

- `Start` ↔ v1 `#/start` — every paragraph present, origin block has the four credits in the right order
- `Phase 1` ↔ v1 `#/phase-1` — three code blocks present in order, the `.callout.warn` is in the right place, the checklist has 5 items with the labels matching exactly
- `Phase 6` ↔ v1 `#/phase-6` — **the two Python scripts are byte-identical after copy-paste**. Use the CopyButton on each, paste into a scratch file, diff against the relevant slice of `ai-layer-workbook-v1.html` (after HTML-entity decode).
- `Glossary` ↔ v1 `#/glossary` — all 22 entries present, in v1's order.

### Level 5: Secret discipline grep

```bash
grep -rnE "sk-ant-|github_pat_|console\.log\([^)]*key|console\.error\([^)]*key" src/
```

**Expected**: zero matches. Defensive check that nothing key-shaped or key-logging has been introduced.

---

## ACCEPTANCE CRITERIA

- [ ] All 16 sections from v1 are rendered as TSX page modules under `src/pages/`. Slugs match `src/data/nav.ts`.
- [ ] Every word, every code block, every callout, every heading, every list item from v1 appears in v3 verbatim, in the same order. (Any deviation must be a documented typo TODO comment.)
- [ ] The persona-card form on `your-picture` saves to `localStorage` under `workbook:persona` and survives refresh.
- [ ] The 9 phase checklists persist per-checkbox under `localStorage` `workbook:checks`, keyed by `p1-a`…`p9-z` ids matching v1.
- [ ] Glossary popups appear on hover (desktop) and tap (mobile) for all 7 terms in `mental-models`. Esc closes. Click-outside closes.
- [ ] All `<pre>` code blocks render with the correct `language-…` class (cosmetic for now; Prism wiring is Cap A). All have a working Copy button that copies the rendered (template-interpolated) string.
- [ ] `<TplRepo />` instances throughout the site show the persona's `repoName` (or `'your-repo'` if unset).
- [ ] `<TplAgent />` instances throughout the site show the topbar-selected agent name.
- [ ] The credit block on `start` contains the four links verbatim (Cole's video, Anthropic article, helpline, Dynamous) with `target="_blank" rel="noopener"`.
- [ ] `Section.tsx` dispatches by slug to the right page module; no placeholder text remains.
- [ ] `npm run lint`, `npm run format:check`, `npm run build` all exit 0.
- [ ] Browser console is clean on every page (zero errors, zero hydration warnings, zero key warnings).
- [ ] Mobile viewport at 375px: no horizontal body scroll, code blocks scroll inside their `<pre>`, the table on `how-it-works` scrolls inside `.table-wrap`, the persona form fits, the glossary popup positions on-screen.
- [ ] `localStorage` after a full walkthrough contains only the four expected keys (`aiLayer.theme`, `aiLayer.agent`, `workbook:persona`, `workbook:checks`). No API-key-shaped values anywhere in storage, console, or network.
- [ ] No `console.log`, `console.error`, or `console.warn` calls in any new code that includes a variable name like `key`, `pat`, `token`, `secret`, `apiKey`. (Defensive — no keys exist yet.)
- [ ] No new npm dependencies added. `package.json` `dependencies` and `devDependencies` are identical to HEAD on main before the port.
- [ ] UI copy never implies the site modifies the user's codebase. (Relevant for any prose mentioning AI output — the prose is verbatim from v1 which is already correct, but confirm.)
- [ ] Pager prev/next still works across all sections; ScrollToTop still fires on navigation.

---

## NOTES / DESIGN DECISIONS / TRADE-OFFS

**Why eager imports, not `React.lazy()`** — 16 page modules with mostly prose are small (~10-30 KB each unminified, much less after Vite's content-aware compression of repeated tokens). A full eager bundle stays well under 200 KB gzipped. Lazy-loading would introduce a network flash on every nav click — bad on slow connections and bad UX for a workbook that the reader walks linearly. Cloudflare Pages serves the static bundle from a global edge, so first-paint cost is minimal. Re-evaluate if the bundle exceeds 250 KB gzipped after Cap A–C ship.

**Why separate `GLOSSARY_DEFS` and `GLOSSARY_DL`** — the popup uses short, plain-text definitions (7 terms in v1); the Glossary page lists 22 entries with richer formatting (some include inline `<code>`). Storing both in one structure forced an unhelpful trade-off. Keeping them separate matches v1's data model.

**Why no Prism wiring in this port** — v1 loads Prism from a CDN. The current globals.css has Prism token overrides but `index.html` and `main.tsx` do not import Prism. The TODO at globals.css:139 owns that work. Wiring Prism touches `index.html` (CDN script tag) or `main.tsx` (npm install + import), and either decision has tail consequences for Cap A's "language picker for code blocks" thinking. Defer until Cap A. Code blocks render as plain monospaced text styled by the existing `pre`/`code` rules — readable and on-aesthetic.

**Why no visited-tracking checkmark in this port** — v1 sets a checkmark on the sidebar nav item when a section is visited (v1 lines 2062–2077). The current `Sidebar.tsx` does not render the `.nav-check` span. Adding visited-tracking is small but **not strictly necessary** for the port to ship — the L1 reading experience works without it. Defer to Cap A unless the owner specifically asks for it on first review. If added now, mirror v1's storage key `workbook:visited`.

**Why no auto-applied `tpl-repo` swap in code-block CopyButton text** — v1's `applyPersona()` (line 2185) mutates `<span class="tpl-repo">` textContent in place; CopyButton later reads `pre.querySelector('code')?.innerText` (line 2141), so the clipboard captures the substituted text. In React, the equivalent is: page modules read `persona.repoName` from `usePersona()` and build the code body as a template literal — same end state, more idiomatic, and the CopyButton gets the exact rendered string by props.

**Why preserve v1 checkbox ids exactly** — `p1-a`, `p1-b`, etc. are referenced by v1's `workbook:checks` schema (v1 lines 2086–2102). Preserving them keeps the storage schema identical, which means any future "import your v1 progress" feature is free.

**Why the page module owns its own `<h1>`, `<span class="section-num">`, eyebrow, and lede** — v1 sections vary slightly: `start` and `glossary` don't have `<div class="phase-meta">`; some have section-num placement nuances. Letting each page own its chrome avoids brittle data-driven defaults in `Section.tsx` and keeps the per-page transcription self-contained.

**Out of scope for this port (capture, don't build)**:
- Prism syntax highlighting wiring
- Visited-tracking checkmarks in the sidebar
- Settings panel (Cap A)
- GitHub fetcher (Cap B)
- C1–C4 AI buttons
- Analytics
- Brand asset swap-in
- Cloudflare Pages deployment

**Risks and open questions**:

1. **Code-block fidelity (highest risk)** — Phase 6's Python scripts are several hundred lines each, with f-strings (curly braces), triple-quoted docstrings, regex, and bash-callouts via `subprocess`. JSX-escape rules and template-literal escapes can silently mangle them. **Mitigation**: per-page validation step that pastes from the CopyButton into `python -m py_compile`. If compile fails, the transcription is broken; fix the TSX, never the Python.

2. **HTML entity decoding** — v1 has `&amp;&amp;` (in bash code) and `&#10;` (in textarea placeholders). JSX renders text inside `{…}` strings without entity decoding. **Mitigation**: hand-decode every entity. In the textarea placeholder at v1 line 451 (`placeholder="ios&#10;android&#10;shared&#10;docs"`), the JSX becomes `placeholder={"ios\nandroid\nshared\ndocs"}`.

3. **Glossary popup positioning on mobile** — the `Math.min(r.left, window.innerWidth - 300)` formula works on desktop but at 375px width, `window.innerWidth - 300 = 75px`, which could push the popup awkwardly into the left edge. **Mitigation**: hand-test on 375px. If awkward, swap to a centered-near-the-trigger formula or a bottom-sheet-style positioning on small screens. **Open question**: is this a port-blocker, or can we ship as-is and refine in feedback? Recommended: ship and refine.

4. **Persona-card form a11y** — v1 uses `<label for="…">` with implicit `<input id="…">` pairing, which is correct. Make sure the React port preserves `htmlFor` on labels and `id` on inputs. v1 doesn't add fieldset/legend grouping for the language checkboxes; preserve that — it's verbatim.

5. **Verbatim discipline drift over 16 files** — the temptation to "tidy" prose during transcription is real. **Mitigation**: at the end of each page port, side-by-side visual diff against v1 in a second tab before moving to the next page. Spot-checks at Phases 1, 6, 9 (per "Phase 6: Validation").

6. **Hash-router scroll-to-top on first visit** — the existing `ScrollToTop.tsx` watches `pathname`. The page modules don't change `pathname` themselves, so this should be fine. Verify after the port that initial deep-link via `#/phase-6` lands at the top, not mid-page.

7. **Origin block / credits rephrasing temptation** — the credit prose in v1 lines 286–294 is the canonical version. Handoff §12 says "preserve substance, can be lightly restructured if needed" — but for a content port, **do not restructure**. Verbatim.

8. **Code blocks with `<TplRepo />` in the middle of a line** — v1's `<pre><code class="language-bash"><span class="tpl-repo">your-repo</span>/...</code></pre>` pattern means the code body is part-static, part-dynamic. Render via template literal with `${repoName}` interpolation. The CopyButton then sees the rendered string, which matches v1's runtime behavior.

9. **Long files** — `Phase6.tsx` will be the largest file in the codebase (probably 500-700 lines). That's fine — content is content. If editor performance suffers, that's a tool problem, not a structure problem.

10. **No tests** — this port is content. There is no logic to unit-test that isn't covered by manual validation. Adding a test framework now would be premature.

## End of plan
