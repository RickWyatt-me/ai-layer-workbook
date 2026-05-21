Run comprehensive validation of the project to ensure formatting, linting, type checking, and the production build are healthy.

This project is a static SPA — **Vite + React + TypeScript**, deployed to Cloudflare Pages. There is no Python, no backend, no test framework (intentional — see `CLAUDE.md` and the v3 handoff brief). Validation = format + lint + type-check + build + preview boot.

Execute the following in sequence and report results.

## 1. Formatting

```bash
npm run format:check
```

**Expected:** `All matched files use Prettier code style!` and exit 0. If Prettier reports drift, run `npm run format` to fix and re-check before continuing.

## 2. Linting

```bash
npm run lint
```

**Expected:** Exit 0 with no output. ESLint config lives at `eslint.config.js`.

## 3. Type Check + Production Build

```bash
npm run build
```

This runs `tsc -b` (project-references type check) followed by `vite build`.

**Expected:**

- Type check passes silently.
- Vite reports `✓ N modules transformed` and emits `dist/index.html`, `dist/assets/index-*.css`, `dist/assets/index-*.js`.
- Total JS bundle stays comfortably under 250 KB gzipped (target <200 KB; current ~76 KB gz).
- CSS bundle under 10 KB gzipped (current ~3.5 KB gz).

Flag any bundle-size jump &gt; 20% over the prior `git log` build numbers.

## 4. Tests

**Skipped.** No test framework configured. Per the v3 plan, vitest/jest is intentionally out of scope for the workbook pre-AI-capabilities. Note in the summary report and move on.

## 5. Local Preview (production-mode boot)

`preview` serves the already-built `dist/` output the same way Cloudflare Pages will. Forces a fixed port so collisions with other dev servers (e.g. Archon on 5173) fail loudly instead of silently shifting.

Start in background:

```bash
npm run preview -- --port 4180 --strictPort
```

Wait briefly for boot, then verify the app actually serves:

```bash
until curl -s -o /dev/null -w "%{http_code}" http://localhost:4180/ | grep -q 200; do sleep 0.3; done
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:4180/
```

**Expected:** `HTTP 200`. If you have the Playwright MCP available via `.mcp.json`, also navigate to `http://localhost:4180/` at 1280×800 and 375×812 and confirm no console errors via `browser_console_messages` at the `warning` level. The app uses `HashRouter`, so deep links look like `/#/start` — verify the initial redirect from `/` to `/#/start` works.

Stop the server:

```bash
lsof -ti:4180 | xargs kill -9 2>/dev/null || true
```

## 6. Summary Report

Provide a summary with status indicators (✅/❌) for each section:

- ✅/❌ Formatting (`format:check`)
- ✅/❌ Linting (`lint`)
- ✅/❌ Type check + build (`build`)
- ⚠️ Tests — N/A (no framework configured; this is intentional)
- ✅/❌ Local preview server (`preview` + curl + optional Playwright)
- ✅/❌ Bundle size within budget (call out raw and gzipped sizes for CSS + JS, with delta vs. last commit if known)
- Overall health: PASS / FAIL

Include any warnings or errors encountered.

## Notes

- **CSS-only changes don't need step 3 to pass cleanly** — `tsc` won't catch unused CSS classes; that's expected. The build still runs to confirm Vite emits the asset.
- **`npm run dev` vs. `npm run preview`** — `dev` runs the Vite dev server with HMR (uses `src/` directly, not `dist/`); `preview` serves the production build. For validation we use `preview` because it matches deploy reality.
- **Don't run the dev server in foreground** during validation — it will block. Always background it with `&`, or run via the Bash tool's `run_in_background: true`.
- **Port 5173** is frequently occupied by Archon's UI on this machine. Vite normally auto-increments to 5174/5175; preview's `--strictPort` flag intentionally fails fast instead, surfacing port conflicts as validation failures rather than silent shifts.
