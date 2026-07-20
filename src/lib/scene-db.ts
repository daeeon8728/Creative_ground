import { openDB, type IDBPDatabase } from 'idb';
import type { SceneData } from './scene-types';

const DB_NAME = 'forge3d';
const DB_VERSION = 1;

let _db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('scenes')) {
        const store = db.createObjectStore('scenes', { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }
    },
  });
  return _db;
}

export async function getScene(id: string): Promise<SceneData | undefined> {
  const db = await getDB();
  return db.get('scenes', id);
}

export async function saveScene(scene: SceneData): Promise<void> {
  const db = await getDB();
  await db.put('scenes', { ...scene, updatedAt: Date.now() });
}

export async function getAllScenes(): Promise<SceneData[]> {
  const db = await getDB();
  const scenes = await db.getAll('scenes');
  return scenes.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteScene(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('scenes', id);
}

export function createEmptyScene(id: string, name: string): SceneData {
  const now = Date.now();
  return {
    id,
    name,
    objects: [],
    background: '#1a1a2e',
    createdAt: now,
    updatedAt: now,
  };
}
