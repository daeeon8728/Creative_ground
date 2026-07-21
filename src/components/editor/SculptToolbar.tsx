'use client';

import { useEditor } from '@/lib/editor-context';

export default function SculptToolbar() {
  const { sculptMode, sculptBrushSize, setSculptBrushSize, sculptBrushStrength, setSculptBrushStrength, sculptBrushType, setSculptBrushType } = useEditor();

  if (!sculptMode) return null;

  return (
    <div className="sculpt-toolbar">
      <div className="sculpt-toolbar-header">
        <span className="sculpt-title">Sculpt Mode</span>
      </div>
      <div className="sculpt-controls">
        <div className="sculpt-control-group">
          <label>Brush Type</label>
          <div className="sculpt-toggle-group">
            <button className={`sculpt-toggle-btn ${sculptBrushType === 'push' ? 'active' : ''}`} onClick={() => setSculptBrushType('push')}>
              Push
            </button>
            <button className={`sculpt-toggle-btn ${sculptBrushType === 'pull' ? 'active' : ''}`} onClick={() => setSculptBrushType('pull')}>
              Pull
            </button>
          </div>
        </div>
        <div className="sculpt-control-group">
          <label>Size: {sculptBrushSize.toFixed(2)}</label>
          <input type="range" min={0.05} max={1.5} step={0.01} value={sculptBrushSize} onChange={(e) => setSculptBrushSize(parseFloat(e.target.value))} className="sculpt-range" />
        </div>
        <div className="sculpt-control-group">
          <label>Strength: {sculptBrushStrength.toFixed(3)}</label>
          <input type="range" min={0.001} max={0.05} step={0.001} value={sculptBrushStrength} onChange={(e) => setSculptBrushStrength(parseFloat(e.target.value))} className="sculpt-range" />
        </div>
      </div>
    </div>
  );
}
