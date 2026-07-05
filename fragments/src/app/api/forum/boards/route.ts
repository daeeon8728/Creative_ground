import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listForumBoards, createForumBoard } from '@/lib/forum';
import { nanoid } from 'nanoid';

// GET /api/forum/boards — list all boards
export async function GET() {
  const boards = await listForumBoards();
  return NextResponse.json({ boards });
}

// POST /api/forum/boards — admin only: create a board
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, description, emoji } = await req.json();
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  const board = await createForumBoard({
    id: nanoid(10),
    title: title.trim(),
    description: (description ?? '').trim(),
    emoji: emoji ?? '📌',
    createdBy: session.user.id,
    createdAt: Date.now(),
    isOfficial: true,
  });

  return NextResponse.json({ board });
}
