import Checklist from '../components/Checklist';
import CodeBlock from '../components/CodeBlock';
import { usePersona } from '../hooks/usePersona';

export default function Phase5() {
  const { persona } = usePersona();
  const repo = persona.repoName || 'your-repo';

  const scopedTestsMd = `---
name: scoped-tests
description: >-
  Use after changing code, before claiming work is done — picks the
  correctly scoped test command instead of running the full suite.
paths:
  - ios/**
  - android/**
  - shared/**
---

# Scoped test runner

Running the whole suite on a one-platform change wastes time and context.
Pick the narrowest command that still covers the change.

| What you changed | Run |
|------------------|-----|
| \`ios/**\` | \`cd ios && xcodebuild test -scheme ${repo}\` |
| \`android/**\` | \`cd android && ./gradlew test\` |
| \`shared/**\` | Both — \`shared\` is consumed by both platforms |

**Rule:** if \`shared/\` changed, always run both test suites. A breaking
change there ships to production if either platform isn't checked.
`;

  const iosAddScreenMd = `---
name: ios-add-screen
description: >-
  Use when adding a new screen to the iOS app. Walks the exact steps so
  the new screen follows ${repo}'s navigation, state, and analytics conventions.
paths: ios/**
---

# Adding an iOS screen

Activates when working in \`ios/\`. Follow these steps in order.

1. **Create the View** in \`Features/<FeatureName>/\` as a SwiftUI \`View\`.
   Use the project's \`ViewModel\` protocol — no logic inside the view.
2. **Create the ViewModel** in the same folder. Inherit from
   \`BaseViewModel<State, Action>\`. State is an enum, actions are an enum.
3. **Register the route** in \`Navigation/AppRoutes.swift\`. A screen not
   registered there cannot be navigated to.
4. **Add the analytics event** in \`Analytics/Events.swift\`.
   Convention: \`screen_viewed_<feature_name>\`.
5. **Add a snapshot test** in \`FeatureName/Tests/<FeatureName>SnapshotTests.swift\`.

Full checklist with code patterns: [references/screen-checklist.md](references/screen-checklist.md).
`;

  const draftingPrompt = `Draft a skill at \`.claude/skills/[NAME]/SKILL.md\` for the following task:

  [DESCRIBE THE TASK — e.g. "Adding a new screen to our iOS app"]

Follow these rules:
- Use the YAML frontmatter format (name, description, paths)
- The description must clearly state when to use this skill
- The paths: field should restrict it to the relevant directories
- Keep SKILL.md under 50 lines
- Use numbered steps for procedures, tables for reference data
- For any deep detail, create a stub at references/[name].md and link to it

Read [example file or area] before drafting so the skill reflects how the
actual code is structured.

Output the SKILL.md content only.
`;

  return (
    <>
      <span className="section-num">08</span>
      <div className="eyebrow">Phase 5</div>
      <h1>Skills — reusable expertise on demand</h1>
      <p className="lede">
        Capture the things your team always has to re-explain. Skills load only
        when relevant, so your agent's "brain" stays uncluttered.
      </p>

      <div className="phase-meta">
        <span>
          <strong>Time:</strong> ~30 min per skill
        </span>
        <span>
          <strong>Prereq:</strong> Phase 3 complete
        </span>
        <span>
          <strong>Outcome:</strong> 3–5 skills covering your most frequent
          workflows
        </span>
      </div>

      <h2>Why this matters</h2>
      <p>
        Some pieces of expertise apply only sometimes. Money-handling rules
        apply only when working in billing. Test patterns apply only when
        writing tests. If you put all of it in CLAUDE.md, every session carries
        it — bloating the context for no reason. Skills sit dormant until
        they're needed.
      </p>

      <h2>What you'll have at the end</h2>
      <p>
        A <code>.claude/skills/</code> folder with three to five skills, each
        scoped via the <code>paths:</code> field so it auto-loads only in the
        relevant part of your codebase.
      </p>

      <h2>The skills to build first</h2>
      <p>For a native mobile app, the highest-leverage starting set:</p>
      <div className="table-wrap">
        <table>
          <tbody>
            <tr>
              <th>Skill</th>
              <th>Scope</th>
              <th>What it captures</th>
            </tr>
            <tr>
              <td>
                <code>scoped-tests</code>
              </td>
              <td>repo-wide</td>
              <td>Which test command to run for each kind of change</td>
            </tr>
            <tr>
              <td>
                <code>ios-add-screen</code>
              </td>
              <td>
                <code>ios/**</code>
              </td>
              <td>The exact steps to add a new screen in your iOS app</td>
            </tr>
            <tr>
              <td>
                <code>android-add-screen</code>
              </td>
              <td>
                <code>android/**</code>
              </td>
              <td>Same, for Android</td>
            </tr>
            <tr>
              <td>
                <code>network-contract-change</code>
              </td>
              <td>
                <code>shared/**</code> or wherever
              </td>
              <td>
                Steps for changing an API contract — both platforms need
                updating
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Anatomy of a skill</h2>
      <p>
        A skill is a folder with a <code>SKILL.md</code> file. The first few
        lines (the "frontmatter") declare the skill's name, when to use it, and
        where it applies. The body is the actual content.
      </p>

      <h4>Template — .claude/skills/scoped-tests/SKILL.md</h4>
      <CodeBlock lang="markdown">{scopedTestsMd}</CodeBlock>

      <h4>Template — .claude/skills/ios-add-screen/SKILL.md</h4>
      <CodeBlock lang="markdown">{iosAddScreenMd}</CodeBlock>

      <h2>The "paths:" field — pay attention to this</h2>
      <p>
        The <code>paths:</code> field is what makes skills lightweight. A skill
        scoped to <code>ios/**</code> doesn't even register in the agent's
        awareness when you're working in Android. This is how you can have a
        dozen skills and only the relevant 1–2 load at any time.
      </p>
      <ul>
        <li>
          <code>ios/**</code> — anywhere under <code>ios/</code> at any depth
        </li>
        <li>
          <code>ios/Features/**</code> — only under the Features folder
        </li>
        <li>
          Multiple paths via a YAML list (see <code>scoped-tests</code> example
          above)
        </li>
      </ul>

      <h2>Progressive disclosure — keep skills lean</h2>
      <p>
        Your skill's <code>SKILL.md</code> should be short — under 50 lines. For
        longer guidance (full code patterns, edge cases), create a{' '}
        <code>references/</code> folder beside it and link to specific files.
        The agent loads the reference only when it needs the detail.
      </p>

      <h2>Step 1 — Use your agent to draft each skill</h2>
      <p>For each skill in your starting set, run this prompt:</p>

      <h4>Skill-drafting prompt</h4>
      <CodeBlock lang="markdown">{draftingPrompt}</CodeBlock>

      <h2>Step 2 — Test that the skill loads</h2>
      <p>
        After creating a skill, start a fresh session, open a file in the
        skill's scope, and ask:{' '}
        <em>"What skills do you have loaded right now?"</em> The skill should
        appear. Then ask it a question the skill addresses; you should see the
        skill's guidance reflected in the answer.
      </p>

      <h2>Step 3 — Verify scoping works</h2>
      <p>
        Switch to a file <em>outside</em> the skill's scope and ask the same
        question. The skill should not be loaded; the answer should be more
        generic. If it loads anyway, your <code>paths:</code> field is too
        broad.
      </p>

      <h2>Checklist</h2>
      <Checklist
        items={[
          {
            id: 'p5-a',
            label: (
              <>
                Created <code>scoped-tests</code> skill
              </>
            ),
          },
          {
            id: 'p5-b',
            label: (
              <>
                Created <code>ios-add-screen</code> (or equivalent for your iOS
                workflow)
              </>
            ),
          },
          {
            id: 'p5-c',
            label: (
              <>
                Created <code>android-add-screen</code> (or equivalent for your
                Android workflow)
              </>
            ),
          },
          {
            id: 'p5-d',
            label: 'Created one more skill specific to your codebase',
          },
          { id: 'p5-e', label: 'Verified each skill loads only in its scope' },
        ]}
      />
    </>
  );
}
