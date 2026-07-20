// ─── Primitive & Object Types ────────────────────────────────────
export type PrimitiveType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'capsule';
export type ObjectType = PrimitiveType | 'imported-obj' | 'imported-fbx';

export interface SceneObject {
  id: string;
  type: ObjectType;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number]; // Euler angles in radians
  scale: [number, number, number];
  color: string;
  wireframe: boolean;
  visible: boolean;
  opacity: number;
  metalness: number;
  roughness: number;
  // For imported objects
  importUrl?: string; // object URL (revoked on cleanup)
  importData?: string; // base64-encoded file content
  importFormat?: 'obj' | 'fbx';
}

export type TransformMode = 'translate' | 'rotate' | 'scale';

// ─── Scene / Project ─────────────────────────────────────────────
export interface SceneData {
  id: string;
  name: string;
  objects: SceneObject[];
  background: string;
  createdAt: number;
  updatedAt: number;
}

// ─── Gallery ─────────────────────────────────────────────────────
export interface GalleryPost {
  id: string;
  userId: string;
  username: string;
  title: string;
  description: string;
  thumbnail: string; // base64 PNG
  likes: string[];   // array of userIds
  createdAt: number;
  // scene is stored separately to keep list fast
}

export interface GalleryPostFull extends GalleryPost {
  scene: SceneData;
}

export interface GalleryComment {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: number;
}

// ─── AI Scene Response ───────────────────────────────────────────
export interface AiSceneObject {
  type: PrimitiveType;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
}

export interface AiSceneResponse {
  objects: AiSceneObject[];
  description?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────
export const PRIMITIVE_LABELS: Record<PrimitiveType, string> = {
  box: 'Box',
  sphere: 'Sphere',
  cylinder: 'Cylinder',
  cone: 'Cone',
  torus: 'Torus',
  plane: 'Plane',
  capsule: 'Capsule',
};

export const PRIMITIVE_ICONS: Record<PrimitiveType, string> = {
  box: '⬜',
  sphere: '⭕',
  cylinder: '🥫',
  cone: '🔺',
  torus: '🍩',
  plane: '▬',
  capsule: '💊',
};

export const DEFAULT_OBJECT_PROPS: Omit<SceneObject, 'id' | 'type' | 'name'> = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
  color: '#4d7fff',
  wireframe: false,
  visible: true,
  opacity: 1,
  metalness: 0.1,
  roughness: 0.7,
};
