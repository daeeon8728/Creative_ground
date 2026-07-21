'use client';

import { useEditor } from '@/lib/editor-context';
import type { SceneObject } from '@/lib/scene-types';

export default function Hierarchy() {
  const { objects, selectedId, selectObject, deleteObject, duplicateObject, updateObject, copyObject, frameSelected } = useEditor();

  return (
    <div className="hierarchy-panel">
      <div className="panel-heading-row">
        <p className="panel-label">Scene Hierarchy</p>
        <span className="object-count">{objects.length}</span>
      </div>
      {objects.length === 0 ? (
        <p className="hierarchy-empty">No objects. Add a primitive or model kit.</p>
      ) : (
        <ul className="hierarchy-list">
          {objects.map((obj) => (
            <HierarchyItem
              key={obj.id}
              obj={obj}
              isSelected={obj.id === selectedId}
              onSelect={() => selectObject(obj.id)}
              onDelete={() => deleteObject(obj.id)}
              onDuplicate={() => duplicateObject(obj.id)}
              onCopy={() => copyObject(obj.id)}
              onFrame={frameSelected}
              onToggleVisible={() => updateObject(obj.id, { visible: !obj.visible })}
              onToggleLocked={() => updateObject(obj.id, { locked: !obj.locked })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function HierarchyItem({
  obj,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onCopy,
  onFrame,
  onToggleVisible,
  onToggleLocked,
}: {
  obj: SceneObject;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onFrame: () => void;
  onToggleVisible: () => void;
  onToggleLocked: () => void;
}) {
  return (
    <li className={`hierarchy-item${isSelected ? ' selected' : ''}${obj.locked ? ' locked' : ''}`}>
      <button className="hierarchy-item-name" onClick={onSelect} title="Select">
        <span className="hierarchy-type-dot" style={{ background: obj.color }} />
        <span className={obj.visible ? '' : 'hierarchy-hidden'}>{obj.name}</span>
      </button>
      <span className="hierarchy-actions">
        <button onClick={onFrame} title="Frame">F</button>
        <button onClick={onToggleVisible} title={obj.visible ? 'Hide' : 'Show'}>{obj.visible ? 'On' : 'Off'}</button>
        <button onClick={onToggleLocked} title={obj.locked ? 'Unlock' : 'Lock'}>{obj.locked ? 'Lock' : 'Free'}</button>
        <button onClick={onCopy} title="Copy">Copy</button>
        <button onClick={onDuplicate} title="Duplicate" disabled={obj.locked}>Dup</button>
        <button onClick={onDelete} title="Delete" className="delete-btn" disabled={obj.locked}>Del</button>
      </span>
    </li>
  );
}
