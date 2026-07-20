'use client';

import { useEditor } from '@/lib/editor-context';
import { PRIMITIVE_LABELS, PRIMITIVE_ICONS, ENVIRONMENT_PRESETS, type PrimitiveType } from '@/lib/scene-types';
import { useRef, useState } from 'react';

const PRIMITIVES: PrimitiveType[] = ['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane', 'capsule'];

export default function Sidebar() {
  const { addPrimitive, addImportedObject, environment, updateEnvironment, objects, selectedId } = useEditor();
  const fileRef = useRef<HTMLInputElement>(null);
  const [envOpen, setEnvOpen] = useState(false);

  const selectedObj = objects.find(o => o.id === selectedId);

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const format = file.name.endsWith('.fbx') ? 'fbx' : 'obj';
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      addImportedObject(file.name.replace(/\.[^/.]+$/, ''), format, data);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <aside className="sidebar">
      {/* Primitives */}
      <p className="panel-label">Primitives</p>
      <div className="primitives-grid">
        {PRIMITIVES.map((type) => (
          <button
            key={type}
            className="primitive-btn"
            onClick={() => addPrimitive(type)}
            title={`Add ${PRIMITIVE_LABELS[type]}`}
          >
            <span className="primitive-icon">{PRIMITIVE_ICONS[type]}</span>
            <span className="primitive-label">{PRIMITIVE_LABELS[type]}</span>
          </button>
        ))}
      </div>

      <div className="sidebar-divider" />

      {/* Import */}
      <p className="panel-label">Import</p>
      <button
        className="import-btn"
        onClick={() => fileRef.current?.click()}
        title="Import OBJ or FBX file"
      >
        <span>📂</span>
        <span>Import OBJ / FBX</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".obj,.fbx"
        className="hidden"
        onChange={handleImport}
      />

      <div className="sidebar-divider" />

      {/* Environment */}
      <button className="panel-label env-toggle" onClick={() => setEnvOpen(!envOpen)}>
        Environment {envOpen ? '▾' : '▸'}
      </button>

      {envOpen && (
        <div className="env-panel">
          {/* Presets */}
          <p className="env-sub-label">Preset</p>
          <div className="env-presets">
            {ENVIRONMENT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                className="env-preset-btn"
                onClick={() => updateEnvironment(preset.env)}
                title={preset.label}
              >
                <span>{preset.icon}</span>
                <span>{preset.label}</span>
              </button>
            ))}
          </div>

          {/* Background color */}
          <p className="env-sub-label">Background</p>
          <div className="color-row" style={{ marginBottom: '0.5rem' }}>
            <input
              type="color"
              className="color-input"
              value={environment.background}
              onChange={(e) => updateEnvironment({ background: e.target.value })}
            />
            <span className="color-hex">{environment.background}</span>
          </div>

          {/* Grid */}
          <p className="env-sub-label">Grid</p>
          <div className="inspector-field row">
            <span className="inspector-field-label">Show Grid</span>
            <input
              type="checkbox"
              className="checkbox-input"
              checked={environment.gridEnabled}
              onChange={(e) => updateEnvironment({ gridEnabled: e.target.checked })}
            />
          </div>
          {environment.gridEnabled && (
            <div className="color-row" style={{ marginBottom: '0.5rem' }}>
              <input
                type="color"
                className="color-input"
                value={environment.gridColor}
                onChange={(e) => updateEnvironment({ gridColor: e.target.value })}
              />
              <span className="color-hex">Grid Color</span>
            </div>
          )}

          {/* Floor */}
          <p className="env-sub-label">Floor</p>
          <div className="inspector-field row">
            <span className="inspector-field-label">Show Floor</span>
            <input
              type="checkbox"
              className="checkbox-input"
              checked={environment.floorEnabled}
              onChange={(e) => updateEnvironment({ floorEnabled: e.target.checked })}
            />
          </div>
          {environment.floorEnabled && (
            <div className="color-row" style={{ marginBottom: '0.5rem' }}>
              <input
                type="color"
                className="color-input"
                value={environment.floorColor}
                onChange={(e) => updateEnvironment({ floorColor: e.target.value })}
              />
              <span className="color-hex">Floor Color</span>
            </div>
          )}

          {/* Fog */}
          <p className="env-sub-label">Fog</p>
          <div className="inspector-field row">
            <span className="inspector-field-label">Enable Fog</span>
            <input
              type="checkbox"
              className="checkbox-input"
              checked={environment.fogEnabled}
              onChange={(e) => updateEnvironment({ fogEnabled: e.target.checked })}
            />
          </div>
          {environment.fogEnabled && (
            <>
              <div className="color-row" style={{ marginBottom: '0.5rem' }}>
                <input
                  type="color"
                  className="color-input"
                  value={environment.fogColor}
                  onChange={(e) => updateEnvironment({ fogColor: e.target.value })}
                />
                <span className="color-hex">Fog Color</span>
              </div>
              <div className="vec3-label" style={{ marginBottom: '0.25rem' }}>Near / Far</div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  className="number-input"
                  value={environment.fogNear}
                  min={0}
                  step={1}
                  onChange={(e) => updateEnvironment({ fogNear: Number(e.target.value) })}
                />
                <input
                  type="number"
                  className="number-input"
                  value={environment.fogFar}
                  min={1}
                  step={1}
                  onChange={(e) => updateEnvironment({ fogFar: Number(e.target.value) })}
                />
              </div>
            </>
          )}

          {/* Lighting Studio */}
          <p className="env-sub-label">💡 Lighting Studio</p>
          <div className="inspector-field row">
            <span className="inspector-field-label">Spotlight</span>
            <input type="checkbox" className="checkbox-input"
              checked={environment.spotLightEnabled ?? false}
              onChange={(e) => updateEnvironment({ spotLightEnabled: e.target.checked })} />
          </div>
          <div className="vec3-label" style={{ marginBottom: '0.25rem' }}>Ambient / Directional</div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input type="range" min={0} max={3} step={0.05} className="range-input"
              value={environment.ambientLightIntensity ?? 0.5}
              onChange={(e) => updateEnvironment({ ambientLightIntensity: parseFloat(e.target.value) })} />
            <input type="range" min={0} max={5} step={0.1} className="range-input"
              value={environment.directionalLightIntensity ?? 1.2}
              onChange={(e) => updateEnvironment({ directionalLightIntensity: parseFloat(e.target.value) })} />
          </div>

          {/* Post-Processing */}
          <p className="env-sub-label">🎬 Post-Processing (VFX)</p>
          <div className="inspector-field row">
            <span className="inspector-field-label">Enable VFX</span>
            <input type="checkbox" className="checkbox-input"
              checked={environment.postProcessingEnabled ?? false}
              onChange={(e) => updateEnvironment({ postProcessingEnabled: e.target.checked })} />
          </div>
          {environment.postProcessingEnabled && (
            <>
              <div className="inspector-field row">
                <span className="inspector-field-label">✨ Bloom (Light Glow)</span>
                <input type="checkbox" className="checkbox-input"
                  checked={environment.bloomEnabled ?? false}
                  onChange={(e) => updateEnvironment({ bloomEnabled: e.target.checked })} />
              </div>
              <div className="inspector-field row">
                <span className="inspector-field-label">🎞 Vignette (Dark edges)</span>
                <input type="checkbox" className="checkbox-input"
                  checked={environment.vignetteEnabled ?? false}
                  onChange={(e) => updateEnvironment({ vignetteEnabled: e.target.checked })} />
              </div>
            </>
          )}

          {/* Physics */}
          <p className="env-sub-label">⚛️ Physics Engine</p>
          <div className="inspector-field row">
            <span className="inspector-field-label">Enable Gravity</span>
            <input type="checkbox" className="checkbox-input"
              checked={environment.physicsEnabled ?? false}
              onChange={(e) => updateEnvironment({ physicsEnabled: e.target.checked })} />
          </div>
          {environment.physicsEnabled && (
            <p className="env-sub-label" style={{ fontSize: '0.7rem', opacity: 0.7 }}>
              Select objects → Inspector → ⚛️ Physics Body to make them fall
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
