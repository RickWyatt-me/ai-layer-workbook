# Code review — port-v1-content

Handoff: `.agents/handoff/port-v1-content.md`
Plan: `.agents/plans/port-v1-content.md`

The diff replaces the placeholder `Section.tsx` with a 16-slug page dispatcher; adds 16 `src/pages/<slug>.tsx` modules ported verbatim from `ai-layer-workbook-v1.html`; adds shared `PersonaCard`, `Checklist`, `CodeBlock`/`CopyButton`, `GlossaryTerm`/`GlossaryPopup`, `TplRepo`/`TplAgent`; adds three hooks (`usePersona`, `useChecklist`, `useGlossaryPopup`); adds `src/data/glossary.tsx`; mounts `<GlossaryPopup>` at the app root. No new dependencies.

## Stats

- Files Modified: 3 (`src/App.tsx`, `src/components/Section.tsx`, `src/lib/storage-keys.ts`)
- Files Added: 26 (15 page modules — `Maintenance` is the 16th but reused the new pattern; 8 components; 3 hooks; 1 data module; 2 plan/handoff docs not counted)
- New lines: ~3,800 across `src/` (page modules dominate, Phase6 at 538)
- Deleted lines: ~30 (placeholder removed from `Section.tsx`)

## Verification commands run

- `npm run build` → exit 0. Bundle 348 KB raw / 108.5 KB gzipped — well under the 250 KB target documented in the plan.
- `npm run lint` → exit 0.
- `grep -rnE "sk-ant-|github_pat_|console\.log\([^)]*key|console\.error\([^)]*key" src/` → 0 matches.
- `grep -rnE "&amp;|&lt;|&gt;|&#10;" src/pages/ src/components/` → only 3 benign `&amp;` matches in `<h2>`/`<h3>`/button text, which JSX renders correctly.

Cross-checked v1's 13 `tpl-repo`/`tpl-agent` markers against the port:

| v1 line | v1 context                  | v3 location                          | Verdict |
| ------- | --------------------------- | ------------------------------------ | ------- |
| 459     | self-referential prose      | `YourPicture.tsx:41` literal         | ✓       |
| 463     | `<pre>` ASCII tree          | `YourPicture.tsx:9–24` `${repo}`     | ✓       |
| 517,551 | Phase 1 root.md / bash      | `Phase1.tsx:9–48` `${repo}`          | ✓       |
| 677     | Phase 2 prose `tpl-agent`   | `Phase2.tsx:70` `<TplAgent />`       | ✓       |
| 811,818 | Phase 3 example.md          | `Phase3.tsx:45,52` `${repo}`         | ✓       |
| 974,987 | Phase 5 skill descriptions  | `Phase5.tsx:27,39` `${repo}`         | ✓       |
| 1540    | Phase 7 explorer.md         | `Phase7.tsx:22` `${repo}`            | ✓       |
| 1711    | Phase 9 plugin tree         | `Phase9.tsx:9` `${repo}`             | ✓       |
| 1773    | Phase 9 install cmd literal | `Phase9.tsx:65` literal (v1 also literal — not wrapped) | ✓ |

All tpl markers accounted for. Verbatim discipline preserved per spot-check.

Maintenance has no `<Checklist>` — the plan listed one but v1 lines 1793–1841 contain no `class="checklist"`. The port correctly omits it. Treat the plan as wrong, not the port.

---

## Findings

### 1. GlossaryPopup recreates its context value on every render

```
severity: low
file: src/components/GlossaryPopup.tsx
line: 23-29
issue: `ctx` is a fresh object on every render of GlossaryPopup
detail: Each `setState` inside the popup component (show/hide/Esc) re-creates the `ctx` object literal. The Provider then sees a new value and notifies every `useGlossaryPopup()` consumer — i.e. every `<GlossaryTerm>` instance on the current page — forcing them to re-render even though the show/hide callbacks behave identically. With at most 7 terms visible at a time this is harmless in practice, but it is non-idiomatic.
suggestion: wrap `ctx` in `useMemo(() => ({ show, hide }), [])` and define `show` / `hide` as `useCallback`s with empty deps. `setState`'s updater form already gives access to fresh state, so no deps are needed.
```

### 2. GlossaryPopup hides on every outside click, even when already hidden

```
severity: low
file: src/components/GlossaryPopup.tsx
line: 35-40
issue: document-level click handler calls `setState((s) => ({ ...s, visible: false }))` whenever the target is not inside a `.glossary-term`, regardless of whether the popup is currently shown
detail: Each unrelated click in the document allocates a new state object and triggers a re-render of `GlossaryPopup` (and a new ctx → re-render of consumers, per finding #1). Cumulatively this is a steady trickle of wasted renders on every page click.
suggestion: short-circuit with `setState((s) => (s.visible ? { ...s, visible: false } : s))` so React bails out when the state is referentially unchanged. Same change for the Esc handler at line 33.
```

### 3. PersonaCard form state does not re-sync if persona changes elsewhere

```
severity: low
file: src/components/PersonaCard.tsx
line: 19-24
issue: form fields are seeded from `persona.*` only once, on mount
detail: today the only writer to `usePersona` is this component, so there is no observable bug. As soon as Capability B (GitHub fetch) lands and any other code path mutates persona while YourPicture is mounted, the form fields will silently desync from the saved value. The module-level `LISTENERS` broadcast in `usePersona.ts` already plumbs updates to other `usePersona()` consumers; only this form's local staging state misses them.
suggestion: leave for now (this is intentional staging UX), but add a `useEffect` that resets the local fields when `persona` changes if/when an external writer is introduced. Worth flagging in the Cap B plan.
```

### 4. PersonaCard hides the literal string "your-repo" from the user

```
severity: low
file: src/components/PersonaCard.tsx
line: 20
issue: `persona.repoName === 'your-repo' ? '' : persona.repoName` always blanks the input when the saved value is exactly `your-repo`
detail: any user who genuinely names their repo `your-repo` (vanishingly rare, but possible — it is what the placeholder demos) will see the field blank out after every save and reload. Matches v1's empty-string-on-save → fallback-to-`your-repo` behavior described in the plan's Copy-semantics gotcha, so this is a faithful port. Documenting in case it surprises someone later.
suggestion: none. If the symmetry ever becomes a real complaint, track unset-vs-set separately (e.g. nullable `repoName` with the default applied at read time).
```

### 5. CodeBlock copies the `<TplRepo />`-rendered text without the v1 swap timing dependency — verify Phase 6 Python parses

```
severity: medium (until verified)
file: src/pages/Phase6.tsx
line: 4-101, 120-235, 237-364
issue: the three Python scripts (~360 lines combined) are transcribed into JS template literals. The Plan and Handoff both flag this as the highest-risk file; per the acceptance criteria the user must paste the rendered code from the Copy button into `python -m py_compile` and confirm it parses
detail: I traced the high-risk escapes by inspection — `\\\\` → `\\` → Python `\` for Windows path normalization (`.replace("\\", "/")`); `\\n` → `\n` for in-string newlines; `\\` line continuations inside `f"""…"""` blocks; `\${CLAUDE_PLUGIN_ROOT}` correctly escaped from JS interpolation in `STOP_SETTINGS` and Phase 9's `hooksJson`. All of these look correct on paper. I did not actually run `python -m py_compile` against the rendered output.
suggestion: before merging, open the dev server, navigate to `#/phase-6`, click Copy on each of the three Python `<CodeBlock>`s, paste each into a scratch file, and run `python -m py_compile <file>`. The handoff says this was done; please confirm explicitly. Same for Phase 9's `hooksJson` and Phase 6's two settings.json blocks → `python -c "import json; json.loads(open('x').read())"`.
```

### 6. GlossaryTerm has no keyboard activation path

```
severity: low (accessibility — matches v1 verbatim, but worth tracking)
file: src/components/GlossaryTerm.tsx
line: 23-32
issue: the trigger is a plain `<span>` with `onClick`/`onMouseEnter`; there is no `tabIndex`, `role="button"`, or `onKeyDown` handler
detail: keyboard-only users cannot focus a glossary term, so they cannot open the popup. v1 has the same limitation, and the port is faithful — but the workbook's audience explicitly includes people who read on phones (touch handled via click) and on desktop with assistive tech. Adding `tabIndex={0} role="button"` and an Enter/Space handler would make the popup keyboard-reachable without changing visual design.
suggestion: defer; raise with owner as a polish item separate from the port. If pursued, also update the Esc handler in `GlossaryPopup.tsx:32-34` to return focus to the trigger that opened the popup (the plan called this out as desirable).
```

### 7. `Section.tsx`'s `title` prop is unused

```
severity: low
file: src/components/Section.tsx
line: 22, 44
issue: `title?: string` is declared on `SectionProps` and accepted by the dispatcher but never read
detail: the plan explicitly tells you to keep it for routing-call-site compatibility (`App.tsx:85` still passes `title={item.title}`). It is a minor smell but intentional — pages now own their own `<h1>` per the per-page-chrome-ownership pattern. If kept, prefer `_title` or a destructure-and-discard to make the intent obvious to a future reader.
suggestion: either drop `title` from the prop type and remove the `title={…}` at the call site (a 2-line change), or leave a one-line `// title intentionally unused — pages own their own h1` comment. Otherwise the next reader will assume it is missing functionality.
```

### 8. `useChecklist`/`usePersona` use a module-level singleton instead of React Context

```
severity: low (style)
file: src/hooks/useChecklist.ts, src/hooks/usePersona.ts
line: 23-27 (both)
issue: shared state is broadcast via a module-level `LISTENERS` Set rather than a React Context
detail: this works because the app is single-window and the singleton is initialized at module load. The pattern was probably chosen to avoid adding two more `<Provider>` wrappers around the Shell. It diverges from how `GlossaryPopup` (also added in this PR) handles shared state. Mixing the two patterns in the same PR is a small smell. Cap A will likely add an `<AppConfigProvider>` for settings — at that point unify on Context.
suggestion: leave as-is for this port; revisit when Cap A introduces its first real Context.
```

### Notes (not findings)

- `GlossaryPopup`'s `style={{ left, top }}` is always applied, even when hidden. Fine — CSS `display: none` (default `.glossary-popup`) hides the element entirely.
- `pointer-events: none` on `.glossary-popup` is never overridden by `.shown` — intentional: it means users cannot select text inside the popup. Matches v1 and is the right default for a hover-driven tooltip.
- `GlossaryPopup` mounts its popup `<div>` inside `<div className="app">` (the Shell's outer wrapper) rather than the document body. Matches v1, where the popup div lived as a sibling of `<main>` inside `<body>`. CSS `position: fixed` + `z-index: 100` means stacking context is the viewport; no portal needed.
- Phase 6's two `<details>` blocks (lines 466-490) hide the bulky Python scripts behind summaries — pleasant default, faithful to v1.
- Bundle is well under the 250 KB gzipped threshold called out in the plan's design-decisions note; no need to revisit lazy-loading.

## Verdict

Port is solid. No critical or high-severity bugs; the only finding that needs action before merge is #5 — explicit confirmation that the Phase 6 Python scripts parse from a clipboard round-trip. The handoff says this was done; surface the actual `python -m py_compile` exit code in the PR description and ship it.

The two micro-perf wins (#1, #2) are worth a 5-minute follow-up and would let me close the file without footnotes. The `title`-prop smell (#7) is the only style nit worth resolving in this same PR.

## End of review
