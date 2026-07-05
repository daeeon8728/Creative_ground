import { openDB, type IDBPDatabase } from 'idb';
import type { BoardData } from './types';

const DB_NAME = 'fragments';
const DB_VERSION = 1;

let _db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('boards')) {
        const store = db.createObjectStore('boards', { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images');
      }
    },
  });
  return _db;
}

// ─── Boards ──────────────────────────────────────────────────

export async function getBoard(id: string): Promise<BoardData | undefined> {
  const db = await getDB();
  return db.get('boards', id);
}

export async function saveBoard(board: BoardData): Promise<void> {
  const db = await getDB();
  await db.put('boards', { ...board, updatedAt: Date.now() });
}

export async function getAllBoards(): Promise<BoardData[]> {
  const db = await getDB();
  const boards = await db.getAll('boards');
  return boards.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteBoard(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('boards', id);
}

// ─── Images ──────────────────────────────────────────────────

export async function saveImage(imageId: string, blob: Blob): Promise<void> {
  const db = await getDB();
  await db.put('images', blob, imageId);
}

export async function getImageBlob(imageId: string): Promise<Blob | undefined> {
  const db = await getDB();
  return db.get('images', imageId);
}

export async function deleteImage(imageId: string): Promise<void> {
  const db = await getDB();
  await db.delete('images', imageId);
}

// ─── Image URL cache (object URLs) ───────────────────────────
// Call revokeImageUrls() on unmount to free memory

const urlCache = new Map<string, string>();

export async function getImageUrl(imageId: string): Promise<string | null> {
  if (urlCache.has(imageId)) return urlCache.get(imageId)!;
  const blob = await getImageBlob(imageId);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(imageId, url);
  return url;
}

export function revokeImageUrls(): void {
  for (const url of urlCache.values()) {
    URL.revokeObjectURL(url);
  }
  urlCache.clear();
}
