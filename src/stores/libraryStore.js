import { writable } from 'svelte/store';
import * as db from '../lib/db/libraryDB.js';
const ACTIVE_BOOK_KEY = 'rsvp-active-book-id';
const state = writable({ books: [], activeBookId: null, loaded: false, error: null });
export const libraryStore = {
 subscribe: state.subscribe,
 async init() {
  try { await this._refresh(); state.update(s => ({ ...s, activeBookId: localStorage.getItem(ACTIVE_BOOK_KEY), loaded: true })); }
  catch (error) { state.update(s => ({ ...s, loaded: true, error: error.message })); }
 },
 async _refresh() {
  const [books, progress] = await Promise.all([db.getAllBooks(), db.getAllProgress()]);
  const byId = new Map(progress.map(p => [p.book_id, p]));
  state.update(s => ({ ...s, books: books.filter(b => b.raw_text_array?.length).map(b => ({ ...b, _progress: byId.get(b.book_id) || null })) }));
 },
 async addBook(book) { await db.upsertBook(book); await this._refresh(); },
 async removeBook(id) {
  await db.deleteBook(id);
  if (localStorage.getItem(ACTIVE_BOOK_KEY) === id) await this.setActiveBook(null);
  await this._refresh();
 },
 async setActiveBook(id) {
  if (id) localStorage.setItem(ACTIVE_BOOK_KEY, id); else localStorage.removeItem(ACTIVE_BOOK_KEY);
  state.update(s => ({ ...s, activeBookId: id }));
 },
 getBook: db.getBook,
 getProgress: db.getProgress,
 async saveProgress(id, index, total) {
  await db.saveProgress({ book_id: id, current_word_index: index, percentage_completed: total ? Math.round(index / total * 100) : 0, last_read_timestamp: Date.now(), total_time_spent_seconds: 0, is_completed: index >= total });
  await this._refresh();
 },
};
