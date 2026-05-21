import Checklist from '../components/Checklist';
import CodeBlock from '../components/CodeBlock';

export default function Phase4() {
  return (
    <>
      <span className="section-num">07</span>
      <div className="eyebrow">Phase 4</div>
      <h1>LSP — symbol-level navigation</h1>
      <p className="lede">
        The single highest-leverage upgrade for large codebases. Stop the agent
        from greppping its way around. Give it actual coordinates.
      </p>

      <div className="phase-meta">
        <span>
          <strong>Time:</strong> ~1 hr per language
        </span>
        <span>
          <strong>Prereq:</strong> Phase 1 complete
        </span>
        <span>
          <strong>Outcome:</strong> Symbol-level search and navigation working
        </span>
      </div>

      <h2>Why this matters</h2>
      <p>
        If you have a function named <code>fetch()</code> in your codebase, grep
        will find it. Grep will also find the word <code>fetch</code> in 47
        comments, 12 string literals, 8 unrelated method names, and the word{' '}
        <code>prefetch</code> three times. The agent then opens each file to
        figure out which one matters. That's a lot of wasted context for an
        answer the LSP gives you instantly.
      </p>
      <p>
        For native mobile development, this is especially valuable because Swift
        and Kotlin are strongly typed — the LSP has rich type information and
        can resolve symbols precisely.
      </p>

      <h2>What you'll have at the end</h2>
      <p>
        Two language servers running locally (one per platform), wired into
        Claude Code via a plugin. Your agent now has "go to definition" and
        "find all references" as native capabilities.
      </p>

      <h2>iOS — Swift via sourcekit-lsp</h2>

      <h4>Step 1: Confirm Xcode is installed</h4>
      <p>sourcekit-lsp ships with Xcode. Run:</p>
      <CodeBlock lang="bash">{`xcrun --find sourcekit-lsp`}</CodeBlock>
      <p>
        You should see a path like{' '}
        <code>
          /Applications/Xcode.app/Contents/Developer/usr/bin/sourcekit-lsp
        </code>
        . If you get an error, install Xcode from the App Store, then run{' '}
        <code>
          sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
        </code>
        .
      </p>

      <h4>Step 2: Install the Claude Code code-intelligence plugin</h4>
      <p>In your terminal, in your repo root:</p>
      <CodeBlock lang="bash">{`claude
/plugin install code-intelligence`}</CodeBlock>

      <h4>Step 3: Configure it for Swift</h4>
      <p>
        Ask your agent:{' '}
        <em>
          "Configure the code-intelligence plugin to use sourcekit-lsp for Swift
          files in <code>ios/</code>. Update <code>.claude/settings.json</code>{' '}
          if needed."
        </em>
      </p>

      <h4>Step 4: Verify</h4>
      <p>
        Open a Swift file. Ask the agent:{' '}
        <em>
          "Find all references to <code>APIClient</code> in the iOS code."
        </em>{' '}
        If you see file:line references and the agent reports the count cleanly
        without opening 30 files first, the LSP is working.
      </p>

      <h2>Android — Kotlin via kotlin-language-server</h2>

      <h4>Step 1: Install kotlin-language-server</h4>
      <p>On macOS via Homebrew:</p>
      <CodeBlock lang="bash">{`brew install kotlin-language-server`}</CodeBlock>
      <p>
        On Linux or Windows, follow the{' '}
        <a
          href="https://github.com/fwcd/kotlin-language-server"
          target="_blank"
          rel="noopener"
        >
          official install guide
        </a>
        .
      </p>

      <h4>Step 2: Verify the binary</h4>
      <CodeBlock lang="bash">{`which kotlin-language-server`}</CodeBlock>
      <p>You should see a path.</p>

      <h4>Step 3: Wire into Claude Code</h4>
      <p>
        Ask your agent:{' '}
        <em>
          "Configure the code-intelligence plugin to use kotlin-language-server
          for Kotlin files in <code>android/</code>. Update{' '}
          <code>.claude/settings.json</code> if needed."
        </em>
      </p>

      <h4>Step 4: Verify</h4>
      <p>
        Open a Kotlin file. Ask the agent:{' '}
        <em>
          "Find all references to the <code>Repository</code> interface in the
          Android code."
        </em>{' '}
        Same test as iOS — clean file:line references, no scattered
        file-reading.
      </p>

      <h2>What it feels like when LSP is working</h2>
      <p>You'll notice:</p>
      <ul>
        <li>
          Refactor questions ("rename this function across the codebase") get
          answered in seconds, not minutes.
        </li>
        <li>"Where is this defined?" gets one answer, not three guesses.</li>
        <li>
          The agent's responses become more confident — because it's working
          from real type information, not pattern-matching.
        </li>
      </ul>

      <h2>Common stumbling blocks</h2>
      <details>
        <summary>
          "sourcekit-lsp can't find my Swift package / Xcode project"
        </summary>
        <p>
          sourcekit-lsp needs to know the build context. Open the project in
          Xcode once first so it generates the DerivedData, then restart Claude
          Code. For Swift packages, ensure <code>Package.swift</code> is at the
          root of the indexed area.
        </p>
      </details>
      <details>
        <summary>"kotlin-language-server is slow on first start"</summary>
        <p>
          Expected. It builds an index of your Kotlin code on first use. Give it
          5–10 minutes on a large codebase. Subsequent starts are fast.
        </p>
      </details>
      <details>
        <summary>"It works for one platform but not the other"</summary>
        <p>
          You probably configured the plugin for only one language. Run the
          configuration step for both.
        </p>
      </details>

      <h2>Checklist</h2>
      <Checklist
        items={[
          {
            id: 'p4-a',
            label: (
              <>
                sourcekit-lsp accessible via <code>xcrun</code>
              </>
            ),
          },
          { id: 'p4-b', label: 'kotlin-language-server installed' },
          {
            id: 'p4-c',
            label: 'code-intelligence plugin installed in Claude Code',
          },
          { id: 'p4-d', label: 'Swift "find references" works cleanly' },
          { id: 'p4-e', label: 'Kotlin "find references" works cleanly' },
        ]}
      />
    </>
  );
}
