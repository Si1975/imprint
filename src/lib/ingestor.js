import { parseText } from './rsvp-utils.js';
export async function ingestLocalFile({ title = 'Untitled', author = 'Unknown', fileType = 'paste', rawText, chapters = [] }) {
 const words = parseText(rawText);
 if (!words.length) throw new Error('No readable text found.');
 const bytes = new TextEncoder().encode(rawText);
 const hash = await crypto.subtle.digest('SHA-256', bytes);
 const book_id = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
 return { book_id, title, author, file_type: fileType, raw_text_array: words, chapters, total_words: words.length, is_custom_upload: true, source_origin: 'local_upload', added_at: Date.now(), last_read_at: Date.now() };
}
