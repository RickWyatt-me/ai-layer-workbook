# The AI Layer Workbook

A plain-language, step-by-step workbook teaching non-technical-but-capable
builders how to set up [Claude Code](https://claude.com/claude-code) in a real
codebase — using the conventions from Anthropic's article ["How Claude Code
works in large codebases"](https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start).

**Status:** pre-implementation. The repo is currently the v1 single-file HTML
prototype plus a fresh Vite + React + TypeScript scaffold. v3 (live AI-powered
site at `ai-layer.roipros.com`) is in active development.

- v1 prototype: [`ai-layer-workbook-v1.html`](./ai-layer-workbook-v1.html)
- Implementation brief: [`Docs/ai-layer-workbook-claude-code-handoff.md`](./Docs/ai-layer-workbook-claude-code-handoff.md)
- Project notes for AI agents: [`CLAUDE.md`](./CLAUDE.md)
- Deferred v3.1+ items: [`ROADMAP.md`](./ROADMAP.md)

---

## Run locally

Requires [Node.js 20+](https://nodejs.org/) (Cloudflare Pages baseline is 22 LTS;
see `.nvmrc`).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs static site to dist/
npm run lint
npm run format:check
```

## Project layout

```
src/
├── main.tsx                Bootstrap
├── App.tsx                 Router shell
├── styles/globals.css      Aesthetic (ported verbatim from v1)
├── components/             Sidebar, Topbar, AI-action buttons, etc.
├── pages/                  One file per workbook section
├── hooks/                  useSettings, useRepo, useChecklist, useDrafts
├── lib/                    anthropic.ts, github.ts, prompts.ts, pricing.ts
└── data/                   glossary, etc.
```

## Claude Code setup in this repo

This repo ships a working `.claude/` setup that follows the same patterns the
workbook teaches. Clone the repo and it works — no extra install. Pieces:

- **`.claude/agents/explorer.md`** — read-only subsystem-mapper subagent
  (adapted from helpline).
- **`.claude/skills/scoped-tests/`** — guidance on running the narrowest
  verification command for a given change (adapted from helpline).
- **`.claude/hooks/propose_claude_md.py`** — Stop hook (the cheap trigger half
  of the self-improving AI Layer — copied verbatim from helpline).
- **`.claude/hooks/reflect_claude_md.py`** — the reasoning half (LLM call that
  proposes CLAUDE.md edits — copied verbatim).
- **`.claude/settings.json`** — wires the Stop hook.

The Stop hook is currently **inert** until at least one sub-directory has its
own `CLAUDE.md` — by design, it watches the CLAUDE.md _hierarchy_ and noops
when only the root is present. As `src/CLAUDE.md`, `Docs/CLAUDE.md` (etc.) land,
it'll start proposing updates whenever a session's changes drift from what those
files say.

Requires [`uv`](https://github.com/astral-sh/uv) to run the hook
(`uv run python …`). Install with `brew install uv`.

---

## Deployment

Static SPA. Deployed to [Cloudflare Pages](https://pages.cloudflare.com/) at
**ai-layer.roipros.com** (DNS pending). Build command: `npm run build`. Output
directory: `dist`. Node version: 22.

[Cloudflare Web Analytics](https://www.cloudflare.com/web-analytics/) is
enabled in the Pages dashboard — cookieless, no consent banner, zero
JS-bundle cost.

---

## Credits

This guide stands on the work of Cole Medin and the
[Dynamous](https://dynamous.ai) community of AI builders. Cole's [YouTube
walkthrough](https://youtu.be/efRIrLXoOVA?si=Pn8Dzw-7DwfmPq5V) took Anthropic's
article ["How Claude Code works in large codebases"](https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start)
and turned it into a working reference codebase — the [`helpline`
repo](https://github.com/coleam00/helpline). Every pattern in this workbook
is concrete because of that repo.

The portable pieces in `.claude/` (the explorer subagent, scoped-tests skill,
and the self-improving Stop hook) are adapted from helpline's
[`tooling/helpline-ai-layer/`](https://github.com/coleam00/helpline/tree/main/tooling/helpline-ai-layer)
directory. The Python hook scripts are copied verbatim; the skill and agent
have been adapted to this project's stack (TypeScript + Vite + React) and
content area.

I built this for myself, to make implementation easier and to translate the
technical pieces into something I could confidently execute. I quickly realised
others might want the same. If that's you — welcome. The substance is Cole's
and Anthropic's; the angle here is just plain-language, one-step-at-a-time.

Want to go deeper with people doing this work full-time? Join us at
[Dynamous](https://dynamous.ai).

---

## License

[MIT](./LICENSE). Use it, fork it, share it. Attribution to helpline / Cole /
Anthropic / Dynamous if you take significant pieces is appreciated and is the
norm in this community.
