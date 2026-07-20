'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { EditorProvider, useEditor } from '@/lib/editor-context';
import { saveScene, getScene, createEmptyScene } from '@/lib/scene-db';
import type { SceneData } from '@/lib/scene-types';
import Sidebar from '@/components/editor/Sidebar';
import Hierarchy from '@/components/editor/Hierarchy';
import Inspector from '@/components/editor/Inspector';
import EditorToolbar from '@/components/editor/EditorToolbar';
import AiPanel from '@/components/editor/AiPanel';

// Dynamic import: Three.js must be client-side only
const Viewport = dynamic(() => import('@/components/editor/Viewport'), {
  ssr: false,
  loading: () => (
    <div className="viewport-loading">
      <div className="viewport-loading-spinner" />
      <p>Loading 3D Engine…</p>
    </div>
  ),
});

// ─── Inner editor (has access to context) ────────────────────────

function EditorInner({ projectId }: { projectId: string }) {
  const { scene, setSaveStatus, setScene, aiPanelOpen, setAiPanelOpen } = useEditor();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (scene) {
        setSaveStatus('saving');
        await saveScene({ ...scene, id: projectId });
        setSaveStatus('saved');
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [scene, projectId, setSaveStatus]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handleSave = useCallback(async () => {
    if (!scene) return;
    setSaveStatus('saving');
    await saveScene({ ...scene, id: projectId });
    setSaveStatus('saved');
  }, [scene, projectId, setSaveStatus]);

  const handleExportPng = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${scene?.name ?? 'scene'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [scene]);

  const handleExportGlb = useCallback(async () => {
    const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
    const THREE = await import('three');

    type ThreeModule = typeof THREE;
    const { Group, SphereGeometry, CylinderGeometry, ConeGeometry, TorusGeometry,
            PlaneGeometry, CapsuleGeometry, BoxGeometry, MeshStandardMaterial, Mesh } = THREE as ThreeModule;

    const group = new Group();

    (scene?.objects ?? []).forEach((obj) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let geo: any;
      switch (obj.type) {
        case 'sphere':   geo = new SphereGeometry(0.5, 32, 32); break;
        case 'cylinder': geo = new CylinderGeometry(0.5, 0.5, 1, 32); break;
        case 'cone':     geo = new ConeGeometry(0.5, 1, 32); break;
        case 'torus':    geo = new TorusGeometry(0.4, 0.15, 16, 64); break;
        case 'plane':    geo = new PlaneGeometry(1, 1); break;
        case 'capsule':  geo = new CapsuleGeometry(0.3, 0.6, 8, 16); break;
        default:         geo = new BoxGeometry(1, 1, 1);
      }
      const mat = new MeshStandardMaterial({ color: obj.color, wireframe: obj.wireframe });
      const mesh = new Mesh(geo, mat);
      mesh.position.set(...obj.position);
      mesh.rotation.set(...obj.rotation);
      mesh.scale.set(...obj.scale);
      mesh.name = obj.name;
      if (obj.visible) group.add(mesh);
    });

    const exporter = new GLTFExporter();
    exporter.parse(
      group,
      (gltf) => {
        const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${scene?.name ?? 'scene'}.glb`;
        a.click();
        URL.revokeObjectURL(url);
      },
      (err) => console.error('GLB export error:', err),
      { binary: true }
    );
  }, [scene]);

  const handleShare = useCallback(async () => {
    if (!scene) return;
    const canvas = document.querySelector('canvas');
    const thumbnail = canvas?.toDataURL('image/png', 0.5) ?? '';
    const title = scene.name || 'Untitled Scene';
    const description = prompt('Add a description (optional):') ?? '';
    if (!description && !confirm('Share without description?')) return;

    const res = await fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, scene, thumbnail }),
    });
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/gallery/${id}`);
    } else {
      const err = await res.text();
      alert('Share failed: ' + err);
    }
  }, [scene, router]);

  return (
    <div className="editor-layout">
      <EditorToolbar
        onSave={handleSave}
        onExportGlb={handleExportGlb}
        onExportPng={handleExportPng}
        onShare={handleShare}
      />

      <div className="editor-main">
        <Sidebar />

        <div className="viewport-wrapper">
          <Viewport canvasRef={canvasRef} />

          {/* AI Panel overlay */}
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

// ─── Editor Page (loads/creates scene) ───────────────────────────

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
        <p>Loading scene…</p>
      </div>
    );
  }

  return (
    <EditorProvider initialScene={initialScene}>
      <EditorInner projectId={projectId} />
    </EditorProvider>
  );
}
