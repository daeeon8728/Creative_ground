export type PrimitiveType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'capsule';
export type ObjectType = PrimitiveType | 'imported-obj' | 'imported-fbx';
export type ShadingMode = 'solid' | 'matte' | 'metal' | 'glass' | 'emissive';

export interface SceneObject {
  id: string;
  type: ObjectType;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  wireframe: boolean;
  visible: boolean;
  opacity: number;
  metalness: number;
  roughness: number;
  shadingMode?: ShadingMode;
  locked?: boolean;
  importUrl?: string;
  importData?: string;
  importFormat?: 'obj' | 'fbx';
  textureMap?: string;
  animationType?: 'none' | 'spin' | 'float' | 'pulse';
  isPhysicsBody?: boolean;
  hasSparkles?: boolean;
}

export type TransformMode = 'translate' | 'rotate' | 'scale';

export interface SceneEnvironment {
  background: string;
  fogEnabled: boolean;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  gridEnabled: boolean;
  gridColor: string;
  floorEnabled: boolean;
  floorColor: string;
  postProcessingEnabled: boolean;
  bloomEnabled: boolean;
  vignetteEnabled: boolean;
  physicsEnabled: boolean;
  ambientLightIntensity: number;
  directionalLightIntensity: number;
  spotLightEnabled: boolean;
  snapEnabled?: boolean;
  snapSize?: number;
}

export const DEFAULT_ENVIRONMENT: SceneEnvironment = {
  background: '#e0e0e0',
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
  snapEnabled: false,
  snapSize: 0.5,
};

export const ENVIRONMENT_PRESETS: { label: string; icon: string; env: Partial<SceneEnvironment> }[] = [
  { label: 'Paper', icon: 'P', env: { background: '#f5f0e8', gridColor: '#1c1a17', fogEnabled: false, floorEnabled: false } },
  { label: 'Sky', icon: 'S', env: { background: '#87ceeb', gridColor: '#1c1a17', fogEnabled: true, fogColor: '#87ceeb', fogNear: 20, fogFar: 80 } },
  { label: 'Sunset', icon: 'D', env: { background: '#ff7e5f', gridColor: '#4a0e00', fogEnabled: true, fogColor: '#ff7e5f', fogNear: 15, fogFar: 60 } },
  { label: 'Night', icon: 'N', env: { background: '#0d0d2b', gridColor: '#4d7fff', fogEnabled: true, fogColor: '#0d0d2b', fogNear: 10, fogFar: 50 } },
  { label: 'Studio', icon: 'L', env: { background: '#2a2a2a', gridColor: '#555555', floorEnabled: true, floorColor: '#3a3732', fogEnabled: false } },
  { label: 'Void', icon: 'V', env: { background: '#000000', gridColor: '#333333', fogEnabled: false, floorEnabled: false } },
];

export interface SceneData {
  id: string;
  name: string;
  objects: SceneObject[];
  background: string;
  environment?: SceneEnvironment;
  createdAt: number;
  updatedAt: number;
}

export interface GalleryReaction {
  emoji: string;
  userIds: string[];
}

export interface GalleryPost {
  id: string;
  userId: string;
  username: string;
  title: string;
  description: string;
  thumbnail: string;
  likes: string[];
  reactions: GalleryReaction[];
  views: number;
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

export interface AiSceneObject {
  type: ObjectType;
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
  box: 'Cube',
  sphere: 'Ball',
  cylinder: 'Cyl',
  cone: 'Cone',
  torus: 'Ring',
  plane: 'Plane',
  capsule: 'Caps',
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
  shadingMode: 'solid',
  locked: false,
  animationType: 'none',
  isPhysicsBody: false,
  hasSparkles: false,
};

export function getPostScore(post: GalleryPost): number {
  const reactionCount = (post.reactions ?? []).reduce((s, r) => s + r.userIds.length, 0);
  const likeCount = (post.likes ?? []).length;
  const viewCount = (post.views ?? 0) * 0.1;
  return reactionCount + likeCount + viewCount;
}
