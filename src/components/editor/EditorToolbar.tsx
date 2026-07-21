'use client';

import Link from 'next/link';
import { useEditor } from '@/lib/editor-context';
import type { TransformMode } from '@/lib/scene-types';

interface Props {
  onSave: () => void;
  onExportGlb: () => void;
  onExportPng: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
  onShare: () => void;
}

const TRANSFORM_MODES: { mode: TransformMode; label: string; key: string }[] = [
  { mode: 'translate', label: 'Move', key: 'G' },
  { mode: 'rotate', label: 'Rotate', key: 'R' },
  { mode: 'scale', label: 'Scale', key: 'S' },
];

export default function EditorToolbar({
  onSave,
  onExportGlb,
  onExportPng,
  onExportJson,
  onImportJson,
  onShare,
}: Props) {
  const {
    scene,
    selectedId,
    transformMode,
    setTransformMode,
    setAiPanelOpen,
    aiPanelOpen,
    saveStatus,
    updateSceneMeta,
    sculptMode,
    setSculptMode,
    undo,
    redo,
    canUndo,
    canRedo,
    duplicateObject,
    deleteObject,
    copyObject,
    pasteObject,
    canPaste,
    frameSelected,
    environment,
    updateEnvironment,
  } = useEditor();

  return (
    <header className="editor-toolbar">
      <div className="toolbar-left">
        <Link href="/projects" className="toolbar-back-btn" title="Back to Projects">
          Back
        </Link>
        <input
          type="text"
          value={scene?.name ?? ''}
          onChange={(e) => updateSceneMeta({ name: e.target.value })}
          className="toolbar-name-input"
          placeholder="Scene name"
        />
        <span className={`save-status save-status--${saveStatus}`}>
          {saveStatus === 'saving' ? 'Saving' : saveStatus === 'unsaved' ? 'Unsaved' : 'Saved'}
        </span>
      </div>

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

      <div className="toolbar-right">
        <button className="toolbar-btn compact" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">Undo</button>
        <button className="toolbar-btn compact" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">Redo</button>
        <button className="toolbar-btn compact" onClick={() => selectedId && copyObject(selectedId)} disabled={!selectedId} title="Copy selected">Copy</button>
        <button className="toolbar-btn compact" onClick={pasteObject} disabled={!canPaste} title="Paste copied object">Paste</button>
        <button className="toolbar-btn compact" onClick={() => selectedId && duplicateObject(selectedId)} disabled={!selectedId} title="Duplicate selected (D)">Dup</button>
        <button className="toolbar-btn compact danger" onClick={() => selectedId && deleteObject(selectedId)} disabled={!selectedId} title="Delete selected">Del</button>
        <button className="toolbar-btn compact" onClick={frameSelected} disabled={!selectedId} title="Frame selected (F)">Frame</button>
        <button
          className={`toolbar-btn compact${environment.snapEnabled ? ' active' : ''}`}
          onClick={() => updateEnvironment({ snapEnabled: !environment.snapEnabled })}
          title="Toggle transform snapping"
        >
          Snap
        </button>
        <button className={`toolbar-btn${aiPanelOpen ? ' active' : ''}`} onClick={() => setAiPanelOpen(!aiPanelOpen)} title="AI Scene Assistant">
          AI
        </button>
        <button className={`toolbar-btn${sculptMode ? ' active' : ''}`} onClick={() => setSculptMode(!sculptMode)} title="Toggle Sculpt Mode">
          Sculpt
        </button>
        <button className="toolbar-btn" onClick={onSave} title="Save (Ctrl+S)">Save</button>
        <button className="toolbar-btn" onClick={onImportJson} title="Import Forge3D JSON">Import</button>
        <button className="toolbar-btn" onClick={onExportJson} title="Export Forge3D JSON">JSON</button>
        <button className="toolbar-btn" onClick={onExportPng} title="Export PNG">PNG</button>
        <button className="toolbar-btn" onClick={onExportGlb} title="Export GLB">GLB</button>
        <button className="toolbar-btn accent" onClick={onShare} title="Share to Gallery">Share</button>
      </div>
    </header>
  );
}
