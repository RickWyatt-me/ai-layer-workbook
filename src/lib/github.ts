import type { Persona, RepoLayout } from '../hooks/usePersona';

export interface ParsedRepoUrl {
  owner: string;
  repo: string;
}

export interface RepoTreeEntry {
  path: string;
  type: 'blob' | 'tree';
}

export interface Repo {
  url: string;
  owner: string;
  repo: string;
  defaultBranch: string;
  description: string | null;
  primaryLanguage: string | null;
  languages: Record<string, number>;
  tree: RepoTreeEntry[];
  treeTruncated: boolean;
  readme: string | null;
  fetchedAt: number;
}

export type GithubErrorKind =
  | 'invalid-url'
  | 'unauthorized'
  | 'rate-limit'
  | 'not-found'
  | 'network'
  | 'unexpected';

export interface GithubError {
  kind: GithubErrorKind;
  message: string;
  next: string;
}

export function isGithubError(v: unknown): v is GithubError {
  if (!v || typeof v !== 'object') return false;
  const e = v as Partial<GithubError>;
  return (
    typeof e.kind === 'string' &&
    typeof e.message === 'string' &&
    typeof e.next === 'string'
  );
}

const SLUG = /^[A-Za-z0-9._-]+$/;

export function parseRepoUrl(input: string): ParsedRepoUrl | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const cleaned = trimmed.replace(/\/+$/, '').replace(/\.git$/, '');

  const ssh = cleaned.match(/^git@github\.com:([^/]+)\/([^/]+)$/);
  if (ssh) {
    const [, owner, repo] = ssh;
    return SLUG.test(owner) && SLUG.test(repo) ? { owner, repo } : null;
  }

  if (/^https?:\/\//i.test(cleaned)) {
    try {
      const url = new URL(cleaned);
      if (url.hostname !== 'github.com') return null;
      const parts = url.pathname.replace(/^\//, '').split('/');
      if (parts.length < 2) return null;
      const [owner, repo] = parts;
      return SLUG.test(owner) && SLUG.test(repo) ? { owner, repo } : null;
    } catch {
      return null;
    }
  }

  const bare = cleaned.match(/^([^/]+)\/([^/]+)$/);
  if (bare) {
    const [, owner, repo] = bare;
    return SLUG.test(owner) && SLUG.test(repo) ? { owner, repo } : null;
  }

  return null;
}

const GH_HEADERS_BASE: Record<string, string> = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

export async function fetchRepo(
  parsed: ParsedRepoUrl,
  pat: string,
  signal?: AbortSignal,
): Promise<Repo> {
  const headers: Record<string, string> = { ...GH_HEADERS_BASE };
  if (pat) headers.Authorization = `Bearer ${pat}`;

  const base = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;

  const metaRes = await fetch(base, { headers, signal });
  if (!metaRes.ok) throw mapGithubError(metaRes, pat);
  const meta = (await metaRes.json()) as {
    default_branch: string;
    description: string | null;
    language: string | null;
  };

  const [langRes, treeRes, readmeRes] = await Promise.all([
    fetch(`${base}/languages`, { headers, signal }),
    fetch(`${base}/git/trees/${meta.default_branch}?recursive=1`, {
      headers,
      signal,
    }),
    fetch(`${base}/readme`, { headers, signal }),
  ]);

  if (!langRes.ok) throw mapGithubError(langRes, pat);
  if (!treeRes.ok) throw mapGithubError(treeRes, pat);
  if (!readmeRes.ok && readmeRes.status !== 404) {
    throw mapGithubError(readmeRes, pat);
  }

  const languages = (await langRes.json()) as Record<string, number>;
  const treeJson = (await treeRes.json()) as {
    truncated?: boolean;
    tree: Array<{ path: string; type: 'blob' | 'tree' }>;
  };
  const readme =
    readmeRes.status === 404
      ? null
      : decodeBase64Readme((await readmeRes.json()) as { content: string });

  return {
    url: `https://github.com/${parsed.owner}/${parsed.repo}`,
    owner: parsed.owner,
    repo: parsed.repo,
    defaultBranch: meta.default_branch,
    description: meta.description ?? null,
    primaryLanguage: meta.language ?? null,
    languages,
    tree: filterToDepth(treeJson.tree, 3),
    treeTruncated: treeJson.truncated === true,
    readme,
    fetchedAt: Date.now(),
  };
}

export function mapGithubError(res: Response, _pat: string): GithubError {
  // _pat is named with a leading underscore as a forbidden-fruit marker: it is
  // present in the signature for symmetry, never interpolated into a message.
  const remaining = res.headers.get('X-RateLimit-Remaining');
  const isRateLimited =
    res.status === 403 && remaining !== null && Number(remaining) === 0;

  if (res.status === 401) {
    return {
      kind: 'unauthorized',
      message: 'GitHub rejected your token.',
      next: 'Open Settings (gear icon) and check your GitHub token.',
    };
  }
  if (isRateLimited) {
    return {
      kind: 'rate-limit',
      message: 'GitHub rate limit hit.',
      next: 'Add a GitHub token in Settings to raise the limit (5000/hr), or wait an hour.',
    };
  }
  if (res.status === 403) {
    return {
      kind: 'unauthorized',
      message: 'GitHub blocked the request.',
      next: 'If the repo is private, add a fine-grained PAT with read access in Settings.',
    };
  }
  if (res.status === 404) {
    return {
      kind: 'not-found',
      message: 'Repo not found.',
      next: 'Check the URL — or if the repo is private, add a PAT in Settings.',
    };
  }
  return {
    kind: 'unexpected',
    message: `GitHub returned ${res.status}.`,
    next: 'Try again. If it keeps failing, the GitHub API may be having problems.',
  };
}

const LANGUAGE_MAP: Record<string, string> = {
  Swift: 'swift',
  Kotlin: 'kotlin',
  TypeScript: 'typescript',
  JavaScript: 'typescript',
  Python: 'python',
  Go: 'go',
  Rust: 'rust',
  Java: 'java',
  'C#': 'csharp',
};

export function derivePersonaFromRepo(repo: Repo): Persona {
  const sorted = Object.entries(repo.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const personaLanguages = Array.from(
    new Set(sorted.map(([name]) => LANGUAGE_MAP[name] ?? 'other')),
  );

  const topLevel = repo.tree
    .filter((e) => e.type === 'tree' && !e.path.includes('/'))
    .map((e) => e.path);

  let layout: RepoLayout = 'single';
  const hasIos = topLevel.includes('ios');
  const hasAndroid = topLevel.includes('android');
  const hasMonoMarker =
    topLevel.includes('packages') ||
    topLevel.includes('services') ||
    topLevel.includes('apps');
  if (hasIos && hasAndroid) layout = 'multi';
  else if (hasMonoMarker) layout = 'mono';

  return {
    repoName: repo.repo,
    languages: personaLanguages,
    layout,
    topLevelDirs: topLevel.join('\n'),
  };
}

function filterToDepth(
  entries: Array<{ path: string; type: 'blob' | 'tree' }>,
  maxDepth: number,
): RepoTreeEntry[] {
  return entries
    .filter((e) => e.path.split('/').length <= maxDepth)
    .map((e) => ({ path: e.path, type: e.type }));
}

function decodeBase64Readme(payload: { content: string }): string {
  // GitHub returns the README base64-encoded with embedded newlines. Use the
  // Uint8Array + TextDecoder path because plain atob() mangles multi-byte UTF-8.
  const b64 = payload.content.replace(/\n/g, '');
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}
