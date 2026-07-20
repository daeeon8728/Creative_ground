'use client';

import { useState } from 'react';
import { nanoid } from 'nanoid';
import { useEditor } from '@/lib/editor-context';
import { DEFAULT_OBJECT_PROPS } from '@/lib/scene-types';
import type { AiSceneResponse, SceneObject } from '@/lib/scene-types';

export default function AiPanel({ onClose }: { onClose: () => void }) {
  const { scene, updateSceneMeta } = useEditor();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/ai/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          existingObjects: (scene?.objects ?? []).map((o) => ({
            type: o.type,
            name: o.name,
            position: o.position,
          })),
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const data: AiSceneResponse = await res.json();

      if (data.objects?.length) {
        const newObjects: SceneObject[] = data.objects.map((ao) => ({
          ...DEFAULT_OBJECT_PROPS,
          id: nanoid(),
          type: ao.type,
          name: ao.name,
          position: ao.position,
          rotation: ao.rotation,
          scale: ao.scale,
          color: ao.color,
        }));

        // Merge with existing objects via scene meta update
        updateSceneMeta({
          objects: [...(scene?.objects ?? []), ...newObjects],
        } as never);

        setResult(
          `✅ Added ${data.objects.length} object${data.objects.length > 1 ? 's' : ''}.` +
          (data.description ? `\n\n${data.description}` : '')
        );
      } else {
        setResult('No objects were generated. Try a more specific description.');
      }
    } catch (e) {
      setError((e as Error).message || 'AI request failed');
    } finally {
      setLoading(false);
      setPrompt('');
    }
  }

  const SUGGESTIONS = [
    'Create a futuristic space station corridor',
    'Build a simple house with a roof',
    'Make an abstract geometric sculpture',
    'Design a minimalist zen garden',
  ];

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <div>
          <p className="ai-panel-title">✨ AI Scene Assistant</p>
          <p className="ai-panel-subtitle">Powered by Nemotron 120B</p>
        </div>
        <button onClick={onClose} className="ai-panel-close" title="Close">✕</button>
      </div>

      <div className="ai-suggestions">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            className="ai-suggestion-chip"
            onClick={() => setPrompt(s)}
            type="button"
          >
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="ai-form">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to create…"
          className="ai-input"
          rows={3}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !prompt.trim()} className="ai-submit-btn">
          {loading ? (
            <span className="ai-loading">
              <span className="loading-dot" />
              <span className="loading-dot" />
              <span className="loading-dot" />
              Generating…
            </span>
          ) : (
            '✨ Generate Scene'
          )}
        </button>
      </form>

      {result && <div className="ai-result success"><p>{result}</p></div>}
      {error   && <div className="ai-result error"><p>⚠️ {error}</p></div>}
    </div>
  );
}
