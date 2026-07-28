import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { followUser, unfollowUser, isFollowing } from '@/lib/social';
import { createNotification } from '@/lib/notifications';

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.username) {
      return NextResponse.json({ following: false });
    }
    const { username } = await params;
    const following = await isFollowing(session.user.username, username);
    return NextResponse.json({ following });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { username } = await params;
    await followUser(session.user.username, username);
    
    await createNotification(
      username,
      'follow',
      session.user.username,
      `/profile/${session.user.username}`
    );

    return NextResponse.json({ success: true, following: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { username } = await params;
    await unfollowUser(session.user.username, username);
    return NextResponse.json({ success: true, following: false });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
