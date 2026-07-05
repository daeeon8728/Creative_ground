import { NextResponse } from 'next/server';
import { aiRateLimit, callNemotron, parseAiJson } from '@/lib/ai';
import type { CanvasItem } from '@/lib/types';
import { DEFAULT_AI_MODEL, isAiModelId } from '@/lib/ai-models';

interface BudgetCoachResponse {
  comment?: string;
}

function summarizeBudget(items: CanvasItem[]) {
  return items
    .filter((item) => typeof item.price === 'number' && item.price > 0)
    .map((item) => ({
      label: item.label || item.text || item.type,
      price: item.price,
      checked: item.checked,
    }))
    .slice(0, 30);
}

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

    const budgetItems = summarizeBudget(items);
    if (budgetItems.length === 0) {
      return NextResponse.json({ comment: 'Add prices to a few items and I can coach the budget.' });
    }

    const systemPrompt = `You are a concise budget coach inside a collage and planning board app.
Board kind: "${kind}".
Price-bearing items: ${JSON.stringify(budgetItems)}.

Write one or two friendly sentences about the budget balance. Mention the biggest concentration or an under-covered area if visible.
Return ONLY valid JSON:
{ "comment": "..." }`;

    const aiResponse = await callNemotron('Coach this board budget.', {
      systemPrompt,
      temperature: 0.4,
      maxTokens: 220,
      jsonMode: true,
      modelId: selectedModel,
    });

    const parsed = parseAiJson<BudgetCoachResponse>(aiResponse);
    return NextResponse.json({ comment: parsed.comment || 'The budget looks balanced enough to keep planning.' });
  } catch (err) {
    console.error('Budget coach API Error:', err);
    return NextResponse.json({ error: 'Failed to coach budget' }, { status: 500 });
  }
}
