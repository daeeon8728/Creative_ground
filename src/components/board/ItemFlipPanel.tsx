'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { CanvasItem, ShapeType } from '@/lib/types';

const COLORS = ['#1c1a17', '#1a5cff', '#ffd000', '#f24e1e', '#ffffff', '#7fb87a', '#8ea8d8', '#a87fd4'];

interface Props {
  item: CanvasItem;
  onUpdate: (id: string, updates: Partial<CanvasItem>) => void;
  onClose: () => void;
}

export function ItemFlipPanel({ item, onUpdate, onClose }: Props) {
  const [localPrice, setLocalPrice] = useState(String(item.price ?? ''));
  const [localUrl, setLocalUrl] = useState(item.sourceUrl ?? '');
  const [localLabel, setLocalLabel] = useState(item.label ?? '');

  function update(updates: Partial<CanvasItem>) {
    onUpdate(item.id, updates);
  }

  function savePlanning() {
    update({
      price: localPrice ? parseFloat(localPrice) : undefined,
      sourceUrl: localUrl || undefined,
      label: localLabel || undefined,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, rotateY: 90 }}
      animate={{ opacity: 1, rotateY: 0 }}
      exit={{ opacity: 0, rotateY: -90 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 z-20 bg-[var(--surface)] border-2 border-[var(--ink)] p-3 flex flex-col gap-3 overflow-auto"
      style={{ backfaceVisibility: 'hidden' }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-xs border border-[var(--pencil)] text-[var(--pencil)] hover:border-[var(--ink)] hover:text-[var(--ink)] transition-colors"
        aria-label="Close details"
      >
        x
      </button>

      <SectionTitle>Inspector</SectionTitle>

      {item.type === 'shape' && (
        <div className="space-y-3">
          <label className="flex flex-col gap-1">
            <FieldLabel>Shape</FieldLabel>
            <select
              value={item.shapeType ?? 'rect'}
              onChange={(e) => update({ shapeType: e.target.value as ShapeType })}
              className="border border-[var(--ink)] bg-transparent px-2 py-1 text-xs text-[var(--ink)]"
            >
              <option value="rect">Rectangle</option>
              <option value="circle">Oval</option>
              <option value="triangle">Triangle</option>
            </select>
          </label>

          <ColorGrid label="Fill" value={item.fillColor ?? 'var(--riso-yellow)'} onChange={(fillColor) => update({ fillColor })} />
          <ColorGrid label="Line" value={item.strokeColor ?? 'var(--ink)'} onChange={(strokeColor) => update({ strokeColor })} />

          <RangeControl label="Stroke width" min={0} max={16} value={item.strokeWidth ?? 2} onChange={(strokeWidth) => update({ strokeWidth })} />
          <RangeControl label="Corner radius" min={0} max={80} value={item.cornerRadius ?? 0} onChange={(cornerRadius) => update({ cornerRadius })} />

          <label className="flex flex-col gap-1">
            <FieldLabel>Line style</FieldLabel>
            <select
              value={item.strokeDash ?? 'solid'}
              onChange={(e) => update({ strokeDash: e.target.value as CanvasItem['strokeDash'] })}
              className="border border-[var(--ink)] bg-transparent px-2 py-1 text-xs text-[var(--ink)]"
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </label>
        </div>
      )}

      {item.type === 'text' && (
        <div className="space-y-3">
          <ColorGrid label="Text color" value={item.textColor ?? 'var(--ink)'} onChange={(textColor) => update({ textColor })} />
          <RangeControl label="Font size" min={10} max={72} value={item.fontSize ?? 20} onChange={(fontSize) => update({ fontSize })} />
          <label className="flex flex-col gap-1">
            <FieldLabel>Weight</FieldLabel>
            <select
              value={item.fontWeight ?? '400'}
              onChange={(e) => update({ fontWeight: e.target.value })}
              className="border border-[var(--ink)] bg-transparent px-2 py-1 text-xs text-[var(--ink)]"
            >
              <option value="400">Regular</option>
              <option value="600">Semi bold</option>
              <option value="700">Bold</option>
              <option value="800">Heavy</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <FieldLabel>Align</FieldLabel>
            <select
              value={item.textAlign ?? 'left'}
              onChange={(e) => update({ textAlign: e.target.value as CanvasItem['textAlign'] })}
              className="border border-[var(--ink)] bg-transparent px-2 py-1 text-xs text-[var(--ink)]"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </label>
        </div>
      )}

      {item.type === 'image' && (
        <div className="space-y-3">
          <RangeControl label="Brightness" min={20} max={180} value={item.brightness ?? 100} onChange={(brightness) => update({ brightness })} />
          <RangeControl label="Contrast" min={20} max={180} value={item.contrast ?? 100} onChange={(contrast) => update({ contrast })} />
          <RangeControl label="Saturation" min={0} max={220} value={item.saturate ?? 100} onChange={(saturate) => update({ saturate })} />
          <RangeControl label="Blur" min={0} max={12} value={item.blur ?? 0} onChange={(blur) => update({ blur })} />
        </div>
      )}

      <RangeControl label="Opacity" min={10} max={100} value={Math.round((item.opacity ?? 1) * 100)} onChange={(opacity) => update({ opacity: opacity / 100 })} />

      <div className="h-px bg-[var(--pencil)]/40" />
      <SectionTitle>Planning</SectionTitle>

      <label className="flex flex-col gap-0.5">
        <FieldLabel>Label</FieldLabel>
        <input
          type="text"
          value={localLabel}
          onChange={(e) => setLocalLabel(e.target.value)}
          onBlur={savePlanning}
          placeholder="Item name"
          className="border border-[var(--ink)] bg-transparent px-2 py-1 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--riso-blue)]"
          style={{ fontFamily: 'var(--font-body)' }}
        />
      </label>

      <label className="flex flex-col gap-0.5">
        <FieldLabel>Price</FieldLabel>
        <input
          type="number"
          value={localPrice}
          onChange={(e) => setLocalPrice(e.target.value)}
          onBlur={savePlanning}
          placeholder="0"
          min="0"
          className="border border-[var(--ink)] bg-transparent px-2 py-1 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--riso-blue)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        />
      </label>

      <label className="flex flex-col gap-0.5">
        <FieldLabel>Source URL</FieldLabel>
        <input
          type="url"
          value={localUrl}
          onChange={(e) => setLocalUrl(e.target.value)}
          onBlur={savePlanning}
          placeholder="https://..."
          className="border border-[var(--ink)] bg-transparent px-2 py-1 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--riso-blue)]"
          style={{ fontFamily: 'var(--font-body)' }}
        />
      </label>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={item.checked ?? false}
          onChange={(e) => update({ checked: e.target.checked })}
          className="w-4 h-4 accent-[var(--riso-blue)]"
        />
        <span className="text-xs text-[var(--ink)]" style={{ fontFamily: 'var(--font-body)' }}>
          {item.checked ? 'Done' : 'Todo'}
        </span>
      </label>

      <div>
        <FieldLabel>Rating</FieldLabel>
        <div className="flex gap-1 mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => update({ rating: item.rating === star ? undefined : star as 1 | 2 | 3 | 4 | 5 })}
              className="text-sm leading-none border border-[var(--ink)] w-6 h-6 hover:bg-[var(--ink)] hover:text-[var(--paper)]"
              title={`${star}`}
            >
              {(item.rating ?? 0) >= star ? '*' : '-'}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ColorGrid({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="grid grid-cols-8 gap-1 mt-1">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            title={color}
            className="w-4 h-4 border transition-transform hover:scale-110"
            style={{
              background: color,
              borderColor: value === color ? 'var(--riso-blue)' : 'var(--ink)',
              outline: value === color ? '2px solid var(--riso-blue)' : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function RangeControl({ label, value, min, max, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <div className="flex justify-between gap-2">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-[10px] text-[var(--pencil)]" style={{ fontFamily: 'var(--font-mono)' }}>{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--riso-blue)]"
      />
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-widest font-semibold text-[var(--pencil)]" style={{ fontFamily: 'var(--font-mono)' }}>
      {children}
    </p>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] text-[var(--pencil)] uppercase tracking-wide" style={{ fontFamily: 'var(--font-mono)' }}>
      {children}
    </span>
  );
}
