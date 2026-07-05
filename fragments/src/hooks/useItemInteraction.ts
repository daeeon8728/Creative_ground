'use client';

import { useRef, useState, useCallback, type RefObject } from 'react';
import type { CanvasItem, ResizeHandle } from '@/lib/types';

interface DragState {
  type: 'move' | 'resize' | 'rotate';
  itemId: string;
  handle?: ResizeHandle;
  startClientX: number;
  startClientY: number;
  startItem: CanvasItem;
  // For rotate: center of item in client coords
  centerClientX?: number;
  centerClientY?: number;
  startAngle?: number;
}

interface UseItemInteractionProps {
  containerRef: RefObject<HTMLDivElement | null>;
  onUpdate: (id: string, updates: Partial<CanvasItem>) => void;
  onSelect: (id: string) => void;
}

export function useItemInteraction({ containerRef, onUpdate, onSelect }: UseItemInteractionProps) {
  const dragRef = useRef<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const startMove = useCallback((e: React.PointerEvent, item: CanvasItem) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(item.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    dragRef.current = {
      type: 'move',
      itemId: item.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startItem: { ...item },
    };
    setIsDragging(true);
  }, [onSelect]);

  const startResize = useCallback((e: React.PointerEvent, item: CanvasItem, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    dragRef.current = {
      type: 'resize',
      itemId: item.id,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startItem: { ...item },
    };
    setIsDragging(true);
  }, []);

  const startRotate = useCallback((e: React.PointerEvent, item: CanvasItem) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    // center of item in client space (accounting for scroll)
    const scroll = containerRef.current!;
    const centerClientX = containerRect.left + item.x + item.width / 2 - scroll.scrollLeft;
    const centerClientY = containerRect.top + item.y + item.height / 2 - scroll.scrollTop;
    const startAngle = Math.atan2(e.clientY - centerClientY, e.clientX - centerClientX) * 180 / Math.PI;

    dragRef.current = {
      type: 'rotate',
      itemId: item.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startItem: { ...item },
      centerClientX,
      centerClientY,
      startAngle,
    };
    setIsDragging(true);
  }, [containerRef]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;

    const dx = e.clientX - drag.startClientX;
    const dy = e.clientY - drag.startClientY;
    const { startItem } = drag;

    if (drag.type === 'move') {
      onUpdate(drag.itemId, {
        x: Math.round(startItem.x + dx),
        y: Math.round(startItem.y + dy),
      });
    } else if (drag.type === 'resize' && drag.handle) {
      const MIN = 40;
      let { x, y, width, height } = startItem;

      switch (drag.handle) {
        case 'se': width = Math.max(MIN, startItem.width + dx);  height = Math.max(MIN, startItem.height + dy); break;
        case 'sw': x = startItem.x + dx; width = Math.max(MIN, startItem.width - dx);  height = Math.max(MIN, startItem.height + dy); break;
        case 'ne': width = Math.max(MIN, startItem.width + dx);  y = startItem.y + dy; height = Math.max(MIN, startItem.height - dy); break;
        case 'nw': x = startItem.x + dx; width = Math.max(MIN, startItem.width - dx);  y = startItem.y + dy; height = Math.max(MIN, startItem.height - dy); break;
        case 'e':  width = Math.max(MIN, startItem.width + dx);  break;
        case 'w':  x = startItem.x + dx; width = Math.max(MIN, startItem.width - dx);  break;
        case 's':  height = Math.max(MIN, startItem.height + dy); break;
        case 'n':  y = startItem.y + dy; height = Math.max(MIN, startItem.height - dy); break;
      }
      onUpdate(drag.itemId, { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });
    } else if (drag.type === 'rotate') {
      const angle = Math.atan2(
        e.clientY - drag.centerClientY!,
        e.clientX - drag.centerClientX!,
      ) * 180 / Math.PI;
      const rotation = Math.round(drag.startItem.rotation + angle - drag.startAngle!);
      onUpdate(drag.itemId, { rotation });
    }
  }, [onUpdate]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  return { startMove, startResize, startRotate, onPointerMove, onPointerUp, isDragging };
}
