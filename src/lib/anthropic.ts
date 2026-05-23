import type { GenerateModel } from './models';

export type Severity = 'high' | 'medium' | 'low';

export interface Finding {
  id: string;
  severity: Severity;
  area: string;
  body: string;
  suggested_next_step: string;
}

export type AnthropicErrorKind =
  | 'unauthorized'
  | 'rate-limit'
  | 'context-too-large'
  | 'invalid-request'
  | 'server'
  | 'network'
  | 'invalid-response'
  | 'unexpected';

export interface AnthropicError {
  kind: AnthropicErrorKind;
  message: string;
  next: string;
}

export interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface SSEEvent {
  type: string;
  data: unknown;
}

export interface AuditRequestBody {
  model: GenerateModel;
  max_tokens: number;
  stream: true;
  system: string;
  messages: Array<{ role: 'user'; content: string }>;
}

export interface StreamAuditParams {
  apiKey: string;
  body: AuditRequestBody;
}

export interface StreamAuditCallbacks {
  onTextDelta: (text: string) => void;
  onUsage: (usage: AnthropicUsage) => void;
  onComplete: (fullText: string) => void;
  onError: (err: AnthropicError) => void;
}

const ANTHROPIC_HEADERS_BASE: Record<string, string> = {
  'Content-Type': 'application/json',
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
};

export function isFinding(v: unknown): v is Finding {
  if (!v || typeof v !== 'object') return false;
  const f = v as Partial<Finding>;
  return (
    typeof f.id === 'string' &&
    (f.severity === 'high' ||
      f.severity === 'medium' ||
      f.severity === 'low') &&
    typeof f.area === 'string' &&
    typeof f.body === 'string' &&
    typeof f.suggested_next_step === 'string'
  );
}

export function isFindingsArray(v: unknown): v is Finding[] {
  return Array.isArray(v) && v.every(isFinding);
}

export function isAnthropicError(v: unknown): v is AnthropicError {
  if (!v || typeof v !== 'object') return false;
  const e = v as Partial<AnthropicError>;
  return (
    typeof e.kind === 'string' &&
    typeof e.message === 'string' &&
    typeof e.next === 'string'
  );
}

export function tryParsePartialFindings(text: string): Finding[] {
  if (!text) return [];

  // Strip a leading ```json fence if the model added one despite instructions.
  // No trailing-fence strip here — during streaming the buffer doesn't end in
  // a fence; the final-parse path in the component handles closing fences.
  const cleaned = text.replace(/^\s*```(?:json)?\s*/i, '');

  const arrayStart = cleaned.indexOf('[');
  if (arrayStart < 0) return [];

  const slice = cleaned.slice(arrayStart + 1);
  const objects: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < slice.length; i++) {
    const ch = slice[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        objects.push(slice.slice(start, i + 1));
        start = -1;
      }
    } else if (ch === ']' && depth === 0) {
      break;
    }
  }

  const out: Finding[] = [];
  for (const raw of objects) {
    try {
      const parsed = JSON.parse(raw);
      if (isFinding(parsed)) out.push(parsed);
    } catch {
      // Skip individual broken objects; they'll fix themselves on the next tick.
    }
  }
  return out;
}

export async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: SSEEvent) => void,
): Promise<void> {
  const decoder = new TextDecoder('utf-8');
  let buf = '';
  let currentEventType = 'message';
  let currentDataLines: string[] = [];

  const flush = () => {
    if (currentDataLines.length === 0) {
      currentEventType = 'message';
      return;
    }
    const raw = currentDataLines.join('\n');
    let data: unknown = null;
    try {
      data = JSON.parse(raw);
    } catch {
      // Skip malformed events rather than failing the whole stream.
    }
    onEvent({ type: currentEventType, data });
    currentEventType = 'message';
    currentDataLines = [];
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).replace(/\r$/, '');
      buf = buf.slice(nl + 1);
      if (line === '') {
        flush();
      } else if (line.startsWith('event:')) {
        currentEventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        currentDataLines.push(line.slice(5).trim());
      }
      // Ignore other line types (id:, retry:, comments starting with `:`).
    }
  }
  if (currentDataLines.length > 0) flush();
}

export async function mapAnthropicError(
  res: Response,
  _key: string,
): Promise<AnthropicError> {
  // _key is named with a leading underscore as a forbidden-fruit marker: it is
  // present in the signature for symmetry, never interpolated into a message.
  // Mirror of mapGithubError(res, _pat).
  if (res.status === 401) {
    return {
      kind: 'unauthorized',
      message: 'Anthropic rejected your API key.',
      next: 'Open Settings (gear icon) and check your Anthropic API key.',
    };
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    const wait = retryAfter ? ` Wait ${retryAfter}s and try again.` : '';
    return {
      kind: 'rate-limit',
      message: 'Anthropic rate limit hit.',
      next: `Wait a moment and try again.${wait}`,
    };
  }
  if (res.status === 413) {
    return {
      kind: 'context-too-large',
      message: 'Your repo is too large for one audit.',
      next: 'This is a known limit. We trim the tree and README; if it still fails, the repo may be unusually large.',
    };
  }
  if (res.status === 400) {
    return {
      kind: 'invalid-request',
      message: 'Anthropic rejected the request shape.',
      next: 'Try again. If it keeps failing, file an issue with the workbook.',
    };
  }
  if (res.status >= 500) {
    return {
      kind: 'server',
      message: `Anthropic returned ${res.status}.`,
      next: 'Try again in a moment.',
    };
  }
  return {
    kind: 'unexpected',
    message: `Anthropic returned ${res.status}.`,
    next: 'Try again. If it keeps failing, the API may be having problems.',
  };
}

interface MessageStartData {
  message?: { usage?: { input_tokens?: number } };
}

interface ContentBlockDeltaData {
  delta?: { type?: string; text?: string };
}

interface MessageDeltaData {
  usage?: { output_tokens?: number };
}

export async function streamAudit(
  params: StreamAuditParams,
  callbacks: StreamAuditCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const headers: Record<string, string> = {
    ...ANTHROPIC_HEADERS_BASE,
    'x-api-key': params.apiKey,
  };

  let res: Response;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(params.body),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    callbacks.onError({
      kind: 'network',
      message: 'Could not reach Anthropic.',
      next: 'Check your connection and try again.',
    });
    return;
  }

  if (!res.ok) {
    callbacks.onError(await mapAnthropicError(res, params.apiKey));
    return;
  }

  if (!res.body) {
    callbacks.onError({
      kind: 'invalid-response',
      message: 'Anthropic returned an empty stream.',
      next: 'Try again. If it keeps failing, the API may be having problems.',
    });
    return;
  }

  let fullText = '';
  let inputTokens = 0;
  let outputTokens = 0;
  // Once a stream-internal error fires, ignore all subsequent events so a
  // trailing message_stop can't race past the error and persist a "completed"
  // audit the caller already saw fail.
  let gotError = false;

  try {
    await parseSSEStream(res.body.getReader(), (event) => {
      if (gotError) return;
      switch (event.type) {
        case 'message_start': {
          const d = event.data as MessageStartData | null;
          const u = d?.message?.usage?.input_tokens;
          if (typeof u === 'number') inputTokens = u;
          break;
        }
        case 'content_block_delta': {
          const d = event.data as ContentBlockDeltaData | null;
          if (
            d?.delta?.type === 'text_delta' &&
            typeof d.delta.text === 'string'
          ) {
            fullText += d.delta.text;
            callbacks.onTextDelta(d.delta.text);
          }
          break;
        }
        case 'message_delta': {
          const d = event.data as MessageDeltaData | null;
          const u = d?.usage?.output_tokens;
          if (typeof u === 'number') outputTokens = u;
          break;
        }
        case 'message_stop': {
          callbacks.onUsage({
            input_tokens: inputTokens,
            output_tokens: outputTokens,
          });
          callbacks.onComplete(fullText);
          break;
        }
        case 'error': {
          gotError = true;
          callbacks.onError({
            kind: 'invalid-response',
            message: 'Anthropic returned a stream error.',
            next: 'Try again. If it keeps failing, the API may be having problems.',
          });
          break;
        }
      }
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    if (gotError) return;
    callbacks.onError({
      kind: 'invalid-response',
      message: 'The stream from Anthropic was malformed.',
      next: 'Try again. If it keeps failing, the API may be having problems.',
    });
  }
}
