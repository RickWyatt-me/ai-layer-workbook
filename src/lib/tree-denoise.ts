import type { RepoTreeEntry } from './github';

export const BLOCKLIST_PATH_SEGMENTS = new Set<string>([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  'target',
  'Pods',
  'vendor',
  '__pycache__',
  '.next',
  '.venv',
  '.nuxt',
  '.cache',
  '.turbo',
  'coverage',
]);

export const BLOCKLIST_FILES = new Set<string>([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'Cargo.lock',
  'Gemfile.lock',
  'composer.lock',
  'poetry.lock',
  'Podfile.lock',
]);

export const BLOCKLIST_EXTENSIONS = new Set<string>(['.lock']);

export function denoiseTree(entries: RepoTreeEntry[]): RepoTreeEntry[] {
  return entries.filter((e) => {
    const parts = e.path.split('/');
    if (parts.some((seg) => BLOCKLIST_PATH_SEGMENTS.has(seg))) return false;
    const base = parts[parts.length - 1];
    if (BLOCKLIST_FILES.has(base)) return false;
    const dot = base.lastIndexOf('.');
    if (dot > 0 && BLOCKLIST_EXTENSIONS.has(base.slice(dot))) return false;
    return true;
  });
}

export function truncateReadme(
  readme: string | null,
  maxBytes: number,
): string {
  if (!readme) return '(no README)';
  const enc = new TextEncoder();
  const bytes = enc.encode(readme);
  if (bytes.length <= maxBytes) return readme;
  // Walk back from maxBytes while the byte at cut is a UTF-8 continuation
  // byte (top bits 10xxxxxx). Without this, a multi-byte char split across
  // the cut boundary would decode to U+FFFD.
  let cut = maxBytes;
  while (cut > 0 && (bytes[cut] & 0xc0) === 0x80) cut--;
  const head = new TextDecoder('utf-8').decode(bytes.slice(0, cut));
  const totalKb = Math.round(bytes.length / 1024);
  return `${head}\n\n[…README truncated, ${totalKb} KB total…]`;
}
