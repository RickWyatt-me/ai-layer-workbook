# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project profile

- **Name:** `ai-layer-workbook`
- **Purpose:** Plain-language, step-by-step workbook teaching non-technical-but-capable builders how to set up Claude Code in a large codebase. Going from v1 (single-file HTML prototype) to v3 (live AI-powered site at `ai-layer.roipros.com`).
- **Stack:** TBD — pre-implementation. Recommended stack is Vite + React + TypeScript per handoff §5, no UI framework, no state library, static deploy to Cloudflare Pages.
- **Repo:** https://github.com/RickWyatt-me/ai-layer-workbook (public, MIT)
- **Brain corpus tag:** not yet registered — run `/brain-onboard` after this init
- **Sensitivity:** `shareable` (repo is public)

---

## Repository state

This repo is **pre-implementation**. It contains exactly two source artifacts:

- `ai-layer-workbook-v1.html` — the v1 prototype. Single self-contained HTML (~2,300 lines) with inline CSS and JS, built as a Claude.ai artifact. The source of truth for content, aesthetic, and v1 interactivity.
- `Docs/ai-layer-workbook-claude-code-handoff.md` — the full implementation brief for v3. Read this end-to-end before doing anything else. It contains the spec, architecture recommendation, acceptance criteria, and eight open questions the user must answer before architecture work begins.

There is no `package.json`, no build, no framework chosen yet. You are starting fresh, using v1 as the content/aesthetic reference.

## Before you start coding

The handoff brief (§13) lists eight open questions — repo visibility (resolved: public), hosting, subdomain, BYOK confirmation, model defaults, L3 feature order, brand assets, analytics. **Ask the remaining ones in your first turn and wait for answers.** Do not scaffold a project or pick a stack until they are resolved.

## What v3 is

A static SPA hosted on a `roipros.com` subdomain that:

1. Ports the v1 workbook content (16 sections) to a maintainable codebase.
2. Adds a settings panel for Anthropic API key + GitHub PAT (BYOK).
3. Adds GitHub repo fetch → personalize the workbook to the user's repo (Level 2).
4. Adds four streaming Anthropic API features (Level 3), built in this order:
   - **C1** Audit my repo (Phase 2)
   - **C2** Draft my root CLAUDE.md (Phase 1)
   - **C3** Draft this sub-CLAUDE.md (Phase 3, per discovered area)
   - **C4** Draft this skill (Phase 5)

Ship after each capability lands so the owner can give feedback before the next one starts. Do not parallel-track.

## Non-negotiable constraints

These are easy to violate by accident and expensive to undo. Internalize them:

- **No backend, ever.** Static site. No serverless functions, no proxy. API keys live only in the browser's `localStorage` and are sent directly to `api.anthropic.com` / `api.github.com`. The moment a proxy exists, the trust model changes — don't introduce one.
- **Never log, persist, or transmit API keys anywhere except their destination host.** No `console.log` of the key (not even truncated), no telemetry payload, no error report.
- **Content is ported verbatim.** Every word, every code block, every callout from v1 stays exactly as written. The Python hook scripts (SessionStart, `propose_claude_md.py`, `reflect_claude_md.py`) are reviewed working code adapted from `helpline` — do not "modernize" them. If you spot a typo or stale fact, flag it; do not rewrite.
- **Aesthetic is preserved.** Fonts (Fraunces / Newsreader / JetBrains Mono), palette (warm cream `#F4EFE6` / deep ink `#1F1A14` / terracotta `#B6452C`), editorial field-guide layout, ~720px reading column. No gradients, no extra shadows, no modernization. If you want to change a visual decision, ask first. Full CSS variables are in handoff Appendix A and the `<style>` block of `ai-layer-workbook-v1.html`.
- **The site cannot edit the user's codebase.** All AI output is *content* the user takes to their local agent. UI copy must never imply the site modifies code.
- **Mobile-first to 375px.** Test the personalize panel, settings, and AI-result rendering on phone widths — non-trivial share of users read on phones.

## The site is *not* a generic AI tool

The target reader is "non-technical-but-capable" — hands-on builders who ship things using agents like Claude Code but should not be asked to debug TypeScript. Pitch UI copy and any error messages to that audience: plain language, jargon defined, direct without being chummy.

## Default model choices

- `claude-opus-4-7` — primary "generate" actions (C1–C4 drafts).
- `claude-haiku-4-5-20251001` — fast small jobs (glossary lookups, quick rewrites).

Make model selection configurable in settings but ship these defaults.

## Anthropic browser call shape

Streaming Messages API. The CORS opt-in header is `anthropic-dangerous-direct-browser-access: true`. Verify the header name against current docs at build time — header names have shifted historically. Full reference call shape is in handoff Appendix C.

## Out of scope for v3.0

Capture in `ROADMAP.md`, do not build:

- Further L3 features beyond C1–C4 (adapt hooks, paste-in CLAUDE.md audit, generate MCP server, plugin manifest, draft history, shareable personalized URLs)
- Accounts / login / cloud sync
- Operator-paid API model (BYOK only)
- Auto-PR to the user's repo
- i18n, comments, community features

## Acceptance criteria

The full checklist is in handoff §14. The non-obvious items: agent picker must be visibly labeled (top v1 UX bug), scroll-to-top must work on navigation when deployed standalone (broken inside the artifact iframe), and no API key/PAT may ever appear outside `localStorage` — including in console errors or network error objects.

## Credits — preserve verbatim

In both the README and the in-page credit block (full text in handoff §12):

- **Cole Medin** — YouTube walkthrough
- **Anthropic** — "How Claude Code works in large codebases"
- **helpline** reference repo — `github.com/coleam00/helpline`
- **Dynamous community** — `dynamous.ai`

---

## Workflow Decision Tree

Pick the right tool for the situation:

**Use a local `/command` (interactive, course-style)** when:
- The task is exploratory or architectural — you want to see and approve each step
- You're early in a feature and don't have a clean spec
- Daily PIV work: `/plan-feature`, `/execute`, `/code-review`, `/validate`, `/code-review-fix`, `/commit`

**Use an Archon workflow (autonomous, delegated)** when:
- The task is well-scoped and the spec is clear — a GitHub issue, a PR review, a known fix
- You want a complete end-to-end run in an isolated worktree, ending in a draft PR
- Fire-and-forget / remote / mobile
- Commands: `/archon/fix-issue`, `/archon/pr-review`, `/archon/create-issue`, `/archon/feature-dev`

**Query the brain** when:
- The question might span multiple projects ("have I solved this before?")
- You need prior patterns, prior RCAs, prior architectural decisions
- Prefer `query_graph`, `shortest_path`, `god_nodes`, `get_neighbors`, `get_community` over file searches for cross-cutting questions

## Brain MCP access

The `brain-global` MCP server is wired to every Claude Code session via `~/.claude/mcp.json`. It exposes a federated knowledge graph across all registered project corpora.

- Before deep-diving into a new problem, ask the brain whether prior work touched something related
- Cite results with `[repo:path]` format so the user can trace claims back to source
- This repo's sensitivity is `shareable` (public GitHub), so its contents are safe to surface anywhere. Cross-repo queries may still touch `confidential` corpora — don't quote those in PRs / public Slack / cloud destinations

## Archon v2 awareness

Archon v2 runs locally and exposes default workflows via the `archon` CLI. The `/archon/*` shim commands in `.claude/commands/archon/` invoke them.

- Workflows run in isolated git worktrees under Archon's workspace — this tree is untouched until a PR is opened
- The GitHub webhook adapter only triggers on **@archon mentions in issue/PR comments**, never descriptions (prompt-injection mitigation)
- If `archon workflow list` returns nothing, Archon isn't running — start it before invoking `/archon/*` commands

## Daily commands

| Command | Purpose |
|---|---|
| `/prime` | Load project context at session start |
| `/plan-feature <feature>` | Produce a deep implementation plan |
| `/execute <plan-path>` | Implement a plan task-by-task |
| `/code-review` | Manual-style code review against project standards |
| `/validate` | Run tests, type-check, lint, format |
| `/code-review-fix` | Address findings from code-review |
| `/commit` | Stage and commit with a structured message |
| `/create-prd` | Bootstrap a PRD from conversation |
| `/archon/fix-issue <#>` | Hand a GitHub issue to Archon for end-to-end fix |
| `/archon/pr-review <#>` | Smart PR review via Archon |
| `/archon/create-issue` | Classify a problem and file a GitHub issue |
| `/archon/feature-dev <feature>` | Greenfield feature, autonomous |
| `/brain-onboard` | Register this project with the brain (one-time at init) |
| `/brain-query "<question>"` | CLI-path brain query (Haiku-summarized prose) |
| `/brain-status` | Show registered corpora and last refresh |

---

## Tech stack / Dev commands

**Pre-implementation.** No `package.json`, no build, no tests. The recommended stack is documented in `Docs/ai-layer-workbook-claude-code-handoff.md` §5. Fill this section in once the scaffolding lands — at that point the file likely needs a split into `templates/CLAUDE-sectioned/` form.

## Trust but verify

Don't assume external claims (library APIs, MCP tool signatures, Archon workflow names, the exact Anthropic browser-CORS header name) without verifying. Use `context7` for current library docs. Check that file paths and function names referenced in old memories still exist before recommending action on them.
