// ─── Primitive & Object Types ────────────────────────────────────
export type PrimitiveType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'capsule';
export type ObjectType = PrimitiveType | 'imported-obj' | 'imported-fbx' | 'csg';

export interface CsgOperation {
  id: string;
  type: PrimitiveType;
  op: 'add' | 'subtract' | 'intersect';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

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
  importUrl?: string;
  importData?: string;
  importFormat?: 'obj' | 'fbx';
  // For CSG objects
  csgBaseType?: PrimitiveType;
  csgOperations?: CsgOperation[];
  // Advanced Features
  textureMap?: string; // base64 or URL
  animationType?: 'none' | 'spin' | 'float' | 'pulse';
  isPhysicsBody?: boolean;
  hasSparkles?: boolean;
}

export type TransformMode = 'translate' | 'rotate' | 'scale';

// ─── Scene & Environment Types ───────────────────────────────────

export interface SceneEnvironment {
  background: string;   // hex color e.g. '#f5f0e8'
  fogEnabled: boolean;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  gridEnabled: boolean;
  gridColor: string;
  floorEnabled: boolean;
  floorColor: string;
  // Advanced Environment
  postProcessingEnabled: boolean;
  bloomEnabled: boolean;
  vignetteEnabled: boolean;
  physicsEnabled: boolean;
  ambientLightIntensity: number;
  directionalLightIntensity: number;
  spotLightEnabled: boolean;
}

export const DEFAULT_ENVIRONMENT: SceneEnvironment = {
  background: '#e0e0e0', // Light grey paper-like
  fogEnabled: false,
  fogColor: '#e0e0e0',
  fogNear: 1,
  fogFar: 30,
  floorEnabled: false,
  floorColor: '#ffffff',
  gridEnabled: true,
  gridColor: '#000000',
  postProcessingEnabled: false,
  bloomEnabled: false,
  vignetteEnabled: false,
  physicsEnabled: false,
  ambientLightIntensity: 0.5,
  directionalLightIntensity: 1.2,
  spotLightEnabled: false,
};

export const ENVIRONMENT_PRESETS: { label: string; icon: string; env: Partial<SceneEnvironment> }[] = [
  { label: 'Paper',   icon: '📄', env: { background: '#f5f0e8', gridColor: '#1c1a17', fogEnabled: false } },
  { label: 'Sky',     icon: '☀️', env: { background: '#87CEEB', gridColor: '#1c1a17', fogEnabled: true, fogColor: '#87CEEB', fogNear: 20, fogFar: 80 } },
  { label: 'Sunset',  icon: '🌅', env: { background: '#ff7e5f', gridColor: '#4a0e00', fogEnabled: true, fogColor: '#ff7e5f', fogNear: 15, fogFar: 60 } },
  { label: 'Night',   icon: '🌙', env: { background: '#0d0d2b', gridColor: '#4d7fff', fogEnabled: true, fogColor: '#0d0d2b', fogNear: 10, fogFar: 50 } },
  { label: 'Studio',  icon: '💡', env: { background: '#2a2a2a', gridColor: '#555555', fogEnabled: false } },
  { label: 'Void',    icon: '⬛', env: { background: '#000000', gridColor: '#333333', fogEnabled: false } },
];

// ─── Scene / Project ─────────────────────────────────────────────
export interface SceneData {
  id: string;
  name: string;
  objects: SceneObject[];
  background: string;
  environment?: SceneEnvironment;
  createdAt: number;
  updatedAt: number;
}

// ─── Gallery Reactions ───────────────────────────────────────────
export interface GalleryReaction {
  emoji: string;
  userIds: string[];
}

// ─── Gallery ─────────────────────────────────────────────────────
export interface GalleryPost {
  id: string;
  userId: string;
  username: string;
  title: string;
  description: string;
  thumbnail: string;        // base64 PNG
  likes: string[];          // legacy — kept for backward compat
  reactions: GalleryReaction[];  // new emoji reactions
  views: number;            // view counter
  createdAt: number;
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
  type: ObjectType;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  csgBaseType?: PrimitiveType;
  csgOperations?: {
    type: PrimitiveType;
    op: 'add' | 'subtract' | 'intersect';
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  }[];
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
  animationType: 'none',
  isPhysicsBody: false,
  hasSparkles: false,
};

// ─── Gallery helpers ─────────────────────────────────────────────
/** Total reaction/like count for ranking */
export function getPostScore(post: GalleryPost): number {
  const reactionCount = (post.reactions ?? []).reduce((s, r) => s + r.userIds.length, 0);
  const likeCount = (post.likes ?? []).length;
  const viewCount = (post.views ?? 0) * 0.1; // views are worth less
  return reactionCount + likeCount + viewCount;
}
