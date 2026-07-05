export type AiModelId = 'nemotron-super' | 'llama-3-3-70b' | 'gemini-2-flash';

export const AI_MODELS: Record<AiModelId, { label: string; model: string; apiKeyEnv: string; provider: 'nvidia' | 'google' }> = {
  'nemotron-super': {
    label: 'Nemotron 120B',
    model: 'nvidia/nemotron-3-super-120b-a12b',
    apiKeyEnv: 'NVIDIA_API_KEY',
    provider: 'nvidia',
  },
  'llama-3-3-70b': {
    label: 'Llama 3.3 70B',
    model: 'meta/llama-3.3-70b-instruct',
    apiKeyEnv: 'NVIDIA_LLAMA_API_KEY',
    provider: 'nvidia',
  },
  'gemini-2-flash': {
    label: 'Gemini 2.0 Flash',
    model: 'gemini-2.0-flash',
    apiKeyEnv: 'GEMINI_API_KEY',
    provider: 'google',
  },
};

export const DEFAULT_AI_MODEL: AiModelId = 'nemotron-super';

export function isAiModelId(value: unknown): value is AiModelId {
  return typeof value === 'string' && value in AI_MODELS;
}
