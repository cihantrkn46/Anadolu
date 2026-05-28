const DB_NAME = 'AnadoluAiDB';
const STORE_NAME = 'chatHistory';

let db = null;

export function initIndexedDB() {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => { db = e.target.result; resolve(db); };
      request.onerror = (e) => reject(e.target.error);
    } catch (e) {
      reject(e);
    }
  });
}

export function saveHistoryToDB(historyArray) {
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({
      id: 'current_session',
      data: JSON.parse(JSON.stringify(historyArray)),
    });
  } catch (e) {
    console.warn('IndexedDB save failed', e);
  }
}

export async function loadHistoryFromDB() {
  if (!db) {
    try { await initIndexedDB(); } catch { return []; }
  }
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get('current_session');
      req.onsuccess = () => resolve(req.result?.data || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export function clearHistoryDB() {
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete('current_session');
  } catch (e) {
    console.warn(e);
  }
}
