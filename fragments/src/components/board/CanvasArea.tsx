'use client';

import { useRef, useState } from 'react';
import { CanvasItemRenderer } from './CanvasItemRenderer';
import { useItemInteraction } from '@/hooks/useItemInteraction';
import type { ActiveTool, CanvasItem } from '@/lib/types';

const CANVAS_W = 3200;
const CANVAS_H = 2200;

interface Props {
  items: CanvasItem[];
  selectedId: string | null;
  flippedId: string | null;
  imageUrls: Record<string, string>;
  tool: ActiveTool;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<CanvasItem>) => void;
  onDelete: (id: string) => void;
  onFlip: (id: string | null) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onAddText: (x: number, y: number) => void;
  onAddShape: (x: number, y: number) => void;
  onAddDrawing: (path: string, color: string, width: number) => void;
  drawColor: string;
  drawWidth: number;
}

interface DrawingPoint { x: number; y: number; }

export function CanvasArea({
  items, selectedId, flippedId, imageUrls, tool,
  onSelect, onUpdate, onDelete, onFlip,
  onBringForward, onSendBackward, onAddText, onAddShape, onAddDrawing,
  drawColor, drawWidth,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Drawing state
  const [liveDrawPath, setLiveDrawPath] = useState('');
  const drawPoints = useRef<DrawingPoint[]>([]);
  const isDrawing = useRef(false);
  const { startMove, startResize, startRotate, onPointerMove, onPointerUp } = useItemInteraction({
    containerRef,
    onUpdate,
    onSelect,
  });

  function getCanvasPoint(e: React.PointerEvent): DrawingPoint {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function pointsToPath(pts: DrawingPoint[]): string {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      d += ` Q ${pts[i].x} ${pts[i].y} ${mx} ${my}`;
    }
    const last = pts[pts.length - 1];
    d += ` L ${last.x} ${last.y}`;
    return d;
  }

  function handleCanvasPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;

    if (tool === 'select') {
      onSelect(null);
      return;
    }

    if (tool === 'text') {
      const pt = getCanvasPoint(e);
      onAddText(pt.x, pt.y);
      return;
    }

    if (tool === 'shape') {
      const pt = getCanvasPoint(e);
      onAddShape(pt.x, pt.y);
      return;
    }

    if (tool === 'draw') {
      isDrawing.current = true;
      drawPoints.current = [getCanvasPoint(e)];
      setLiveDrawPath(pointsToPath(drawPoints.current));
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  }

  function handleCanvasPointerMove(e: React.PointerEvent) {
    onPointerMove(e);

    if (tool === 'draw' && isDrawing.current) {
      drawPoints.current.push(getCanvasPoint(e));
      setLiveDrawPath(pointsToPath(drawPoints.current));
    }
  }

  function handleCanvasPointerUp(e: React.PointerEvent) {
    onPointerUp();

    if (tool === 'draw' && isDrawing.current) {
      isDrawing.current = false;
      const path = pointsToPath(drawPoints.current);
      if (path) onAddDrawing(path, drawColor, drawWidth);
      drawPoints.current = [];
      setLiveDrawPath('');
    }
  }

  const sorted = [...items].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-[var(--paper-dim)]"
      style={{ cursor: tool === 'draw' ? 'crosshair' : tool === 'text' ? 'text' : tool === 'shape' ? 'copy' : 'default' }}
    >
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative"
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          backgroundImage: `radial-gradient(circle, var(--pencil) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
          backgroundPosition: '16px 16px',
          backgroundColor: 'var(--paper)',
        }}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
      >
        {/* Items */}
        {sorted.map(item => (
          <CanvasItemRenderer
            key={item.id}
            item={item}
            isSelected={item.id === selectedId}
            isFlipped={item.id === flippedId}
            imageUrl={item.imageId ? imageUrls[item.imageId] : undefined}
            onSelect={onSelect}
            onUpdate={onUpdate}
            onStartMove={startMove}
            onStartResize={startResize}
            onStartRotate={startRotate}
            onFlip={() => onFlip(item.id === flippedId ? null : item.id)}
            onDelete={() => onDelete(item.id)}
            onBringForward={() => onBringForward(item.id)}
            onSendBackward={() => onSendBackward(item.id)}
          />
        ))}

        {/* Live drawing overlay */}
        {liveDrawPath && (
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: CANVAS_W, height: CANVAS_H }}
          >
            <path
              d={liveDrawPath}
              fill="none"
              stroke={drawColor}
              strokeWidth={drawWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
