# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

This repo is **pre-implementation**. It contains exactly two artifacts:

- `ai-layer-workbook.html` — the v1 prototype. Single self-contained HTML (~2,300 lines) with inline CSS and JS, built as a Claude.ai artifact. The source of truth for content, aesthetic, and v1 interactivity.
- `Docs/ai-layer-workbook-claude-code-handoff.md` — the full implementation brief for v3. Read this end-to-end before doing anything else. It contains the spec, architecture recommendation, acceptance criteria, and eight open questions the user must answer before architecture work begins.

There is no `package.json`, no build, no git history, no framework chosen yet. You are starting fresh, using v1 as the content/aesthetic reference.

## Before you start coding

The handoff brief (§13) lists eight open questions — repo visibility, hosting, subdomain, BYOK confirmation, model defaults, L3 feature order, brand assets, analytics. **Ask these in your first turn and wait for answers.** Do not scaffold a project or pick a stack until they are resolved.

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
- **Aesthetic is preserved.** Fonts (Fraunces / Newsreader / JetBrains Mono), palette (warm cream `#F4EFE6` / deep ink `#1F1A14` / terracotta `#B6452C`), editorial field-guide layout, ~720px reading column. No gradients, no extra shadows, no modernization. If you want to change a visual decision, ask first. Full CSS variables are in handoff Appendix A and the `<style>` block of `ai-layer-workbook.html`.
- **The site cannot edit the user's codebase.** All AI output is *content* the user takes to their local agent. UI copy must never imply the site modifies code.
- **Mobile-first to 375px.** Test the personalize panel, settings, and AI-result rendering on phone widths — non-trivial share of users read on phones.

## The site is *not* a generic AI tool

The target reader is "non-technical-but-capable" — hands-on builders who ship things using agents like Claude Code but should not be asked to debug TypeScript. Pitch UI copy and any error messages to that audience: plain language, jargon defined, direct without being chummy.

## Recommended stack (from the brief — confirm before committing)

- **Vite + React + TypeScript**, no UI framework, no state library. Context + `localStorage` is enough.
- **`@anthropic-ai/sdk`** with `dangerouslyAllowBrowser: true`, OR hand-rolled `fetch` to `https://api.anthropic.com/v1/messages`. Both are fine. Streaming endpoint, render tokens as they arrive, surface `usage.input_tokens` / `usage.output_tokens` + approximate cost at the end.
- **`octokit`** or hand-rolled `fetch` for GitHub REST. Cache aggressively per-repo in `localStorage` with timestamps.
- **Cloudflare Pages** for hosting (recommended), with branch previews enabled.

Suggested project structure is in handoff §7 — use it as a starting point, not a prescription.

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
