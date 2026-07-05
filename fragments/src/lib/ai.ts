import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { AI_MODELS, DEFAULT_AI_MODEL, isAiModelId, type AiModelId } from './ai-models';

// Initialize Redis for rate limiting
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Create a new ratelimiter that allows 10 requests per 10 seconds per IP
export const aiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
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
  const jsonText = fenced?.[1] ?? trimmed;
  const start = jsonText.indexOf('{');
  const end = jsonText.lastIndexOf('}');

  if (start >= 0 && end > start) {
    return JSON.parse(jsonText.slice(start, end + 1)) as T;
  }

  return JSON.parse(jsonText) as T;
}

// ── Internal: Call NVIDIA or local NIM ───────────────────────────
async function callNvidiaModel(prompt: string, options: NemotronOptions = {}): Promise<string> {
  const modelId = isAiModelId(options.modelId) ? options.modelId : DEFAULT_AI_MODEL;
  const model = AI_MODELS[modelId];

  const baseUrl = process.env.NIM_BASE_URL
    ? `${process.env.NIM_BASE_URL}/v1`
    : 'https://integrate.api.nvidia.com/v1';

  const apiKey = process.env.NIM_BASE_URL
    ? (process.env.NIM_API_KEY ?? 'unused')
    : (process.env[model.apiKeyEnv] || process.env.NVIDIA_API_KEY);

  if (!apiKey) throw new Error('NVIDIA_API_KEY is not set');

  const messages = [];
  if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
  messages.push({ role: 'user', content: prompt || 'proceed' });

  const body: Record<string, unknown> = {
    model: model.model,
    messages,
    temperature: options.temperature ?? 0.7,
    top_p: 0.95,
    max_tokens: options.maxTokens ?? 1024,
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

// ── Internal: Call Gemini via native REST API ────────────────────
async function callGeminiModel(prompt: string, options: NemotronOptions = {}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const modelName = 'gemini-2.0-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const userText = options.systemPrompt
    ? `${options.systemPrompt}\n\n${prompt || 'proceed'}`
    : (prompt || 'proceed');

  const requestBody: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 1024,
    },
  };

  if (options.jsonMode) {
    (requestBody.generationConfig as Record<string, unknown>).responseMimeType = 'application/json';
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

// ── Public: Auto-fallback from NVIDIA → Gemini ──────────────────
export async function callNemotron(prompt: string, options: NemotronOptions = {}): Promise<string> {
  // 1. Try NVIDIA / local NIM
  try {
    return await callNvidiaModel(prompt, options);
  } catch (e1) {
    console.warn('[AI] NVIDIA failed, trying Gemini fallback:', (e1 as Error).message);
  }

  // 2. Fallback to Gemini
  return callGeminiModel(prompt, options);
}

