export default function Maintenance() {
  return (
    <>
      <span className="section-num">13</span>
      <div className="eyebrow">Reference</div>
      <h1>Maintenance</h1>
      <p className="lede">
        An AI Layer set up once and forgotten degrades. A small recurring review
        keeps it sharp.
      </p>

      <h2>The 3–6 month review cadence</h2>
      <p>
        Every three to six months, schedule an hour to walk through your AI
        Layer. The trigger for an off-cycle review: a major new model release,
        or a noticeable drop in agent quality.
      </p>

      <h2>What to look at, in order</h2>

      <h3>
        1. The accumulated <code>.claude/claude-md-review.md</code>
      </h3>
      <p>
        This file collects every proposed CLAUDE.md update from your Stop hook.
        Read through it. Apply the genuinely useful ones; ignore the noise;
        clear the file.
      </p>

      <h3>2. CLAUDE.md drift</h3>
      <p>Open each CLAUDE.md (root and subdirectory). Ask:</p>
      <ul>
        <li>Do the gotchas still describe real gotchas? (Were any fixed?)</li>
        <li>Are the conventions still followed? (Or has the code drifted?)</li>
        <li>Are the test/build commands still correct?</li>
      </ul>
      <p>Delete what's no longer true.</p>

      <h3>3. Skills that exist to compensate for old model limits</h3>
      <p>
        This one is subtle. Some skills exist because earlier models needed
        hand-holding ("always break refactors into single-file changes"). Newer
        models often handle those scenarios natively.{' '}
        <strong>
          Skills built to compensate for model weaknesses can become a drag once
          those weaknesses are gone.
        </strong>
      </p>
      <p>
        Audit each skill: is the limitation it works around still real? If not,
        delete the skill.
      </p>

      <h3>4. Hooks that intercept what the model now does natively</h3>
      <p>
        Same principle as skills. If you wrote a hook to enforce something the
        model used to skip, check whether the model still skips it. If not, the
        hook is overhead.
      </p>

      <h3>5. New skills worth adding</h3>
      <p>
        What workflows have you found yourself explaining repeatedly over the
        last quarter? Those are skill candidates. Run the skill-drafting prompt
        from Phase 5.
      </p>

      <h2>The hardest discipline: deleting</h2>
      <p>
        It feels productive to add things. It feels less productive to delete.
        But your AI Layer's quality is shaped by what's <em>not</em> in it as
        much as what is. Be ruthless.
      </p>

      <h2>Re-verifying after major model updates</h2>
      <p>
        When Anthropic ships a major Claude model release, do a focused review:
      </p>
      <ol>
        <li>
          Test your most common workflows against the new model with your
          current AI Layer.
        </li>
        <li>Note where the new model behaves differently — better or worse.</li>
        <li>Update CLAUDE.md, skills, and hooks accordingly.</li>
        <li>Document what you changed and why (a short note in your repo).</li>
      </ol>
    </>
  );
}
