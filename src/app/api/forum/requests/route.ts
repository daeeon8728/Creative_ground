import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listBoardRequests, submitBoardRequest, updateBoardRequestStatus, createForumBoard } from '@/lib/forum';
import { nanoid } from 'nanoid';

// GET /api/forum/requests — admin gets all; user gets own
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reqs = await listBoardRequests();
  if (session.user.role === 'admin') {
    return NextResponse.json({ requests: reqs });
  }
  const mine = reqs.filter(r => r.requestedBy === session.user.id);
  return NextResponse.json({ requests: mine });
}

// POST /api/forum/requests — user submits a request
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, description, emoji } = await req.json();
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

  await submitBoardRequest({
    id: nanoid(10),
    requestedBy: session.user.id,
    requestedByName: session.user.name ?? '익명',
    title: title.trim(),
    description: (description ?? '').trim(),
    emoji: emoji ?? '📌',
    createdAt: Date.now(),
    status: 'pending',
  });

  return NextResponse.json({ ok: true });
}

// PATCH /api/forum/requests — admin approves/rejects
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { requestId, action } = await req.json(); // action: 'approve' | 'reject'
  if (!requestId || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  if (action === 'approve') {
    const { listBoardRequests: lr } = await import('@/lib/forum');
    const reqs = await lr('pending');
    const request = reqs.find(r => r.id === requestId);
    if (request) {
      await createForumBoard({
        id: nanoid(10),
        title: request.title,
        description: request.description,
        emoji: request.emoji,
        createdBy: session.user.id,
        createdAt: Date.now(),
        isOfficial: false,
      });
      await updateBoardRequestStatus(requestId, 'approved');
    }
  } else {
    await updateBoardRequestStatus(requestId, 'rejected');
  }

  return NextResponse.json({ ok: true });
}
