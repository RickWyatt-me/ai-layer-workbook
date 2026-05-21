export const GENERATE_MODELS = [
  'claude-opus-4-7',
  'claude-sonnet-4-6',
] as const;

export const FAST_MODELS = ['claude-haiku-4-5-20251001'] as const;

export type GenerateModel = (typeof GENERATE_MODELS)[number];
export type FastModel = (typeof FAST_MODELS)[number];

export const DEFAULT_GENERATE_MODEL: GenerateModel = 'claude-opus-4-7';
export const DEFAULT_FAST_MODEL: FastModel = 'claude-haiku-4-5-20251001';

export function isGenerateModel(v: unknown): v is GenerateModel {
  return (
    typeof v === 'string' && (GENERATE_MODELS as readonly string[]).includes(v)
  );
}

export function isFastModel(v: unknown): v is FastModel {
  return (
    typeof v === 'string' && (FAST_MODELS as readonly string[]).includes(v)
  );
}
