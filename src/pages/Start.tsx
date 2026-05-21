export default function Start() {
  return (
    <>
      <span className="section-num">00</span>
      <div className="eyebrow">Begin here</div>
      <h1>The AI Layer Workbook</h1>
      <p className="lede">
        A step-by-step, plain-language guide to setting up Claude Code in a
        large codebase — built for people who can ship without being career
        engineers.
      </p>

      <p>
        Most articles about getting AI to work in real codebases assume you
        already speak engineer. This one doesn't. It walks you through the same
        setup the best teams use — but with analogies, copy-paste templates, and
        prompts you hand to your own coding agent to do the heavy work for you.
      </p>

      <p>
        Each phase has the same shape: <strong>why it matters</strong>,{' '}
        <strong>what you'll have at the end</strong>,{' '}
        <strong>concrete steps</strong>, <strong>copy-paste blocks</strong>, and
        a <strong>verify it worked</strong> section. Check items off as you go —
        your progress is saved in your browser.
      </p>

      <h2>How to use this workbook</h2>
      <ol>
        <li>
          Read the three <strong>Orientation</strong> pages first. They give you
          the mental model — none of the implementation steps will land without
          them.
        </li>
        <li>
          Fill in the <strong>Personalize</strong> panel on the next page. The
          whole workbook adapts to your repo.
        </li>
        <li>
          Work through the nine <strong>Implementation</strong> phases in order.
          Each one takes 30 minutes to a couple of hours.
        </li>
        <li>
          Don't write CLAUDE.md files, hooks, or skills by hand. Use the prompts
          in this workbook — your own coding agent will do the work on your
          machine.
        </li>
      </ol>

      <div className="callout">
        <div className="callout-title">A note before you start</div>
        <p>
          This workbook teaches the Claude Code conventions — CLAUDE.md, hooks,
          skills, plugins. But the work of <em>setting them up</em> can be done
          by whatever coding agent you already use. Use the picker in the top
          bar to set your agent; the wording adapts.
        </p>
      </div>

      <div className="origin-block">
        <h3>Origins &amp; credit</h3>
        <p>
          This guide stands on the work of{' '}
          <a href="https://dynamous.ai" target="_blank" rel="noopener">
            Cole Medin
          </a>{' '}
          and the{' '}
          <a href="https://dynamous.ai" target="_blank" rel="noopener">
            Dynamous
          </a>{' '}
          community of AI builders. Cole's{' '}
          <a
            href="https://youtu.be/efRIrLXoOVA?si=Pn8Dzw-7DwfmPq5V"
            target="_blank"
            rel="noopener"
          >
            YouTube walkthrough
          </a>{' '}
          took Anthropic's article{' '}
          <a
            href="https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start"
            target="_blank"
            rel="noopener"
          >
            "How Claude Code works in large codebases"
          </a>{' '}
          and turned it into a working reference codebase — the{' '}
          <a
            href="https://github.com/coleam00/helpline"
            target="_blank"
            rel="noopener"
          >
            helpline repo
          </a>
          . Every pattern in this workbook is concrete because of that repo.
        </p>
        <p>
          I built this for myself, to make implementation easier and to
          translate the technical pieces into something I could confidently
          execute. I quickly realised others might want the same. If that's you
          — welcome. The substance is Cole and Anthropic's; the angle here is
          just <em>plain-language, one-step-at-a-time</em>.
        </p>
        <p>
          <strong>
            Want to go deeper with people doing this work full-time?
          </strong>{' '}
          Join us at{' '}
          <a href="https://dynamous.ai" target="_blank" rel="noopener">
            Dynamous
          </a>
          .
        </p>
        <ul>
          <li>
            Cole's video:{' '}
            <a
              href="https://youtu.be/efRIrLXoOVA?si=Pn8Dzw-7DwfmPq5V"
              target="_blank"
              rel="noopener"
            >
              How Claude Code Works in Large Codebases
            </a>
          </li>
          <li>
            Anthropic article:{' '}
            <a
              href="https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start"
              target="_blank"
              rel="noopener"
            >
              claude.com/blog/...large-codebases
            </a>
          </li>
          <li>
            Helpline reference repo:{' '}
            <a
              href="https://github.com/coleam00/helpline"
              target="_blank"
              rel="noopener"
            >
              github.com/coleam00/helpline
            </a>
          </li>
          <li>
            Dynamous community:{' '}
            <a href="https://dynamous.ai" target="_blank" rel="noopener">
              dynamous.ai
            </a>
          </li>
        </ul>
      </div>
    </>
  );
}
