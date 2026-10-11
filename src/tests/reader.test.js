import { render, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const fixtures = vi.hoisted(() => ({ books: [], progress: new Map(), saves: [] }));
vi.mock('../lib/db/libraryDB.js', () => ({
 getAllBooks: async () => fixtures.books,
 getAllProgress: async () => Array.from(fixtures.progress.values()),
 getBook: async id => fixtures.books.find(b => b.book_id === id),
 getProgress: async id => fixtures.progress.get(id),
 upsertBook: async book => { fixtures.books = [...fixtures.books.filter(b => b.book_id !== book.book_id), book]; },
 deleteBook: async id => { fixtures.books = fixtures.books.filter(b => b.book_id !== id); fixtures.progress.delete(id); },
 saveProgress: async p => { fixtures.saves.push({ ...p }); fixtures.progress.set(p.book_id, p); },
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'web' } }));
import App from '../App.svelte';
const book = (id, title) => ({ book_id: id, title, author: 'Author', raw_text_array: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'], chapters: [{ title: 'First chapter', wordIndex: 0 }, { title: 'Second chapter', wordIndex: 4 }], total_words: 8, last_read_at: 1 });
beforeEach(() => { localStorage.clear(); fixtures.books = [book('a', 'Book A'), book('b', 'Book B')]; fixtures.progress.clear(); fixtures.saves = []; });
afterEach(() => cleanup());
describe('reader persistence', () => {
 it('restores active book identity and saves a chapter jump without a reading session', async () => {
  localStorage.setItem('rsvp-active-book-id', 'a');
  fixtures.progress.set('a', { book_id: 'a', current_word_index: 2 });
  const view = render(App);
  await waitFor(() => expect(view.getByText('Book A')).toBeTruthy());
  await fireEvent.click(view.getByText('Continue Reading'));
  await fireEvent.click(view.getByTitle('Pause (Space)'));
  await fireEvent.change(view.getByLabelText('Choose chapter'), { target: { value: '4' } });
  await waitFor(() => expect(fixtures.progress.get('a').current_word_index).toBe(4));
 });
 it('flushes the old book before switching and retains a fewer-than-five-word session', async () => {
  localStorage.setItem('rsvp-active-book-id', 'a');
  const view = render(App);
  await waitFor(() => expect(view.getByText('Book A')).toBeTruthy());
  await fireEvent.click(view.getByText('Start Reading'));
  await fireEvent.click(view.getByTitle('Pause (Space)'));
  await fireEvent.click(view.getByTitle('Stop (Esc)'));
  await fireEvent.click(view.getByLabelText('Library'));
  await fireEvent.click(view.getByText('Book B'));
  await waitFor(() => expect(localStorage.getItem('rsvp-active-book-id')).toBe('b'));
  expect(fixtures.progress.get('a').current_word_index).toBe(1);
  expect(fixtures.saves.filter(p => p.book_id === 'b')).toHaveLength(0);
 });
 it('checkpoints a book on pagehide', async () => {
  localStorage.setItem('rsvp-active-book-id', 'a');
  const view = render(App);
  await waitFor(() => expect(view.getByText('Book A')).toBeTruthy());
  await fireEvent.click(view.getByText('Start Reading'));
  window.dispatchEvent(new Event('pagehide'));
  await waitFor(() => expect(fixtures.progress.get('a')?.current_word_index).toBe(1));
 });
});
