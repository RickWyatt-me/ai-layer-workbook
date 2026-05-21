# Roadmap

Tracks what's intentionally **not** in v3.0 so v3.0 stays shippable. v3.0 scope is fixed in `CLAUDE.md` and `Docs/ai-layer-workbook-claude-code-handoff.md`.

---

## v3.0 — current target

Port v1 to React/Vite/TS, deploy to `ai-layer.roipros.com` on Cloudflare Pages, then layer in:

- **A.** Settings (Anthropic key + GitHub PAT in `localStorage`)
- **B.** GitHub repo fetch (Level 2 baseline)
- **C1.** Audit my repo (Phase 2)
- **C2.** Draft my root CLAUDE.md (Phase 1)
- **C3.** Draft this sub-CLAUDE.md (Phase 3, per discovered area)
- **C4.** Draft this skill (Phase 5)

Ship between each capability for owner feedback.

---

## v3.1+ — explicitly deferred

Captured here so they don't get lost. Do **not** build during v3.0.

### Further L3 capabilities

- **Adapt the SessionStart hook to my structure.** Take the user's repo data and rewrite the embedded SessionStart hook script to fit their actual layout.
- **Adapt the Stop hook scripts to my repo.** Same idea for `propose_claude_md.py` and `reflect_claude_md.py`.
- **Review my existing CLAUDE.md.** Paste-in audit of a CLAUDE.md the user already has — flag what's working, what's missing, what's stale.
- **Generate a custom MCP server.** From a one-line description, produce a starter MCP server scaffold matching the user's stack.
- **Generate a plugin manifest.** Turn the workbook output into a `plugin.json` for a Claude Code plugin so a team can install the whole bundle in one command.

### Persistence / sharing

- **Draft history.** Persist generated AI outputs across sessions, let the user diff against prior runs.
- **Shareable personalized URLs.** A teammate opens a link and sees the workbook pre-personalized to a shared repo.

### Out-of-scope categories

- **Accounts / login / cloud sync.** Stay BYOK + local-only.
- **Operator-paid API model.** Would require a backend proxy — explicit non-goal.
- **Auto-PR to the user's repo.** Site produces content; user's local agent applies it.
- **i18n.** English only.
- **Comments / community features.** No discussion surfaces on the site.
- **"Generate complete starter pack as a zip."** Interesting; large scope; defer.

---

## Performance / tech-debt watch items

These came out of the scaffold + shell port `/code-review` (see
[`.agents/code-reviews/scaffold-and-shell-port.md`](./.agents/code-reviews/scaffold-and-shell-port.md)).
None block v3.0 — revisit if/when they actually hurt.

- **Replace `react-router-dom` with a hand-rolled hash router.** ~20 KB
  gzipped saving. Routes are flat, no loaders, no nesting — we're paying for
  unused capability. Revisit if bundle blows the <200 KB target.
- **Lazy-load `react-markdown` + `remark-gfm`.** When C1 ships, import via
  `React.lazy` / dynamic `import()` so the markdown chunk only loads when an
  AI panel mounts. Currently tree-shaken to zero, but the moment they're
  imported eagerly that's ~50–70 KB on every page.
- **Self-host fonts via `@fontsource-variable/*`.** Google Fonts adds two
  preconnects and a third-party RTT; self-hosting eliminates that plus
  fingerprints fonts with the bundle.
- **Inline theme-init script in `<head>`.** Eliminates the brief light flash
  for users whose system prefers dark. Read `localStorage` / `matchMedia` and
  set `data-theme` before React boots.
- **`matchMedia` listener for OS theme changes.** Currently we snapshot the
  preference once at first mount. Add a listener so the page tracks OS
  toggling (with cleanup).
- **`vite.config.ts` `build.rollupOptions.output.manualChunks`.** Split
  vendor chunks (react, router, markdown) so the index chunk doesn't churn
  on every app change.
- **Drawer focus trap on mobile.** `aria-expanded` and Escape-to-close shipped
  in step 2; a proper focus trap (Tab cycles inside drawer when open) is
  deferred to step 3.

## How to promote an item

When promoting from this list into a real scope:

1. Confirm the capability still matches the workbook's framing ("the site cannot edit your codebase" — it only produces content).
2. Add it as a new section in `Docs/` with the prompt design, API call shape, and acceptance criteria.
3. Update `CLAUDE.md` "Resolved decisions" if its inclusion changes any existing decision.
4. Open a tracking issue once the repo has GitHub Issues enabled.
