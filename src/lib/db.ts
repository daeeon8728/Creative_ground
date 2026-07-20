import { openDB, type IDBPDatabase } from 'idb';

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

// Keep stub exports for compatibility — actual scene ops moved to scene-db.ts
export { getDB };
