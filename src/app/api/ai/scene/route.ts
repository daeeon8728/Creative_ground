import { NextRequest, NextResponse } from 'next/server';
import { callNemotron, parseAiJson } from '@/lib/ai';
import { isAiModelId } from '@/lib/ai-models';
import type { AiSceneResponse } from '@/lib/scene-types';

const SYSTEM_PROMPT = `You are an expert 3D scene design architect. When given a description, respond ONLY with a valid JSON object.
The JSON must have an "objects" array and an optional "description" string.
Each object in the array must have:
- type: one of "box", "sphere", "cylinder", "cone", "torus", "plane", "capsule"
- name: descriptive string (e.g. "Left Upper Arm")
- position: [x, y, z] numbers (y is up, keep objects above y=0 unless it's a floor/plane)
- rotation: [x, y, z] in radians
- scale: [x, y, z] positive numbers
- color: hex color string like "#4d7fff"

Rules:
- There is NO LIMIT on the number of objects. Use as many as needed to build the scene richly and in detail.
- When building living creatures, characters, or robots, think carefully about anatomy. Include all necessary parts.
- Pay extreme attention to CONNECTIVITY. Parts should not float in mid-air. Calculate relative positions logically.
- A "floor" should be a plane with scale [20, 20, 1] at position [0, 0, 0].
- Keep scenes relatively compact (positions roughly within -20 to 20 range), scaling parts proportionally.
- For complex characters or buildings, use 30-80+ objects to achieve realism.
- Use varied, realistic colors. Don't make everything the same color.

Example response:
{
  "description": "A detailed robot character",
  "objects": [
    { "type": "sphere", "name": "Head", "position": [0, 3, 0], "rotation": [0,0,0], "scale": [0.6, 0.6, 0.6], "color": "#c0c0c0" },
    { "type": "box", "name": "Torso", "position": [0, 1.5, 0], "rotation": [0,0,0], "scale": [0.8, 1.2, 0.5], "color": "#888888" }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const { prompt, existingObjects, modelId } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ error: 'prompt required' }, { status: 400 });

    const chosenModelId = isAiModelId(modelId) ? modelId : undefined;

    const userMessage = existingObjects?.length
      ? `Current scene has ${existingObjects.length} objects: ${JSON.stringify(existingObjects.slice(0, 10))}\n\nUser request: ${prompt}`
      : prompt;

    let raw: string;
    try {
      raw = await callNemotron(userMessage, {
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.7,
        maxTokens: 8192,
        jsonMode: true,
        modelId: chosenModelId,
      });
    } catch (primaryErr) {
      const msg = (primaryErr as Error).message ?? '';
      // If Gemini quota exceeded, fallback to Nemotron
      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota exceeded')) {
        console.warn('[AI Scene] Gemini quota exceeded, falling back to Nemotron');
        raw = await callNemotron(userMessage, {
          systemPrompt: SYSTEM_PROMPT,
          temperature: 0.7,
          maxTokens: 8192,
          jsonMode: true,
          modelId: 'nemotron-super',
        });
      } else {
        throw primaryErr;
      }
    }

    const parsed = parseAiJson<AiSceneResponse>(raw);
    return NextResponse.json(parsed);
  } catch (e) {
    console.error('[AI Scene]', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
