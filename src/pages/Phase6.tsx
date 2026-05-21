import Checklist from '../components/Checklist';
import CodeBlock from '../components/CodeBlock';

const SESSION_START_PY = `"""SessionStart hook — dynamic per-area orientation.

Prints a short orientation block at the start of every Claude Code session.
Claude Code injects this stdout into the session context, so Claude starts
already knowing which area has active work — and the recent direction of
travel from git history — without spending a turn re-exploring.

Tested standalone: \`python .claude/hooks/session_start_context.py\`
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

_EXCLUDE_DIRS = frozenset({
    ".git", ".venv", "venv", "env", "node_modules", "__pycache__",
    ".pytest_cache", ".gradle", "build", "DerivedData", "Pods",
})


def _project_root() -> Path:
    project = os.environ.get("CLAUDE_PROJECT_DIR")
    return Path(project) if project else Path(__file__).resolve().parents[2]


def _claude_md_areas(root: Path) -> set[str]:
    areas: set[str] = set()
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in _EXCLUDE_DIRS]
        if "CLAUDE.md" in filenames:
            rel = Path(dirpath).relative_to(root).as_posix()
            if rel != ".":
                areas.add(rel)
    return areas


def _area_of(changed: str, areas: set[str]) -> str | None:
    parts = changed.split("/")
    for depth in range(len(parts) - 1, 0, -1):
        candidate = "/".join(parts[:depth])
        if candidate in areas:
            return candidate
    return None


def _working_tree_changes(root: Path) -> list[str]:
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=root, capture_output=True, text=True, timeout=5,
        )
    except (OSError, subprocess.SubprocessError):
        return []
    return [line[3:].strip().replace("\\\\", "/")
            for line in result.stdout.splitlines() if len(line) > 3]


def _recent_commits(root: Path, limit: int = 5) -> list[str]:
    try:
        result = subprocess.run(
            ["git", "log", f"-{limit}", "--pretty=format:%h %s"],
            cwd=root, capture_output=True, text=True, timeout=5,
        )
    except (OSError, subprocess.SubprocessError):
        return []
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def main() -> None:
    try: sys.stdin.read()
    except: pass

    root = _project_root()
    governed = _claude_md_areas(root)
    changes = _working_tree_changes(root)
    active = sorted({_area_of(p, governed) for p in changes if _area_of(p, governed)})

    lines = ["## Session orientation", ""]
    if active:
        lines.append(f"Active area(s) this session: **{', '.join(active)}**.")
        lines.append("Load the matching CLAUDE.md in each before editing.")
    else:
        lines.append("Working tree is clean — no area has pending work.")

    commits = _recent_commits(root)
    if commits:
        lines.append("")
        lines.append("Recent commits (newest first):")
        lines.extend(f"- {commit}" for commit in commits)

    print("\\n".join(lines))


if __name__ == "__main__":
    main()
`;

const SETTINGS_SESSION_ONLY = `{
  "permissions": { "...": "your existing allow/deny lists" },
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python \\"$CLAUDE_PROJECT_DIR/.claude/hooks/session_start_context.py\\""
          }
        ]
      }
    ]
  }
}
`;

const PROPOSE_PY = `"""Stop hook trigger — cheap, deterministic part of the self-improving loop.

Detects which CLAUDE.md-governed areas changed, dedups against prior runs,
and spawns reflect_claude_md.py in the background. Returns immediately so
the turn never blocks on an LLM call.

Three guards: recursion lock, diff fingerprint dedup, deterministic fallback
if the reflector fails.
"""
from __future__ import annotations

import hashlib, os, subprocess, sys
from pathlib import Path

_EXCLUDE_DIRS = frozenset({
    ".git", ".venv", "venv", "env", "node_modules", "__pycache__",
    ".pytest_cache", ".gradle", "build", "DerivedData", "Pods",
})
_LOCK_ENV = "AILAYER_REFLECT_LOCK"
_STATE_FILE = ".claude/.claude-md-review-state"
_REFLECTOR = "reflect_claude_md.py"
_DETACHED_PROCESS = 0x00000008


def _project_root() -> Path:
    project = os.environ.get("CLAUDE_PROJECT_DIR")
    return Path(project) if project else Path(__file__).resolve().parents[2]


def _git(args, root, timeout=5):
    try:
        return subprocess.run(["git", *args], cwd=root, capture_output=True,
                              text=True, timeout=timeout).stdout
    except (OSError, subprocess.SubprocessError):
        return ""


def _claude_md_areas(root):
    areas = set()
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in _EXCLUDE_DIRS]
        if "CLAUDE.md" in fns:
            rel = Path(dp).relative_to(root).as_posix()
            if rel != ".": areas.add(rel)
    return areas


def _area_of(changed, areas):
    parts = changed.split("/")
    for depth in range(len(parts) - 1, 0, -1):
        c = "/".join(parts[:depth])
        if c in areas: return c
    return None


def _touched_areas(root):
    governed = _claude_md_areas(root)
    out = set()
    for line in _git(["status", "--porcelain"], root).splitlines():
        if len(line) <= 3: continue
        path = line[3:].strip().replace("\\\\", "/")
        a = _area_of(path, governed)
        if a: out.add(a)
    return out


def _spawn_reflector(reflector, root):
    flags = 0; new_session = False
    if os.name == "nt":
        flags = subprocess.CREATE_NEW_PROCESS_GROUP | _DETACHED_PROCESS
    else:
        new_session = True
    try:
        subprocess.Popen(
            [sys.executable, str(reflector)],
            cwd=str(root),
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            creationflags=flags, start_new_session=new_session,
        )
    except Exception:
        return False
    return True


def main():
    try: sys.stdin.read()
    except: pass
    if os.environ.get(_LOCK_ENV): return 0

    root = _project_root()
    areas = _touched_areas(root)
    if not areas: return 0

    fp = hashlib.sha256(_git(["diff", "HEAD", "--", *sorted(areas)], root)
                        .encode("utf-8", "replace")).hexdigest()
    state = root / _STATE_FILE
    try:
        if state.read_text().strip() == fp: return 0
    except OSError: pass

    reflector = Path(__file__).with_name(_REFLECTOR)
    if not reflector.is_file(): return 0
    if not _spawn_reflector(reflector, root): return 0

    try:
        state.parent.mkdir(parents=True, exist_ok=True)
        state.write_text(fp)
    except OSError: pass

    print(f"[ai-layer] {len(areas)} area(s) changed — reflecting in background", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
`;

const REFLECT_PY = `"""The reasoning half of the self-improving Stop hook.

Gathers the session's working-tree diff plus the current CLAUDE.md of every
area that changed, asks Claude (headless \`claude -p\`) to judge whether those
conventions still hold, and writes the proposal to .claude/claude-md-review.md.

If \`claude\` is unavailable, writes a deterministic "re-check these files"
note instead.
"""
from __future__ import annotations

import os, shutil, subprocess, sys
from datetime import datetime
from pathlib import Path

_REVIEW = ".claude/claude-md-review.md"
_LOCK = "AILAYER_REFLECT_LOCK"
_MAX_DIFF = 12_000
_TIMEOUT = 180


def _root():
    p = os.environ.get("CLAUDE_PROJECT_DIR")
    return Path(p) if p else Path(__file__).resolve().parents[2]


def _git(args, root):
    try:
        return subprocess.run(["git", *args], cwd=root, capture_output=True,
                              text=True, timeout=10).stdout
    except: return ""


def _touched(root):
    EXCLUDE = {".git", ".venv", "node_modules", "__pycache__", ".gradle",
               "build", "DerivedData", "Pods"}
    areas = set()
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in EXCLUDE]
        if "CLAUDE.md" in fns:
            rel = Path(dp).relative_to(root).as_posix()
            if rel != ".": areas.add(rel)
    touched = {}
    for line in _git(["status", "--porcelain"], root).splitlines():
        if len(line) <= 3: continue
        path = line[3:].strip().replace("\\\\", "/")
        for depth in range(len(path.split("/")) - 1, 0, -1):
            c = "/".join(path.split("/")[:depth])
            if c in areas:
                touched[c] = touched.get(c, 0) + 1
                break
    return touched


def _build_prompt(root, areas, diff):
    blocks = []
    for area in sorted(areas):
        md = root / area / "CLAUDE.md"
        content = md.read_text() if md.is_file() else "(no CLAUDE.md yet)"
        blocks.append(f"### {area}/CLAUDE.md\\n\\n{content}")
    return f"""You are auditing whether a codebase's CLAUDE.md files still match \\
reality after a coding session.

Below is the git diff of uncommitted changes, then each touched area's CLAUDE.md.

For EACH area, output one of:
- \`No change needed\` — the CLAUDE.md still holds
- A concrete proposed edit: the specific line(s) to add, change, or remove,
  plus one sentence on why

Only propose updates for genuine new conventions, gotchas, or constraints.
Skip stylistic rewrites. Be terse. No tools needed.

## Git diff
\`\`\`
{diff}
\`\`\`

## Current CLAUDE.md files
{chr(10).join(blocks)}
"""


def _run_claude(prompt, root):
    claude = shutil.which("claude")
    if not claude: return None
    env = dict(os.environ); env[_LOCK] = "1"
    try:
        r = subprocess.run(
            [claude, "-p", "--output-format", "text"],
            cwd=root, input=prompt, capture_output=True, text=True,
            timeout=_TIMEOUT, env=env,
        )
    except: return None
    return r.stdout.strip() if r.returncode == 0 else None


def _fallback(areas, stamp):
    lines = [f"# CLAUDE.md review — {stamp}", "",
             "_\`claude\` CLI unavailable. Re-check these areas by hand._", ""]
    for area, n in sorted(areas.items()):
        lines.append(f"- **{area}** ({n} file(s))")
    return "\\n".join(lines) + "\\n"


def reflect():
    if os.environ.get(_LOCK): return 0
    root = _root()
    areas = _touched(root)
    if not areas: return 0
    diff = _git(["diff", "HEAD", "--", *sorted(areas)], root)
    if len(diff) > _MAX_DIFF:
        diff = diff[:_MAX_DIFF] + "\\n... (truncated)"
    stamp = datetime.now().isoformat(timespec="seconds")
    out = _run_claude(_build_prompt(root, areas, diff), root) if diff.strip() else None
    body = (f"# CLAUDE.md review — {stamp}\\n\\n{out}\\n"
            if out else _fallback(areas, stamp))
    review = root / _REVIEW
    try:
        review.parent.mkdir(parents=True, exist_ok=True)
        review.write_text(body)
    except: return 1
    return 0


if __name__ == "__main__":
    sys.exit(reflect())
`;

const STOP_SETTINGS = `{
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "python \\"$CLAUDE_PROJECT_DIR/.claude/hooks/session_start_context.py\\"" }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "python \\"$CLAUDE_PROJECT_DIR/.claude/hooks/propose_claude_md.py\\"" }] }
    ]
  }
}
`;

export default function Phase6() {
  return (
    <>
      <span className="section-num">09</span>
      <div className="eyebrow">Phase 6</div>
      <h1>Hooks — automation that runs itself</h1>
      <p className="lede">
        Two hooks. The first gives every session instant orientation. The second
        makes your AI Layer improve itself.
      </p>

      <div className="phase-meta">
        <span>
          <strong>Time:</strong> ~2 hrs
        </span>
        <span>
          <strong>Prereq:</strong> Phase 5 complete
        </span>
        <span>
          <strong>Outcome:</strong> SessionStart + Stop hooks running,
          self-improvement loop active
        </span>
      </div>

      <h2>Why this matters</h2>
      <p>
        You can write the best CLAUDE.md files in the world, but they drift.
        Code evolves; the documentation about it lags. Hooks are how you fight
        drift automatically. The SessionStart hook ensures every session starts
        oriented to <em>now</em> (not last week). The Stop hook reflects on what
        just happened and proposes documentation updates while context is fresh.
      </p>

      <h2>What you'll have at the end</h2>
      <ul>
        <li>
          A <code>SessionStart</code> hook that injects today's "active areas"
          and recent commits at every session start
        </li>
        <li>
          A <code>Stop</code> hook that detects changed areas and spawns a
          background reflection that proposes CLAUDE.md edits
        </li>
        <li>
          A new file <code>.claude/claude-md-review.md</code> that accumulates
          proposed updates for you to review
        </li>
      </ul>

      <h2>Start simple — SessionStart only</h2>
      <p>
        Don't try to build both hooks at once. Get SessionStart working first;
        it's the simpler one and gives you immediate value.
      </p>

      <h4>Template — .claude/hooks/session_start_context.py</h4>
      <CodeBlock lang="python">{SESSION_START_PY}</CodeBlock>

      <h4>Wire it into .claude/settings.json</h4>
      <p>
        Add the <code>hooks</code> block to your existing settings.json:
      </p>
      <CodeBlock lang="json">{SETTINGS_SESSION_ONLY}</CodeBlock>

      <h4>Verify SessionStart</h4>
      <p>
        Quit any open Claude Code session. Run <code>claude</code> in your repo.
        You should see the orientation block ("Active area(s) this session…") in
        the first response. If you don't, check:
      </p>
      <ul>
        <li>
          The script runs standalone:{' '}
          <code>python .claude/hooks/session_start_context.py</code> from your
          repo root
        </li>
        <li>The path in settings.json is correct</li>
        <li>Python is on your PATH</li>
      </ul>

      <h2>Then add the self-improving Stop hook</h2>
      <p>
        This is the more sophisticated piece. It's split into two scripts
        because the work is split: a cheap trigger that runs every turn, and an
        expensive reflection that runs in the background only when something
        actually changed.
      </p>

      <details>
        <summary>Show the full Stop hook script (propose_claude_md.py)</summary>
        <p>
          This file lives at <code>.claude/hooks/propose_claude_md.py</code>.
          It's adapted from{' '}
          <a
            href="https://github.com/coleam00/helpline"
            target="_blank"
            rel="noopener"
          >
            Cole's helpline repo
          </a>
          .
        </p>
        <CodeBlock lang="python">{PROPOSE_PY}</CodeBlock>
      </details>

      <details>
        <summary>Show the reflector script (reflect_claude_md.py)</summary>
        <p>
          This file lives at <code>.claude/hooks/reflect_claude_md.py</code>. It
          calls headless <code>claude -p</code> to do the actual reflection.
        </p>
        <CodeBlock lang="python">{REFLECT_PY}</CodeBlock>
      </details>

      <h4>Wire the Stop hook into settings.json</h4>
      <CodeBlock lang="json">{STOP_SETTINGS}</CodeBlock>

      <h2>Verify the Stop hook</h2>
      <ol>
        <li>Start a fresh Claude Code session.</li>
        <li>
          Edit one file in a CLAUDE.md-governed area (e.g.{' '}
          <code>ios/SomeView.swift</code>).
        </li>
        <li>End your turn (let the agent respond).</li>
        <li>
          Wait 30 seconds. Check for the file{' '}
          <code>.claude/claude-md-review.md</code> — it should exist with a
          proposed edit or "no change needed."
        </li>
      </ol>

      <h2>How to use the review file</h2>
      <p>
        Once a week (or whenever it feels right), open{' '}
        <code>.claude/claude-md-review.md</code>, read the proposed edits, and
        apply the ones that make sense. Most won't — but the ones that do
        prevent your CLAUDE.md files from rotting silently.
      </p>

      <h2>Checklist</h2>
      <Checklist
        items={[
          { id: 'p6-a', label: 'SessionStart hook installed and verified' },
          { id: 'p6-b', label: 'Stop hook trigger installed' },
          { id: 'p6-c', label: 'Reflector installed' },
          { id: 'p6-d', label: 'Both wired into settings.json' },
          {
            id: 'p6-e',
            label: (
              <>
                Verified <code>.claude/claude-md-review.md</code> gets written
                after a session with edits
              </>
            ),
          },
        ]}
      />
    </>
  );
}
