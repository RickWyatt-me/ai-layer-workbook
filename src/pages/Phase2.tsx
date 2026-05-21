import Checklist from '../components/Checklist';
import CodeBlock from '../components/CodeBlock';
import TplAgent from '../components/TplAgent';

export default function Phase2() {
  const discoveryPrompt = `Audit this codebase and recommend where CLAUDE.md files should go.

For each candidate directory:
1. Briefly explain what makes this area distinct (its domain, language, or conventions)
2. List the 2-3 gotchas an editor of this area absolutely needs to know
3. Note the scoped test/build command for this area, if there is one
4. Assign a priority: 1 (essential), 2 (valuable), 3 (nice to have)

Use signals like: directory name and structure, the languages present,
which folders import which other folders, the git log of recent changes,
and any existing documentation. Look at file counts to gauge complexity.

Output as a single markdown table with these columns:
Path | Domain/language | Gotchas | Scoped test command | Priority

Do NOT create any CLAUDE.md files. Just produce the table and a brief
paragraph at the end explaining your reasoning for the ordering.
`;

  return (
    <>
      <span className="section-num">05</span>
      <div className="eyebrow">Phase 2</div>
      <h1>Discovery — let your agent find the right spots</h1>
      <p className="lede">
        Don't guess where subdirectory CLAUDE.md files should go. Don't try to
        write them by hand. Have your agent audit your repo and tell you.
      </p>

      <div className="phase-meta">
        <span>
          <strong>Time:</strong> ~30 min
        </span>
        <span>
          <strong>Prereq:</strong> Phase 1 complete
        </span>
        <span>
          <strong>Outcome:</strong> A prioritised list of where CLAUDE.md files
          belong
        </span>
      </div>

      <h2>Why this matters</h2>
      <p>
        The right places for CLAUDE.md files aren't always obvious. Some folders
        are conventions-heavy; others are mostly boilerplate. Some have gotchas;
        others don't. Your agent — which has seen many codebases of similar
        shapes — can audit yours in minutes. Skipping this step usually results
        in either too many CLAUDE.mds (noise) or too few (the agent navigates
        blind in important areas).
      </p>

      <h2>What you'll have at the end</h2>
      <ul>
        <li>
          A markdown table from your agent: <strong>path</strong>,{' '}
          <strong>why this area benefits from a CLAUDE.md</strong>,{' '}
          <strong>priority (1–3)</strong>
        </li>
        <li>A clear decision: which to do first, which to defer</li>
      </ul>

      <h2>Step 1 — Open your agent in your repo</h2>
      <p>
        In a terminal, navigate to your repo root and start <TplAgent />.
      </p>

      <h2>Step 2 — Paste this discovery prompt</h2>
      <p>
        This is the most important prompt in the workbook. It tells your agent{' '}
        <em>not to write any files yet</em> — only to audit and recommend.
      </p>

      <h4>Discovery prompt</h4>
      <CodeBlock lang="markdown">{discoveryPrompt}</CodeBlock>

      <h2>Step 3 — Read the output critically</h2>
      <p>
        Your agent will produce a table.{' '}
        <strong>Don't accept it blindly.</strong> Read each row and ask
        yourself:
      </p>
      <ul>
        <li>
          <strong>Is this area actually distinct?</strong> If two adjacent
          folders have identical conventions, they don't both need a CLAUDE.md.
        </li>
        <li>
          <strong>Are the listed gotchas real?</strong> Or did the agent invent
          plausible-sounding ones?
        </li>
        <li>
          <strong>
            Is the priority right for <em>your</em> day-to-day work?
          </strong>{' '}
          An area you edit twice a year is lower priority than one you touch
          weekly.
        </li>
      </ul>
      <p>
        Push back. Ask follow-ups like "Why priority 1 for{' '}
        <code>android/core</code> but priority 2 for <code>ios/Core</code>?
        Aren't they parallel?" Your agent will adjust.
      </p>

      <h2>Step 4 — Pick your top 3–5 for Phase 3</h2>
      <p>
        Don't try to draft eight CLAUDE.md files in one go. Pick the
        highest-priority three to five and do those first. You can always add
        more later. Save the priority-3 candidates for the next iteration.
      </p>

      <div className="callout">
        <div className="callout-title">Common output for a mobile app</div>
        <p>
          For a typical iOS + Android app, the audit usually surfaces:{' '}
          <code>ios/</code> (Swift conventions), <code>android/</code>{' '}
          (Kotlin/Gradle conventions), <code>shared/</code> if you have one
          (network contracts), and possibly one networking module or one shared
          UI module per platform. Five files total is a good first pass.
        </p>
      </div>

      <h2>Step 5 — Save the audit for reference</h2>
      <p>
        Copy the table from your agent's output into a file at{' '}
        <code>docs/ai-layer/audit-2026.md</code> (or wherever you keep
        engineering notes). You'll reference it in Phase 3 and again when you do
        your six-month review.
      </p>

      <h2>Checklist</h2>
      <Checklist
        items={[
          { id: 'p2-a', label: 'Ran the discovery prompt against my repo' },
          {
            id: 'p2-b',
            label:
              "Read the table critically and pushed back where it didn't match reality",
          },
          { id: 'p2-c', label: 'Picked top 3–5 candidates for Phase 3' },
          {
            id: 'p2-d',
            label: 'Saved the audit somewhere I can find it again',
          },
        ]}
      />
    </>
  );
}
