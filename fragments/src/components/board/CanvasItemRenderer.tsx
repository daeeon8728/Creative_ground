'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SelectionHandles } from './SelectionHandles';
import { ItemFlipPanel } from './ItemFlipPanel';
import type { CanvasItem, ResizeHandle } from '@/lib/types';

interface Props {
  item: CanvasItem;
  isSelected: boolean;
  isFlipped: boolean;
  imageUrl?: string;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<CanvasItem>) => void;
  onStartMove: (e: React.PointerEvent, item: CanvasItem) => void;
  onStartResize: (e: React.PointerEvent, item: CanvasItem, handle: ResizeHandle) => void;
  onStartRotate: (e: React.PointerEvent, item: CanvasItem) => void;
  onFlip: () => void;
  onDelete: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
}

export function CanvasItemRenderer({
  item, isSelected, isFlipped, imageUrl,
  onSelect, onUpdate, onStartMove, onStartResize, onStartRotate,
  onFlip, onDelete, onBringForward, onSendBackward,
}: Props) {
  const [isEditingText, setIsEditingText] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: item.width,
    height: item.height,
    transform: `translate(${item.x}px, ${item.y}px) rotate(${item.rotation}deg)`,
    zIndex: item.zIndex,
    cursor: 'grab',
    userSelect: 'none',
    touchAction: 'none',
    opacity: item.opacity ?? 1,
  };

  function handlePointerDown(e: React.PointerEvent) {
    if (isEditingText) return;
    onSelect(item.id);
    onStartMove(e, item);
  }

  function handleDoubleClick() {
    if (item.type === 'text') setIsEditingText(true);
  }

  // Finish text edit
  useEffect(() => {
    if (isEditingText && textRef.current) {
      textRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(textRef.current);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
  }, [isEditingText]);

  function handleTextBlur() {
    if (!textRef.current) return;
    onUpdate(item.id, { text: textRef.current.innerText });
    setIsEditingText(false);
  }

  // CSS filter string for images
  const filterStr = item.type === 'image'
    ? `brightness(${item.brightness ?? 100}%) contrast(${item.contrast ?? 100}%) saturate(${item.saturate ?? 100}%) blur(${item.blur ?? 0}px)`
    : undefined;

  return (
    <div
      style={style}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* ── Content ── */}
      {item.type === 'image' && (
        imageUrl ? (
          <img
            src={imageUrl}
            alt={item.label ?? 'canvas image'}
            draggable={false}
            className="w-full h-full object-cover select-none"
            style={{
              filter: filterStr,
              mixBlendMode: (item.blendMode as React.CSSProperties['mixBlendMode']) ?? 'normal',
            }}
          />
        ) : (
          <div className="w-full h-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--pencil)] text-sm">
            로딩 중…
          </div>
        )
      )}

      {item.type === 'text' && (
        <div
          ref={textRef}
          contentEditable={isEditingText}
          suppressContentEditableWarning
          onBlur={handleTextBlur}
          onPointerDown={isEditingText ? e => e.stopPropagation() : undefined}
          className="w-full h-full flex items-center px-2 py-1 break-words overflow-hidden"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: item.fontSize ?? 20,
            color: item.textColor ?? 'var(--ink)',
            fontWeight: item.fontWeight ?? '400',
            textAlign: item.textAlign ?? 'left',
            cursor: isEditingText ? 'text' : 'grab',
            outline: isEditingText ? '2px solid var(--riso-blue)' : 'none',
            background: item.aiSuggested ? 'var(--surface)' : undefined,
            border: item.aiSuggested ? '2px dashed var(--riso-blue)' : undefined,
            boxShadow: item.aiSuggested ? 'var(--shadow-sm-blue)' : undefined,
          }}
        >
          {item.text ?? ''}
        </div>
      )}

      {item.type === 'shape' && (
        <ShapeRenderer item={item} />
      )}

      {item.type === 'drawing' && item.drawingPath && (
        <svg
          className="absolute inset-0 overflow-visible pointer-events-none"
          style={{ width: 1, height: 1 }}
        >
          <path
            d={item.drawingPath}
            fill="none"
            stroke={item.drawingColor ?? 'var(--ink)'}
            strokeWidth={item.drawingWidth ?? 3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* ── Checked badge ── */}
      {item.checked && (
        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[var(--riso-yellow)] border border-[var(--ink)] flex items-center justify-center text-[10px] pointer-events-none z-10">
          ✓
        </div>
      )}

      {/* ── Price badge ── */}
      {item.price !== undefined && item.price > 0 && (
        <div
          className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-[var(--ink)] text-[var(--paper)] text-[10px] pointer-events-none z-10"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          ₩{item.price.toLocaleString()}
        </div>
      )}

      {/* ── Selection handles & flip panel ── */}
      {isSelected && !isFlipped && !isEditingText && (
        <SelectionHandles
          item={item}
          onStartResize={onStartResize}
          onStartRotate={onStartRotate}
          onFlip={onFlip}
          onDelete={onDelete}
          onBringForward={onBringForward}
          onSendBackward={onSendBackward}
        />
      )}

      <AnimatePresence>
        {isFlipped && (
          <ItemFlipPanel
            item={item}
            onUpdate={onUpdate}
            onClose={onFlip}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ShapeRenderer({ item }: { item: CanvasItem }) {
  const fill = item.fillColor ?? 'var(--riso-yellow)';
  const stroke = item.strokeColor ?? 'var(--ink)';
  const sw = item.strokeWidth ?? 2;
  const dash = item.strokeDash === 'dashed'
    ? '8 6'
    : item.strokeDash === 'dotted'
      ? '2 5'
      : undefined;

  if (item.shapeType === 'circle') {
    return (
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <ellipse cx="50" cy="50" rx={50 - sw} ry={50 - sw} fill={fill} stroke={stroke} strokeWidth={sw * 100 / Math.min(item.width, item.height)} strokeDasharray={dash} />
      </svg>
    );
  }
  if (item.shapeType === 'triangle') {
    return (
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points="50,5 95,95 5,95" fill={fill} stroke={stroke} strokeWidth={sw * 100 / Math.min(item.width, item.height)} strokeDasharray={dash} />
      </svg>
    );
  }
  // rect (default)
  return (
    <div
      className="w-full h-full"
      style={{
        background: fill,
        border: `${sw}px ${item.strokeDash ?? 'solid'} ${stroke}`,
        borderRadius: item.cornerRadius ?? 0,
      }}
    />
  );
}
