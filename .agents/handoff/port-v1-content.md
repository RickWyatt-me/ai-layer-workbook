# Handoff: port-v1-content

**Plan:** `.agents/plans/port-v1-content.md`
**Built:** Replaced the placeholder `Section.tsx` with 16 per-slug TSX page modules ported verbatim from `ai-layer-workbook-v1.html`, plus shared `PersonaCard`, `Checklist`, `CodeBlock`/`CopyButton`, `GlossaryTerm`/`GlossaryPopup`, and `TplRepo`/`TplAgent` components. No Prism wiring, no visited-tracking, no L2/L3 features — those are the next steps in the locked feature order.

**Files changed:** 3 modified, 26 added. Highlights:

- `src/components/Section.tsx` — rewired from placeholder to a static slug→page dispatcher (eager imports, 16 entries)
- `src/App.tsx` — wraps the Shell in `<GlossaryPopup>` so the popup context is available to every page
- `src/pages/Phase6.tsx` — largest file; transcribes the two Python hook scripts via template literals to preserve indentation/escapes
- `src/components/PersonaCard.tsx` — controlled form persisting to `workbook:persona`; matches v1's empty-string-to-`'your-repo'` fallback
- `src/data/glossary.tsx` — single source of truth for both the popup map (7 terms) and the Glossary page `<dl>` (23 entries)
- `src/lib/storage-keys.ts` — added `persona` + `checks` keys (literal values match v1 storage schema for state portability)

**Acceptance status:**

- ✓ All 16 page modules render, dispatcher works, pager and ScrollToTop intact
- ✓ Persona + checklist persist to the exact v1 keys/shape
- ✓ Glossary popup hover/click/Esc/click-outside all work
- ✓ `npm run lint`, `format:check`, `build` all clean; zero console errors across all 16 routes
- ✓ No new dependencies; secret-grep returns zero matches

**Deviations from plan:** Plan said 22 glossary entries; v1 actually has 23 (verified by counting `<dt>` in `ai-layer-workbook-v1.html` lines 1959–1981). Included all 23.

**TODOs left in code:** None.
