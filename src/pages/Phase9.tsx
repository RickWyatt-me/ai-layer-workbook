import Checklist from '../components/Checklist';
import CodeBlock from '../components/CodeBlock';
import { usePersona } from '../hooks/usePersona';

export default function Phase9() {
  const { persona } = usePersona();
  const repo = persona.repoName || 'your-repo';

  const tree = `${repo}-ai-layer/
└── tooling/
    ├── .claude-plugin/
    │   └── marketplace.json     ← the marketplace manifest
    └── your-team-ai-layer/
        ├── .claude-plugin/
        │   └── plugin.json       ← the plugin manifest
        ├── hooks/
        │   ├── hooks.json
        │   ├── propose_claude_md.py
        │   └── reflect_claude_md.py
        ├── agents/
        │   └── explorer.md
        ├── skills/
        │   └── scoped-tests/
        │       └── SKILL.md
        ├── mcp/                  ← if you have an MCP server
        │   └── server.py
        └── README.md
`;

  const pluginJson = `{
  "name": "your-team-ai-layer",
  "version": "0.1.0",
  "description": "Portable AI Layer: scoped-tests skill, self-improving CLAUDE.md hook, read-only explorer subagent. Install this and any repo gets the team's baseline Claude Code setup on day one.",
  "author": { "name": "Your team" }
}
`;

  const marketplaceJson = `{
  "name": "your-team-tooling",
  "owner": { "name": "Your team" },
  "metadata": {
    "description": "Internal marketplace for our Claude Code tooling."
  },
  "plugins": [
    {
      "name": "your-team-ai-layer",
      "source": "./your-team-ai-layer",
      "description": "The portable AI Layer."
    }
  ]
}
`;

  const hooksJson = `{
  "hooks": {
    "Stop": [
      { "hooks": [{ "type": "command",
        "command": "python \\"\${CLAUDE_PLUGIN_ROOT}/hooks/propose_claude_md.py\\"" }] }
    ]
  }
}
`;

  const installCmds = `claude
/plugin marketplace add /path/to/your-repo-ai-layer/tooling
/plugin install your-team-ai-layer@your-team-tooling`;

  return (
    <>
      <span className="section-num">12</span>
      <div className="eyebrow">Phase 9</div>
      <h1>Plugin — distribute what works</h1>
      <p className="lede">
        Once your AI Layer earns its keep, bundle the portable pieces so
        teammates (or a future project) get them in one command.
      </p>

      <div className="phase-meta">
        <span>
          <strong>Time:</strong> ~2 hrs
        </span>
        <span>
          <strong>Prereq:</strong> Phases 1–7 working
        </span>
        <span>
          <strong>Outcome:</strong> An installable plugin teammates can adopt
          with <code>/plugin install</code>
        </span>
      </div>

      <h2>Why this matters</h2>
      <p>
        Without a plugin, knowledge stays tribal. The first engineer to set up
        their AI Layer reaps the reward; everyone else either copies files by
        hand or stays without. A plugin turns your setup into a one-command
        install for anyone on your team — or in your community.
      </p>

      <h2>What travels vs what stays</h2>
      <p>
        This is the crucial distinction. Some of your AI Layer is repo-specific
        (the CLAUDE.md files describing <em>your</em> conventions). Some of it
        is portable (the hooks that detect changed areas based on CLAUDE.md
        presence — they work in any repo). The plugin bundles only the portable
        pieces.
      </p>

      <div className="table-wrap">
        <table>
          <tbody>
            <tr>
              <th>Stays in your repo</th>
              <th>Goes in the plugin</th>
            </tr>
            <tr>
              <td>
                Root <code>CLAUDE.md</code>
              </td>
              <td>
                The Stop hook (works in any repo with a CLAUDE.md hierarchy)
              </td>
            </tr>
            <tr>
              <td>
                Subdirectory <code>CLAUDE.md</code> files
              </td>
              <td>The reflector script</td>
            </tr>
            <tr>
              <td>
                Domain-specific skills (<code>ios-add-screen</code>, etc.)
              </td>
              <td>
                Generic skills (<code>scoped-tests</code>)
              </td>
            </tr>
            <tr>
              <td>SessionStart hook (references your structure)</td>
              <td>The explorer subagent</td>
            </tr>
            <tr>
              <td>
                <code>.claudeignore</code> (your file patterns)
              </td>
              <td>Any custom MCP servers</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Step 1 — Decide what's portable</h2>
      <p>
        Walk through your <code>.claude/</code> folder. For each item, ask:{' '}
        <em>
          "Would this work in a completely different repo, with a different
          structure?"
        </em>
      </p>
      <ul>
        <li>If yes → portable, goes in the plugin</li>
        <li>
          If no → stays in this repo's <code>.claude/</code>
        </li>
      </ul>

      <h2>Step 2 — Set up the plugin folder</h2>
      <p>
        Create a separate folder — could be inside your repo (e.g.{' '}
        <code>tooling/your-team-ai-layer/</code>) or in a completely separate
        repo (better for sharing across projects).
      </p>
      <CodeBlock lang="bash">{tree}</CodeBlock>

      <h4>plugin.json</h4>
      <CodeBlock lang="json">{pluginJson}</CodeBlock>

      <h4>marketplace.json</h4>
      <CodeBlock lang="json">{marketplaceJson}</CodeBlock>

      <h2>Step 3 — Make hooks/agents/skills portable</h2>
      <p>
        Anything in the plugin needs to reference its own directory via{' '}
        <code>{'${CLAUDE_PLUGIN_ROOT}'}</code> (the plugin's own path when
        installed). Update the hooks.json:
      </p>
      <CodeBlock lang="json">{hooksJson}</CodeBlock>

      <h2>Step 4 — Install &amp; test</h2>
      <p>
        From another repo entirely (or after temporarily removing your{' '}
        <code>.claude/hooks/</code>):
      </p>
      <CodeBlock lang="bash">{installCmds}</CodeBlock>
      <p>
        Verify the hook fires, the subagent is dispatchable, and the skill loads
        in the new repo. If any of those don't work, the most common cause is a
        path that references the original repo's structure — fix to use{' '}
        <code>{'${CLAUDE_PLUGIN_ROOT}'}</code>.
      </p>

      <h2>Step 5 — Share</h2>
      <p>
        Once it works, push the plugin to a git repo your teammates can clone.
        They run the two commands above against their clone, and they're set up.
      </p>

      <h2>Checklist</h2>
      <Checklist
        items={[
          { id: 'p9-a', label: "Decided what's portable vs repo-specific" },
          { id: 'p9-b', label: 'Created plugin folder structure' },
          { id: 'p9-c', label: 'plugin.json and marketplace.json valid' },
          {
            id: 'p9-d',
            label: (
              <>
                All bundled scripts use <code>{'${CLAUDE_PLUGIN_ROOT}'}</code>
              </>
            ),
          },
          { id: 'p9-e', label: 'Tested install in a different repo' },
        ]}
      />
    </>
  );
}
