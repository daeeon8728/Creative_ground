import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { AI_MODELS, DEFAULT_AI_MODEL, isAiModelId, type AiModelId } from './ai-models';

// Initialize Redis for rate limiting
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Allow 60 requests per minute per IP (generous for personal use)
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

  // Repair common JSON errors from LLMs (e.g. missing commas between array elements)
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
    throw new Error('AI가 올바르지 않은 데이터를 생성했습니다. 구체적인 형태로 다시 시도해주세요.');
  }
}

// ── Call Google Gemini API ────────────────────────────────────────────────────
async function callGemini(prompt: string, options: NemotronOptions, modelName: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const systemInstruction = options.systemPrompt
    ? { parts: [{ text: options.systemPrompt }] }
    : undefined;

  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: prompt || 'proceed' }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 4096,
      ...(options.jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  };
  if (systemInstruction) body.systemInstruction = systemInstruction;

  const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ── Call NVIDIA Cloud API (nemotron-3-super-120b-a12b) ───────────────────────
async function callNvidia(prompt: string, options: NemotronOptions, modelName: string): Promise<string> {
  const baseUrl = process.env.NIM_BASE_URL
    ? `${process.env.NIM_BASE_URL}/v1`
    : 'https://integrate.api.nvidia.com/v1';

  const apiKey = process.env.NIM_BASE_URL
    ? (process.env.NIM_API_KEY ?? 'unused')
    : process.env.NVIDIA_API_KEY;

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
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`NVIDIA API ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ── Main unified call function ────────────────────────────────────────────────
export async function callNemotron(prompt: string, options: NemotronOptions = {}): Promise<string> {
  const modelId = isAiModelId(options.modelId) ? options.modelId : DEFAULT_AI_MODEL;
  const model = AI_MODELS[modelId];

  if (model.provider === 'google') {
    return callGemini(prompt, options, model.model);
  }
  return callNvidia(prompt, options, model.model);
}
