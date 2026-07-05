import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { nanoid } from 'nanoid';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

interface CommentRecord {
  id: string;
  text: string;
  createdAt: number;
}

interface Props {
  params: Promise<{ shareId: string }>;
}

function commentsKey(shareId: string) {
  return `share:${shareId}:comments`;
}

async function getComments(shareId: string): Promise<CommentRecord[]> {
  const value = await redis.get<CommentRecord[] | string>(commentsKey(shareId));
  if (!value) return [];
  return typeof value === 'string' ? JSON.parse(value) as CommentRecord[] : value;
}

export async function GET(_req: Request, { params }: Props) {
  const { shareId } = await params;
  const comments = await getComments(shareId);
  return NextResponse.json({ comments });
}

export async function POST(req: Request, { params }: Props) {
  try {
    const { shareId } = await params;
    const { text } = await req.json();
    const cleanText = typeof text === 'string' ? text.trim().slice(0, 1000) : '';

    if (!cleanText) {
      return NextResponse.json({ error: 'Missing comment text' }, { status: 400 });
    }

    const boardExists = await redis.exists(`share:${shareId}`);
    if (!boardExists) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 });
    }

    const comments = await getComments(shareId);
    const nextComment: CommentRecord = {
      id: nanoid(10),
      text: cleanText,
      createdAt: Date.now(),
    };
    const nextComments = [...comments, nextComment].slice(-100);

    await redis.set(commentsKey(shareId), nextComments, { ex: 60 * 60 * 24 * 30 });
    return NextResponse.json({ comment: nextComment });
  } catch (err) {
    console.error('Comment API Error:', err);
    return NextResponse.json({ error: 'Failed to save comment' }, { status: 500 });
  }
}
