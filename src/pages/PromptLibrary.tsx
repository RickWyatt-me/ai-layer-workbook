import CodeBlock from '../components/CodeBlock';

const DISCOVERY = `Audit this codebase and recommend where CLAUDE.md files should go.

For each candidate directory:
1. Briefly explain what makes this area distinct
2. List the 2-3 gotchas an editor of this area absolutely needs to know
3. Note the scoped test/build command for this area, if there is one
4. Assign a priority: 1 (essential), 2 (valuable), 3 (nice to have)

Output as a single markdown table with these columns:
Path | Domain/language | Gotchas | Scoped test command | Priority

Do NOT create any CLAUDE.md files yet.`;

const DRAFTING = `Draft a CLAUDE.md for the directory \`[PATH]\`.

Follow these rules strictly:
- Total length: under 60 lines
- No facts obvious from file extensions
- No facts already in the root CLAUDE.md
- Lead with 3-5 gotchas an editor must know
- Include the exact scoped test/build command
- Bullet points, not paragraphs
- Reference other CLAUDE.md files where relevant

Read the actual code first. Look for shared state, error patterns,
naming conventions, import boundaries, and unusual idioms.

Output only the CLAUDE.md content.`;

const LSP = `Configure the code-intelligence plugin to use [LSP NAME — sourcekit-lsp
or kotlin-language-server] for [LANGUAGE] files in [PATH]. Update
.claude/settings.json if needed. Verify by finding all references to
[SOME TYPE] and confirming you get clean file:line results without
opening every file.`;

const SKILL = `Draft a skill at \`.claude/skills/[NAME]/SKILL.md\` for:

  [TASK DESCRIPTION]

Rules:
- YAML frontmatter (name, description, paths)
- Description states clearly when to use this skill
- paths: field restricts to relevant directories
- SKILL.md under 50 lines
- Numbered steps for procedures, tables for reference
- For deep detail, stub references/[name].md and link to it

Read [EXAMPLE FILE OR AREA] first so the skill matches reality.

Output the SKILL.md content only.`;

const ADAPT_HOOK = `I have a SessionStart hook script that prints active areas + recent
commits at session start. Adapt it for my repo:

- My repo root has these subdirectories: [LIST]
- My version control is [git / other]
- My exclude patterns should be: [LIST]

Keep the layout-agnostic logic — it should detect CLAUDE.md-governed
areas, not assume any specific folder names.

Output the adapted script.`;

const REVIEW_DRAFT = `Review this CLAUDE.md / skill / hook draft against the rules in
[The AI Layer Workbook]. Specifically check:

1. Is anything in it untrue? (Verify against the actual code.)
2. Is anything in it redundant with what's already in the root CLAUDE.md
   or another skill?
3. Is anything in it too long or too detailed for its purpose?

Suggest specific edits as line-by-line deletions or rewrites.`;

const MAP_SUBSYSTEM = `Use the explorer subagent to map [SUBSYSTEM PATH] and report back
under these headings: Entry points, Key types & functions,
Dependencies, Gotchas, Suggested fixes (described, not applied).`;

const SIX_MONTH = `It's been six months since I set up my AI Layer. Walk through:

1. Open .claude/claude-md-review.md and identify the proposed CLAUDE.md
   updates that are still relevant and worth applying.
2. Read each CLAUDE.md (root and subdirectories) and flag any gotchas,
   conventions, or commands that no longer match reality.
3. Read each skill and flag any that exist to compensate for a model
   limitation that's likely been resolved.
4. Read each hook and ask the same question.
5. Note workflows I've explained more than twice this quarter — those
   are candidates for new skills.

Output a structured report. Don't make changes yet — I'll review and
apply them in a second pass.`;

export default function PromptLibrary() {
  return (
    <>
      <span className="section-num">14</span>
      <div className="eyebrow">Reference</div>
      <h1>Prompt library</h1>
      <p className="lede">
        Every prompt from the workbook, in one place. Copy what you need.
      </p>

      <h2>Discovery (Phase 2)</h2>
      <CodeBlock lang="markdown">{DISCOVERY}</CodeBlock>

      <h2>Drafting a CLAUDE.md (Phase 3)</h2>
      <CodeBlock lang="markdown">{DRAFTING}</CodeBlock>

      <h2>Configuring LSP (Phase 4)</h2>
      <CodeBlock lang="markdown">{LSP}</CodeBlock>

      <h2>Drafting a skill (Phase 5)</h2>
      <CodeBlock lang="markdown">{SKILL}</CodeBlock>

      <h2>Adapting a hook (Phase 6)</h2>
      <CodeBlock lang="markdown">{ADAPT_HOOK}</CodeBlock>

      <h2>Reviewing a draft</h2>
      <CodeBlock lang="markdown">{REVIEW_DRAFT}</CodeBlock>

      <h2>Mapping a subsystem (Phase 7)</h2>
      <CodeBlock lang="markdown">{MAP_SUBSYSTEM}</CodeBlock>

      <h2>Six-month review (Maintenance)</h2>
      <CodeBlock lang="markdown">{SIX_MONTH}</CodeBlock>
    </>
  );
}
