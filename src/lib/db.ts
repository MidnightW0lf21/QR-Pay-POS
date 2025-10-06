import { openDB, type DBSchema } from 'idb';

const DB_NAME = 'QuickPayDB';
const DB_VERSION = 1;
const IMAGE_STORE_NAME = 'images';

interface MyDB extends DBSchema {
  [IMAGE_STORE_NAME]: {
    key: string;
    value: string;
  };
}

const dbPromise = openDB<MyDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
      db.createObjectStore(IMAGE_STORE_NAME);
    }
  },
});

export async function saveImage(key: string, value: string) {
  return (await dbPromise).put(IMAGE_STORE_NAME, value, key);
}

export async function getImage(key: string) {
  return (await dbPromise).get(IMAGE_STORE_NAME, key);
}

export async function deleteImage(key: string) {
  return (await dbPromise).delete(IMAGE_STORE_NAME, key);
}

export async function getAllImages() {
    return (await dbPromise).getAll(IMAGE_STORE_NAME);
}

export async function getAllImageKeys() {
    return (await dbPromise).getAllKeys(IMAGE_STORE_NAME);
}