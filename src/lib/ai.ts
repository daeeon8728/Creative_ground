import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { AI_MODELS, DEFAULT_AI_MODEL, isAiModelId, type AiModelId } from './ai-models';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export const aiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '60 s'),
  analytics: true,
});

export interface NemotronOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  modelId?: AiModelId;
  reasoning?: boolean;
}

export function parseAiJson<T>(content: string): T {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let jsonText = fenced?.[1] ?? trimmed;

  jsonText = jsonText.replace(/\}\s*\{/g, '},{');
  jsonText = jsonText.replace(/"\s*"/g, '","');

  const start = jsonText.indexOf('{');
  const end = jsonText.lastIndexOf('}');

  try {
    if (start >= 0 && end > start) {
      return JSON.parse(jsonText.slice(start, end + 1)) as T;
    }
    return JSON.parse(jsonText) as T;
  } catch (e) {
    console.error('JSON parsing error. Raw string:', jsonText, e);
    throw new Error('AI failed to generate valid JSON. Try again with a more specific prompt.');
  }
}

async function callNvidia(prompt: string, options: NemotronOptions, modelName: string): Promise<string> {
  const baseUrl = 'https://integrate.api.nvidia.com/v1';
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) throw new Error('NVIDIA_API_KEY is not set');

  const messages = [];
  if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
  messages.push({ role: 'user', content: prompt || 'proceed' });

  const body: Record<string, unknown> = {
    model: modelName,
    messages,
    temperature: options.temperature ?? 0.7,
    top_p: 0.95,
    max_tokens: options.maxTokens ?? 4096,
  };

  if (options.jsonMode) body.response_format = { type: 'json_object' };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`NVIDIA API ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export async function callNemotron(prompt: string, options: NemotronOptions = {}): Promise<string> {
  const modelId = isAiModelId(options.modelId) ? options.modelId : DEFAULT_AI_MODEL;
  const model = AI_MODELS[modelId];

  return callNvidia(prompt, options, model.model);
}
