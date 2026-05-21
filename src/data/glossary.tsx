import type { ReactNode } from 'react';

export const GLOSSARY_DEFS: Record<string, string> = {
  'CLAUDE.md':
    'A markdown file Claude Code reads automatically. The root file holds repo-wide rules; subdirectory files hold local conventions for that area.',
  Hook: 'A script Claude Code runs automatically at a specific moment — session start, after a tool runs, when the agent finishes responding, etc.',
  Skill:
    'A folder with a SKILL.md file declaring reusable expertise. Auto-loads when relevant based on its paths field.',
  Subagent:
    'A separate Claude Code instance with its own context window. Used to split exploration (read-only) from editing (the main agent).',
  LSP: 'Language Server Protocol — gives the agent symbol-level navigation (go-to-definition, find-references) instead of text-only search.',
  MCP: 'Model Context Protocol — a standard way to plug external tools and data sources into the agent.',
  Plugin:
    'A bundle of skills, hooks, and MCP servers that can be installed in one command. Distributes a working AI Layer to teammates.',
};

export interface GlossaryEntry {
  term: string;
  definition: ReactNode;
}

export const GLOSSARY_DL: GlossaryEntry[] = [
  {
    term: 'Agent',
    definition:
      'A program that uses an AI model to read, write, and run things on your behalf. Claude Code, Codex, Cursor, and Cline are all agents.',
  },
  {
    term: 'AI Layer',
    definition:
      'The bundle of configuration and tooling — CLAUDE.md files, hooks, skills, subagents, LSP, MCP, plugins — that makes a codebase navigable for an AI agent. Cole Medin\'s term; the article calls it "the harness."',
  },
  {
    term: 'AST',
    definition:
      "Abstract Syntax Tree. A structured representation of code that knows the difference between a function definition and a comment that just mentions the function's name. Powers precise code search.",
  },
  {
    term: 'CLAUDE.md',
    definition:
      'A markdown file Claude Code reads automatically. A root file holds repo-wide truths; subdirectory files hold local conventions.',
  },
  {
    term: 'CLI',
    definition:
      'Command-Line Interface. A program you run by typing commands in a terminal. Claude Code is a CLI tool.',
  },
  {
    term: 'Context (or context window)',
    definition:
      "The agent's short-term memory for the current session. Finite. Every file read, every command output, every line of conversation consumes some of it.",
  },
  {
    term: 'Frontmatter',
    definition: (
      <>
        The block at the top of a markdown file between two <code>---</code>{' '}
        lines, holding structured metadata (name, description, paths). Used in
        skills and subagents.
      </>
    ),
  },
  {
    term: 'Grep',
    definition:
      'A text-search command. Fast and useful, but finds the search term anywhere — in code, in comments, in strings — without knowing the difference.',
  },
  {
    term: 'Hook',
    definition:
      'A script Claude Code runs automatically at a specific lifecycle moment (session start, after a tool call, etc.).',
  },
  {
    term: 'LSP',
    definition:
      'Language Server Protocol. A system that gives an editor (or an agent) symbol-level understanding of code — go-to-definition, find-references, type information.',
  },
  {
    term: 'MCP',
    definition:
      'Model Context Protocol. A standard for plugging external tools into AI agents. An MCP server exposes custom tools the agent can call.',
  },
  {
    term: 'Monorepo',
    definition:
      'A single git repo holding many related projects (multiple services, multiple packages, sometimes multiple platforms).',
  },
  {
    term: 'Path glob',
    definition: (
      <>
        A pattern that matches file paths. <code>ios/**</code> matches
        everything under <code>ios/</code> at any depth. Used in skills'{' '}
        <code>paths:</code> field.
      </>
    ),
  },
  {
    term: 'Plugin',
    definition:
      'An installable bundle of skills, hooks, and MCP servers. Lets a team distribute its AI Layer in one command.',
  },
  {
    term: 'Progressive disclosure',
    definition:
      "The design principle that a skill's main file is short, with deeper details in linked reference files that load only when needed.",
  },
  {
    term: 'RAG',
    definition:
      "Retrieval-Augmented Generation. An older approach where the codebase is indexed and chunks are retrieved at query time. Doesn't scale well in actively-developed codebases.",
  },
  {
    term: 'Repository (repo)',
    definition:
      'A folder under version control (almost always git). The unit Claude Code operates on.',
  },
  {
    term: 'Session',
    definition: (
      <>
        One continuous conversation with the agent, from <code>claude</code>{' '}
        until you close the terminal or run <code>/clear</code>.
      </>
    ),
  },
  {
    term: 'Skill',
    definition: (
      <>
        A folder with a <code>SKILL.md</code> file declaring reusable expertise.
        Loads only when relevant — scoped via the <code>paths:</code> field.
      </>
    ),
  },
  {
    term: 'Standard input / output / error',
    definition:
      'The three default streams a program can read from or write to. Hooks receive a payload on standard input and inject context by writing to standard output.',
  },
  {
    term: 'Subagent',
    definition:
      'A separate Claude Code instance launched by the main agent. Has its own context window. Used to split exploration from editing.',
  },
  {
    term: 'Symbol',
    definition: (
      <>
        A named code element — a function, class, variable, constant. LSP-based
        search finds symbols precisely; grep finds <em>text</em> that may or may
        not be a symbol.
      </>
    ),
  },
  {
    term: 'YAML frontmatter',
    definition: (
      <>
        See <em>Frontmatter</em>. YAML is the syntax used inside the{' '}
        <code>---</code> block.
      </>
    ),
  },
];
