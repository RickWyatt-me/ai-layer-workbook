import Checklist from '../components/Checklist';
import CodeBlock from '../components/CodeBlock';
import { usePersona } from '../hooks/usePersona';

export default function Phase1() {
  const { persona } = usePersona();
  const repo = persona.repoName || 'your-repo';

  const rootMd = `# ${repo}

What this is in one line. (E.g. "Native mobile customer-support app — iOS and Android, shared backend.")

This root file is intentionally lean. It holds only what's true repo-wide.
Each platform and shared module has its own CLAUDE.md with local conventions;
Claude loads them automatically as it moves into that directory.

## Where things live

- \`ios/\` — Swift, Xcode project, iOS-specific code
- \`android/\` — Kotlin, Gradle, Android-specific code
- \`shared/\` — (if applicable) cross-platform contracts, protobufs, etc.
- \`docs/\` — engineering documentation

See each subdirectory's CLAUDE.md for the rules of that area.

## Critical gotchas (repo-wide)

- **Network contracts are shared.** API request/response shapes live in \`shared/\`
  (or whichever folder you use). A change there affects both platforms — run
  both test suites, not just one.
- **Versioning is per-platform.** iOS uses its own version scheme; Android uses
  its own. Don't conflate them.
- **Navigate by symbol, not by grep.** Both platforms have an LSP configured
  (sourcekit-lsp for Swift, kotlin-language-server for Kotlin). Prefer
  "go to definition" and "find references" over text search.
- **Tests scoped to platform.** A change in \`ios/\` runs the iOS test target.
  A change in \`android/\` runs the Android tests. A change in \`shared/\` runs both.

## Commands

\`\`\`bash
# iOS
cd ios && xcodebuild test -scheme ${repo}

# Android
cd android && ./gradlew test
\`\`\`
`;

  const claudeignore = `# Generated artifacts and build output
build/
DerivedData/
.gradle/
.idea/
*.xcuserstate
*.xcodeproj/xcuserdata/

# Dependencies (let LSP/Xcode/Gradle manage these)
Pods/
node_modules/
.bundle/

# Caches
.swiftpm/
__pycache__/
*.pyc
.pytest_cache/

# Lockfiles — large, machine-generated
Podfile.lock
gradle.lockfile
package-lock.json
yarn.lock

# Local environment + secrets
.env
.env.*
*.pem
*.p12
*.keystore

# Mac/Windows clutter
.DS_Store
Thumbs.db
`;

  const settings = `{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Bash(xcodebuild test:*)",
      "Bash(./gradlew test:*)",
      "Bash(./gradlew build:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Read(./**/.env)",
      "Read(./**/.env.*)",
      "Read(./**/*.pem)",
      "Read(./**/*.p12)",
      "Read(./**/*.keystore)"
    ]
  }
}
`;

  return (
    <>
      <span className="section-num">04</span>
      <div className="eyebrow">Phase 1</div>
      <h1>Foundation</h1>
      <p className="lede">
        Three files that give Claude Code a baseline: a high-level orientation,
        a list of what to ignore, and a list of what it's allowed to do.
      </p>

      <div className="phase-meta">
        <span>
          <strong>Time:</strong> ~45 min
        </span>
        <span>
          <strong>Prereq:</strong> Claude Code installed
        </span>
        <span>
          <strong>Outcome:</strong> Three files in your repo root
        </span>
      </div>

      <h2>Why this matters</h2>
      <p>
        Without these three files, every session starts with the agent doing the
        equivalent of asking "where am I, what do you want me to know, and what
        am I allowed to touch?" That's a context-burning waste. These files
        answer those questions once, version them in git, and travel with your
        repo.
      </p>

      <h2>What you'll have at the end</h2>
      <ul>
        <li>
          <code>CLAUDE.md</code> at your repo root — the lean orientation file
        </li>
        <li>
          <code>.claudeignore</code> — generated files, lockfiles, build output
          excluded
        </li>
        <li>
          <code>.claude/settings.json</code> — permissions and (later) hooks
          configured
        </li>
      </ul>

      <h2>Step 1 — Create the root CLAUDE.md</h2>
      <p>
        The single most important rule: <strong>this file is lean</strong>. It
        is not a manual. It is not a tutorial. It is repo-wide truths and the
        3–5 gotchas that bite everyone, plus pointers to where more lives.
      </p>
      <p>Open a terminal in your repo root and create the file:</p>

      <h4>Template — root CLAUDE.md (mobile app)</h4>
      <CodeBlock lang="markdown">{rootMd}</CodeBlock>

      <div className="callout warn">
        <div className="callout-title">
          Resist the urge to put everything in here
        </div>
        <p>
          Conventions for the iOS code go in <code>ios/CLAUDE.md</code> (Phase
          3). Conventions for the Android code go in{' '}
          <code>android/CLAUDE.md</code>. Skills go in skill files. If it
          doesn't apply repo-wide, it doesn't go in the root.
        </p>
      </div>

      <h2>Step 2 — Create .claudeignore</h2>
      <p>
        This file tells Claude Code which paths to skip when searching or
        reading. It's the same idea as <code>.gitignore</code> — keep generated
        junk out of the agent's way.
      </p>

      <h4>Template — .claudeignore</h4>
      <CodeBlock lang="bash">{claudeignore}</CodeBlock>

      <h2>Step 3 — Create .claude/settings.json</h2>
      <p>
        This is where permissions and hooks live. For Phase 1, we'll set
        permissions only — hooks come in Phase 6.
      </p>

      <h4>Template — .claude/settings.json</h4>
      <CodeBlock lang="json">{settings}</CodeBlock>

      <p>
        The <code>allow</code> list pre-approves commands you'd normally have to
        confirm one at a time. The <code>deny</code> list blocks things outright
        — never accidentally <code>rm -rf</code>, never read secrets files.
      </p>

      <h2>Step 4 — Verify</h2>
      <ol>
        <li>Open a terminal in your repo root.</li>
        <li>
          Run <code>claude</code>.
        </li>
        <li>
          Ask:{' '}
          <em>
            "What's in your context right now? Just list the CLAUDE.md files
            you've loaded."
          </em>
        </li>
        <li>
          You should see the root <code>CLAUDE.md</code> listed.
        </li>
      </ol>
      <p>
        If the agent doesn't mention it, the file isn't being read — check the
        filename is exactly <code>CLAUDE.md</code> (case-sensitive) and that
        you're in the right directory.
      </p>

      <h2>Checklist</h2>
      <Checklist
        items={[
          {
            id: 'p1-a',
            label: (
              <>
                Root <code>CLAUDE.md</code> created, lean, with pointers +
                gotchas
              </>
            ),
          },
          {
            id: 'p1-b',
            label: (
              <>
                <code>.claudeignore</code> created with platform-specific
                exclusions
              </>
            ),
          },
          {
            id: 'p1-c',
            label: (
              <>
                <code>.claude/settings.json</code> created with allow + deny
                lists
              </>
            ),
          },
          {
            id: 'p1-d',
            label: (
              <>
                Verified <code>CLAUDE.md</code> is being loaded in a fresh
                session
              </>
            ),
          },
          { id: 'p1-e', label: 'All three files committed to git' },
        ]}
      />
    </>
  );
}
