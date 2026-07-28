import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getConversations } from '@/lib/chat';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const convos = await getConversations(session.user.username);
    return NextResponse.json({ conversations: convos });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
