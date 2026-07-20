'use client';

import Link from 'next/link';
import { useEditor } from '@/lib/editor-context';
import type { TransformMode } from '@/lib/scene-types';

interface Props {
  onSave: () => void;
  onExportGlb: () => void;
  onExportPng: () => void;
  onShare: () => void;
}

const TRANSFORM_MODES: { mode: TransformMode; label: string; key: string }[] = [
  { mode: 'translate', label: '↔ Move', key: 'G' },
  { mode: 'rotate',    label: '↺ Rotate', key: 'R' },
  { mode: 'scale',     label: '⤡ Scale', key: 'S' },
];

export default function EditorToolbar({ onSave, onExportGlb, onExportPng, onShare }: Props) {
  const { scene, transformMode, setTransformMode, setAiPanelOpen, aiPanelOpen, saveStatus, updateSceneMeta } = useEditor();

  return (
    <header className="editor-toolbar">
      {/* Left: back + name */}
      <div className="toolbar-left">
        <Link href="/projects" className="toolbar-back-btn" title="Back to Projects">
          ←
        </Link>
        <input
          type="text"
          value={scene?.name ?? ''}
          onChange={(e) => updateSceneMeta({ name: e.target.value })}
          className="toolbar-name-input"
          placeholder="Scene name…"
        />
        <span className={`save-status save-status--${saveStatus}`}>
          {saveStatus === 'saving' ? '…' : saveStatus === 'unsaved' ? '●' : '✓'}
        </span>
      </div>

      {/* Center: transform mode */}
      <div className="toolbar-center">
        {TRANSFORM_MODES.map(({ mode, label, key }) => (
          <button
            key={mode}
            className={`transform-btn${transformMode === mode ? ' active' : ''}`}
            onClick={() => setTransformMode(mode)}
            title={`${label} (${key})`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Right: actions */}
      <div className="toolbar-right">
        <button
          className={`toolbar-btn${aiPanelOpen ? ' active' : ''}`}
          onClick={() => setAiPanelOpen(!aiPanelOpen)}
          title="AI Scene Assistant"
        >
          ✨ AI
        </button>
        <button className="toolbar-btn" onClick={onSave} title="Save (Ctrl+S)">
          💾 Save
        </button>
        <div className="toolbar-dropdown-group">
          <button className="toolbar-btn" onClick={onExportPng} title="Export PNG">
            📷 PNG
          </button>
          <button className="toolbar-btn" onClick={onExportGlb} title="Export GLB">
            📦 GLB
          </button>
        </div>
        <button className="toolbar-btn accent" onClick={onShare} title="Share to Gallery">
          🌐 Share
        </button>
      </div>
    </header>
  );
}
