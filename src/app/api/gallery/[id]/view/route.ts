import { NextRequest, NextResponse } from 'next/server';
import { incrementViews } from '@/lib/gallery';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const views = await incrementViews(id);
    return NextResponse.json({ views });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
