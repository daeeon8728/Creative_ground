import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import type { SceneData } from '@/lib/scene-types';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const scene = await redis.get<SceneData>(`gallery:scene:${id}`);
    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }
    return NextResponse.json({ scene });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
