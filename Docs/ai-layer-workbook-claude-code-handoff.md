# The AI Layer Workbook — Implementation Handoff

**Audience:** Claude Code (or another senior coding agent) taking this project from a single-file v1 prototype to a deployed v3 production site.
**Author of brief:** Claude (claude.ai chat), drafted with the project owner.
**Status of v1:** Built as a single HTML artifact in a chat session. Functional but unpolished. Provided as a reference at `./ai-layer-workbook-v1.html`.
**Target:** Deploy a Level-3 (live AI-powered) version of the workbook to a subdomain of `roipros.com` (proposed: `ai-layer.roipros.com`).

> **Note for Claude Code:** Read this entire brief before writing any code. The "Open questions" section at the bottom contains things you should confirm with the user before starting major architectural work. Ask those questions in your first turn. Do not assume answers.

---

## 1. Project context

The AI Layer Workbook is a plain-language, step-by-step implementation guide that teaches non-technical-but-capable builders how to set up Claude Code in a large codebase — using the conventions described in Anthropic's article ["How Claude Code works in large codebases"](https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start) and Cole Medin's [YouTube walkthrough](https://youtu.be/efRIrLXoOVA?si=Pn8Dzw-7DwfmPq5V), which uses his [helpline reference repo](https://github.com/coleam00/helpline) as the concrete example.

The owner of this project is a member of the [Dynamous](https://dynamous.ai) community, building the workbook for himself and for other community members. He is **non-technical** in the sense of not being a career engineer — he is hands-on, ships things, and uses agents like Claude Code to do implementation work — but he should not be asked to debug TypeScript or design React component hierarchies. Pitch your questions accordingly.

The workbook's target reader is the same persona: smart builders who want a less-jargony walkthrough of these patterns, applied to their own real codebase.

### Three product levels we considered

| Level | What it does | Status |
|---|---|---|
| **L1** | Static curriculum + prompt library. User runs prompts in their own agent locally. | v1 — done |
| **L2** | GitHub URL paste → workbook fetches repo metadata and tailors prompts/examples to the user's actual structure. Still you-run-the-prompts. | v2 — to build |
| **L3** | Live Anthropic API calls from the page. Buttons like "Audit my repo," "Draft my root CLAUDE.md," "Draft this skill" produce real, personalized output in-page that the user then takes to their local agent to apply. | v3 — the target |

**v3 contains L2 inside it.** You are building L3. Do not strip out L2 — the GitHub fetch produces the data L3 reasons over.

### Important framing

Even at Level 3, the workbook **cannot edit the user's codebase**. Only their local coding agent (running on their machine with filesystem access) can do that. The deployed site's job is to produce *content* — drafts, audits, recommendations, prompts — that the user pastes into their local agent (or copies directly into their repo). Make sure all UI copy reflects this. Never imply the site "modifies your code."

---

## 2. What you are receiving

1. **`./ai-layer-workbook-v1.html`** — the v1 build. Single self-contained HTML file with embedded CSS and JS. ~3000 lines. Loads Prism.js + Google Fonts from CDNs. Built as a Claude.ai artifact, so it has some sandbox-specific behaviors (see "Known v1 issues" below).
2. **This brief** — the spec.

That's it. There is no git history, no design system, no existing repo. You're starting fresh, using v1 as the content + aesthetic + structural reference.

---

## 3. What v1 already does (preserve this)

### Content
Sixteen sections of original writing covering:
- **Orientation** (4): Start here · Mental models · How Claude Code works · Your codebase picture (personalize panel)
- **Implementation** (9): Phase 1 Foundation · Phase 2 Discovery · Phase 3 Sub-CLAUDE.mds · Phase 4 LSP · Phase 5 Skills · Phase 6 Hooks · Phase 7 Subagent · Phase 8 MCP · Phase 9 Plugin
- **Reference** (3): Maintenance · Prompt library · Glossary

The writing is intentionally non-technical-but-substantive. Mobile-app-first (Swift + Kotlin) examples are the default; generic examples are secondary. Working Python scripts are embedded (adapted from helpline) for the SessionStart hook and the self-improving Stop hook (split into `propose_claude_md.py` + `reflect_claude_md.py`).

**CRITICAL: Do not rewrite the content.** Port it verbatim. If you spot a typo or a genuinely outdated technical fact, flag it and ask. Do not rephrase for "clarity" or "concision." The voice is deliberate.

### Aesthetic
- Fonts: Fraunces (display serif), Newsreader (body serif), JetBrains Mono (code) — all Google Fonts.
- Palette: warm cream paper (`#F4EFE6`), deep warm ink (`#1F1A14`), terracotta accent (`#B6452C`). Dark mode swaps to deep warm dark.
- Aesthetic direction: editorial / field-guide / "considered book." Not "tech product." Not "marketing site." Generous spacing, comfortable reading column (~720px max-width), large serif section numbers, decorative horizontal rules.
- Sidebar nav with section numbers in display font, persistent checklist per phase with strikethrough done-state, glossary popups on hover/click, copy buttons on every code block, top-bar agent picker + dark mode toggle.

**CRITICAL: Do not redesign.** Preserve the aesthetic. The owner liked the look — and design iteration is not part of this scope. If you want to change a visual decision, ask first.

### Interactivity (v1)
- Hash-based routing (`#/start`, `#/phase-1`, …)
- Page-by-page rendering (only one section visible at a time)
- Personalize form: repo name, languages (multi-select), repo layout, top-level folders
- Template tokens that swap on save: `.tpl-repo` and `.tpl-agent` classes in the HTML get their text content replaced
- Persistent state via `window.storage` (Claude artifact API) with `localStorage` fallback. In production, `localStorage` will be the only storage; the `window.storage` branch is irrelevant.
- Agent picker (Claude Code / Codex / Cursor / Cline / Other) in the top bar — swaps "your agent" wording throughout
- Glossary popups (hover and click)
- Copy buttons on `<pre>` blocks
- Dark mode toggle, theme persisted
- Mobile-responsive with sidebar drawer

### Known v1 issues to fix during the port
1. **Agent picker dropdown is unlabeled.** Users don't know what it is. Add a visible label ("Your agent →") or a one-line helper. This is the top-priority UX fix.
2. **Console shows generic `Uncaught Error: Script error.`** Almost certainly Claude.ai artifact-sandbox behavior (Prism.js loaded cross-origin, errors sanitized). Verify by running v1 outside the sandbox; if errors persist, debug them. They should not appear in the deployed standalone build.
3. **"Next" navigation does not scroll to top of next page** inside the artifact iframe. Caused by `window.scrollTo` scrolling the iframe's viewport, not the outer container that's actually displayed. Will resolve once deployed standalone (the page IS the viewport). Verify after deploy; add scroll-to-top safety as needed.

---

## 4. The goal — what v3 must deliver

Three new capability layers on top of the existing content. Build them in this order; do not parallel-track.

### Capability A — Settings & key management

A persistent settings panel (gear icon in the top bar, or a dedicated "Settings" page) where the user manages:

1. **Anthropic API key** (`sk-ant-…`). Required for any L3 features. Stored only in `localStorage`. Never logged, never sent anywhere except `api.anthropic.com` directly from the user's browser. The UI must clearly state where it's stored, with a "Clear key" button.
2. **GitHub Personal Access Token** (optional). Only required for private repos. Same storage / privacy rules. Link to GitHub's PAT generation page with the recommended scope (`repo` for private; nothing needed for public).
3. **Existing settings**: agent picker, dark mode, personalize data (repo name, languages, layout, folders).

Provide a clear "What gets stored locally vs sent over the network" explainer in the settings panel. Trust matters.

### Capability B — GitHub repo integration (Level 2 baseline)

A new section on the "Your codebase picture" page (replacing or augmenting the manual form):

1. **URL paste field**: `https://github.com/owner/repo` or `git@github.com:owner/repo`. Parse both formats.
2. **Fetch repo metadata** via the GitHub REST API (or GraphQL — your call):
   - Repo description, primary language, top 5 languages by bytes
   - File tree (top 3 levels deep is enough; deeper on demand)
   - README content
   - Detect presence of common framework/package files (`Package.swift`, `build.gradle.kts`, `package.json`, `pyproject.toml`, etc.) to infer stack
3. **Auto-populate the personalize fields** from the fetched data; let the user override.
4. **Use the GitHub PAT** if present and the repo is private (or if rate limits kick in for unauthenticated requests).
5. **Cache** fetched data in `localStorage` with a per-repo key and a timestamp; "Refresh from GitHub" button to refetch.
6. **Graceful errors**: bad URL, 404, rate limit, private repo without PAT — clear messages with the next step the user should take.

### Capability C — Live AI features (Level 3)

The new buttons that make L3 different from L2. Each calls the Anthropic Messages API directly from the browser using the user's stored API key, streams the response, and renders it in the page with a copy button.

**Use the model `claude-opus-4-7` for the primary "generate" actions** (highest-quality drafts). Use `claude-haiku-4-5-20251001` for fast, smaller jobs (a definition lookup, a quick rewrite). Make the model choice configurable in settings, but pick those sane defaults.

Build these four L3 features for v3 launch. **Do not try to build all of them at once** — ship them in this order, with the option to deploy and gather feedback between each:

#### C1. "Audit my repo" (on Phase 2 — Discovery)
- Prereqs: GitHub URL fetched (Capability B).
- Sends: the fetched README, file tree, language breakdown, plus the Phase 2 discovery prompt from the workbook.
- Returns: the discovery table (Path · Domain/language · Gotchas · Scoped test command · Priority).
- Renders the table in-page. Buttons: "Copy as markdown," "Regenerate," "Send to next step" (which pre-populates Phase 3).

#### C2. "Draft my root CLAUDE.md" (on Phase 1 — Foundation)
- Prereqs: GitHub URL fetched.
- Sends: repo metadata + README + the workbook's root-CLAUDE.md guidance + structural rules from the workbook.
- Returns: a complete draft, ready to paste into the repo root.
- Buttons: "Copy," "Regenerate with note" (user adds a note like "make it shorter" or "emphasize Android").

#### C3. "Draft this sub-CLAUDE.md" (on Phase 3 — Sub-CLAUDE.mds, one button per discovered area)
- Prereqs: C1 audit run.
- For each row in the discovery table, a "Draft this one" button.
- Sends: that area's path, the files in it (via GitHub API), the drafting prompt from the workbook, the project's root CLAUDE.md if present.
- Returns: a complete sub-CLAUDE.md draft for that area.
- Renders inline under the row, with copy / regenerate.

#### C4. "Draft this skill" (on Phase 5 — Skills)
- Prereqs: GitHub URL fetched.
- A small free-text field where the user describes the workflow they want to capture ("adding a new screen to our iOS app").
- Sends: that description + the project's languages + the workbook's skill-drafting prompt + an example skill from the workbook.
- Returns: a complete SKILL.md with correct frontmatter.

**API call requirements that apply to all four:**
- Stream responses so the user sees text appearing (Anthropic's streaming endpoint).
- Show a clear loading state; show input tokens used and approximate cost at the end.
- Handle errors explicitly: invalid key (401), rate limit (429), context too large (413), network failure. Each error gets a specific message with a specific next step.
- All API calls go to `https://api.anthropic.com/v1/messages` with the user's key. **Never proxy through any server.** Keys must stay client-side.

### Future L3 features explicitly out of scope for v3 launch
Document these in the README so you don't forget, but do not build them now:
- "Adapt the SessionStart hook to my structure"
- "Adapt the Stop hook scripts to my repo"
- "Review my existing CLAUDE.md" (paste-in audit)
- "Generate a custom MCP server"
- "Generate a plugin manifest from my setup"
- Persisting drafts across sessions / draft history
- Sharing personalized workbook URLs with teammates

These are good v3.1+ features. v3.0 ships the four above.

---

## 5. Tech stack recommendation

You make the final call, but here is the recommended setup:

- **Vite + React + TypeScript** for the build. Single-page app, no router framework needed (the existing hash routing is fine; keep it or migrate to react-router — your choice).
- **No UI framework** (no MUI, no Chakra, etc.). Keep the existing aesthetic; build components directly with CSS modules or styled-components. The existing CSS is already aesthetic-complete — port it.
- **No state management library.** React Context + `localStorage` is plenty.
- **`@anthropic-ai/sdk`** (the official Anthropic Node SDK) — works in the browser if you set `dangerouslyAllowBrowser: true`. That flag is correctly named: with BYOK and a dedicated user-facing app, the user's key in the browser is acceptable, but make sure the user knows. (Alternative: hand-roll `fetch` calls to `api.anthropic.com` — fewer dependencies, more control. Either is fine.)
- **`octokit`** (the official GitHub SDK) — handles GitHub REST and GraphQL cleanly. Or hand-roll `fetch` again; both work.
- **No backend.** No serverless functions. No proxy. Static site, deployed to Cloudflare Pages (or Netlify, or Vercel — owner's choice; Cloudflare Pages is the recommended default for cost + speed + GitHub auto-deploy).

If you have a strong reason to deviate (e.g., "I'd prefer Astro for content-heavy sites"), make the case before starting and confirm with the user.

---

## 6. Architecture notes

### State model
A single `useSettings()` hook backed by `localStorage`, exposing:
```typescript
interface Settings {
  anthropicKey: string | null;
  githubPat: string | null;
  agent: 'Claude Code' | 'Codex' | 'Cursor' | 'Cline' | 'Other';
  theme: 'light' | 'dark';
  persona: {
    repoName: string;
    languages: string[];
    layout: 'single' | 'multi' | 'mono';
    topLevelDirs: string;
  };
}
```

A separate `useRepo()` hook for the GitHub-fetched data (cached separately with the URL as key).

A `useChecklist()` hook for per-phase checkbox state.

A `useDrafts()` hook for storing generated AI outputs so they survive page refresh until the user explicitly clears them.

### API key handling — non-negotiables
- Stored in `localStorage` only. Never in `sessionStorage` (won't persist), never in a cookie, never in URL params.
- Sent only to `api.anthropic.com` (Anthropic key) and `api.github.com` (GitHub PAT). Verify with a CSP if practical.
- The Settings page must show the user exactly where their keys are stored, and provide a one-click "Clear all keys & settings" reset.
- Never `console.log` the key, even partially. Never include it in error reports if you add telemetry.
- If you ever introduce a backend (you shouldn't), the key handling rules become much harder. Don't.

### GitHub fetching
- Unauthenticated GitHub API has a 60 req/hour limit per IP. Reasonable for v3 because each repo fetch is ~5-10 requests.
- With a PAT, the limit is 5000 req/hour — comfortable.
- Cache aggressively. Same repo fetched twice in a session should hit the cache, not the API.

### Streaming AI responses
Use the streaming endpoint. Render tokens as they arrive — this is core to the "feels live" UX. Disable the button while streaming; show a stop button to cancel mid-stream.

### Token accounting
Anthropic returns `usage.input_tokens` and `usage.output_tokens` in the final message. Display estimated cost using current model pricing (you can hard-code it in a constants file; document where to update when prices change).

---

## 7. Project structure (suggested)

```
ai-layer-workbook/
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── public/
│   └── (favicon, og image)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── styles/
│   │   ├── globals.css           ← port v1's CSS verbatim
│   │   └── theme.ts              ← color tokens
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   ├── PersonalizePanel.tsx
│   │   ├── ChecklistItem.tsx
│   │   ├── GlossaryPopup.tsx
│   │   ├── CodeBlock.tsx
│   │   ├── CopyButton.tsx
│   │   ├── Pager.tsx
│   │   ├── SettingsPanel.tsx     ← NEW (Capability A)
│   │   ├── GitHubFetcher.tsx     ← NEW (Capability B)
│   │   ├── AIAuditButton.tsx     ← NEW (C1)
│   │   ├── AIDraftRoot.tsx       ← NEW (C2)
│   │   ├── AIDraftSubMd.tsx      ← NEW (C3)
│   │   └── AIDraftSkill.tsx      ← NEW (C4)
│   ├── pages/
│   │   ├── Start.tsx
│   │   ├── MentalModels.tsx
│   │   ├── HowItWorks.tsx
│   │   ├── YourPicture.tsx
│   │   ├── Phase1.tsx … Phase9.tsx
│   │   ├── Maintenance.tsx
│   │   ├── PromptLibrary.tsx
│   │   └── Glossary.tsx
│   ├── hooks/
│   │   ├── useSettings.ts
│   │   ├── useRepo.ts
│   │   ├── useChecklist.ts
│   │   └── useDrafts.ts
│   ├── lib/
│   │   ├── anthropic.ts          ← thin wrapper for streaming calls
│   │   ├── github.ts             ← thin wrapper for repo fetching
│   │   ├── prompts.ts            ← the workbook prompts as exported strings
│   │   └── pricing.ts            ← per-token costs for cost display
│   └── data/
│       └── glossary.ts           ← glossary terms + definitions
└── ...
```

Names are suggestions. The structure is the point: split the new L3 components clearly from the ported v1 components so the diff is legible.

---

## 8. Content port instructions

The v1 HTML has all 16 sections inlined as `<section class="page" id="page-X">…</section>` blocks. Your job is to port each into its own React component (`src/pages/Xxx.tsx`) **preserving:**

1. **Every word** of the body content. No paraphrase, no "improvements."
2. **All code blocks exactly as written.** Especially the Python hook scripts — they are functional code adapted from helpline and have been reviewed. Do not "modernize" them.
3. **All headings, eyebrows, ledes, callouts, tables, checklists** in their existing structure.
4. **All glossary `<span class="glossary-term" data-term="...">` markings.** These power the popup.
5. **All `.tpl-repo` and `.tpl-agent` template tokens.** Convert these to React components or interpolations driven by the personalize state, but preserve every location they appear.
6. **The phase-meta blocks** (Time / Prereq / Outcome) at the top of each implementation phase.
7. **The credit / origin block** on the landing page — exact wording, all four links.

You will need to add new UI within some pages (the AI buttons in Phases 1, 2, 3, 5; the GitHub fetcher on "Your codebase picture"). Add these without disturbing the surrounding content. They should feel like additions to the existing page, not replacements.

---

## 9. Deployment

Recommended path:

1. Push to a new GitHub repo (private or public — owner's call; see "Open questions" below).
2. Cloudflare Pages → connect repo → build command `npm run build` → output directory `dist`.
3. Configure custom domain `ai-layer.roipros.com`. Cloudflare Pages provides automatic HTTPS and a fast global edge.
4. Each push to `main` auto-deploys.

Alternative hosts (Netlify, Vercel, GitHub Pages) all work equivalently for a static Vite build. Cloudflare Pages is recommended for free tier generosity and global edge speed.

**Set up branch previews** so the owner can review changes at preview URLs before merging to main.

---

## 10. Open-source / repo visibility

The workbook is built to share with the Dynamous community. Two paths:

- **Private repo, public site.** Site is live at the subdomain; source is private. Simpler.
- **Public repo, public site.** Source is open-source; community members can fork, PR, etc.

Confirm with the owner which path. If public, add an MIT or CC-BY-SA license, a `CONTRIBUTING.md`, and a clear credit block in the README that mirrors the in-page credit (Cole, Anthropic, Dynamous, helpline).

---

## 11. Things the owner cares about (read carefully)

- **Plain language.** No jargon without definition. If you add a new piece of UI copy, run it past the "would a non-engineer understand this" test.
- **Trust.** API key handling needs to be obviously safe. The owner is putting his name on this for his community; a leaked key is a reputational hit.
- **Mobile-first.** A meaningful share of users will read on phones. Test every page on a real phone (or accurate emulator) at 375px width minimum. Especially the personalize panel, settings, and AI-result rendering.
- **The aesthetic.** Editorial / field-guide. Resist the urge to "modernize" by adding gradients, shadows, more rounded corners, or color. Less is more.
- **Voice.** Workbook voice is direct, slightly dry, with selective warmth. Not "hey friend!" Not "as we navigate this exciting journey…" Just clear.

---

## 12. Credits to preserve (verbatim, in both the README and the in-page credit block)

- **Cole Medin** — [YouTube walkthrough](https://youtu.be/efRIrLXoOVA?si=Pn8Dzw-7DwfmPq5V)
- **Anthropic** — [How Claude Code works in large codebases](https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start)
- **helpline reference repo** — [github.com/coleam00/helpline](https://github.com/coleam00/helpline)
- **Dynamous community** — [dynamous.ai](https://dynamous.ai)

The framing in the v1 origin block reads (preserve substance, can be lightly restructured if needed):

> This guide stands on the work of Cole Medin and the Dynamous community of AI builders. Cole's YouTube walkthrough took Anthropic's article "How Claude Code works in large codebases" and turned it into a working reference codebase — the helpline repo. Every pattern in this workbook is concrete because of that repo.
>
> I built this for myself, to make implementation easier and to translate the technical pieces into something I could confidently execute. I quickly realised others might want the same. If that's you — welcome. The substance is Cole and Anthropic's; the angle here is just plain-language, one-step-at-a-time.
>
> Want to go deeper with people doing this work full-time? Join us at Dynamous.

---

## 13. Open questions — ask the user before starting

In your first turn, ask the user these. Do not start coding until you have answers.

1. **Repo visibility.** Private repo + public site, or public repo + public site? If public, what license — MIT, CC-BY-SA, something else?
2. **Hosting confirmation.** Cloudflare Pages, Netlify, Vercel, or GitHub Pages? (Recommend Cloudflare Pages.) Do you already have the DNS for `roipros.com` somewhere we can point a CNAME?
3. **Subdomain.** Is `ai-layer.roipros.com` the correct subdomain, or something else (`workbook.roipros.com`, `ailayer.roipros.com`)?
4. **API key model confirmation.** Default is BYOK (each user provides their own Anthropic API key). Confirm. If you want operator-paid (you pay for everyone's usage), that requires a serverless function as a proxy — meaningful added complexity and you pay per use. Recommend BYOK.
5. **Model choice.** Defaults are `claude-opus-4-7` for primary draft/audit, `claude-haiku-4-5-20251001` for small jobs. Confirm or change.
6. **L3 feature priority.** The brief lists four (Audit / Draft Root CLAUDE.md / Draft Sub-CLAUDE.md / Draft Skill). Confirm the order or reshuffle. Worth shipping after building the first two and gathering feedback?
7. **OG image / favicon.** Do you have brand assets for ROI Pros that should be used, or should I generate placeholders?
8. **Analytics.** Do you want Plausible / Fathom / Cloudflare Web Analytics added at launch, or skip for v3.0?

Ask these in a numbered list. Wait for answers before starting the architecture.

---

## 14. Acceptance criteria (v3.0)

The deployed site is "done" when all of the following are true:

- [ ] All 16 sections from v1 are present, with content unchanged.
- [ ] Aesthetic matches v1 (same fonts, palette, layout patterns). Dark mode works.
- [ ] Sidebar navigation, hash routing, scroll-to-top-on-navigation all work correctly when deployed (not in artifact).
- [ ] Agent picker is now labeled and clear.
- [ ] Persistent checklist per phase works; state survives refresh.
- [ ] Glossary popups work on hover (desktop) and tap (mobile).
- [ ] Copy buttons work on all code blocks.
- [ ] Settings panel exists with API key + PAT + agent + theme. Settings persist.
- [ ] GitHub URL paste fetches public repo metadata; PAT enables private repos. Errors are clear.
- [ ] All four L3 features (C1–C4) work end-to-end: streaming response, copy, regenerate, error handling.
- [ ] Token counts and approximate cost display at the end of each AI call.
- [ ] Site is mobile-usable at 375px width (no horizontal scroll, all features accessible).
- [ ] Site is deployed at the confirmed subdomain over HTTPS.
- [ ] README documents the project, how to run locally, how to deploy, credit block.
- [ ] No API key or PAT ever appears in console logs, network errors, or anywhere outside `localStorage`.

---

## 15. Out of scope for v3.0

Do not build these. Capture them in a `ROADMAP.md`:
- Additional L3 features beyond C1–C4 (see section 4)
- User accounts / login / cloud sync
- Multi-language i18n
- Operator-paid API model (BYOK only)
- A "Generate complete starter pack as a zip" feature (interesting but big scope)
- Auto-PRing changes to the user's repo on their behalf
- Comments / community features

---

## Appendix A — v1's existing CSS variables (port these)

```css
:root {
  --bg: #F4EFE6;
  --bg-elev: #FAF6EE;
  --bg-card: #FFFBF3;
  --ink: #1F1A14;
  --ink-soft: #5A5048;
  --ink-mute: #8A7F73;
  --rule: #D9CFBE;
  --rule-soft: #E8DECC;
  --accent: #B6452C;
  --accent-soft: #D67B5F;
  --accent-bg: rgba(182, 69, 44, 0.08);
  --ok: #3F6B3A;
  --warn: #8A6914;
  --serif: 'Fraunces', Georgia, serif;
  --body: 'Newsreader', Georgia, serif;
  --mono: 'JetBrains Mono', ui-monospace, monospace;
}

[data-theme="dark"] {
  --bg: #13110E;
  --bg-elev: #1B1814;
  --bg-card: #221E18;
  --ink: #F0EBE0;
  --ink-soft: #BDB4A4;
  --ink-mute: #857C6E;
  --rule: #2E2922;
  --rule-soft: #241F19;
  --accent: #E67A5C;
  --accent-soft: #C46347;
  --accent-bg: rgba(230, 122, 92, 0.10);
}
```

Full CSS is in `ai-layer-workbook-v1.html`. Port everything inside the `<style>` block.

---

## Appendix B — Google Fonts URL (preserve)

```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..900&family=Newsreader:opsz,wght@6..72,300..600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

Including the optical-size axis (`opsz`) is intentional — Fraunces and Newsreader both have optical sizing, used for the display headings.

---

## Appendix C — Anthropic API call shape (reference)

For each L3 feature, the call looks roughly like this. Use the streaming endpoint.

```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': settings.anthropicKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true', // required for browser calls
  },
  body: JSON.stringify({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    stream: true,
    system: SYSTEM_PROMPT_FOR_THIS_FEATURE,
    messages: [{ role: 'user', content: USER_MESSAGE_WITH_REPO_CONTEXT }],
  }),
});
// Parse SSE stream, render tokens as they arrive, capture usage from final event
```

(The `anthropic-dangerous-direct-browser-access` header is the current name for the browser-CORS opt-in; verify against Anthropic's current docs at build time in case it has changed.)

System prompts for each feature should be built up from the corresponding workbook prompt (in the Prompt Library page) plus output-format instructions tailored to the in-page rendering.

---

## Appendix D — GitHub API call shape (reference)

Use the REST API for simplicity. Auth header only when PAT is present.

```typescript
const headers: HeadersInit = {
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};
if (settings.githubPat) headers['Authorization'] = `Bearer ${settings.githubPat}`;

// Repo metadata: GET /repos/{owner}/{repo}
// Languages: GET /repos/{owner}/{repo}/languages
// Tree: GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1
// README: GET /repos/{owner}/{repo}/readme
// File contents: GET /repos/{owner}/{repo}/contents/{path}
```

Resolve the default branch via `/repos/{owner}/{repo}` (`default_branch` field). Filter the recursive tree to the top 3 levels for the personalize defaults; fetch deeper on demand.

---

## End of brief

Ask the eight Open Questions in section 13 first. Once those are answered, plan the work in two phases:

1. **Port** (v1 content + aesthetic + interactivity to React/Vite, fix the labeled-dropdown bug, deploy as L1 to the subdomain — proves the deployment pipeline works).
2. **Build up** (add Capability A → B → C1 → C2 → C3 → C4, deploying after each to gather owner feedback).

Good luck. The owner is hands-on but not deeply technical — surface decisions clearly, recommend with reasoning, and don't ask him to weigh in on things you can decide yourself.
