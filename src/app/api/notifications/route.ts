import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getNotifications, markNotificationsAsRead } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const notifs = await getNotifications(session.user.username);
    return NextResponse.json({ notifications: notifs });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await markNotificationsAsRead(session.user.username);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
