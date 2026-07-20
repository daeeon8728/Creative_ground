export type AiModelId = 'nemotron-super';

export const AI_MODELS: Record<AiModelId, { label: string; model: string; apiKeyEnv: string; provider: 'nvidia' }> = {
  'nemotron-super': {
    label: 'Nemotron 120B',
    model: 'nvidia/nemotron-3-super-120b-a12b',
    apiKeyEnv: 'NVIDIA_API_KEY',
    provider: 'nvidia',
  },
};

export const DEFAULT_AI_MODEL: AiModelId = 'nemotron-super';

export function isAiModelId(value: unknown): value is AiModelId {
  return typeof value === 'string' && value in AI_MODELS;
}
