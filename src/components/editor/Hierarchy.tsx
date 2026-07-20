'use client';

import { useEditor } from '@/lib/editor-context';
import type { SceneObject } from '@/lib/scene-types';

export default function Hierarchy() {
  const { objects, selectedId, selectObject, deleteObject, duplicateObject, updateObject } = useEditor();

  return (
    <div className="hierarchy-panel">
      <p className="panel-label">Scene Hierarchy</p>
      {objects.length === 0 ? (
        <p className="hierarchy-empty">No objects. Add a primitive →</p>
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
              onToggleVisible={() => updateObject(obj.id, { visible: !obj.visible })}
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
  onToggleVisible,
}: {
  obj: SceneObject;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleVisible: () => void;
}) {
  return (
    <li className={`hierarchy-item${isSelected ? ' selected' : ''}`}>
      <button className="hierarchy-item-name" onClick={onSelect} title="Select">
        <span className="hierarchy-type-dot" style={{ background: obj.color }} />
        <span className={obj.visible ? '' : 'hierarchy-hidden'}>{obj.name}</span>
      </button>
      <span className="hierarchy-actions">
        <button onClick={onToggleVisible} title={obj.visible ? 'Hide' : 'Show'}>
          {obj.visible ? '👁' : '🙈'}
        </button>
        <button onClick={onDuplicate} title="Duplicate">⧉</button>
        <button onClick={onDelete} title="Delete" className="delete-btn">✕</button>
      </span>
    </li>
  );
}
