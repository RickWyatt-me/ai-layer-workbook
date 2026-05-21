export default function HowItWorks() {
  return (
    <>
      <span className="section-num">02</span>
      <div className="eyebrow">Mechanics</div>
      <h1>How Claude Code actually works</h1>
      <p className="lede">
        No magic. Just a CLI tool that walks your filesystem and runs scripts at
        specific moments. Once you see the mechanics, the whole AI Layer stops
        feeling mysterious.
      </p>

      <h2>What "Claude Code" is, mechanically</h2>
      <p>
        <strong>Claude Code</strong> is a command-line program you install once
        on your computer. You open a terminal, navigate to your project folder,
        and type <code>claude</code>. That starts a <strong>session</strong>: an
        interactive conversation where you type requests and the agent reads
        files, runs commands, and edits code on your behalf — all locally, on
        your machine.
      </p>
      <p>
        Unlike older AI tools that uploaded your entire codebase to a server to
        be "indexed," Claude Code does nothing of the sort. It works exactly
        like a careful new engineer would: opens files, greps for things,
        follows imports, looks at git history. The code never leaves your
        machine unless you explicitly send it somewhere.
      </p>

      <h2>What a "session" is</h2>
      <p>
        A session starts when you run <code>claude</code> and ends when you
        close that terminal or run <code>/clear</code>. Inside one session, the
        agent remembers everything you've discussed and every file it has looked
        at. Across sessions, it doesn't — each new session starts fresh.
      </p>
      <p>
        This matters because the <strong>CLAUDE.md files</strong> are how the
        agent gets re-oriented at the start of every new session. Without them,
        every session starts blind.
      </p>

      <h2>What "the context" is, and why it matters</h2>
      <p>
        The <strong>context</strong> is the agent's short-term memory for the
        current session — a finite amount of text it can hold at once. Every
        file it reads, every output of every command, every line of conversation
        eats into that budget. When the budget gets low, the agent struggles.
      </p>
      <p>
        This is why every design choice in the AI Layer is fundamentally about{' '}
        <strong>context economy</strong>: load only what's relevant{' '}
        <em>right now</em>, defer everything else until it's needed. CLAUDE.md
        hierarchy, path-scoped skills, read-only subagents — they all exist to
        spend the context budget wisely.
      </p>

      <h2>How hooks actually fire</h2>
      <p>
        A hook is just a command that Claude Code runs at a moment you've
        defined. You configure them in a file called{' '}
        <code>.claude/settings.json</code>. Here are the moments that exist:
      </p>
      <div className="table-wrap">
        <table>
          <tbody>
            <tr>
              <th>Hook name</th>
              <th>Fires when…</th>
              <th>Typical use</th>
            </tr>
            <tr>
              <td>
                <code>SessionStart</code>
              </td>
              <td>
                You run <code>claude</code> or <code>/clear</code>
              </td>
              <td>Inject orientation (active files, recent commits)</td>
            </tr>
            <tr>
              <td>
                <code>UserPromptSubmit</code>
              </td>
              <td>You hit Enter on a message</td>
              <td>Add context to your message before it's sent</td>
            </tr>
            <tr>
              <td>
                <code>PreToolUse</code>
              </td>
              <td>Before the agent runs a tool (e.g. Bash, Edit)</td>
              <td>Block dangerous commands; require confirmation</td>
            </tr>
            <tr>
              <td>
                <code>PostToolUse</code>
              </td>
              <td>After a tool runs</td>
              <td>Auto-lint after every edit; log changes</td>
            </tr>
            <tr>
              <td>
                <code>Stop</code>
              </td>
              <td>The agent finishes its current response to you</td>
              <td>Self-improvement: reflect, propose CLAUDE.md updates</td>
            </tr>
            <tr>
              <td>
                <code>PreCompact</code>
              </td>
              <td>Before the agent compresses old conversation</td>
              <td>Snapshot state before it's summarised away</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>What a hook actually receives and returns</h2>
      <p>
        Each hook is just a program (a Python script, a shell command —
        anything). When the hook fires:
      </p>
      <ol>
        <li>Claude Code runs your program.</li>
        <li>
          It pipes a JSON payload to your program's{' '}
          <strong>standard input</strong> (the equivalent of typing into the
          program).
        </li>
        <li>
          Whatever your program writes to <strong>standard output</strong> (its
          console) gets injected back into the agent's context.
        </li>
        <li>
          Whatever your program writes to <strong>standard error</strong> shows
          up in the terminal for you to read.
        </li>
      </ol>
      <p>
        That's it. Hooks aren't magic — they're scripts that run at lifecycle
        events and can speak to the agent through stdin/stdout. A bash one-liner
        is a valid hook. A 200-line Python program is also a valid hook. The
        simplest useful hook is just <code>echo "Today is $(date)"</code>.
      </p>

      <div className="callout">
        <div className="callout-title">
          "Stop" doesn't mean what you'd think
        </div>
        <p>
          "Stop" doesn't mean you closed the terminal. It means the agent
          finished its current response to your most recent message. The Stop
          hook fires <strong>every single turn</strong>. So whatever you put
          there must be cheap, or it must check whether anything actually
          changed before doing real work — which is exactly what the
          self-improvement pattern in Phase 6 does.
        </p>
      </div>

      <h2>Skills, mechanically</h2>
      <p>
        A <strong>skill</strong> is a folder under <code>.claude/skills/</code>{' '}
        containing a <code>SKILL.md</code> file. The first few lines of that
        file (the "frontmatter") declare a name, a description, and optionally a{' '}
        <code>paths:</code> field — a pattern matching where in your codebase
        this skill applies.
      </p>
      <p>
        At every turn, Claude Code reads the descriptions of all available
        skills and decides which ones are relevant. Only relevant skills are
        loaded into context. A skill scoped to <code>services/billing/**</code>{' '}
        stays dormant until the agent works in <code>services/billing</code>.
      </p>

      <h2>Subagents, mechanically</h2>
      <p>
        A subagent is a second instance of Claude Code launched by the first. It
        has its own context window — its own short-term memory — separate from
        the parent. You define it in a single markdown file under{' '}
        <code>.claude/agents/</code>, including which tools it's allowed to use
        (e.g. only <code>Read</code> and <code>Grep</code>, no <code>Edit</code>{' '}
        or <code>Write</code>). When the parent dispatches the subagent, it does
        its work, returns a final report, and disappears. The parent receives
        only the report — not the subagent's reading list.
      </p>

      <h2>The whole picture, on one page</h2>
      <p>Here's what happens in a typical session, end to end:</p>
      <ol>
        <li>
          You type <code>claude</code>. <strong>SessionStart hook</strong> fires
          → prints orientation into context.
        </li>
        <li>
          Claude Code reads the root <strong>CLAUDE.md</strong>. As you work in
          subfolders, it loads those <strong>CLAUDE.md</strong>s too.
        </li>
        <li>
          You ask for something. <strong>Relevant skills</strong> auto-load
          based on which files you're touching.
        </li>
        <li>
          The agent reads files. For exact symbol lookups, it uses{' '}
          <strong>LSP</strong>. For structured search, it calls your{' '}
          <strong>MCP</strong> server.
        </li>
        <li>
          For a big unfamiliar area, the agent dispatches the{' '}
          <strong>explorer subagent</strong> first to map it.
        </li>
        <li>
          The agent edits files, runs your tests (filtered by the{' '}
          <strong>scoped-tests</strong> skill), reports back to you.
        </li>
        <li>
          <strong>Stop hook</strong> fires → notices what changed, spawns a
          background reflection that proposes CLAUDE.md updates while context is
          fresh.
        </li>
        <li>You type another request. Loop.</li>
      </ol>
      <p>
        Every piece you build in this workbook hooks into one of those steps.
      </p>
    </>
  );
}
