import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getGalleryPosts, createGalleryPost } from '@/lib/gallery';
import { nanoid } from 'nanoid';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const posts = await getGalleryPosts(limit, offset);
    return NextResponse.json({ posts });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, scene, thumbnail } = await req.json();
    if (!title?.trim() || !scene) {
      return NextResponse.json({ error: 'title and scene required' }, { status: 400 });
    }

    const id = nanoid();
    const post = {
      id,
      userId: session.user.id ?? session.user.email ?? 'anon',
      username: session.user.name ?? session.user.email ?? 'Anonymous',
      title: title.trim(),
      description: (description ?? '').trim(),
      thumbnail: thumbnail ?? '',
      likes: [],
      reactions: [],
      views: 0,
      createdAt: Date.now(),
      scene,
    };

    await createGalleryPost(post);
    return NextResponse.json({ id });
  } catch (e) {
    console.error('[Gallery POST]', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
