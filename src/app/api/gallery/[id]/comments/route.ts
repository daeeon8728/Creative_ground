import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getComments, addComment, getGalleryPost } from '@/lib/gallery';
import { createNotification } from '@/lib/notifications';
import { nanoid } from 'nanoid';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const comments = await getComments(id);
    return NextResponse.json({ comments });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });

    const comment = {
      id: nanoid(),
      userId: session.user.id ?? session.user.email ?? 'anon',
      username: session.user.name ?? session.user.email ?? 'Anonymous',
      content: content.trim(),
      createdAt: Date.now(),
    };

    await addComment(id, comment);

    // Notify post author
    const post = await getGalleryPost(id);
    if (post && post.username) {
      await createNotification(
        post.username,
        'comment',
        comment.username,
        `/gallery/${id}`
      );
    }

    return NextResponse.json(comment);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
