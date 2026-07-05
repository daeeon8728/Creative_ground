'use client';

import type { CanvasItem, ResizeHandle } from '@/lib/types';

const HANDLE_SIZE = 10;

const HANDLES: { id: ResizeHandle; cursor: string; style: React.CSSProperties }[] = [
  { id: 'nw', cursor: 'nw-resize', style: { top: -5, left: -5 } },
  { id: 'n',  cursor: 'n-resize',  style: { top: -5, left: '50%', transform: 'translateX(-50%)' } },
  { id: 'ne', cursor: 'ne-resize', style: { top: -5, right: -5 } },
  { id: 'e',  cursor: 'e-resize',  style: { top: '50%', right: -5, transform: 'translateY(-50%)' } },
  { id: 'se', cursor: 'se-resize', style: { bottom: -5, right: -5 } },
  { id: 's',  cursor: 's-resize',  style: { bottom: -5, left: '50%', transform: 'translateX(-50%)' } },
  { id: 'sw', cursor: 'sw-resize', style: { bottom: -5, left: -5 } },
  { id: 'w',  cursor: 'w-resize',  style: { top: '50%', left: -5, transform: 'translateY(-50%)' } },
];

interface Props {
  item: CanvasItem;
  onStartResize: (e: React.PointerEvent, item: CanvasItem, handle: ResizeHandle) => void;
  onStartRotate: (e: React.PointerEvent, item: CanvasItem) => void;
  onFlip: () => void;
  onDelete: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
}

export function SelectionHandles({
  item,
  onStartResize,
  onStartRotate,
  onFlip,
  onDelete,
  onBringForward,
  onSendBackward,
}: Props) {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ border: '2px solid var(--riso-blue)', borderRadius: 0 }}
      />

      <div
        className="absolute flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{ top: -58, left: '50%', transform: 'translateX(-50%)', width: 30, height: 30, zIndex: 30 }}
        onPointerDown={(e) => onStartRotate(e, item)}
        title="Rotate"
      >
        <div className="w-px h-7 bg-[var(--riso-blue)] absolute top-full left-1/2 -translate-x-1/2" />
        <div className="w-7 h-7 rounded-full bg-[var(--riso-blue)] border-2 border-white flex items-center justify-center text-white text-xs shadow">
          R
        </div>
      </div>

      {HANDLES.map((handle) => (
        <div
          key={handle.id}
          className="absolute bg-white border-2 border-[var(--riso-blue)] shadow-sm z-10"
          style={{
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            cursor: handle.cursor,
            ...handle.style,
          }}
          onPointerDown={(e) => onStartResize(e, item, handle.id)}
        />
      ))}

      <div
        className="absolute flex gap-1"
        style={{ bottom: -40, right: 0, zIndex: 25 }}
      >
        <ActionBtn title="Details" onClick={onFlip}>i</ActionBtn>
        <ActionBtn title="Bring forward" onClick={onBringForward}>+</ActionBtn>
        <ActionBtn title="Send backward" onClick={onSendBackward}>-</ActionBtn>
        <ActionBtn title="Delete" onClick={onDelete} danger>x</ActionBtn>
      </div>
    </>
  );
}

function ActionBtn({ children, onClick, title, danger }: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className={`
        w-7 h-7 text-xs font-bold border-2 flex items-center justify-center
        transition-colors shadow-sm
        ${danger
          ? 'border-[var(--riso-coral)] bg-[var(--riso-coral)] text-white hover:bg-[var(--riso-coral)]/80'
          : 'border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)]'
        }
      `}
    >
      {children}
    </button>
  );
}
