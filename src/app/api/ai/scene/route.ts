import { NextRequest, NextResponse } from 'next/server';
import { callNemotron, parseAiJson } from '@/lib/ai';
import type { AiSceneResponse } from '@/lib/scene-types';

const SYSTEM_PROMPT = `You are an expert 3D scene design architect. When given a description, respond ONLY with a valid JSON object.
The JSON must have an "objects" array and an optional "description" string.
Each object in the array must have:
- type: one of "box", "sphere", "cylinder", "cone", "torus", "plane", "capsule", or "csg"
- name: descriptive string (e.g. "Left Upper Arm")
- position: [x, y, z] numbers (y is up, keep objects above y=0 unless it's a floor/plane)
- rotation: [x, y, z] in radians
- scale: [x, y, z] positive numbers
- color: hex color string like "#4d7fff"
- IF type is "csg", you MUST include:
  - csgBaseType: a primitive type (e.g., "box", "sphere")
  - csgOperations: array of objects with { type: primitive_type, op: "subtract" | "add" | "intersect", position: [x,y,z], rotation: [x,y,z], scale: [x,y,z] }

Rules:
- You can create up to 30 objects to build complex structures.
- Use the "csg" type to carve shapes! For example, to make a bowl, use a "sphere" csgBaseType and a "subtract" csgOperation with a slightly smaller sphere shifted up. To make a face with eye sockets, subtract spheres from a base head sphere.
- When building living creatures, characters, or robots, think carefully about anatomy. Include all necessary parts.
- Pay extreme attention to CONNECTIVITY. Parts should not float in mid-air. Calculate relative positions logically.
- A "floor" should be a plane with scale [20, 20, 1] at position [0, 0, 0].
- Keep scenes relatively compact (positions roughly within -15 to 15 range), scaling parts proportionally.
- Note: For csgOperations, positions are RELATIVE to the base object's center.

Example response:
{
  "description": "A character with carved out eye sockets",
  "objects": [
    {
      "type": "csg",
      "name": "Head with eyes carved",
      "position": [0, 5, 0],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1],
      "color": "#FFDBAC",
      "csgBaseType": "sphere",
      "csgOperations": [
        {"type": "sphere", "op": "subtract", "position": [-0.3, 0.2, 0.8], "rotation": [0,0,0], "scale": [0.2, 0.2, 0.2]},
        {"type": "sphere", "op": "subtract", "position": [0.3, 0.2, 0.8], "rotation": [0,0,0], "scale": [0.2, 0.2, 0.2]}
      ]
    }
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
