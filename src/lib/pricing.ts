// Hand-maintained from anthropic.com/pricing as of 2026-05. Re-verify and
// update on every model addition or pricing change. The `~` prefix on the
// displayed cost signals "estimate" to the user.
import type { FastModel, GenerateModel } from './models';

export interface ModelRate {
  inputPerMTok: number;
  outputPerMTok: number;
}

export const MODEL_RATES: Record<GenerateModel | FastModel, ModelRate> = {
  'claude-opus-4-7': { inputPerMTok: 15, outputPerMTok: 75 },
  'claude-sonnet-4-6': { inputPerMTok: 3, outputPerMTok: 15 },
  'claude-haiku-4-5-20251001': { inputPerMTok: 1, outputPerMTok: 5 },
};

export function estimateCostUsd(
  model: GenerateModel | FastModel,
  usage: { input_tokens: number; output_tokens: number },
): number {
  // `MODEL_RATES` is typed `Record<GenerateModel | FastModel, ModelRate>` —
  // adding a new model literal to `models.ts` will fail compilation here
  // until a rate is added, so there is no runtime "unknown model" path.
  const rate = MODEL_RATES[model];
  const cost =
    (usage.input_tokens / 1_000_000) * rate.inputPerMTok +
    (usage.output_tokens / 1_000_000) * rate.outputPerMTok;
  return Math.round(cost * 10_000) / 10_000;
}

export function formatUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '~$0.00';
  // 4 decimal places, then strip trailing zeros past the third decimal so
  // cents-level audits ($0.02-0.20) read cleanly while sub-cent ($0.0001)
  // estimates still surface a non-zero value.
  const fixed = n.toFixed(4);
  const trimmed = fixed.replace(/(\.\d{2}\d*?)0+$/, '$1');
  return `~$${trimmed}`;
}
