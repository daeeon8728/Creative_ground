export type AiModelId = 'nemotron-super' | 'gemini-flash' | 'gemini-pro';

export const AI_MODELS: Record<AiModelId, { label: string; model: string; apiKeyEnv: string; provider: 'nvidia' | 'google' }> = {
  'nemotron-super': {
    label: 'Nemotron 120B',
    model: 'nvidia/nemotron-3-super-120b-a12b',
    apiKeyEnv: 'NVIDIA_API_KEY',
    provider: 'nvidia',
  },
  'gemini-flash': {
    label: 'Gemini 2.0 Flash',
    model: 'gemini-2.0-flash',
    apiKeyEnv: 'GEMINI_API_KEY',
    provider: 'google',
  },
  'gemini-pro': {
    label: 'Gemini 1.5 Pro',
    model: 'gemini-1.5-pro',
    apiKeyEnv: 'GEMINI_API_KEY',
    provider: 'google',
  },
};

export const DEFAULT_AI_MODEL: AiModelId = 'gemini-flash';

export function isAiModelId(value: unknown): value is AiModelId {
  return typeof value === 'string' && value in AI_MODELS;
}
