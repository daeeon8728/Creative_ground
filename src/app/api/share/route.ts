import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { auth } from '@/lib/auth';
import { nanoid } from 'nanoid';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { board } = await req.json();
    if (!board || !board.id) {
      return NextResponse.json({ error: 'Invalid board data' }, { status: 400 });
    }

    const shareId = nanoid(10);
    
    // Save to Redis (expire after 30 days)
    await redis.set(`share:${shareId}`, JSON.stringify(board), { ex: 60 * 60 * 24 * 30 });

    return NextResponse.json({ shareId });
  } catch (err) {
    console.error('Share error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
