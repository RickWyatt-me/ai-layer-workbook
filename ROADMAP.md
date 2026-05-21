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

## How to promote an item

When promoting from this list into a real scope:

1. Confirm the capability still matches the workbook's framing ("the site cannot edit your codebase" — it only produces content).
2. Add it as a new section in `Docs/` with the prompt design, API call shape, and acceptance criteria.
3. Update `CLAUDE.md` "Resolved decisions" if its inclusion changes any existing decision.
4. Open a tracking issue once the repo has GitHub Issues enabled.
