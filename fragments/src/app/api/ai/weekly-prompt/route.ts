import { NextResponse } from 'next/server';
import { aiRateLimit, callNemotron, parseAiJson } from '@/lib/ai';
import { getWeeklyPrompt } from '@/lib/actions';
import type { CanvasItem } from '@/lib/types';
import { DEFAULT_AI_MODEL, isAiModelId } from '@/lib/ai-models';

interface WeeklyPromptResponse {
  prompt?: string;
}

function summarizeItems(items: CanvasItem[]) {
  return items
    .map((item) => item.text || item.label || item.type)
    .filter(Boolean)
    .slice(0, 40)
    .join(', ');
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
    const { success } = await aiRateLimit.limit(ip);

    if (!success) {
      return NextResponse.json({ prompt: await getWeeklyPrompt(), fallback: true }, { status: 429 });
    }

    const { items, kind, modelId } = await req.json();
    const selectedModel = isAiModelId(modelId) ? modelId : DEFAULT_AI_MODEL;
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing items' }, { status: 400 });
    }

    const systemPrompt = `You write a weekly creative prompt for a free-form collage board.
Board kind: "${kind}".
Visible board contents: ${summarizeItems(items) || 'empty board'}.

Write one short, specific prompt in Korean that nudges the user to explore the board in a new direction.
Keep it under 80 Korean characters.
Return ONLY valid JSON:
{ "prompt": "..." }`;

    const aiResponse = await callNemotron('Create a personalized weekly prompt.', {
      systemPrompt,
      temperature: 0.7,
      maxTokens: 220,
      jsonMode: true,
      modelId: selectedModel,
    });

    const parsed = parseAiJson<WeeklyPromptResponse>(aiResponse);
    return NextResponse.json({ prompt: parsed.prompt || await getWeeklyPrompt() });
  } catch (err) {
    console.error('Weekly prompt API Error:', err);
    return NextResponse.json({ prompt: await getWeeklyPrompt(), fallback: true });
  }
}
