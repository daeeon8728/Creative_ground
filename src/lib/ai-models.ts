export type AiModelId = 'nemotron-super' | 'gemini-flash' | 'gemini-flash-8b';

export const AI_MODELS: Record<AiModelId, { label: string; model: string; apiKeyEnv: string; provider: 'nvidia' | 'google' }> = {
  'nemotron-super': {
    label: 'Nemotron 120B',
    model: 'nvidia/nemotron-3-super-120b-a12b',
    apiKeyEnv: 'NVIDIA_API_KEY',
    provider: 'nvidia',
  },
  'gemini-flash': {
    label: 'Gemini 1.5 Flash',
    model: 'gemini-1.5-flash',
    apiKeyEnv: 'GEMINI_API_KEY',
    provider: 'google',
  },
  'gemini-flash-8b': {
    label: 'Gemini 1.5 Flash-8B',
    model: 'gemini-1.5-flash-8b',
    apiKeyEnv: 'GEMINI_API_KEY',
    provider: 'google',
  },
};

export const DEFAULT_AI_MODEL: AiModelId = 'gemini-flash';

export function isAiModelId(value: unknown): value is AiModelId {
  return typeof value === 'string' && value in AI_MODELS;
}
