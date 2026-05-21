import Checklist from '../components/Checklist';
import CodeBlock from '../components/CodeBlock';
import { usePersona } from '../hooks/usePersona';

export default function Phase7() {
  const { persona } = usePersona();
  const repo = persona.repoName || 'your-repo';

  const explorerMd = `---
name: explorer
description: >-
  Read-only subsystem explorer. Use it to map an unfamiliar service or
  module BEFORE editing — it explores with its own context window and
  reports back, so the main agent edits with the full picture instead
  of burning its context on discovery.
tools: Read, Grep, Glob
model: sonnet
---

# Explorer subagent

You map one subsystem of the ${repo} codebase. You are **genuinely
read-only**: your only tools are \`Read\`, \`Grep\`, and \`Glob\`. There is no
\`Write\` or \`Edit\`, so you *cannot* modify the codebase even if asked.

## When you are invoked

You will be given one subsystem to map — a top-level folder like \`ios/\`,
\`android/\`, or a submodule like \`ios/Features/Billing\`.

## What to do

1. Read that subsystem's \`CLAUDE.md\` first if it has one.
2. Use Glob and Grep to find: entry points, public types/classes, what it
   imports from other modules, and what imports it.
3. Identify the gotchas — shared state, error contracts, anything surprising.
4. Return your findings as your final report, under these headings:
   - **Entry points** — where work starts
   - **Key types & functions** — the public surface
   - **Dependencies** — what it imports, what imports it
   - **Gotchas** — what would bite an editor
   - **Suggested fixes** — anything that looks wrong; *describe* it,
     since you cannot apply it

## Why read-only

Running exploration and editing in one session spends the editing context
on discovery. A separate read-only explorer keeps them apart. Having no
write tools is the *guarantee* of that separation, not a polite request
you could break.
`;

  return (
    <>
      <span className="section-num">10</span>
      <div className="eyebrow">Phase 7</div>
      <h1>Subagent — the read-only scout</h1>
      <p className="lede">
        Send a scout ahead. Map the territory cheaply. Then act with the full
        picture.
      </p>

      <div className="phase-meta">
        <span>
          <strong>Time:</strong> ~20 min
        </span>
        <span>
          <strong>Prereq:</strong> Phase 3 complete
        </span>
        <span>
          <strong>Outcome:</strong> A reusable explorer subagent
        </span>
      </div>

      <h2>Why this matters</h2>
      <p>
        When your main agent enters an unfamiliar subsystem, it spends a lot of
        attention on discovery before any actual editing. By the time it
        understands the area, half its context budget is gone. A subagent solves
        this: it explores with <em>its own</em> context, returns only a summary,
        and the main agent edits with that summary in hand — fresh context, full
        picture.
      </p>
      <p>
        The trick is that the subagent must be <strong>read-only</strong>. If it
        can edit, it might start trying to "fix" things while exploring,
        defeating the purpose. We enforce read-only by not giving it write tools
        — not by asking nicely.
      </p>

      <h2>What you'll have at the end</h2>
      <p>
        A single file at <code>.claude/agents/explorer.md</code> that defines a
        reusable scout. Any time you need to map a subsystem before editing it,
        you dispatch the explorer.
      </p>

      <h2>Step 1 — Create the explorer</h2>
      <p>
        The explorer is defined in one markdown file. Frontmatter sets its name,
        scope, and — critically — which tools it's allowed to use.
      </p>

      <h4>Template — .claude/agents/explorer.md</h4>
      <CodeBlock lang="markdown">{explorerMd}</CodeBlock>

      <h2>Step 2 — Dispatch it</h2>
      <p>
        In a Claude Code session, ask:{' '}
        <em>
          "Use the explorer subagent to map <code>android/core</code> and report
          back."
        </em>
      </p>
      <p>
        The explorer will run in a separate context window, do its work, and
        return a report. Your main agent receives the report — not the
        explorer's reading list — and can then edit with a complete picture.
      </p>

      <h2>When to use the explorer</h2>
      <ul>
        <li>You're about to refactor code you haven't touched in months.</li>
        <li>You're picking up a service or module a teammate built.</li>
        <li>You're debugging an issue that crosses several modules.</li>
        <li>
          You're estimating the scope of a feature that touches an unfamiliar
          area.
        </li>
      </ul>
      <p>
        When <em>not</em> to use it: a quick edit to a file you know well. The
        dispatch overhead isn't worth it for small, scoped changes.
      </p>

      <h2>Checklist</h2>
      <Checklist
        items={[
          {
            id: 'p7-a',
            label: (
              <>
                Created <code>.claude/agents/explorer.md</code>
              </>
            ),
          },
          {
            id: 'p7-b',
            label:
              'Verified tools field includes only Read/Grep/Glob (no Write/Edit)',
          },
          { id: 'p7-c', label: 'Dispatched it once and got a usable report' },
        ]}
      />
    </>
  );
}
