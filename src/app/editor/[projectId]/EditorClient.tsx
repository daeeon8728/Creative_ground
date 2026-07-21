'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { EditorProvider, useEditor } from '@/lib/editor-context';
import { saveScene, getScene, createEmptyScene } from '@/lib/scene-db';
import type { SceneData } from '@/lib/scene-types';
import type { BufferGeometry } from 'three';
import Sidebar from '@/components/editor/Sidebar';
import Hierarchy from '@/components/editor/Hierarchy';
import Inspector from '@/components/editor/Inspector';
import EditorToolbar from '@/components/editor/EditorToolbar';
import SculptToolbar from '@/components/editor/SculptToolbar';
import AiPanel from '@/components/editor/AiPanel';

const Viewport = dynamic(() => import('@/components/editor/Viewport'), {
  ssr: false,
  loading: () => (
    <div className="viewport-loading">
      <div className="viewport-loading-spinner" />
      <p>Loading 3D engine...</p>
    </div>
  ),
});

function EditorInner({ projectId }: { projectId: string }) {
  const {
    scene,
    setScene,
    setSaveStatus,
    aiPanelOpen,
    setAiPanelOpen,
    selectedId,
    deleteObject,
    duplicateObject,
    copyObject,
    pasteObject,
    undo,
    redo,
    setTransformMode,
    frameSelected,
  } = useEditor();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const jsonImportRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSave = useCallback(async () => {
    if (!scene) return;
    setSaveStatus('saving');
    await saveScene({ ...scene, id: projectId });
    setSaveStatus('saved');
  }, [scene, projectId, setSaveStatus]);

  useEffect(() => {
    const interval = setInterval(handleSave, 30_000);
    return () => clearInterval(interval);
  }, [handleSave]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSave();
      } else if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if ((mod && e.key.toLowerCase() === 'y') || (mod && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === 'c' && selectedId) {
        e.preventDefault();
        copyObject(selectedId);
      } else if (mod && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteObject();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) deleteObject(selectedId);
      } else if (e.key.toLowerCase() === 'd' && selectedId) {
        duplicateObject(selectedId);
      } else if (e.key.toLowerCase() === 'g') {
        setTransformMode('translate');
      } else if (e.key.toLowerCase() === 'r') {
        setTransformMode('rotate');
      } else if (e.key.toLowerCase() === 's') {
        setTransformMode('scale');
      } else if (e.key.toLowerCase() === 'f') {
        frameSelected();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [copyObject, deleteObject, duplicateObject, frameSelected, handleSave, pasteObject, redo, selectedId, setTransformMode, undo]);

  const handleExportPng = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${scene?.name ?? 'scene'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [scene]);

  const handleExportJson = useCallback(() => {
    if (!scene) return;
    const blob = new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scene.name || 'scene'}.forge3d.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [scene]);

  const handleImportJson = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result ?? '')) as SceneData;
        setScene({ ...parsed, id: projectId, updatedAt: Date.now() });
      } catch {
        alert('This is not a valid Forge3D scene file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [projectId, setScene]);

  const handleExportGlb = useCallback(async () => {
    const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
    const THREE = await import('three');
    const group = new THREE.Group();

    (scene?.objects ?? []).forEach((obj) => {
      if (!obj.visible || obj.type.startsWith('imported')) return;
      let geo: BufferGeometry;
      switch (obj.type) {
        case 'sphere': geo = new THREE.SphereGeometry(0.5, 32, 32); break;
        case 'cylinder': geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 32); break;
        case 'cone': geo = new THREE.ConeGeometry(0.5, 1, 32); break;
        case 'torus': geo = new THREE.TorusGeometry(0.4, 0.15, 16, 64); break;
        case 'plane': geo = new THREE.PlaneGeometry(1, 1); break;
        case 'capsule': geo = new THREE.CapsuleGeometry(0.3, 0.6, 8, 16); break;
        default: geo = new THREE.BoxGeometry(1, 1, 1);
      }
      const mat = new THREE.MeshStandardMaterial({
        color: obj.color,
        wireframe: obj.wireframe,
        transparent: obj.opacity < 1,
        opacity: obj.opacity,
        metalness: obj.metalness,
        roughness: obj.roughness,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...obj.position);
      mesh.rotation.set(...obj.rotation);
      mesh.scale.set(...obj.scale);
      mesh.name = obj.name;
      group.add(mesh);
    });

    new GLTFExporter().parse(group, (gltf) => {
      const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${scene?.name ?? 'scene'}.glb`;
      a.click();
      URL.revokeObjectURL(url);
    }, (err) => console.error('GLB export error:', err), { binary: true });
  }, [scene]);

  const handleShare = useCallback(async () => {
    if (!scene) return;
    const canvas = document.querySelector('canvas');
    const thumbnail = canvas?.toDataURL('image/png', 0.5) ?? '';
    const description = prompt('Add a description (optional):') ?? '';
    if (!description && !confirm('Share without description?')) return;

    const res = await fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: scene.name || 'Untitled Scene', description, scene, thumbnail }),
    });
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/gallery/${id}`);
    } else {
      alert('Share failed: ' + await res.text());
    }
  }, [scene, router]);

  return (
    <div className="editor-layout">
      <EditorToolbar
        onSave={handleSave}
        onExportGlb={handleExportGlb}
        onExportPng={handleExportPng}
        onExportJson={handleExportJson}
        onImportJson={() => jsonImportRef.current?.click()}
        onShare={handleShare}
      />
      <input ref={jsonImportRef} type="file" accept=".json,.forge3d" className="hidden" onChange={handleImportJson} />
      <SculptToolbar />

      <div className="editor-main">
        <Sidebar />
        <div className="viewport-wrapper">
          <Viewport canvasRef={canvasRef} />
          {aiPanelOpen && (
            <div className="ai-panel-overlay">
              <AiPanel onClose={() => setAiPanelOpen(false)} />
            </div>
          )}
        </div>
        <div className="right-panel">
          <Hierarchy />
          <Inspector />
        </div>
      </div>
    </div>
  );
}

export default function EditorPage({ projectId }: { projectId: string }) {
  const [initialScene, setInitialScene] = useState<SceneData | null>(null);

  useEffect(() => {
    (async () => {
      const existing = await getScene(projectId);
      if (existing) {
        setInitialScene(existing);
      } else {
        const fresh = createEmptyScene(projectId, 'Untitled Scene');
        await saveScene(fresh);
        setInitialScene(fresh);
      }
    })();
  }, [projectId]);

  if (!initialScene) {
    return (
      <div className="viewport-loading">
        <div className="viewport-loading-spinner" />
        <p>Loading scene...</p>
      </div>
    );
  }

  return (
    <EditorProvider initialScene={initialScene}>
      <EditorInner projectId={projectId} />
    </EditorProvider>
  );
}
