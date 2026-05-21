import GlossaryTerm from '../components/GlossaryTerm';

export default function MentalModels() {
  return (
    <>
      <span className="section-num">01</span>
      <div className="eyebrow">Concepts before code</div>
      <h1>Mental models</h1>
      <p className="lede">
        Seven analogies that let you reason about every piece of an AI Layer
        without knowing the technical names yet.
      </p>

      <h2>The AI Layer itself</h2>
      <p>
        Think of your codebase as a giant warehouse. Without help, every visitor
        — even an experienced one — wastes time finding the right aisle, asking
        where things are, and bumping into rules they didn't know existed.
      </p>
      <p>
        The <strong>AI Layer</strong> is the signage, the floor map, the staff
        handbook, and the badge-access system — all bolted onto the warehouse so
        anyone walking in (human or AI) can get useful work done quickly without
        breaking things. The warehouse is your codebase. The AI Layer is what
        makes it navigable.
      </p>

      <h2>CLAUDE.md — the team handbook</h2>
      <p>
        A <GlossaryTerm term="CLAUDE.md">CLAUDE.md</GlossaryTerm> file is a
        short handbook for one part of your codebase. The handbook at the top of
        the warehouse covers company-wide rules: how we measure things, what
        departments exist. Handbooks in each department cover only that
        department's rules: how the billing team handles refunds, what the
        shipping team does with damaged goods.
      </p>
      <p>
        The agent reads the top-level handbook first, then loads the relevant
        department handbook when it walks into that department. It never carries
        every handbook at once — that would be exhausting and most of them
        aren't relevant.
      </p>

      <h2>Hooks — automatic doors</h2>
      <p>
        <GlossaryTerm term="Hook">Hooks</GlossaryTerm> are like automatic doors
        that fire when you cross a sensor. You don't ask them to open — they
        just do, at moments you've defined. A <code>SessionStart</code> hook is
        the door at the entrance ("welcome, here's today's floor map"). A{' '}
        <code>Stop</code> hook is the door at the exit ("what just happened on
        this visit — anything we should add to the handbook?"). They run on
        their own. You configure them once.
      </p>

      <h2>Skills — consultants on retainer</h2>
      <p>
        A <GlossaryTerm term="Skill">skill</GlossaryTerm> is a specialist
        consultant who only shows up when their expertise is relevant. You
        wouldn't bring a tax attorney to every meeting; you'd call them when
        there's a tax question. Skills are scoped: the billing-specialist skill
        activates when the agent works in the billing department, and stays out
        of the way otherwise. This keeps the agent's "brain" — its context —
        from being cluttered with advice it doesn't need right now.
      </p>

      <h2>Subagents — scouts</h2>
      <p>
        A <GlossaryTerm term="Subagent">subagent</GlossaryTerm> is a scout you
        send ahead. Before your main party (the editing agent) descends into an
        unfamiliar part of the warehouse, you dispatch a scout — read-only,
        can't break anything, just observes — to map the area and report back.
        The scout returns with a clean report; the main agent then enters with
        the full picture instead of using up its own attention on discovery. Map
        first, then act.
      </p>

      <h2>LSP — GPS for code</h2>
      <p>
        The <GlossaryTerm term="LSP">Language Server Protocol</GlossaryTerm> is
        GPS for your codebase. Without it, the agent searches for things by name
        (text matching) — like trying to find a specific "Main Street" by
        reading every street sign in every city. With it, the agent navigates by
        coordinates — actual definitions and references — so it finds the right
        thing the first time. This is the single highest-leverage upgrade for
        big codebases.
      </p>

      <h2>MCP — USB ports for Claude</h2>
      <p>
        An <GlossaryTerm term="MCP">MCP server</GlossaryTerm> is a standard way
        to plug external tools into your agent. Think USB ports: any device that
        speaks USB can plug into any computer. Any tool that speaks MCP can plug
        into Claude Code. A search engine for your codebase, a connection to
        your ticket system, a custom analytics query — all become tools the
        agent can call.
      </p>

      <h2>Plugins — app installs</h2>
      <p>
        A <GlossaryTerm term="Plugin">plugin</GlossaryTerm> bundles a set of
        skills, hooks, and MCP servers into one installable package. Like
        installing an app on your phone: one tap, and everything comes with it
        pre-wired. When a teammate joins your project, they install your team's
        plugin and get the same setup you have — no manual copying of files.
      </p>

      <hr />
      <p>
        <strong>Carry these analogies with you.</strong> Every implementation
        phase in this workbook maps back to one of them. If you ever get
        confused mid-phase, come back here.
      </p>
    </>
  );
}
