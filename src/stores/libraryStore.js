/**
 * libraryStore.js — Reactive library state wrapping the async DB adapter
 *
 * The store automatically selects the correct DB adapter:
 *   - Free tier  → libraryDB.js  (IndexedDB)
 *   - Premium    → sqliteAdapter.js (delegates to IndexedDB in Phase 1;
 *                  replace implementation for Phase 2 SQLite/WASM)
 *
 * All store methods are async — components should `await` them or handle
 * the returned Promise. This ensures zero breakage when the DB adapter
 * changes in Phase 2.
 */

import { writable, get } from 'svelte/store';
import { getIsPremium } from './premiumStore.js';
import { classics } from '../lib/catalog/classics.js';

// ── Adapter selector ─────────────────────────────────────────────────────────

/**
 * Returns the appropriate DB adapter based on premium status.
 * Dynamic import means the WASM bundle isn't loaded until needed.
 * @returns {Promise<typeof import('../lib/db/libraryDB.js')>}
 */
async function getAdapter() {
  if (getIsPremium()) {
    return import('../lib/db/sqliteAdapter.js');
  }
  return import('../lib/db/libraryDB.js');
}

// ── Keys ─────────────────────────────────────────────────────────────────────

const ACTIVE_BOOK_KEY = 'rsvp-active-book-id';

// ── Store shape ───────────────────────────────────────────────────────────────

/**
 * @typedef {Object} LibraryState
 * @property {import('../lib/db/libraryDB.js').BookRecord[]} books
 * @property {string|null} activeBookId
 * @property {boolean} loaded
 * @property {boolean} loading
 * @property {string|null} error
 */

/** @type {import('svelte/store').Writable<LibraryState>} */
const _state = writable({
  books: [],
  activeBookId: null,
  loaded: false,
  loading: false,
  error: null,
});

// ── Catalog helpers ───────────────────────────────────────────────────────────

/**
 * Build a full list merging DB books with catalog entries that haven't been
 * opened yet (catalog entries are shown but their text isn't in the DB).
 * @param {import('../lib/db/libraryDB.js').BookRecord[]} dbBooks
 * @returns {import('../lib/db/libraryDB.js').BookRecord[]}
 */
function mergeWithCatalog(dbBooks) {
  const dbIds = new Set(dbBooks.map((b) => b.book_id));
  const catalogEntries = classics
    .filter((c) => !dbIds.has(c.book_id))
    .map((c) => ({
      ...c,
      raw_text_array: null,
      added_at: 0,
      last_read_at: 0,
    }));
  return [...dbBooks, ...catalogEntries];
}

/**
 * Attach progress records to books so that book._progress is always available.
 * @param {import('../lib/db/libraryDB.js').BookRecord[]} books
 * @param {import('../lib/db/libraryDB.js').ProgressRecord[]} progressRecords
 * @returns {import('../lib/db/libraryDB.js').BookRecord[]}
 */
function attachProgress(books, progressRecords) {
  const progMap = new Map(progressRecords.map((p) => [p.book_id, p]));
  return books.map((b) => ({
    ...b,
    _progress: progMap.get(b.book_id) || null,
  }));
}

// ── Public store interface ────────────────────────────────────────────────────

export const libraryStore = {
  subscribe: _state.subscribe,

  /**
   * Initialize: load DB books and merge with catalog.
   * Called once on app mount.
   * @returns {Promise<void>}
   */
  async init() {
    _state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      const db = await getAdapter();
      const [dbBooks, progressRecords] = await Promise.all([
        db.getAllBooks(),
        db.getAllProgress(),
      ]);
      const merged = mergeWithCatalog(dbBooks);
      const books = attachProgress(merged, progressRecords);
      const activeBookId =
        localStorage.getItem(ACTIVE_BOOK_KEY) || (books[0]?.book_id ?? null);

      _state.set({ books, activeBookId, loaded: true, loading: false, error: null });
    } catch (err) {
      console.error('[libraryStore] init failed:', err);
      _state.update((s) => ({
        ...s,
        books: attachProgress(mergeWithCatalog([]), []),
        loaded: true,
        loading: false,
        error: err.message,
      }));
    }
  },

  /**
   * Add or update a book record. Refreshes the book list.
   * @param {import('../lib/db/libraryDB.js').BookRecord} bookMeta
   * @returns {Promise<void>}
   */
  async addBook(bookMeta) {
    const db = await getAdapter();
    await db.upsertBook({ ...bookMeta, added_at: Date.now(), last_read_at: Date.now() });
    await libraryStore._refresh();
  },

  /**
   * Delete a book and its progress.
   * @param {string} bookId
   * @returns {Promise<void>}
   */
  async removeBook(bookId) {
    const db = await getAdapter();
    await db.deleteBook(bookId);
    await libraryStore._refresh();
  },

  /**
   * Mark a book as the active reading target.
   * @param {string|null} bookId
   * @returns {Promise<void>}
   */
  async setActiveBook(bookId) {
    if (bookId) {
      localStorage.setItem(ACTIVE_BOOK_KEY, bookId);
      // Touch last_read_at
      const db = await getAdapter();
      const existing = await db.getBook(bookId);
      if (existing) {
        await db.upsertBook({ ...existing, last_read_at: Date.now() });
      }
    } else {
      localStorage.removeItem(ACTIVE_BOOK_KEY);
    }
    _state.update((s) => ({ ...s, activeBookId: bookId }));
  },

  /**
   * Persist reading progress for the active (or specified) book.
   * Accumulates total_time_spent_seconds — pass only the delta for this session.
   * @param {string} bookId
   * @param {number} wordIndex
   * @param {number} totalWords
   * @param {number} sessionDeltaSeconds — seconds read in this session call
   * @param {boolean} [isCompleted]
   * @returns {Promise<void>}
   */
  async saveProgress(bookId, wordIndex, totalWords, sessionDeltaSeconds = 0, isCompleted = false) {
    const db = await getAdapter();
    const percentage = totalWords > 0 ? Math.round((wordIndex / totalWords) * 100) : 0;
    await db.saveProgress({
      book_id: bookId,
      current_word_index: wordIndex,
      percentage_completed: percentage,
      last_read_timestamp: Date.now(),
      total_time_spent_seconds: sessionDeltaSeconds,
      is_completed: isCompleted || wordIndex >= totalWords,
    });
  },

  /**
   * Get progress for a specific book.
   * @param {string} bookId
   * @returns {Promise<import('../lib/db/libraryDB.js').ProgressRecord|undefined>}
   */
  async getProgress(bookId) {
    const db = await getAdapter();
    return db.getProgress(bookId);
  },

  /**
   * Record a completed reading session (for streak/history tracking).
   * @param {string} bookId
   * @param {number} startTimestamp
   * @param {number} endTimestamp
   * @param {number} wordsRead
   * @returns {Promise<void>}
   */
  async recordSession(bookId, startTimestamp, endTimestamp, wordsRead) {
    const db = await getAdapter();
    const date = new Date(startTimestamp).toISOString().slice(0, 10);
    await db.recordSession({ book_id: bookId, start_timestamp: startTimestamp, end_timestamp: endTimestamp, words_read: wordsRead, date });
  },

  /**
   * Get aggregate stats (for ActivityDashboard).
   * @returns {Promise<{totalMinutesRead: number, booksCompleted: number, currentStreak: number, weekHistory: number[]}>}
   */
  async getAggregateStats() {
    const db = await getAdapter();
    return db.getAggregateStats();
  },

  /**
   * Get a single book record (from DB or catalog fallback).
   * @param {string} bookId
   * @returns {Promise<import('../lib/db/libraryDB.js').BookRecord|undefined>}
   */
  async getBook(bookId) {
    const db = await getAdapter();
    const dbBook = await db.getBook(bookId);
    if (dbBook) return dbBook;
    // Fall back to catalog entry
    return classics.find((c) => c.book_id === bookId);
  },

  // ── Internal ──────────────────────────────────────────────────────────────

  async _refresh() {
    const db = await getAdapter();
    const [dbBooks, progressRecords] = await Promise.all([
      db.getAllBooks(),
      db.getAllProgress(),
    ]);
    const merged = mergeWithCatalog(dbBooks);
    const books = attachProgress(merged, progressRecords);
    _state.update((s) => ({ ...s, books }));
  },
};
