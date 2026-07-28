import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMessages, sendMessage } from '@/lib/chat';

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { username } = await params;
    const messages = await getMessages(session.user.username, username);
    return NextResponse.json({ messages });
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
    const body = await req.json();
    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
    }
    
    const msg = await sendMessage(session.user.username, username, body.content.trim());
    return NextResponse.json({ message: msg });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
