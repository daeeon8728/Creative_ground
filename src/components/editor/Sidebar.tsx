'use client';

import { useRef, useState } from 'react';
import { useEditor } from '@/lib/editor-context';
import { PRIMITIVE_LABELS, PRIMITIVE_ICONS, ENVIRONMENT_PRESETS, type PrimitiveType } from '@/lib/scene-types';

const PRIMITIVES: PrimitiveType[] = ['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane', 'capsule'];
const PRESETS = [
  { id: 'table', label: 'Table' },
  { id: 'chair', label: 'Chair' },
  { id: 'lamp', label: 'Lamp' },
  { id: 'arch', label: 'Arch' },
  { id: 'pedestal', label: 'Pedestal' },
] as const;

export default function Sidebar() {
  const { addPrimitive, addImportedObject, addModelPreset, environment, updateEnvironment } = useEditor();
  const fileRef = useRef<HTMLInputElement>(null);
  const [envOpen, setEnvOpen] = useState(true);

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const format = file.name.toLowerCase().endsWith('.fbx') ? 'fbx' : 'obj';
    const reader = new FileReader();
    reader.onload = (ev) => {
      addImportedObject(file.name.replace(/\.[^/.]+$/, ''), format, String(ev.target?.result ?? ''));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <aside className="sidebar">
      <p className="panel-label">Primitives</p>
      <div className="primitives-grid">
        {PRIMITIVES.map((type) => (
          <button key={type} className="primitive-btn" onClick={() => addPrimitive(type)} title={`Add ${PRIMITIVE_LABELS[type]}`}>
            <span className="primitive-icon">{PRIMITIVE_ICONS[type]}</span>
            <span className="primitive-label">{PRIMITIVE_LABELS[type]}</span>
          </button>
        ))}
      </div>

      <div className="sidebar-divider" />
      <p className="panel-label">Model Kits</p>
      <div className="preset-grid">
        {PRESETS.map((preset) => (
          <button key={preset.id} className="preset-btn" onClick={() => addModelPreset(preset.id)} title={`Add ${preset.label} kit`}>
            {preset.label}
          </button>
        ))}
      </div>

      <div className="sidebar-divider" />
      <p className="panel-label">Import</p>
      <button className="import-btn" onClick={() => fileRef.current?.click()} title="Import OBJ or FBX file">
        Import OBJ / FBX
      </button>
      <input ref={fileRef} type="file" accept=".obj,.fbx" className="hidden" onChange={handleImport} />

      <div className="sidebar-divider" />
      <button className="panel-label env-toggle" onClick={() => setEnvOpen(!envOpen)}>
        Environment {envOpen ? '-' : '+'}
      </button>

      {envOpen && (
        <div className="env-panel">
          <p className="env-sub-label">Preset</p>
          <div className="env-presets">
            {ENVIRONMENT_PRESETS.map((preset) => (
              <button key={preset.label} className="env-preset-btn" onClick={() => updateEnvironment(preset.env)} title={preset.label}>
                <span>{preset.icon}</span>
                <span>{preset.label}</span>
              </button>
            ))}
          </div>

          <p className="env-sub-label">Background</p>
          <div className="color-row compact-row">
            <input type="color" className="color-input" value={environment.background} onChange={(e) => updateEnvironment({ background: e.target.value })} />
            <span className="color-hex">{environment.background}</span>
          </div>

          <p className="env-sub-label">Grid and Snap</p>
          <label className="inspector-field row">
            <span className="inspector-field-label">Show Grid</span>
            <input type="checkbox" className="checkbox-input" checked={environment.gridEnabled} onChange={(e) => updateEnvironment({ gridEnabled: e.target.checked })} />
          </label>
          <div className="color-row compact-row">
            <input type="color" className="color-input" value={environment.gridColor} onChange={(e) => updateEnvironment({ gridColor: e.target.value })} />
            <span className="color-hex">Grid color</span>
          </div>
          <label className="inspector-field row">
            <span className="inspector-field-label">Transform Snap</span>
            <input type="checkbox" className="checkbox-input" checked={environment.snapEnabled ?? false} onChange={(e) => updateEnvironment({ snapEnabled: e.target.checked })} />
          </label>
          <label className="inspector-field">
            <span className="inspector-field-label">Snap Size</span>
            <input type="number" className="number-input" min={0.05} step={0.05} value={environment.snapSize ?? 0.5} onChange={(e) => updateEnvironment({ snapSize: Number(e.target.value) || 0.5 })} />
          </label>

          <p className="env-sub-label">Floor</p>
          <label className="inspector-field row">
            <span className="inspector-field-label">Show Floor</span>
            <input type="checkbox" className="checkbox-input" checked={environment.floorEnabled} onChange={(e) => updateEnvironment({ floorEnabled: e.target.checked })} />
          </label>
          <div className="color-row compact-row">
            <input type="color" className="color-input" value={environment.floorColor} onChange={(e) => updateEnvironment({ floorColor: e.target.value })} />
            <span className="color-hex">Floor color</span>
          </div>

          <p className="env-sub-label">Fog</p>
          <label className="inspector-field row">
            <span className="inspector-field-label">Enable Fog</span>
            <input type="checkbox" className="checkbox-input" checked={environment.fogEnabled} onChange={(e) => updateEnvironment({ fogEnabled: e.target.checked })} />
          </label>
          {environment.fogEnabled && (
            <>
              <div className="color-row compact-row">
                <input type="color" className="color-input" value={environment.fogColor} onChange={(e) => updateEnvironment({ fogColor: e.target.value })} />
                <span className="color-hex">Fog color</span>
              </div>
              <div className="two-input-row">
                <input type="number" className="number-input" value={environment.fogNear} min={0} step={1} onChange={(e) => updateEnvironment({ fogNear: Number(e.target.value) })} />
                <input type="number" className="number-input" value={environment.fogFar} min={1} step={1} onChange={(e) => updateEnvironment({ fogFar: Number(e.target.value) })} />
              </div>
            </>
          )}

          <p className="env-sub-label">Lighting</p>
          <label className="inspector-field row">
            <span className="inspector-field-label">Spotlight</span>
            <input type="checkbox" className="checkbox-input" checked={environment.spotLightEnabled ?? false} onChange={(e) => updateEnvironment({ spotLightEnabled: e.target.checked })} />
          </label>
          <label className="range-field">
            <span>Ambient {environment.ambientLightIntensity.toFixed(2)}</span>
            <input type="range" min={0} max={3} step={0.05} className="range-input" value={environment.ambientLightIntensity} onChange={(e) => updateEnvironment({ ambientLightIntensity: parseFloat(e.target.value) })} />
          </label>
          <label className="range-field">
            <span>Key {environment.directionalLightIntensity.toFixed(2)}</span>
            <input type="range" min={0} max={5} step={0.1} className="range-input" value={environment.directionalLightIntensity} onChange={(e) => updateEnvironment({ directionalLightIntensity: parseFloat(e.target.value) })} />
          </label>

          <p className="env-sub-label">Effects</p>
          <label className="inspector-field row">
            <span className="inspector-field-label">Post FX</span>
            <input type="checkbox" className="checkbox-input" checked={environment.postProcessingEnabled ?? false} onChange={(e) => updateEnvironment({ postProcessingEnabled: e.target.checked })} />
          </label>
          {environment.postProcessingEnabled && (
            <>
              <label className="inspector-field row">
                <span className="inspector-field-label">Bloom</span>
                <input type="checkbox" className="checkbox-input" checked={environment.bloomEnabled ?? false} onChange={(e) => updateEnvironment({ bloomEnabled: e.target.checked })} />
              </label>
              <label className="inspector-field row">
                <span className="inspector-field-label">Vignette</span>
                <input type="checkbox" className="checkbox-input" checked={environment.vignetteEnabled ?? false} onChange={(e) => updateEnvironment({ vignetteEnabled: e.target.checked })} />
              </label>
            </>
          )}

          <p className="env-sub-label">Physics</p>
          <label className="inspector-field row">
            <span className="inspector-field-label">Gravity</span>
            <input type="checkbox" className="checkbox-input" checked={environment.physicsEnabled ?? false} onChange={(e) => updateEnvironment({ physicsEnabled: e.target.checked })} />
          </label>
        </div>
      )}
    </aside>
  );
}
