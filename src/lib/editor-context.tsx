'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import type { SceneObject, TransformMode, PrimitiveType, SceneData, SceneEnvironment } from './scene-types';
import { DEFAULT_OBJECT_PROPS, PRIMITIVE_LABELS, DEFAULT_ENVIRONMENT } from './scene-types';

interface EditorContextValue {
  scene: SceneData | null;
  setScene: (scene: SceneData) => void;
  objects: SceneObject[];
  selectedId: string | null;
  selectObject: (id: string | null) => void;
  transformMode: TransformMode;
  setTransformMode: (mode: TransformMode) => void;
  addPrimitive: (type: PrimitiveType) => void;
  addModelPreset: (preset: ModelPresetId) => void;
  addImportedObject: (name: string, format: 'obj' | 'fbx', data: string) => void;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  deleteObject: (id: string) => void;
  duplicateObject: (id: string) => void;
  copyObject: (id: string) => void;
  pasteObject: () => void;
  canPaste: boolean;
  alignSelected: (axis: 'x' | 'y' | 'z') => void;
  groundSelected: () => void;
  frameSelected: () => void;
  focusRequest: { id: string | null; nonce: number };
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  updateSceneMeta: (updates: Partial<SceneData>) => void;
  updateEnvironment: (updates: Partial<SceneEnvironment>) => void;
  environment: SceneEnvironment;
  aiPanelOpen: boolean;
  setAiPanelOpen: (open: boolean) => void;
  saveStatus: 'saved' | 'unsaved' | 'saving';
  setSaveStatus: (s: 'saved' | 'unsaved' | 'saving') => void;
  sculptMode: boolean;
  setSculptMode: (active: boolean) => void;
  sculptBrushSize: number;
  setSculptBrushSize: (size: number) => void;
  sculptBrushStrength: number;
  setSculptBrushStrength: (strength: number) => void;
  sculptBrushType: 'push' | 'pull';
  setSculptBrushType: (type: 'push' | 'pull') => void;
}

type ModelPresetId = 'table' | 'chair' | 'lamp' | 'arch' | 'pedestal';

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used inside EditorProvider');
  return ctx;
}

let objectCount = 0;

function withDefaults(scene: SceneData): SceneData {
  return {
    ...scene,
    objects: scene.objects.map((obj) => ({ ...DEFAULT_OBJECT_PROPS, ...obj })),
    environment: { ...DEFAULT_ENVIRONMENT, ...(scene.environment ?? { background: scene.background }) },
  };
}

function makePrimitive(
  type: PrimitiveType,
  name: string,
  updates: Partial<SceneObject> = {}
): SceneObject {
  return {
    ...DEFAULT_OBJECT_PROPS,
    id: nanoid(),
    type,
    name,
    position: [0, type === 'plane' ? 0 : 0.5, 0],
    ...updates,
  };
}

function createPresetObjects(preset: ModelPresetId): SceneObject[] {
  const palette = {
    wood: '#9a5a2c',
    dark: '#202124',
    shade: '#f5d36b',
    steel: '#b8c0ca',
    stone: '#a5a09a',
  };

  if (preset === 'table') {
    return [
      makePrimitive('box', 'Table top', { position: [0, 1.2, 0], scale: [2.4, 0.18, 1.4], color: palette.wood, roughness: 0.45 }),
      ...[-1, 1].flatMap((x) => [-1, 1].map((z) => makePrimitive('box', 'Table leg', { position: [x, 0.55, z * 0.55], scale: [0.16, 1.1, 0.16], color: palette.wood }))),
    ];
  }

  if (preset === 'chair') {
    return [
      makePrimitive('box', 'Chair seat', { position: [0, 0.9, 0], scale: [1.25, 0.18, 1.15], color: palette.dark }),
      makePrimitive('box', 'Chair back', { position: [0, 1.55, -0.52], scale: [1.25, 1.15, 0.16], color: palette.dark }),
      ...[-1, 1].flatMap((x) => [-1, 1].map((z) => makePrimitive('cylinder', 'Chair leg', { position: [x * 0.45, 0.42, z * 0.42], scale: [0.08, 0.85, 0.08], color: palette.steel, metalness: 0.6, roughness: 0.25 }))),
    ];
  }

  if (preset === 'lamp') {
    return [
      makePrimitive('cylinder', 'Lamp base', { position: [0, 0.08, 0], scale: [0.55, 0.16, 0.55], color: palette.steel, metalness: 0.7, roughness: 0.25 }),
      makePrimitive('cylinder', 'Lamp stem', { position: [0, 0.9, 0], scale: [0.08, 1.6, 0.08], color: palette.steel, metalness: 0.7, roughness: 0.25 }),
      makePrimitive('cone', 'Lamp shade', { position: [0, 1.85, 0], scale: [0.8, 0.7, 0.8], color: palette.shade, opacity: 0.86, roughness: 0.6 }),
      makePrimitive('sphere', 'Lamp glow', { position: [0, 1.55, 0], scale: [0.28, 0.28, 0.28], color: '#fff2aa', shadingMode: 'emissive', hasSparkles: true }),
    ];
  }

  if (preset === 'arch') {
    return [
      makePrimitive('box', 'Left column', { position: [-0.9, 1, 0], scale: [0.35, 2, 0.35], color: palette.stone }),
      makePrimitive('box', 'Right column', { position: [0.9, 1, 0], scale: [0.35, 2, 0.35], color: palette.stone }),
      makePrimitive('torus', 'Arch curve', { position: [0, 2, 0], rotation: [0, Math.PI / 2, 0], scale: [1.25, 1.25, 0.28], color: palette.stone }),
    ];
  }

  return [
    makePrimitive('cylinder', 'Pedestal base', { position: [0, 0.15, 0], scale: [1.1, 0.3, 1.1], color: palette.stone }),
    makePrimitive('cylinder', 'Pedestal column', { position: [0, 0.8, 0], scale: [0.55, 1.2, 0.55], color: palette.stone }),
    makePrimitive('cylinder', 'Pedestal cap', { position: [0, 1.45, 0], scale: [1, 0.22, 1], color: palette.stone }),
  ];
}

export function EditorProvider({
  children,
  initialScene,
}: {
  children: React.ReactNode;
  initialScene: SceneData;
}) {
  const [scene, setSceneState] = useState<SceneData>(() => withDefaults(initialScene));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const [sculptMode, setSculptMode] = useState(false);
  const [sculptBrushSize, setSculptBrushSize] = useState(0.5);
  const [sculptBrushStrength, setSculptBrushStrength] = useState(0.01);
  const [sculptBrushType, setSculptBrushType] = useState<'push' | 'pull'>('push');
  const [focusRequest, setFocusRequest] = useState({ id: null as string | null, nonce: 0 });
  const [historyIndex, setHistoryIndex] = useState(0);
  const [history, setHistory] = useState<SceneData[]>(() => [withDefaults(initialScene)]);
  const [clipboard, setClipboard] = useState<SceneObject | null>(null);

  const commitScene = useCallback((producer: (prev: SceneData) => SceneData) => {
    setSceneState((prev) => {
      const next = withDefaults(producer(prev));
      setHistory((current) => {
        const trimmed = current.slice(0, historyIndex + 1);
        return [...trimmed, next].slice(-60);
      });
      setHistoryIndex((idx) => Math.min(idx + 1, 59));
      return next;
    });
    setSaveStatus('unsaved');
  }, [historyIndex]);

  const setScene = useCallback((s: SceneData) => {
    const next = withDefaults(s);
    setSceneState(next);
    setHistory([next]);
    setHistoryIndex(0);
    setSaveStatus('unsaved');
  }, []);

  const updateSceneMeta = useCallback((updates: Partial<SceneData>) => {
    commitScene((prev) => ({ ...prev, ...updates }));
  }, [commitScene]);

  const updateEnvironment = useCallback((updates: Partial<SceneEnvironment>) => {
    commitScene((prev) => {
      const env = { ...(prev.environment ?? DEFAULT_ENVIRONMENT), ...updates };
      return { ...prev, background: env.background, environment: env };
    });
  }, [commitScene]);

  const addPrimitive = useCallback((type: PrimitiveType) => {
    objectCount += 1;
    const obj = makePrimitive(type, `${PRIMITIVE_LABELS[type]} ${objectCount}`);
    commitScene((prev) => ({ ...prev, objects: [...prev.objects, obj] }));
    setSelectedId(obj.id);
  }, [commitScene]);

  const addModelPreset = useCallback((preset: ModelPresetId) => {
    const created = createPresetObjects(preset);
    commitScene((prev) => ({ ...prev, objects: [...prev.objects, ...created] }));
    setSelectedId(created[0]?.id ?? null);
  }, [commitScene]);

  const addImportedObject = useCallback((name: string, format: 'obj' | 'fbx', data: string) => {
    const obj: SceneObject = {
      ...DEFAULT_OBJECT_PROPS,
      id: nanoid(),
      type: `imported-${format}` as SceneObject['type'],
      name,
      importData: data,
      importFormat: format,
      position: [0, 0.5, 0],
    };
    commitScene((prev) => ({ ...prev, objects: [...prev.objects, obj] }));
    setSelectedId(obj.id);
  }, [commitScene]);

  const updateObject = useCallback((id: string, updates: Partial<SceneObject>) => {
    commitScene((prev) => ({
      ...prev,
      objects: prev.objects.map((o) => (o.id === id && !o.locked ? { ...o, ...updates } : o)),
    }));
  }, [commitScene]);

  const deleteObject = useCallback((id: string) => {
    commitScene((prev) => ({ ...prev, objects: prev.objects.filter((o) => o.id !== id || o.locked) }));
    setSelectedId((s) => (s === id ? null : s));
  }, [commitScene]);

  const duplicateObject = useCallback((id: string) => {
    const src = scene.objects.find((o) => o.id === id);
    if (!src) return;
    const copy = { ...src, id: nanoid(), name: `${src.name} copy`, position: [src.position[0] + 0.75, src.position[1], src.position[2] + 0.75] as [number, number, number], locked: false };
    commitScene((prev) => ({ ...prev, objects: [...prev.objects, copy] }));
    setSelectedId(copy.id);
  }, [commitScene, scene.objects]);

  const copyObject = useCallback((id: string) => {
    setClipboard(scene.objects.find((o) => o.id === id) ?? null);
  }, [scene.objects]);

  const pasteObject = useCallback(() => {
    const source = clipboard;
    if (!source) return;
    const copy = { ...source, id: nanoid(), name: `${source.name} copy`, position: [source.position[0] + 0.75, source.position[1], source.position[2] + 0.75] as [number, number, number], locked: false };
    commitScene((prev) => ({ ...prev, objects: [...prev.objects, copy] }));
    setSelectedId(copy.id);
  }, [clipboard, commitScene]);

  const alignSelected = useCallback((axis: 'x' | 'y' | 'z') => {
    if (!selectedId) return;
    const index = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    commitScene((prev) => ({
      ...prev,
      objects: prev.objects.map((obj) => obj.id === selectedId && !obj.locked
        ? { ...obj, position: obj.position.map((v, i) => (i === index ? 0 : v)) as [number, number, number] }
        : obj),
    }));
  }, [commitScene, selectedId]);

  const groundSelected = useCallback(() => {
    if (!selectedId) return;
    commitScene((prev) => ({
      ...prev,
      objects: prev.objects.map((obj) => obj.id === selectedId && !obj.locked
        ? { ...obj, position: [obj.position[0], Math.max(obj.scale[1] / 2, 0), obj.position[2]] }
        : obj),
    }));
  }, [commitScene, selectedId]);

  const frameSelected = useCallback(() => {
    setFocusRequest((prev) => ({ id: selectedId, nonce: prev.nonce + 1 }));
  }, [selectedId]);

  const undo = useCallback(() => {
    setHistoryIndex((idx) => {
      const nextIndex = Math.max(0, idx - 1);
      setSceneState(history[nextIndex]);
      setSaveStatus('unsaved');
      return nextIndex;
    });
  }, [history]);

  const redo = useCallback(() => {
    setHistoryIndex((idx) => {
      const nextIndex = Math.min(history.length - 1, idx + 1);
      setSceneState(history[nextIndex]);
      setSaveStatus('unsaved');
      return nextIndex;
    });
  }, [history]);

  const value = useMemo<EditorContextValue>(() => ({
    scene,
    setScene,
    objects: scene.objects,
    selectedId,
    selectObject: setSelectedId,
    transformMode,
    setTransformMode,
    addPrimitive,
    addModelPreset,
    addImportedObject,
    updateObject,
    deleteObject,
    duplicateObject,
    copyObject,
    pasteObject,
    canPaste: !!clipboard,
    alignSelected,
    groundSelected,
    frameSelected,
    focusRequest,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
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
  }), [addImportedObject, addModelPreset, addPrimitive, aiPanelOpen, alignSelected, clipboard, copyObject, deleteObject, duplicateObject, focusRequest, frameSelected, groundSelected, history.length, historyIndex, pasteObject, redo, scene, sculptBrushSize, sculptBrushStrength, sculptBrushType, sculptMode, saveStatus, selectedId, setScene, transformMode, undo, updateEnvironment, updateObject, updateSceneMeta]);

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}
