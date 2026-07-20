'use client';

import { useEditor } from '@/lib/editor-context';
import { PRIMITIVE_LABELS, PRIMITIVE_ICONS, type PrimitiveType } from '@/lib/scene-types';
import { useRef } from 'react';

const PRIMITIVES: PrimitiveType[] = ['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane', 'capsule'];

export default function Sidebar() {
  const { addPrimitive, addImportedObject } = useEditor();
  const fileRef = useRef<HTMLInputElement>(null);

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
    </aside>
  );
}
