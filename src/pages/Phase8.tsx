import Checklist from '../components/Checklist';
import CodeBlock from '../components/CodeBlock';

export default function Phase8() {
  const mcpPrompt = `I want to build a custom MCP server for my repo. The tool it should expose:

  [DESCRIBE — e.g. "Given a feature name, return every Swift file
   that references it and every Kotlin file that references it,
   so I can audit cross-platform consistency."]

Scaffold:
1. The Python (or Node) script for the MCP server
2. The .mcp.json entry to wire it in
3. A README explaining how to run and test it standalone

Use the MCP SDK conventions (the \`mcp\` Python package or \`@modelcontextprotocol/sdk\`
for Node). The tool's docstring must be precise — the agent decides when to call it
based on that description.

Output: the files, with the path each should live at.
`;

  return (
    <>
      <span className="section-num">11</span>
      <div className="eyebrow">Phase 8 · Advanced</div>
      <h1>MCP — structured tools for your agent</h1>
      <p className="lede">
        For when grep noise becomes a real problem, or you want to plug your
        agent into something only your team has.
      </p>

      <div className="phase-meta">
        <span>
          <strong>Time:</strong> half a day or more
        </span>
        <span>
          <strong>Prereq:</strong> Phases 1–7 done and bedded in
        </span>
        <span>
          <strong>Outcome:</strong> Optional. Skip unless you need it.
        </span>
      </div>

      <h2>Why this matters — and when it doesn't</h2>
      <p>
        An MCP server is a custom tool your agent can call. The most common uses
        for a custom MCP:
      </p>
      <ul>
        <li>
          <strong>Codebase search</strong> by AST instead of grep. Useful for
          million-line codebases or codebases where method names are common
          words.
        </li>
        <li>
          <strong>Internal documentation lookup</strong> across systems your
          team uses (Notion, internal wikis, design docs).
        </li>
        <li>
          <strong>Ticket/issue queries</strong> against Jira, Linear, Shortcut,
          etc.
        </li>
        <li>
          <strong>Deployment or analytics queries</strong> for your specific
          platforms.
        </li>
      </ul>
      <p>
        <strong>You probably don't need this in your first month.</strong> The
        patterns from Phases 1–7 deliver most of the value. MCP servers are a
        high-investment, high-ceiling addition you make when you've outgrown the
        basics.
      </p>

      <h2>What an MCP server is, in one paragraph</h2>
      <p>
        An MCP server is a small program (Python, Node, anything) that exposes a
        set of "tools" — functions the agent can call. It runs locally and
        communicates over standard input/output. You wire it into Claude Code
        via a file called <code>.mcp.json</code>. From the agent's point of
        view, calling your MCP server's tool feels the same as calling any
        built-in tool.
      </p>

      <h2>The high-value first MCP — AST-based codebase search</h2>
      <p>
        The single most useful custom MCP for a large mobile codebase is a
        structured search server. Instead of grep returning 200 matches for
        "send," your AST-based search returns "the 3 actual{' '}
        <em>function definitions</em> named <code>send</code> in your repo, with
        their qualified names and line numbers."
      </p>
      <p>
        Cole's helpline repo includes{' '}
        <a
          href="https://github.com/coleam00/helpline/blob/main/tooling/mcp/codebase_search.py"
          target="_blank"
          rel="noopener"
        >
          a reference implementation in Python
        </a>
        . For Swift and Kotlin you'd write something similar using each
        language's AST tooling (SwiftSyntax and Kotlin's PSI, respectively) — or
        use the LSP from Phase 4, which already provides much of this.
      </p>

      <h2>When the LSP is enough vs when you need MCP</h2>
      <div className="table-wrap">
        <table>
          <tbody>
            <tr>
              <th>Situation</th>
              <th>LSP enough?</th>
              <th>MCP useful?</th>
            </tr>
            <tr>
              <td>
                "Where is <code>Foo</code> defined?"
              </td>
              <td>Yes</td>
              <td>No</td>
            </tr>
            <tr>
              <td>
                "Find all callers of <code>Foo</code>"
              </td>
              <td>Yes</td>
              <td>No</td>
            </tr>
            <tr>
              <td>"List every API endpoint our app calls"</td>
              <td>No — that's a custom query</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td>
                "Show me every screen using <code>OldDeprecatedView</code>"
              </td>
              <td>Yes</td>
              <td>No</td>
            </tr>
            <tr>
              <td>"Query our internal ticketing system"</td>
              <td>No</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td>"What changed across services in the last release?"</td>
              <td>No</td>
              <td>Yes</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Step 0 — Decide if you need this</h2>
      <p>
        Before investing days into a custom MCP, ask:{' '}
        <em>
          "After three months with Phases 1–7, what queries am I still
          hand-running because my agent can't?"
        </em>{' '}
        Those are your candidate MCP tools. If the answer is "none," skip this
        phase.
      </p>

      <h2>Step 1 — If you decide yes, start with one well-defined tool</h2>
      <p>
        Don't try to build a Swiss army knife MCP. Pick one query that you run
        by hand more than weekly. Build an MCP server with that one tool. Live
        with it for a sprint. Add more tools only when you've felt the pull.
      </p>

      <h2>What's in this phase, deliberately</h2>
      <p>
        This workbook deliberately doesn't include a full MCP server template —
        because the right design depends entirely on what you're querying. The
        prompt below gets your agent to scaffold one for you.
      </p>

      <h4>MCP scaffolding prompt</h4>
      <CodeBlock lang="markdown">{mcpPrompt}</CodeBlock>

      <h2>Checklist</h2>
      <Checklist
        items={[
          {
            id: 'p8-a',
            label:
              "Identified at least one query I'd want an MCP for (or decided: not yet)",
          },
          {
            id: 'p8-b',
            label: 'If proceeding: scaffolded an MCP server with one tool',
          },
          {
            id: 'p8-c',
            label: (
              <>
                Wired it into <code>.mcp.json</code>
              </>
            ),
          },
          { id: 'p8-d', label: 'Verified the agent calls it correctly' },
        ]}
      />
    </>
  );
}
