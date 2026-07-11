/**
 * sqliteAdapter.js — Phase 2 SQLite drop-in adapter
 *
 * This module exports the IDENTICAL async interface as libraryDB.js.
 * In Phase 1 it simply re-exports IndexedDB functions.
 *
 * PHASE 2 UPGRADE PATH:
 *   Replace the re-exports below with implementations that call
 *   `@capacitor-community/sqlite` (mobile) or `wa-sqlite` (WASM web).
 *   No changes required in premiumStore, libraryStore, or any component.
 *
 * All functions must return Promises matching the signatures in libraryDB.js.
 */

export {
  openDB,
  upsertBook,
  getBook,
  getAllBooks,
  deleteBook,
  saveProgress,
  getProgress,
  getAllProgress,
  recordSession,
  getAllSessions,
  getAggregateStats,
} from './libraryDB.js';

/* ─── Phase 2 stubs (uncomment and implement when integrating SQLite) ──────
 *
 * import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
 *
 * const sqliteConn = new SQLiteConnection(CapacitorSQLite);
 * let _db = null;
 *
 * export async function openDB() {
 *   if (_db) return _db;
 *   _db = await sqliteConn.createConnection('imprint', false, 'no-encryption', 1, false);
 *   await _db.open();
 *   await _db.execute(CREATE_TABLES_SQL);
 *   return _db;
 * }
 *
 * export async function upsertBook(book) { ... }
 * // ... etc
 * ──────────────────────────────────────────────────────────────────────── */
