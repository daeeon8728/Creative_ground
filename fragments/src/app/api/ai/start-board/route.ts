import { NextResponse } from 'next/server';
import { aiRateLimit, callNemotron, parseAiJson } from '@/lib/ai';
import { nanoid } from 'nanoid';
import type { CanvasItem } from '@/lib/types';
import { DEFAULT_AI_MODEL, isAiModelId } from '@/lib/ai-models';

interface StartBoardItem {
  type?: 'text' | 'shape';
  text?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  price?: number;
}

interface StartBoardResponse {
  items?: StartBoardItem[];
}

const KIND_GUIDANCE: Record<string, string> = {
  home: 'Interior board. Include room mood, key furniture, lighting, material/color palette, budget items, and a practical checklist.',
  outfit: 'Outfit board. Include core pieces, color palette, shoes/bags/accessories, weather or occasion notes, and 2-3 search terms.',
  trip: 'Trip board. Include destination mood, day plan blocks, budget buckets, must-book checklist, food/place ideas, and route notes.',
  event: 'Event board. Include theme, guest/count notes, decoration, food/cake, venue or layout checklist, and budget reminders.',
  gift: 'Gift board. Include recipient taste, budget range, candidate gift ideas, comparison criteria, wrapping/delivery checklist.',
  freeform: 'Free-form mood board. Include visual keywords, colors, textures, contrast ideas, one intentionally surprising direction, and a loose next step.',
};

function num(value: unknown, fallback: number, min: number, max: number) {
  const next = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(min, Math.min(max, next));
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
    const { success } = await aiRateLimit.limit(ip);
    
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { prompt, kind, modelId } = await req.json();
    const selectedModel = isAiModelId(modelId) ? modelId : DEFAULT_AI_MODEL;

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const systemPrompt = `You are an AI assistant for a digital collage and planning board app. 
The user is creating a board of kind: "${kind}". 
Their description is: "${prompt}".
Board-specific guidance: ${KIND_GUIDANCE[kind] ?? KIND_GUIDANCE.freeform}

Generate a JSON object containing a layout of 3 to 6 placeholder items to jump-start their board.
Each item should represent a concept, a search term, a budget element, or a checklist entry.
Make the output concrete and directly usable. Avoid generic labels like "idea" or "mood".
If the user mentions a budget, include 1 or 2 price-bearing text items.
Use Korean for user-facing text unless the user prompt is mostly another language.

Use this JSON format exactly:
{
  "items": [
    {
      "type": "text" | "shape",
      "text": "The content to display",
      "x": number (between 50 and 600),
      "y": number (between 50 and 400),
      "width": number (typically 200 to 400),
      "height": number (typically 60 to 200),
      "color": "var(--riso-yellow)" | "var(--riso-blue)" | "var(--riso-coral)",
      "price": number (optional, if it represents a budget item)
    }
  ]
}

Return ONLY valid JSON. No markdown, no explanations.`;

    const aiResponse = await callNemotron(prompt, {
      systemPrompt,
      maxTokens: 1000,
      jsonMode: true,
      modelId: selectedModel,
      reasoning: selectedModel === 'nemotron-super',
    });

    const parsed = parseAiJson<StartBoardResponse>(aiResponse);

    // Handle shape + text layering
    const finalItems: CanvasItem[] = [];
    let zIdx = 1;
    for (const item of parsed.items || []) {
      const x = num(item.x, 100 + zIdx * 40, 50, 600);
      const y = num(item.y, 100 + zIdx * 30, 50, 400);
      const width = num(item.width, 240, 120, 420);
      const height = num(item.height, 90, 50, 220);

      if (item.type === 'shape') {
        // Add shape
        finalItems.push({
          id: nanoid(),
          type: 'shape',
          shapeType: 'rect',
          x,
          y,
          width,
          height,
          fillColor: item.color || 'var(--riso-yellow)',
          strokeColor: 'var(--ink)',
          strokeWidth: 2,
          rotation: Math.random() * 6 - 3,
          zIndex: zIdx++,
        });
        // Add text on top
        if (item.text) {
          finalItems.push({
            id: nanoid(),
            type: 'text',
            text: item.text,
            x: x + 20,
            y: y + 20,
            width: Math.max(80, width - 40),
            height: Math.max(40, height - 40),
            fontSize: 18,
            fontWeight: '400',
            textColor: 'var(--ink)',
            textAlign: 'left',
            rotation: 0,
            zIndex: zIdx++,
            price: item.price,
          });
        }
      } else {
        // Just text
        finalItems.push({
          id: nanoid(),
          type: 'text',
          text: item.text || 'New idea',
          x,
          y,
          width,
          height,
          fontSize: 24,
          fontWeight: '600',
          textColor: 'var(--ink)',
          textAlign: 'left',
          rotation: 0,
          zIndex: zIdx++,
          price: item.price,
        });
      }
    }

    return NextResponse.json({ items: finalItems });

  } catch (err) {
    console.error('Board Generation API Error:', err);
    return NextResponse.json({ error: 'Failed to generate board' }, { status: 500 });
  }
}
