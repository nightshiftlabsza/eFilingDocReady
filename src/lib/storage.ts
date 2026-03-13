/**
 * storage.ts
 * Dual-write premium state to localStorage + IndexedDB.
 *
 * Why dual-write:
 * - localStorage: fast synchronous read on init
 * - IndexedDB: survives DevTools "Clear site data" in most browsers
 * Reading checks both — if either says premium, the user is premium.
 *
 * POPIA note: no personal data is stored. Values are boolean flags only.
 */

const LS_KEY    = 'docready-premium';
const DB_NAME   = 'docready-db';
const DB_VER    = 1;
const STORE     = 'flags';
const IDB_KEY   = 'isPremium';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VER);
        req.onupgradeneeded = () => {
            req.result.createObjectStore(STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror   = () => reject(req.error);
    });
}

/** Persist premium flag to both stores. */
export async function writePremiumFlag(value: boolean): Promise<void> {
    localStorage.setItem(LS_KEY, value ? '1' : '0');
    try {
        const db = await openDB();
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, IDB_KEY);
        await new Promise<void>((res, rej) => {
            tx.oncomplete = () => res();
            tx.onerror    = () => rej(tx.error);
        });
        db.close();
    } catch {
        // IDB blocked (some private-mode browsers) — localStorage is the fallback
    }
}

/** Read premium flag — returns true if either store says premium. */
export async function readPremiumFlag(): Promise<boolean> {
    // Fast path: localStorage
    if (localStorage.getItem(LS_KEY) === '1') return true;
    // Durable path: IndexedDB
    try {
        const db  = await openDB();
        const val = await new Promise<unknown>((resolve) => {
            const tx  = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(IDB_KEY);
            req.onsuccess = () => resolve(req.result);
            req.onerror   = () => resolve(false);
        });
        db.close();
        return val === true;
    } catch {
        return false;
    }
}

/** Clear premium from both stores (used by reset/dev tooling). */
export async function clearPremiumFlag(): Promise<void> {
    localStorage.removeItem(LS_KEY);
    try {
        const db = await openDB();
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(IDB_KEY);
        db.close();
    } catch { /* ignore */ }
}
