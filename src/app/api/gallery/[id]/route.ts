import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getGalleryPost, deleteGalleryPost, toggleLike } from '@/lib/gallery';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const post = await getGalleryPost(id);
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(post);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { action } = await req.json();

    if (action === 'like') {
      const userId = session.user.id ?? session.user.email ?? 'anon';
      const likes = await toggleLike(id, userId);
      return NextResponse.json({ likes });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const userId = session.user.id ?? session.user.email ?? 'anon';
    const ok = await deleteGalleryPost(id, userId);
    if (!ok) return NextResponse.json({ error: 'Forbidden or not found' }, { status: 403 });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
