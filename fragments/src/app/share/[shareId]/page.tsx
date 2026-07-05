import { notFound } from 'next/navigation';
import { Redis } from '@upstash/redis';
import { CanvasArea } from '@/components/board/CanvasArea';
import { ShareFeedback } from '@/components/ShareFeedback';
import type { BoardData } from '@/lib/types';
import type { Metadata } from 'next';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

interface Props {
  params: Promise<{ shareId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareId } = await params;
  const boardJson = await redis.get(`share:${shareId}`);
  if (!boardJson) return { title: 'Not Found' };
  
  const board = typeof boardJson === 'string' ? JSON.parse(boardJson) as BoardData : boardJson as BoardData;
  return { title: `${board.name} — Fragments` };
}

export default async function SharePage({ params }: Props) {
  const { shareId } = await params;
  const boardJson = await redis.get(`share:${shareId}`);
  
  if (!boardJson) notFound();
  
  const board = typeof boardJson === 'string' ? JSON.parse(boardJson) as BoardData : boardJson as BoardData;

  // Since we don't have object URLs for the images in SSR, we'd normally need a CDN.
  // For this demo, images will appear as broken/loading if they relied on indexedDB Object URLs.
  // We'll pass empty imageUrls to CanvasArea since it's read-only.

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-[var(--paper)]">
      {/* Read-only header */}
      <header className="h-14 border-b-2 border-[var(--ink)] bg-[var(--surface)] flex items-center px-4 shrink-0 z-50">
        <div className="font-display text-xl uppercase tracking-tight text-[var(--ink)] truncate max-w-md" style={{ fontFamily: 'var(--font-display)' }}>
          {board.name} <span className="text-[var(--pencil)] text-sm ml-2 font-mono">읽기 전용</span>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 relative pointer-events-none">
          <CanvasArea
            items={board.items}
            selectedId={null}
            flippedId={null}
            imageUrls={{}}
            tool="select"
            onSelect={() => {}}
            onUpdate={() => {}}
            onDelete={() => {}}
            onFlip={() => {}}
            onBringForward={() => {}}
            onSendBackward={() => {}}
            onAddText={() => {}}
            onAddShape={() => {}}
            onAddDrawing={() => {}}
            drawColor="#1c1a17"
            drawWidth={3}
          />
        </div>
        <ShareFeedback shareId={shareId} />
      </div>
    </div>
  );
}
