'use client';

import { useEditor } from '@/lib/editor-context';
import type { SceneObject } from '@/lib/scene-types';
import { useRef } from 'react';

function NumberInput({
  label,
  value,
  onChange,
  step = 0.1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="number-input-wrapper">
      <span className="axis-label">{label}</span>
      <input
        type="number"
        step={step}
        value={parseFloat(value.toFixed(3))}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="number-input"
      />
    </label>
  );
}

function Vec3Control({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: [number, number, number];
  onChange: (v: [number, number, number]) => void;
  step?: number;
}) {
  return (
    <div className="vec3-control">
      <p className="vec3-label">{label}</p>
      <div className="vec3-inputs">
        <NumberInput label="X" value={value[0]} step={step} onChange={(v) => onChange([v, value[1], value[2]])} />
        <NumberInput label="Y" value={value[1]} step={step} onChange={(v) => onChange([value[0], v, value[2]])} />
        <NumberInput label="Z" value={value[2]} step={step} onChange={(v) => onChange([value[0], value[1], v])} />
      </div>
    </div>
  );
}

export default function Inspector() {
  const { objects, selectedId, updateObject, sculptMode, sculptBrushSize, setSculptBrushSize, sculptBrushStrength, setSculptBrushStrength, sculptBrushType, setSculptBrushType } = useEditor();
  const obj: SceneObject | undefined = objects.find((o) => o.id === selectedId);
  const textureRef = useRef<HTMLInputElement>(null);

  if (!obj) {
    return (
      <div className="inspector-panel">
        <p className="panel-label">Inspector</p>
        <p className="inspector-empty">Select an object to edit its properties.</p>
      </div>
    );
  }

  const update = (updates: Partial<SceneObject>) => updateObject(obj.id, updates);

  function handleTextureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      update({ textureMap: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div className="inspector-panel">
      <p className="panel-label">Inspector</p>

      {/* Name */}
      <div className="inspector-field">
        <p className="inspector-field-label">Name</p>
        <input
          type="text"
          value={obj.name}
          onChange={(e) => update({ name: e.target.value })}
          className="text-input"
        />
      </div>

      <div className="inspector-divider" />

      {/* Transform */}
      <Vec3Control label="Position" value={obj.position} onChange={(v) => update({ position: v })} />
      <Vec3Control label="Rotation (rad)" value={obj.rotation} step={0.05} onChange={(v) => update({ rotation: v })} />
      <Vec3Control label="Scale" value={obj.scale} step={0.05} onChange={(v) => update({ scale: v })} />

      <div className="inspector-divider" />

      {/* Material */}
      <p className="vec3-label">Material</p>

      <div className="inspector-field">
        <p className="inspector-field-label">Color</p>
        <div className="color-row">
          <input type="color" value={obj.color} onChange={(e) => update({ color: e.target.value })} className="color-input" />
          <span className="color-hex">{obj.color}</span>
        </div>
      </div>

      <div className="inspector-field">
        <p className="inspector-field-label">Opacity</p>
        <input type="range" min={0} max={1} step={0.01} value={obj.opacity}
          onChange={(e) => update({ opacity: parseFloat(e.target.value) })} className="range-input" />
        <span className="range-value">{obj.opacity.toFixed(2)}</span>
      </div>

      <div className="inspector-field">
        <p className="inspector-field-label">Metalness</p>
        <input type="range" min={0} max={1} step={0.01} value={obj.metalness}
          onChange={(e) => update({ metalness: parseFloat(e.target.value) })} className="range-input" />
        <span className="range-value">{obj.metalness.toFixed(2)}</span>
      </div>

      <div className="inspector-field">
        <p className="inspector-field-label">Roughness</p>
        <input type="range" min={0} max={1} step={0.01} value={obj.roughness}
          onChange={(e) => update({ roughness: parseFloat(e.target.value) })} className="range-input" />
        <span className="range-value">{obj.roughness.toFixed(2)}</span>
      </div>

      <div className="inspector-field row">
        <p className="inspector-field-label">Wireframe</p>
        <input type="checkbox" checked={obj.wireframe}
          onChange={(e) => update({ wireframe: e.target.checked })} className="checkbox-input" />
      </div>

      <div className="inspector-divider" />

      {/* Texture Map */}
      <p className="vec3-label">Texture Map</p>
      {obj.textureMap ? (
        <div className="inspector-field row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={obj.textureMap} alt="Texture" style={{ width: 48, height: 48, objectFit: 'cover', border: '2px solid #000', borderRadius: 4 }} />
          <button className="toolbar-btn" style={{ fontSize: '0.75rem' }} onClick={() => update({ textureMap: undefined })}>🗑 Remove</button>
        </div>
      ) : (
        <button className="import-btn" style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }} onClick={() => textureRef.current?.click()}>
          📷 Upload Texture
        </button>
      )}
      <input ref={textureRef} type="file" accept="image/*" className="hidden" onChange={handleTextureUpload} />

      <div className="inspector-divider" />

      {/* Animation */}
      <p className="vec3-label">Animation</p>
      <div className="inspector-field">
        <select
          className="text-input"
          value={obj.animationType ?? 'none'}
          onChange={(e) => update({ animationType: e.target.value as SceneObject['animationType'] })}
        >
          <option value="none">None (Static)</option>
          <option value="spin">🔄 Spin (Y-axis rotation)</option>
          <option value="float">🪂 Float (Hover up/down)</option>
          <option value="pulse">💗 Pulse (Scale in/out)</option>
        </select>
      </div>

      <div className="inspector-divider" />

      {/* Sculpting */}
      {sculptMode && (
        <>
          <p className="vec3-label" style={{ color: '#ff4d4d' }}>🖐️ Sculpting Brush</p>
          <div className="inspector-field">
            <p className="inspector-field-label">Type</p>
            <select
              className="text-input"
              value={sculptBrushType}
              onChange={(e) => setSculptBrushType(e.target.value as 'push' | 'pull')}
            >
              <option value="push">Push (밀어넣기)</option>
              <option value="pull">Pull (당기기)</option>
            </select>
          </div>
          <div className="inspector-field">
            <p className="inspector-field-label">Size</p>
            <input type="range" min={0.1} max={2} step={0.1} value={sculptBrushSize}
              onChange={(e) => setSculptBrushSize(parseFloat(e.target.value))} className="range-input" />
            <span className="range-value">{sculptBrushSize.toFixed(1)}</span>
          </div>
          <div className="inspector-field">
            <p className="inspector-field-label">Strength</p>
            <input type="range" min={0.01} max={0.5} step={0.01} value={sculptBrushStrength}
              onChange={(e) => setSculptBrushStrength(parseFloat(e.target.value))} className="range-input" />
            <span className="range-value">{sculptBrushStrength.toFixed(2)}</span>
          </div>
          <div className="inspector-divider" />
        </>
      )}

      {/* Physics & VFX */}
      <p className="vec3-label">Physics & VFX</p>
      <div className="inspector-field row">
        <p className="inspector-field-label">⚛️ Physics Body (Gravity)</p>
        <input type="checkbox" checked={obj.isPhysicsBody ?? false}
          onChange={(e) => update({ isPhysicsBody: e.target.checked })} className="checkbox-input" />
      </div>
      <div className="inspector-field row">
        <p className="inspector-field-label">✨ Sparkles Effect</p>
        <input type="checkbox" checked={obj.hasSparkles ?? false}
          onChange={(e) => update({ hasSparkles: e.target.checked })} className="checkbox-input" />
      </div>
    </div>
  );
}
