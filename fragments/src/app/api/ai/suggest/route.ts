import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { aiRateLimit, callNemotron, parseAiJson } from '@/lib/ai';
import type { CanvasItem } from '@/lib/types';
import { DEFAULT_AI_MODEL, isAiModelId } from '@/lib/ai-models';

interface SuggestResponse {
  items?: Array<{
    text?: string;
    color?: string;
  }>;
}

const KIND_GUIDANCE: Record<string, string> = {
  home: 'Suggest missing interior pieces, lighting, material samples, budget checks, or practical room details.',
  outfit: 'Suggest missing outfit pieces, accessories, shoes, weather notes, or search keywords.',
  trip: 'Suggest missing route blocks, booking checklist items, food/place ideas, budget buckets, or timing notes.',
  event: 'Suggest missing decoration, guest, food, venue, timeline, or budget items.',
  gift: 'Suggest missing recipient preference notes, candidate gifts, comparison criteria, wrapping, or delivery items.',
  freeform: 'Suggest missing visual keywords, colors, textures, contrast ideas, or a surprising next direction.',
};

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
    const { success } = await aiRateLimit.limit(ip);

    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { items, kind, modelId } = await req.json();
    const selectedModel = isAiModelId(modelId) ? modelId : DEFAULT_AI_MODEL;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing items' }, { status: 400 });
    }

    const itemDescriptions = (items as CanvasItem[])
      .map((item) => item.text || item.label || item.type)
      .filter(Boolean)
      .slice(0, 40)
      .join(', ');

    const systemPrompt = `You are an AI assistant for a digital collage and planning board app.
The user is building a board of kind: "${kind}".
Current items on the board: [${itemDescriptions}].
Board-specific guidance: ${KIND_GUIDANCE[kind] ?? KIND_GUIDANCE.freeform}

Suggest 2 or 3 missing items that would complement their plan. Keep each suggestion short, concrete, and non-generic.
Use Korean for user-facing text unless the board contents are mostly another language.
Return ONLY valid JSON in this exact format:
{
  "items": [
    {
      "text": "The suggested item description",
      "color": "var(--riso-coral)"
    }
  ]
}`;

    const aiResponse = await callNemotron('Suggest missing board items.', {
      systemPrompt,
      maxTokens: 500,
      jsonMode: true,
      modelId: selectedModel,
      reasoning: selectedModel === 'nemotron-super',
    });

    const parsed = parseAiJson<SuggestResponse>(aiResponse);
    const suggestedItems: CanvasItem[] = (parsed.items ?? []).slice(0, 3).map((item, index) => ({
      id: nanoid(),
      type: 'text',
      x: 120 + index * 230,
      y: 120,
      width: 200,
      height: 80,
      rotation: index % 2 === 0 ? -2 : 2,
      zIndex: 999 + index,
      text: `AI: ${item.text ?? 'Add one missing item'}`,
      textColor: item.color || 'var(--riso-blue)',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      aiSuggested: true,
    }));

    return NextResponse.json({ items: suggestedItems });
  } catch (err) {
    console.error('Suggest API Error:', err);
    return NextResponse.json({ error: 'Failed to suggest items' }, { status: 500 });
  }
}
