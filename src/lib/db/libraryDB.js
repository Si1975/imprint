/** Personal books and progress in IndexedDB. Existing database/store names are retained. */

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
    transaction.oncomplete = () => resolve(req.result);
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
    req.onerror = () => reject(req.error);
  });
}

// ── Library Store ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} BookRecord
 * @property {string}   book_id             — UUID or stable hash (PK)
 * @property {string}   title
 * @property {string}   author
 * @property {string}   file_type           — 'epub'|'pdf'|'txt'|'md'|'paste'
 * @property {number}   total_words
 * @property {string[]|null} raw_text_array  — cached parsed words
 * @property {boolean}  is_custom_upload
 * @property {string}   source_origin       — 'local_upload' (legacy sources are retained)
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

