---
name: scoped-tests
description: >-
  Use after changing code, before claiming work is done — run the narrowest
  verification command that still covers your change, instead of the full
  pipeline on every edit. Saves context and time.
---

# Scoped verification runner

The article's rule: running every check when you changed one thing wastes
context and time. Pick the narrowest command that still covers the change.

This is a static React/Vite/TS project. There is no unit-test suite yet (Vitest
may be added later). The "verification commands" here are the type-checker,
linter, formatter, and build.

## Pick the narrowest check by what changed

| Change                                       | Run                                    |
| -------------------------------------------- | -------------------------------------- |
| One or two `.ts` / `.tsx` files              | `npx tsc -b --noEmit` (type-check only) |
| TS or TSX touching public component contracts | `npm run lint` then `npm run build`   |
| `*.css` only                                 | `npm run build` (smoke the bundle)     |
| Workbook content (`src/pages/*` body text)   | `npm run dev` and eyeball the page     |
| Anthropic API client (`src/lib/anthropic.ts`) | Manual: real streaming call in dev     |
| GitHub client (`src/lib/github.ts`)          | Manual: paste a real repo URL in dev   |
| `package.json` / `vite.config.ts` / tsconfig | `rm -rf node_modules dist && npm install && npm run build` |
| Markdown docs only (CLAUDE.md, README, etc.) | Nothing — no code path touched         |

## Pick the full pipeline when…

- You changed shared code that many other files import (e.g. `src/hooks/`,
  `src/lib/`, `src/styles/globals.css`). Run all of: `npm run lint`,
  `npx tsc -b --noEmit`, `npm run build`, `npm run format:check`.
- You don't know what a change reaches. Trace its importers first
  (`grep -rn "from '../lib/foo'" src`), then scope accordingly.
- You're about to commit or push. Run the full pipeline so CI doesn't catch
  what you should have.

## What this skill is NOT

- A replacement for actually running the app. UI changes need eyeballs in
  `npm run dev` at 375px and desktop widths.
- A replacement for testing the AI features end-to-end. The Anthropic /
  GitHub calls only fail in real conditions — invalid key, rate-limit,
  context-too-large — so manual exercise in dev is required.

## Why scoped

Running `npm run build` on every keystroke costs seconds of wall-clock and
chews context. Running it never costs a broken deploy. The middle path — run
the narrowest check that *can* fail for what you actually changed — is the
discipline. CI catches what slipped through.
