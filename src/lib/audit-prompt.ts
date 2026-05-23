import type { Agent } from '../hooks/useAgent';
import type { Repo } from './github';
import { denoiseTree, truncateReadme } from './tree-denoise';

export const README_MAX_BYTES = 8_192;
export const AUDIT_MAX_BODY_BYTES = 20_000;

function displayAgent(agent: Agent): string {
  return agent === 'Other' ? 'your agent' : agent;
}

export function buildAuditSystemPrompt(agent: Agent): string {
  const a = displayAgent(agent);
  return `You are an audit assistant inside a workbook that teaches builders how to set up ${a} in their codebase. The user has fetched their GitHub repo's metadata and you are receiving a denoised summary. Your job is to recommend where CLAUDE.md files should live in this repo, what's distinctive about each candidate area, and what its editor needs to know.

Respond with JSON only — no markdown fence, no preamble, no commentary. The exact shape is:

{
  "findings": [
    {
      "id": "kebab-case-stable-handle",
      "severity": "high" | "medium" | "low",
      "area": "path/in/repo or short descriptive name",
      "body": "2-4 short paragraphs in plain English explaining what makes this area distinct and what's likely to bite an editor who hasn't seen it before.",
      "suggested_next_step": "One concrete sentence the user can act on (e.g. 'Draft a CLAUDE.md here covering the test command and the import boundary with auth/')."
    }
  ]
}

Rules:
- Aim for 3-7 findings. Quality over quantity. If the repo only warrants 3, return 3.
- 'severity' maps to the v1 prompt's priority: high = essential (the editor will get something wrong without this CLAUDE.md), medium = valuable, low = nice-to-have.
- 'id' is a stable, URL-safe kebab-case slug derived from the area (e.g. 'ios-core', 'shared-network', 'root-claudemd'). Reuse the same id if the user re-runs against the same repo.
- 'area' may be a literal path (e.g. 'ios/Core') or a descriptive label (e.g. 'Shared networking layer') if no single path captures it.
- 'body' is plain English, no markdown headings, no bullet lists — short paragraphs only. Speak directly to the reader as 'you'.
- 'suggested_next_step' is one sentence, imperative voice.
- Do NOT include any prose outside the JSON. Do NOT wrap the JSON in a fence. Do NOT include trailing commas.

Example finding (for shape reference; do not echo verbatim):

{
  "id": "ios-core",
  "severity": "high",
  "area": "ios/Core",
  "body": "This is the iOS app's core business logic and persistence layer. It uses Swift Concurrency throughout and has its own protocol-oriented dependency injection that doesn't match anything in android/. Anyone editing here needs to know that the SwiftData migrations are gated behind a feature flag and that the unit tests run via 'xcodebuild test -scheme CoreTests'.",
  "suggested_next_step": "Draft a CLAUDE.md at ios/Core/CLAUDE.md that covers the Swift Concurrency conventions, the protocol-DI pattern, and the scoped test command."
}`;
}

export function buildAuditUserMessage(repo: Repo): string {
  const denoisedTree = denoiseTree(repo.tree)
    .map((e) => `${e.type === 'tree' ? 'd' : 'f'} ${e.path}`)
    .join('\n');

  const languages = Object.entries(repo.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, bytes]) => `  ${name}: ${bytes}`)
    .join('\n');

  const readmeBlock = truncateReadme(repo.readme, README_MAX_BYTES);

  const compose = (tree: string) => `# Repo
${repo.owner}/${repo.repo}
Default branch: ${repo.defaultBranch}
Primary language: ${repo.primaryLanguage ?? '(unknown)'}
Description: ${repo.description ?? '(none)'}

# Languages (bytes)
${languages || '  (none reported)'}

# Tree (depth <= 3, denoised)
${tree || '(empty after denoise)'}

# README
${readmeBlock}
`;

  const body = compose(denoisedTree);
  if (new TextEncoder().encode(body).length <= AUDIT_MAX_BODY_BYTES)
    return body;
  // If over cap, snip the tree first (less narrative value than the README),
  // then hard-slice the result. Compose directly with `shorterTree` rather
  // than string-replacing into `body` — `$` in paths would otherwise be
  // interpreted as a replacement pattern by String.prototype.replace.
  const shorterTree =
    denoisedTree.split('\n').slice(0, 200).join('\n') + '\n…(tree truncated)';
  return compose(shorterTree).slice(0, AUDIT_MAX_BODY_BYTES);
}
