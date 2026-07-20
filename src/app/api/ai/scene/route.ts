import { NextRequest, NextResponse } from 'next/server';
import { callNemotron, parseAiJson } from '@/lib/ai';
import type { AiSceneResponse } from '@/lib/scene-types';

const SYSTEM_PROMPT = `You are a 3D scene design assistant. When given a description, respond ONLY with a valid JSON object.
The JSON must have an "objects" array and an optional "description" string.
Each object in the array must have:
- type: one of "box", "sphere", "cylinder", "cone", "torus", "plane", "capsule"
- name: descriptive string
- position: [x, y, z] numbers (y is up, keep objects above y=0 unless it's a floor/plane)
- rotation: [x, y, z] in radians
- scale: [x, y, z] positive numbers
- color: hex color string like "#4d7fff"

Rules:
- Create 3–10 objects maximum
- Vary positions so objects don't overlap
- Use realistic proportions
- A "floor" should be a plane with scale [10, 10, 10] at position [0, 0, 0]
- A "wall" should be a box with large x/z scale and small thickness
- Keep scenes compact (positions roughly within -10 to 10 range)

Example response:
{
  "description": "A simple room with a table and chair",
  "objects": [
    {"type": "plane", "name": "Floor", "position": [0, 0, 0], "rotation": [-1.5708, 0, 0], "scale": [10, 10, 1], "color": "#555555"},
    {"type": "box", "name": "Table top", "position": [0, 1, 0], "rotation": [0, 0, 0], "scale": [2, 0.1, 1], "color": "#8B4513"}
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const { prompt, existingObjects } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ error: 'prompt required' }, { status: 400 });

    const userMessage = existingObjects?.length
      ? `Current scene has ${existingObjects.length} objects: ${JSON.stringify(existingObjects.slice(0, 5))}\n\nUser request: ${prompt}`
      : prompt;

    const raw = await callNemotron(userMessage, {
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.7,
      maxTokens: 2048,
      jsonMode: true,
    });

    const parsed = parseAiJson<AiSceneResponse>(raw);
    return NextResponse.json(parsed);
  } catch (e) {
    console.error('[AI Scene]', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
