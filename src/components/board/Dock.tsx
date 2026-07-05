'use client';

import { useRef } from 'react';
import type { ActiveTool, CanvasItem, ShapeType } from '@/lib/types';

interface Props {
  tool: ActiveTool;
  onSetTool: (t: ActiveTool) => void;
  onUploadImage: (file: File) => void;
  onAddShape: (shape: ShapeType) => void;
  drawColor: string;
  drawWidth: number;
  onSetDrawColor: (c: string) => void;
  onSetDrawWidth: (w: number) => void;
  shapeType: ShapeType;
  onSetShapeType: (shape: ShapeType) => void;
  shapeStyle: Pick<CanvasItem, 'fillColor' | 'strokeColor' | 'strokeWidth' | 'strokeDash' | 'cornerRadius' | 'opacity'>;
  onSetShapeStyle: (updates: Partial<CanvasItem>) => void;
}

const TOOLS: { id: ActiveTool; icon: string; title: string }[] = [
  { id: 'select', icon: 'V', title: 'Select' },
  { id: 'text', icon: 'T', title: 'Text' },
  { id: 'draw', icon: 'D', title: 'Draw' },
  { id: 'shape', icon: 'S', title: 'Shape' },
];

const COLORS = ['#1c1a17', '#1a5cff', '#ffd000', '#f24e1e', '#ffffff', '#7fb87a', '#8ea8d8', '#a87fd4'];
const SHAPES: { id: ShapeType; label: string }[] = [
  { id: 'rect', label: 'Rect' },
  { id: 'circle', label: 'Oval' },
  { id: 'triangle', label: 'Tri' },
];

export function Dock({
  tool,
  onSetTool,
  onUploadImage,
  onAddShape,
  drawColor,
  drawWidth,
  onSetDrawColor,
  onSetDrawWidth,
  shapeType,
  onSetShapeType,
  shapeStyle,
  onSetShapeStyle,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUploadImage(file);
    e.target.value = '';
  }

  return (
    <aside className="w-24 border-r-2 border-[var(--ink)] bg-[var(--surface)] flex flex-col py-3 px-2 gap-3 shrink-0 z-40 overflow-y-auto">
      <PanelLabel>Tools</PanelLabel>
      <div className="grid grid-cols-2 gap-1">
        {TOOLS.map((item) => (
          <DockBtn
            key={item.id}
            active={tool === item.id}
            title={item.title}
            onClick={() => onSetTool(item.id)}
          >
            {item.icon}
          </DockBtn>
        ))}
      </div>

      <DockBtn title="Add image" onClick={() => fileRef.current?.click()} wide>
        Image
      </DockBtn>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      <div className="h-px bg-[var(--ink)]" />

      <PanelLabel>Shape</PanelLabel>
      <div className="grid grid-cols-1 gap-1">
        {SHAPES.map((shape) => (
          <button
            key={shape.id}
            onClick={() => {
              onSetShapeType(shape.id);
              onSetTool('shape');
            }}
            className={`border-2 px-2 py-1 text-[11px] font-semibold text-left transition-colors ${
              shapeType === shape.id
                ? 'border-[var(--riso-blue)] bg-[var(--riso-blue)] text-white'
                : 'border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)]'
            }`}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {shape.label}
          </button>
        ))}
      </div>
      <DockBtn title="Add selected shape now" onClick={() => onAddShape(shapeType)} wide>
        Add
      </DockBtn>

      <ColorGrid
        label="Fill"
        value={shapeStyle.fillColor ?? 'var(--riso-yellow)'}
        onChange={(fillColor) => onSetShapeStyle({ fillColor })}
      />
      <ColorGrid
        label="Line"
        value={shapeStyle.strokeColor ?? 'var(--ink)'}
        onChange={(strokeColor) => onSetShapeStyle({ strokeColor })}
      />

      <label className="flex flex-col gap-1">
        <PanelLabel>Stroke</PanelLabel>
        <input
          type="range"
          min={0}
          max={12}
          value={shapeStyle.strokeWidth ?? 2}
          onChange={(e) => onSetShapeStyle({ strokeWidth: Number(e.target.value) })}
          className="w-full accent-[var(--riso-blue)]"
        />
      </label>

      <select
        value={shapeStyle.strokeDash ?? 'solid'}
        onChange={(e) => onSetShapeStyle({ strokeDash: e.target.value as CanvasItem['strokeDash'] })}
        className="border-2 border-[var(--ink)] bg-[var(--surface)] text-[11px] px-1 py-1 text-[var(--ink)]"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <option value="solid">Solid</option>
        <option value="dashed">Dash</option>
        <option value="dotted">Dot</option>
      </select>

      <label className="flex flex-col gap-1">
        <PanelLabel>Round</PanelLabel>
        <input
          type="range"
          min={0}
          max={48}
          value={shapeStyle.cornerRadius ?? 0}
          onChange={(e) => onSetShapeStyle({ cornerRadius: Number(e.target.value) })}
          className="w-full accent-[var(--riso-blue)]"
        />
      </label>

      {tool === 'draw' && (
        <>
          <div className="h-px bg-[var(--ink)]" />
          <ColorGrid label="Brush" value={drawColor} onChange={onSetDrawColor} />
          <label className="flex flex-col gap-1">
            <PanelLabel>Width</PanelLabel>
            <input
              type="range"
              min={1}
              max={20}
              value={drawWidth}
              onChange={(e) => onSetDrawWidth(Number(e.target.value))}
              className="w-full accent-[var(--riso-blue)]"
            />
          </label>
        </>
      )}
    </aside>
  );
}

function ColorGrid({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) {
  return (
    <div>
      <PanelLabel>{label}</PanelLabel>
      <div className="grid grid-cols-4 gap-1 mt-1">
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

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] uppercase tracking-widest text-[var(--pencil)]" style={{ fontFamily: 'var(--font-mono)' }}>
      {children}
    </span>
  );
}

function DockBtn({ children, onClick, active, title, wide }: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
  wide?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        ${wide ? 'w-full' : 'w-9'} h-9 px-1 flex items-center justify-center text-[11px] border-2 transition-all
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--riso-blue)]
        ${active
          ? 'border-[var(--riso-blue)] bg-[var(--riso-blue)] text-white shadow-[2px_2px_0_var(--ink)]'
          : 'border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)]'
        }
      `}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {children}
    </button>
  );
}
