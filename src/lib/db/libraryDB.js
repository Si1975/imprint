/**
 * libraryDB.js — IndexedDB data layer for Imprint
 *
 * Object Stores:
 *   library  — one record per book (metadata + optional cached word array for uploads)
 *   progress — one record per book (reading position, time spent)
 *   sessions — one record per reading session (for streak/history in ActivityDashboard)
 *
 * All exports return Promises so this module can be swapped for a
 * native SQLite adapter (Capacitor SQLite / wa-sqlite) in Phase 2
 * without touching any Svelte store or component code.
 */

const DB_NAME = 'imprint-library';
const DB_VERSION = 1;

/** @type {IDBDatabase|null} */
let _db = null;

/**
 * Open (or reuse) the IndexedDB connection.
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      // ── library store ────────────────────────────────────────────────────
      if (!db.objectStoreNames.contains('library')) {
        const libStore = db.createObjectStore('library', { keyPath: 'book_id' });
        libStore.createIndex('by_title', 'title', { unique: false });
        libStore.createIndex('by_source', 'source_origin', { unique: false });
        libStore.createIndex('by_custom', 'is_custom_upload', { unique: false });
        libStore.createIndex('by_last_read', 'last_read_at', { unique: false });
      }

      // ── progress store ───────────────────────────────────────────────────
      if (!db.objectStoreNames.contains('progress')) {
        const progStore = db.createObjectStore('progress', { keyPath: 'book_id' });
        progStore.createIndex('by_timestamp', 'last_read_timestamp', { unique: false });
      }

      // ── sessions store ───────────────────────────────────────────────────
      if (!db.objectStoreNames.contains('sessions')) {
        const sessStore = db.createObjectStore('sessions', {
          keyPath: 'session_id',
          autoIncrement: true,
        });
        sessStore.createIndex('by_book', 'book_id', { unique: false });
        sessStore.createIndex('by_date', 'date', { unique: false });
      }
    };

    req.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };

    req.onerror = (e) => reject(e.target.error);
  });
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Run a single IDB request inside a transaction, returning a Promise.
 * @param {string} storeName
 * @param {'readonly'|'readwrite'} mode
 * @param {(store: IDBObjectStore) => IDBRequest} fn
 */
async function tx(storeName, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Library Store ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} BookRecord
 * @property {string}   book_id             — UUID or stable hash (PK)
 * @property {string}   title
 * @property {string}   author
 * @property {string}   file_type           — 'json'|'epub'|'pdf'|'txt'|'catalog'
 * @property {number}   total_words
 * @property {string[]|null} raw_text_array  — parsed words; null for catalog books (fetched on demand)
 * @property {boolean}  is_custom_upload
 * @property {string}   source_origin       — 'local_upload'|'local_catalog'|'gutenberg_api'
 * @property {string|null} external_source_id — slug or Gutenberg ID
 * @property {string|null} catalog_url      — URL to fetch raw text for catalog books
 * @property {number}   added_at            — timestamp
 * @property {number}   last_read_at        — timestamp (for sorting)
 */

/**
 * Insert or update a book record.
 * @param {BookRecord} book
 * @returns {Promise<void>}
 */
export async function upsertBook(book) {
  return tx('library', 'readwrite', (store) => store.put(book));
}

/**
 * Retrieve a single book by its ID.
 * @param {string} bookId
 * @returns {Promise<BookRecord|undefined>}
 */
export async function getBook(bookId) {
  return tx('library', 'readonly', (store) => store.get(bookId));
}

/**
 * Retrieve all books, sorted by last_read_at descending.
 * @returns {Promise<BookRecord[]>}
 */
export async function getAllBooks() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('library', 'readonly');
    const store = transaction.objectStore('library');
    const req = store.getAll();
    req.onsuccess = () => {
      const books = req.result;
      books.sort((a, b) => (b.last_read_at || 0) - (a.last_read_at || 0));
      resolve(books);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Delete a book and its associated progress.
 * @param {string} bookId
 * @returns {Promise<void>}
 */
export async function deleteBook(bookId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['library', 'progress'], 'readwrite');
    transaction.objectStore('library').delete(bookId);
    transaction.objectStore('progress').delete(bookId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// ── Progress Store ───────────────────────────────────────────────────────────

/**
 * @typedef {Object} ProgressRecord
 * @property {string} book_id                — FK to library (also PK here — 1:1)
 * @property {number} current_word_index
 * @property {number} percentage_completed   — 0–100
 * @property {number} last_read_timestamp    — epoch ms
 * @property {number} total_time_spent_seconds
 * @property {boolean} is_completed
 */

/**
 * Insert or update progress for a book.
 * @param {ProgressRecord} progressRecord
 * @returns {Promise<void>}
 */
export async function saveProgress(progressRecord) {
  // Merge with any existing record to accumulate time
  const existing = await getProgress(progressRecord.book_id);
  const merged = {
    ...existing,
    ...progressRecord,
    total_time_spent_seconds:
      (existing?.total_time_spent_seconds || 0) + (progressRecord.total_time_spent_seconds || 0),
  };
  return tx('progress', 'readwrite', (store) => store.put(merged));
}

/**
 * Get progress for a specific book.
 * @param {string} bookId
 * @returns {Promise<ProgressRecord|undefined>}
 */
export async function getProgress(bookId) {
  return tx('progress', 'readonly', (store) => store.get(bookId));
}

/**
 * Get all progress records (for dashboard aggregation).
 * @returns {Promise<ProgressRecord[]>}
 */
export async function getAllProgress() {
  return tx('progress', 'readonly', (store) => store.getAll());
}

// ── Sessions Store ───────────────────────────────────────────────────────────

/**
 * @typedef {Object} SessionRecord
 * @property {number} [session_id]   — autoIncrement PK
 * @property {string} book_id
 * @property {number} start_timestamp
 * @property {number} end_timestamp
 * @property {number} words_read
 * @property {string} date           — ISO date string 'YYYY-MM-DD' for streak grouping
 */

/**
 * Record a completed reading session.
 * @param {Omit<SessionRecord,'session_id'>} session
 * @returns {Promise<number>} — the new session_id
 */
export async function recordSession(session) {
  return tx('sessions', 'readwrite', (store) => store.add(session));
}

/**
 * Get all sessions for streak + history calculation.
 * @returns {Promise<SessionRecord[]>}
 */
export async function getAllSessions() {
  return tx('sessions', 'readonly', (store) => store.getAll());
}

/**
 * Aggregate stats across all sessions + progress records.
 * @returns {Promise<{totalMinutesRead: number, booksCompleted: number, currentStreak: number, weekHistory: number[]}>}
 */
export async function getAggregateStats() {
  const [sessions, progressRecords] = await Promise.all([
    getAllSessions(),
    getAllProgress(),
  ]);

  // Total time
  const totalMinutesRead = progressRecords.reduce(
    (sum, p) => sum + Math.floor((p.total_time_spent_seconds || 0) / 60),
    0,
  );

  // Completed books
  const booksCompleted = progressRecords.filter((p) => p.is_completed).length;

  // Streak — consecutive distinct calendar days with at least one session
  const daySet = new Set(sessions.map((s) => s.date));
  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  let checkDate = new Date();
  while (true) {
    const d = checkDate.toISOString().slice(0, 10);
    if (daySet.has(d)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // 7-day session minutes history
  const weekHistory = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const daySessions = sessions.filter((s) => s.date === dateStr);
    return Math.round(
      daySessions.reduce((sum, s) => sum + (s.end_timestamp - s.start_timestamp) / 60000, 0),
    );
  });

  return { totalMinutesRead, booksCompleted, currentStreak: streak, weekHistory };
}
