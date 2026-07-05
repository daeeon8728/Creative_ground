import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listPosts, createPost } from '@/lib/forum';
import { nanoid } from 'nanoid';

interface Props { params: Promise<{ boardId: string }> }

// GET /api/forum/posts/[boardId]
export async function GET(_req: Request, { params }: Props) {
  const { boardId } = await params;
  const posts = await listPosts(boardId);
  return NextResponse.json({ posts });
}

// POST /api/forum/posts/[boardId] — logged-in users create posts
export async function POST(req: Request, { params }: Props) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { boardId } = await params;
  const { title, content, sharedBoardId, sharedBoardName, sharedBoardKind } = await req.json();

  if (!title || !content) {
    return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
  }

  const now = Date.now();
  await createPost({
    id: nanoid(10),
    boardId,
    title: title.trim(),
    content: content.trim(),
    authorId: session.user.id,
    authorName: session.user.name ?? session.user.email ?? '익명',
    createdAt: now,
    updatedAt: now,
    likeCount: 0,
    commentCount: 0,
    sharedBoardId,
    sharedBoardName,
    sharedBoardKind,
  });

  return NextResponse.json({ ok: true });
}
