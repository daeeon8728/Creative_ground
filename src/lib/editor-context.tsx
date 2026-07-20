'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import type { SceneObject, TransformMode, PrimitiveType, SceneData, SceneEnvironment } from './scene-types';
import { DEFAULT_OBJECT_PROPS, PRIMITIVE_LABELS, DEFAULT_ENVIRONMENT } from './scene-types';

interface EditorContextValue {
  // Scene
  scene: SceneData | null;
  setScene: (scene: SceneData) => void;
  objects: SceneObject[];

  // Selection
  selectedId: string | null;
  selectObject: (id: string | null) => void;

  // Transform
  transformMode: TransformMode;
  setTransformMode: (mode: TransformMode) => void;

  // Object operations
  addPrimitive: (type: PrimitiveType) => void;
  addImportedObject: (name: string, format: 'obj' | 'fbx', data: string) => void;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  deleteObject: (id: string) => void;
  duplicateObject: (id: string) => void;
  convertToCsg: (id: string) => void;
  addCsgOperation: (id: string, type: PrimitiveType, op: 'add'|'subtract'|'intersect') => void;

  // Scene operations
  updateSceneMeta: (updates: Partial<SceneData>) => void;
  updateEnvironment: (updates: Partial<SceneEnvironment>) => void;
  environment: SceneEnvironment;

  // Panels
  aiPanelOpen: boolean;
  setAiPanelOpen: (open: boolean) => void;
  saveStatus: 'saved' | 'unsaved' | 'saving';
  setSaveStatus: (s: 'saved' | 'unsaved' | 'saving') => void;

  // Sculpting
  sculptMode: boolean;
  setSculptMode: (active: boolean) => void;
  sculptBrushSize: number;
  setSculptBrushSize: (size: number) => void;
  sculptBrushStrength: number;
  setSculptBrushStrength: (strength: number) => void;
  sculptBrushType: 'push' | 'pull';
  setSculptBrushType: (type: 'push' | 'pull') => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used inside EditorProvider');
  return ctx;
}

let objectCount = 0;

export function EditorProvider({
  children,
  initialScene,
}: {
  children: React.ReactNode;
  initialScene: SceneData;
}) {
  const [scene, setSceneState] = useState<SceneData>(initialScene);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');

  const [sculptMode, setSculptMode] = useState(false);
  const [sculptBrushSize, setSculptBrushSize] = useState(0.5);
  const [sculptBrushStrength, setSculptBrushStrength] = useState(0.1);
  const [sculptBrushType, setSculptBrushType] = useState<'push'|'pull'>('push');

  const setScene = useCallback((s: SceneData) => {
    setSceneState(s);
  }, []);

  const mutateObjects = useCallback((fn: (objs: SceneObject[]) => SceneObject[]) => {
    setSceneState((prev) => {
      const next = { ...prev, objects: fn(prev.objects) };
      return next;
    });
    setSaveStatus('unsaved');
  }, []);

  const updateSceneMeta = useCallback((updates: Partial<SceneData>) => {
    setSceneState((prev) => {
      // If objects are included in updates, merge them
      const merged = { ...prev, ...updates };
      return merged;
    });
    setSaveStatus('unsaved');
  }, []);

  const updateEnvironment = useCallback((updates: Partial<SceneEnvironment>) => {
    setSceneState((prev) => {
      const env = { ...(prev.environment ?? DEFAULT_ENVIRONMENT), ...updates };
      return { ...prev, environment: env };
    });
    setSaveStatus('unsaved');
  }, []);

  const addPrimitive = useCallback((type: PrimitiveType) => {
    objectCount += 1;
    const id = nanoid();
    const obj: SceneObject = {
      ...DEFAULT_OBJECT_PROPS,
      id,
      type,
      name: `${PRIMITIVE_LABELS[type]} ${objectCount}`,
      position: [0, type === 'plane' ? 0 : 0.5, 0],
    };
    mutateObjects((prev) => [...prev, obj]);
    setSelectedId(id);
  }, [mutateObjects]);

  const addImportedObject = useCallback((name: string, format: 'obj' | 'fbx', data: string) => {
    const id = nanoid();
    const obj: SceneObject = {
      ...DEFAULT_OBJECT_PROPS,
      id,
      type: `imported-${format}` as SceneObject['type'],
      name,
      importData: data,
      importFormat: format,
    };
    mutateObjects((prev) => [...prev, obj]);
    setSelectedId(id);
  }, [mutateObjects]);

  const convertToCsg = useCallback((id: string) => {
    mutateObjects((prev) =>
      prev.map((o) => {
        if (o.id === id && o.type !== 'csg' && !o.type.toString().startsWith('imported')) {
          return {
            ...o,
            type: 'csg',
            csgBaseType: o.type as PrimitiveType,
            csgOperations: [],
          };
        }
        return o;
      })
    );
  }, [mutateObjects]);

  const addCsgOperation = useCallback((id: string, type: PrimitiveType, op: 'add'|'subtract'|'intersect') => {
    mutateObjects((prev) =>
      prev.map((o) => {
        if (o.id === id && o.type === 'csg') {
          const newOp = { id: nanoid(), type, op, position: [0, 0, 0] as [number,number,number], rotation: [0, 0, 0] as [number,number,number], scale: [1, 1, 1] as [number,number,number] };
          return { ...o, csgOperations: [...(o.csgOperations || []), newOp] };
        }
        return o;
      })
    );
  }, [mutateObjects]);

  const updateObject = useCallback((id: string, updates: Partial<SceneObject>) => {
    mutateObjects((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );
  }, [mutateObjects]);

  const deleteObject = useCallback((id: string) => {
    mutateObjects((prev) => prev.filter((o) => o.id !== id));
    setSelectedId((s) => (s === id ? null : s));
  }, [mutateObjects]);

  const duplicateObject = useCallback((id: string) => {
    mutateObjects((prev) => {
      const src = prev.find((o) => o.id === id);
      if (!src) return prev;
      objectCount += 1;
      const copy: SceneObject = {
        ...src,
        id: nanoid(),
        name: `${src.name} copy`,
        position: [src.position[0] + 1, src.position[1], src.position[2]],
      };
      setSelectedId(copy.id);
      return [...prev, copy];
    });
  }, [mutateObjects]);

  const value: EditorContextValue = {
    scene,
    setScene,
    objects: scene.objects,
    selectedId,
    selectObject: setSelectedId,
    transformMode,
    setTransformMode,
    addPrimitive,
    addImportedObject,
    updateObject,
    deleteObject,
    duplicateObject,
    convertToCsg,
    addCsgOperation,
    updateSceneMeta,
    updateEnvironment,
    environment: scene.environment ?? DEFAULT_ENVIRONMENT,
    aiPanelOpen,
    setAiPanelOpen,
    saveStatus,
    setSaveStatus,
    sculptMode,
    setSculptMode,
    sculptBrushSize,
    setSculptBrushSize,
    sculptBrushStrength,
    setSculptBrushStrength,
    sculptBrushType,
    setSculptBrushType,
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
