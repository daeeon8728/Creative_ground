'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { getAllScenes, deleteScene, saveScene, createEmptyScene } from '@/lib/scene-db';
import type { SceneData } from '@/lib/scene-types';

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function ProjectsPage() {
  const router = useRouter();
  const [scenes, setScenes] = useState<SceneData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllScenes().then((s) => {
      setScenes(s);
      setLoading(false);
    });
  }, []);

  async function handleNew() {
    const id = nanoid();
    const scene = createEmptyScene(id, 'Untitled Scene');
    await saveScene(scene);
    router.push(`/editor/${id}`);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}"을 삭제하시겠습니까?`)) return;
    await deleteScene(id);
    setScenes((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="projects-page">
      {/* Header */}
      <header className="projects-header">
        <div>
          <Link href="/" className="projects-logo">⬡ FORGE3D</Link>
          <p className="projects-subtitle">Your local projects</p>
        </div>
        <div className="projects-header-actions">
          <Link href="/gallery" className="toolbar-btn">🌐 Gallery</Link>
          <button className="toolbar-btn accent" onClick={handleNew}>
            + New Scene
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="projects-main">
        {loading ? (
          <div className="projects-loading">
            <div className="viewport-loading-spinner" />
            <p>Loading projects…</p>
          </div>
        ) : scenes.length === 0 ? (
          <div className="projects-empty">
            <div className="projects-empty-icon">⬡</div>
            <h2>No projects yet</h2>
            <p>Create your first 3D scene to get started.</p>
            <button className="toolbar-btn accent large" onClick={handleNew}>
              + Create New Scene
            </button>
          </div>
        ) : (
          <div className="projects-grid">
            {/* New project card */}
            <button className="project-card new-card" onClick={handleNew}>
              <div className="new-card-icon">+</div>
              <p>New Scene</p>
            </button>

            {scenes.map((scene) => (
              <div key={scene.id} className="project-card">
                <Link href={`/editor/${scene.id}`} className="project-card-link">
                  <div className="project-card-preview">
                    <div className="project-card-3d-icon">
                      <span style={{ fontSize: '2rem' }}>⬡</span>
                      <span className="project-obj-count">{scene.objects.length} objects</span>
                    </div>
                  </div>
                  <div className="project-card-info">
                    <p className="project-card-name">{scene.name}</p>
                    <p className="project-card-date">Updated {formatDate(scene.updatedAt)}</p>
                  </div>
                </Link>
                <button
                  className="project-card-delete"
                  onClick={() => handleDelete(scene.id, scene.name)}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
