import { NextRequest, NextResponse } from 'next/server';
import { callNemotron, parseAiJson } from '@/lib/ai';
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
- You can create up to 30 objects to build complex structures.
- When building living creatures, characters, or robots, think carefully about anatomy. Include all necessary parts: Head, Neck, Torso, Shoulders, Upper Arms, Lower Arms, Hands, Pelvis, Thighs, Calves, and Feet.
- Pay extreme attention to CONNECTIVITY. Arms must attach to the top sides of the torso, legs to the bottom. Parts should not float in mid-air. Calculate relative positions logically.
- Vary positions so objects don't completely overlap, but joint areas SHOULD intersect slightly to look connected.
- A "floor" should be a plane with scale [20, 20, 1] at position [0, 0, 0].
- Keep scenes relatively compact (positions roughly within -15 to 15 range), scaling parts proportionally.

Example response:
{
  "description": "A humanoid figure standing",
  "objects": [
    {"type": "box", "name": "Torso", "position": [0, 3, 0], "rotation": [0, 0, 0], "scale": [1.5, 2, 1], "color": "#1E90FF"},
    {"type": "sphere", "name": "Head", "position": [0, 4.5, 0], "rotation": [0, 0, 0], "scale": [0.8, 0.8, 0.8], "color": "#FFDBAC"},
    {"type": "capsule", "name": "Left Arm", "position": [-1.2, 3, 0], "rotation": [0, 0, -0.2], "scale": [0.4, 1.5, 0.4], "color": "#1E90FF"}
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
