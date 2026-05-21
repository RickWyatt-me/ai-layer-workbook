import Checklist from '../components/Checklist';
import CodeBlock from '../components/CodeBlock';
import { usePersona } from '../hooks/usePersona';

export default function Phase3() {
  const { persona } = usePersona();
  const repo = persona.repoName || 'your-repo';

  const draftPrompt = `Draft a CLAUDE.md for the directory \`[PATH FROM AUDIT]\`.

Follow these rules strictly:
- Total length: under 60 lines
- No facts that are obvious from the file extensions (don't say "this is
  written in Swift")
- No facts that already appear in the root CLAUDE.md
- Lead with 3-5 gotchas an editor of this area must know
- Include the exact scoped test/build command for this area
- Use bullet points, not paragraphs
- Reference other CLAUDE.md files where relevant rather than duplicating

Read the actual code in that directory before drafting. Specifically look
for: shared mutable state, error-handling patterns, naming conventions,
import boundaries (what this area imports vs what imports it), and any
unusual idioms.

Output only the CLAUDE.md content — no preamble, no commentary.
`;

  const exampleMd = `# ios — Swift app target

## Conventions

- **Errors propagate via \`Result<T, AppError>\`** — never throw across module
  boundaries. \`AppError\` enum lives in \`Core/AppError.swift\`.
- **Networking goes through \`APIClient\`.** Direct \`URLSession\` calls are forbidden;
  they bypass auth headers and analytics.
- **No singletons except \`APIClient\` and \`AnalyticsService\`.** Everything else
  uses dependency injection through the app's \`Resolver\`.
- **State is async-let, not Combine.** We migrated off Combine in 2025;
  any remaining \`@Published\` properties are tech debt.

## Gotchas

- **Xcode's "Clean Build Folder" doesn't clear DerivedData.** If a build is
  acting strange, also \`rm -rf ~/Library/Developer/Xcode/DerivedData/${repo}-*\`.
- **The simulator caches keychain data.** Logout flows need an explicit
  \`KeychainService.clear()\` in tests, or the next test inherits the session.

## Tests

\`\`\`bash
cd ios && xcodebuild test -scheme ${repo} -destination 'platform=iOS Simulator,name=iPhone 15'
\`\`\`
`;

  return (
    <>
      <span className="section-num">06</span>
      <div className="eyebrow">Phase 3</div>
      <h1>Subdirectory CLAUDE.md files</h1>
      <p className="lede">
        Use your agent to draft the per-area handbooks. Your job is to review
        and tighten — not to write from scratch.
      </p>

      <div className="phase-meta">
        <span>
          <strong>Time:</strong> ~1.5 hrs (for 3–5 files)
        </span>
        <span>
          <strong>Prereq:</strong> Phase 2 audit complete
        </span>
        <span>
          <strong>Outcome:</strong> 3–5 working CLAUDE.md files in the right
          places
        </span>
      </div>

      <h2>Why this matters</h2>
      <p>
        Subdirectory CLAUDE.md files are loaded <em>additively</em> as the agent
        walks into each area. They're where the local rules live — conventions
        specific to the iOS code, gotchas specific to the Android build, the
        test command for one service. Without them, the root CLAUDE.md balloons
        trying to cover everything, and the agent ignores rules that don't
        visibly apply.
      </p>

      <h2>What you'll have at the end</h2>
      <p>
        Three to five CLAUDE.md files committed to your repo at the paths your
        Phase 2 audit identified. Each one short, focused, and unmistakably
        about <em>its</em> area.
      </p>

      <h2>The rules every subdirectory CLAUDE.md must follow</h2>
      <ol>
        <li>
          <strong>Under 60 lines.</strong> If it's longer, it's drifting into
          noise.
        </li>
        <li>
          <strong>Conventions, not tutorials.</strong> Don't explain what Swift
          is. Do explain how <em>your</em> Swift code handles error states.
        </li>
        <li>
          <strong>Gotchas first.</strong> The things that will bite an editor go
          above everything else.
        </li>
        <li>
          <strong>The scoped test/build command.</strong> Exactly what to run
          after editing this area.
        </li>
        <li>
          <strong>No duplication.</strong> If it's in the root CLAUDE.md, don't
          repeat it.
        </li>
      </ol>

      <h2>Step 1 — Draft each file using your agent</h2>
      <p>For each path from your Phase 2 audit, run this prompt:</p>

      <h4>Drafting prompt</h4>
      <CodeBlock lang="markdown">{draftPrompt}</CodeBlock>

      <h2>Step 2 — Review every line</h2>
      <p>Your agent will produce a draft. Read it line by line and ask:</p>
      <ul>
        <li>
          <strong>Is this true?</strong> Agents occasionally hallucinate
          conventions. Check against the actual code.
        </li>
        <li>
          <strong>Is this useful?</strong> "This module uses Swift's standard
          library" is not useful. Cut it.
        </li>
        <li>
          <strong>Is this specific to this area?</strong> If it applies
          repo-wide, move it to the root.
        </li>
      </ul>
      <p>
        A good rule:{' '}
        <strong>
          delete a line if removing it wouldn't surprise a future editor.
        </strong>
      </p>

      <h2>Example — what a good ios/CLAUDE.md looks like</h2>
      <CodeBlock lang="markdown">{exampleMd}</CodeBlock>

      <h2>Step 3 — Verify each file loads</h2>
      <p>
        For each new CLAUDE.md, start a fresh session of your agent, ask it to
        read a file in that directory, and then ask:{' '}
        <em>"What CLAUDE.md files do you have loaded right now?"</em> Confirm
        the right ones appear.
      </p>

      <h2>Step 4 — Commit</h2>
      <p>
        Once each file is reviewed and verified, commit them as a single commit:{' '}
        <code>git commit -m "AI Layer: add subdirectory CLAUDE.md files"</code>.
        This is the foundation everything else builds on.
      </p>

      <h2>Checklist</h2>
      <Checklist
        items={[
          { id: 'p3-a', label: 'Drafted CLAUDE.md for each priority-1 area' },
          {
            id: 'p3-b',
            label: 'Reviewed each draft line-by-line for accuracy and signal',
          },
          {
            id: 'p3-c',
            label: 'Removed any duplicated content from the root CLAUDE.md',
          },
          { id: 'p3-d', label: 'Verified each file loads in a fresh session' },
          { id: 'p3-e', label: 'All files committed to git' },
        ]}
      />
    </>
  );
}
