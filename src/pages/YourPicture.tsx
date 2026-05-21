import CodeBlock from '../components/CodeBlock';
import PersonaCard from '../components/PersonaCard';
import RepoFetcher from '../components/RepoFetcher';
import { usePersona } from '../hooks/usePersona';

export default function YourPicture() {
  const { persona } = usePersona();
  const repo = persona.repoName || 'your-repo';

  const tree = `${repo}/
├── CLAUDE.md                ← root (lean — pointers only)
├── .claude/                 ← all AI Layer config lives here
│   ├── settings.json
│   ├── skills/
│   ├── hooks/
│   └── agents/
├── .claudeignore            ← what Claude Code shouldn't read
├── .mcp.json                ← MCP servers wired into this repo
├── ios/
│   ├── CLAUDE.md            ← Swift / iOS conventions
│   └── ...
├── android/
│   ├── CLAUDE.md            ← Kotlin / Android conventions
│   └── ...
└── docs/`;

  return (
    <>
      <span className="section-num">03</span>
      <div className="eyebrow">Personalize</div>
      <h1>Your codebase picture</h1>
      <p className="lede">
        Tell the workbook about your repo. Every code snippet, prompt, and
        template from here on adapts to what you enter.
      </p>

      <p>
        Have a GitHub repo for this project? Paste the URL and we'll fill in the
        fields below from your repo's metadata. Otherwise, fill them in
        manually.
      </p>

      <RepoFetcher />
      <PersonaCard />

      <h2>What you'll see throughout the workbook</h2>
      <p>
        Once you save, mentions of <code>your-repo</code> get replaced with your
        actual repo name. If you selected Swift and/or Kotlin, the
        mobile-specific examples become primary. If you provided top-level
        folders, the file paths in templates reflect them.
      </p>

      <h2>If you have a native mobile app (iOS + Android)</h2>
      <p>The default examples assume this shape:</p>
      <CodeBlock lang="bash">{tree}</CodeBlock>

      <h2>If you have something else</h2>
      <p>
        Wherever the examples say <code>ios/</code> or <code>android/</code>,
        substitute your own top-level folder names. The patterns generalise.
      </p>

      <h2>What's next</h2>
      <p>
        The Implementation section has nine phases. They build on each other in
        order. Don't skip ahead. Phase 1 establishes the foundation everything
        else sits on.
      </p>
    </>
  );
}
