'use client';

import { useRef, useState } from 'react';
import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION, ADDITION, INTERSECTION } from 'three-bvh-csg';
import { useEditor } from '@/lib/editor-context';
import type { SceneObject, ShadingMode } from '@/lib/scene-types';

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

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
      <input type="number" step={step} value={Number(value.toFixed(3))} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="number-input" />
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

function applyShading(mode: ShadingMode): Partial<SceneObject> {
  if (mode === 'matte') return { shadingMode: mode, metalness: 0, roughness: 0.92, opacity: 1, wireframe: false };
  if (mode === 'metal') return { shadingMode: mode, metalness: 0.85, roughness: 0.22, opacity: 1, wireframe: false };
  if (mode === 'glass') return { shadingMode: mode, metalness: 0, roughness: 0.04, opacity: 0.36, wireframe: false };
  if (mode === 'emissive') return { shadingMode: mode, metalness: 0, roughness: 0.35, opacity: 1, wireframe: false, hasSparkles: true };
  return { shadingMode: mode, metalness: 0.1, roughness: 0.7, opacity: 1 };
}

export default function Inspector() {
  const {
    objects,
    selectedId,
    updateObject,
    alignSelected,
    groundSelected,
    frameSelected,
    sculptMode,
    sculptBrushSize,
    setSculptBrushSize,
    sculptBrushStrength,
    setSculptBrushStrength,
    sculptBrushType,
    setSculptBrushType,
    meshes,
  } = useEditor();

  function handleSubdivide() {
    if (!selectedId) return;
    const mesh = meshes[selectedId];
    if (!mesh) return;

    // Simple Loop/Catmull-Clark midpoint subdivision step
    const src = mesh.geometry;
    const posAttr = src.attributes.position;
    const idxAttr = src.index;
    if (!posAttr || !idxAttr) return;

    const newPositions: number[] = [];
    const newIndices: number[] = [];
    const midpointCache = new Map<string, number>();

    function getVertex(i: number) {
      return [posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)];
    }
    function getMidpoint(a: number, b: number): number {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (midpointCache.has(key)) return midpointCache.get(key)!;
      const va = getVertex(a), vb = getVertex(b);
      const idx = newPositions.length / 3;
      newPositions.push((va[0] + vb[0]) / 2, (va[1] + vb[1]) / 2, (va[2] + vb[2]) / 2);
      midpointCache.set(key, idx);
      return idx;
    }

    // Copy existing vertices
    for (let i = 0; i < posAttr.count; i++) {
      newPositions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
    }
    // Subdivide each triangle into 4
    for (let i = 0; i < idxAttr.count; i += 3) {
      const a = idxAttr.getX(i), b = idxAttr.getX(i + 1), c = idxAttr.getX(i + 2);
      const ab = getMidpoint(a, b), bc = getMidpoint(b, c), ca = getMidpoint(c, a);
      newIndices.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca);
    }

    const newGeo = new THREE.BufferGeometry();
    newGeo.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    newGeo.setIndex(newIndices);
    newGeo.computeVertexNormals();

    const json = JSON.stringify(newGeo.toJSON());
    updateObject(selectedId, { type: 'custom-mesh' as any, importData: json });
  }
  const obj: SceneObject | undefined = objects.find((o) => o.id === selectedId);
  const textureRef = useRef<HTMLInputElement>(null);
  const [uniformScale, setUniformScale] = useState(true);

  if (!obj) {
    return (
      <div className="inspector-panel">
        <p className="panel-label">Inspector</p>
        <p className="inspector-empty">Select an object to edit transforms, materials, animation, and physics.</p>
      </div>
    );
  }

  const selectedObj = obj;
  const update = (updates: Partial<SceneObject>) => updateObject(obj.id, updates);
  const rotationDeg: [number, number, number] = selectedObj.rotation.map((v) => v * RAD_TO_DEG) as [number, number, number];

  function handleTextureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => update({ textureMap: String(ev.target?.result ?? '') });
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function updateScale(next: [number, number, number]) {
    if (!uniformScale) {
      update({ scale: next });
      return;
    }
    const changedIndex = next.findIndex((value, index) => value !== selectedObj.scale[index]);
    const uniform = changedIndex >= 0 ? next[changedIndex] : next[0];
    update({ scale: [uniform, uniform, uniform] });
  }

  return (
    <div className="inspector-panel">
      <p className="panel-label">Inspector</p>

      <div className="inspector-field">
        <p className="inspector-field-label">Name</p>
        <input type="text" value={obj.name} onChange={(e) => update({ name: e.target.value })} className="text-input" disabled={obj.locked} />
      </div>
      <label className="inspector-field row">
        <span className="inspector-field-label">Lock Object</span>
        <input type="checkbox" checked={obj.locked ?? false} onChange={(e) => updateObject(obj.id, { locked: e.target.checked })} className="checkbox-input" />
      </label>

      <div className="inspector-divider" />
      <Vec3Control label="Position" value={obj.position} onChange={(v) => update({ position: v })} />
      <Vec3Control label="Rotation Degrees" value={rotationDeg} step={1} onChange={(v) => update({ rotation: v.map((n) => n * DEG_TO_RAD) as [number, number, number] })} />
      <label className="inspector-field row">
        <span className="inspector-field-label">Uniform Scale</span>
        <input type="checkbox" checked={uniformScale} onChange={(e) => setUniformScale(e.target.checked)} className="checkbox-input" />
      </label>
      <Vec3Control label="Scale" value={obj.scale} step={0.05} onChange={updateScale} />
      <div className="button-row">
        <button className="mini-btn" onClick={() => update({ position: [0, obj.position[1], obj.position[2]] })}>Center X</button>
        <button className="mini-btn" onClick={() => alignSelected('y')}>Center Y</button>
        <button className="mini-btn" onClick={() => update({ position: [obj.position[0], obj.position[1], 0] })}>Center Z</button>
      </div>
      <div className="button-row">
        <button className="mini-btn" onClick={groundSelected}>Ground</button>
        <button className="mini-btn" onClick={frameSelected}>Frame</button>
        <button className="mini-btn" onClick={() => update({ rotation: [0, 0, 0], scale: [1, 1, 1] })}>Reset</button>
        <button className="mini-btn" onClick={handleSubdivide} title="Subdivide: double the mesh resolution for more sculpt detail">Subdivide ×4</button>
      </div>

      <div className="inspector-divider" />
      <p className="vec3-label">Material</p>
      <div className="segmented-row">
        {(['solid', 'matte', 'metal', 'glass', 'emissive'] as ShadingMode[]).map((mode) => (
          <button key={mode} className={`segment-btn${(obj.shadingMode ?? 'solid') === mode ? ' active' : ''}`} onClick={() => update(applyShading(mode))}>
            {mode}
          </button>
        ))}
      </div>
      <div className="inspector-field">
        <p className="inspector-field-label">Color</p>
        <div className="color-row">
          <input type="color" value={obj.color} onChange={(e) => update({ color: e.target.value })} className="color-input" />
          <span className="color-hex">{obj.color}</span>
        </div>
      </div>
      <label className="range-field">
        <span>Opacity {obj.opacity.toFixed(2)}</span>
        <input type="range" min={0} max={1} step={0.01} value={obj.opacity} onChange={(e) => update({ opacity: parseFloat(e.target.value) })} className="range-input" />
      </label>
      <label className="range-field">
        <span>Metalness {obj.metalness.toFixed(2)}</span>
        <input type="range" min={0} max={1} step={0.01} value={obj.metalness} onChange={(e) => update({ metalness: parseFloat(e.target.value) })} className="range-input" />
      </label>
      <label className="range-field">
        <span>Roughness {obj.roughness.toFixed(2)}</span>
        <input type="range" min={0} max={1} step={0.01} value={obj.roughness} onChange={(e) => update({ roughness: parseFloat(e.target.value) })} className="range-input" />
      </label>
      <label className="inspector-field row">
        <span className="inspector-field-label">Wireframe</span>
        <input type="checkbox" checked={obj.wireframe} onChange={(e) => update({ wireframe: e.target.checked })} className="checkbox-input" />
      </label>

      <div className="inspector-divider" />
      <p className="vec3-label">Texture</p>
      {obj.textureMap ? (
        <div className="texture-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={obj.textureMap} alt="Texture preview" />
          <button className="mini-btn" onClick={() => update({ textureMap: undefined })}>Remove</button>
        </div>
      ) : (
        <button className="import-btn compact-import" onClick={() => textureRef.current?.click()}>Upload Texture</button>
      )}
      <input ref={textureRef} type="file" accept="image/*" className="hidden" onChange={handleTextureUpload} />

      <div className="inspector-divider" />
      <p className="vec3-label">Animation</p>
      <select className="text-input" value={obj.animationType ?? 'none'} onChange={(e) => update({ animationType: e.target.value as SceneObject['animationType'] })}>
        <option value="none">None</option>
        <option value="spin">Spin</option>
        <option value="float">Float</option>
        <option value="pulse">Pulse</option>
      </select>

      <div className="inspector-divider" />
      <CSGPanel obj={obj} />

      <div className="inspector-divider" />
      <p className="vec3-label">Physics and VFX</p>
      <label className="inspector-field row">
        <span className="inspector-field-label">Physics Body</span>
        <input type="checkbox" checked={obj.isPhysicsBody ?? false} onChange={(e) => update({ isPhysicsBody: e.target.checked })} className="checkbox-input" />
      </label>
      <label className="inspector-field row">
        <span className="inspector-field-label">Sparkles (VFX)</span>
        <input type="checkbox" checked={obj.hasSparkles ?? false} onChange={(e) => update({ hasSparkles: e.target.checked })} className="checkbox-input" />
      </label>

      {sculptMode && (
        <>
          <div className="inspector-divider" />
          <p className="vec3-label">Sculpt Brush</p>
          <div className="segmented-row">
            <button className={`segment-btn${sculptBrushType === 'push' ? ' active' : ''}`} onClick={() => setSculptBrushType('push')}>Push</button>
            <button className={`segment-btn${sculptBrushType === 'pull' ? ' active' : ''}`} onClick={() => setSculptBrushType('pull')}>Pull</button>
          </div>
          <label className="range-field">
            <span>Size {sculptBrushSize.toFixed(2)}</span>
            <input type="range" min={0.05} max={1.5} step={0.01} value={sculptBrushSize} onChange={(e) => setSculptBrushSize(parseFloat(e.target.value))} className="range-input" />
          </label>
          <label className="range-field">
            <span>Strength {sculptBrushStrength.toFixed(3)}</span>
            <input type="range" min={0.001} max={0.05} step={0.001} value={sculptBrushStrength} onChange={(e) => setSculptBrushStrength(parseFloat(e.target.value))} className="range-input" />
          </label>
        </>
      )}
    </div>
  );
}

function CSGPanel({ obj }: { obj: SceneObject }) {
  const { objects, meshes, updateObject, deleteObject } = useEditor();
  const [targetId, setTargetId] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const otherObjects = objects.filter((o) => o.id !== obj.id && !o.locked);

  async function handleCSG(operation: 'union' | 'subtract' | 'intersect') {
    if (!targetId) { setStatus('Select a target object first.'); return; }
    const mesh1 = meshes[obj.id];
    const mesh2 = meshes[targetId];
    if (!mesh1 || !mesh2) { setStatus('Mesh not found. Select objects in viewport first.'); return; }

    try {
      setStatus('Computing...');
      const evaluator = new Evaluator();
      evaluator.useGroups = false;

      const brush1 = new Brush(mesh1.geometry.clone());
      brush1.position.copy(mesh1.position);
      brush1.rotation.copy(mesh1.rotation);
      brush1.scale.copy(mesh1.scale);
      brush1.updateMatrixWorld(true);

      const brush2 = new Brush(mesh2.geometry.clone());
      brush2.position.copy(mesh2.position);
      brush2.rotation.copy(mesh2.rotation);
      brush2.scale.copy(mesh2.scale);
      brush2.updateMatrixWorld(true);

      const op = operation === 'union' ? ADDITION : operation === 'subtract' ? SUBTRACTION : INTERSECTION;
      const result = evaluator.evaluate(brush1, brush2, op);

      result.geometry.computeVertexNormals();

      // Store the merged geometry JSON as importData on the source object
      const json = JSON.stringify(result.geometry.toJSON());
      updateObject(obj.id, { type: 'custom-mesh' as any, importData: json });
      deleteObject(targetId);
      setTargetId('');
      setStatus('Done! Boolean result applied.');
    } catch (err) {
      setStatus(`Error: ${String(err)}`);
    }
  }

  return (
    <>
      <p className="vec3-label">Boolean Operations (CSG)</p>
      <select className="text-input" value={targetId} onChange={(e) => { setTargetId(e.target.value); setStatus(''); }}>
        <option value="">Select Target Object...</option>
        {otherObjects.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
      <div className="segmented-row" style={{ marginTop: 8 }}>
        <button className="segment-btn" onClick={() => handleCSG('union')}>Union</button>
        <button className="segment-btn" onClick={() => handleCSG('subtract')}>Subtract</button>
        <button className="segment-btn" onClick={() => handleCSG('intersect')}>Intersect</button>
      </div>
      {status && <p style={{ fontSize: 11, color: 'var(--accent)', marginTop: 6 }}>{status}</p>}
    </>
  );
}
