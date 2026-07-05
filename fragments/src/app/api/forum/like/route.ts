import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { togglePostLike, getPostLikedByUser } from '@/lib/forum';

// POST /api/forum/like — toggle like on a post
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { postId, boardId } = await req.json();
  if (!postId || !boardId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const result = await togglePostLike(postId, boardId, session.user.id);
  return NextResponse.json(result);
}

// GET /api/forum/like?postId=&userId=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get('postId');
  const userId = searchParams.get('userId');
  if (!postId || !userId) return NextResponse.json({ liked: false });
  const liked = await getPostLikedByUser(postId, userId);
  return NextResponse.json({ liked });
}
