/**
 * ingestor.js — Unified text ingestion pipeline
 *
 * All text entering the RSVP player must pass through here.
 * Accepts either:
 *   (a) A locally parsed file result object
 *   (b) An external JSON record (Gutenberg API shape)
 *
 * Responsibilities:
 *   1. Validate and normalise the incoming payload
 *   2. Parse raw text → words[] via parseText()
 *   3. Enforce 10,000-word paste limit for free-tier users
 *   4. Generate a stable book_id
 *   5. Return a normalised BookRecord ready for libraryDB.upsertBook()
 *
 * IMPORTANT: This module is 100% client-side with no network calls.
 * Network book fetching is handled by the catalog loader in libraryStore.
 */

import { parseText } from './rsvp-utils.js';
import { getIsPremium } from '../stores/premiumStore.js';

// ── Constants ─────────────────────────────────────────────────────────────────

export const FREE_WORD_LIMIT = 10_000;

// ── ID generation ─────────────────────────────────────────────────────────────

/**
 * Generate a stable, collision-resistant book ID from title + author.
 * Uses the Web Crypto API (available in all modern browsers + Capacitor WebView).
 * @param {string} title
 * @param {string} author
 * @param {string} [externalId]
 * @returns {Promise<string>}
 */
export async function generateBookId(title, author, externalId) {
  if (externalId) return `ext_${externalId}`;

  const raw = `${title.trim().toLowerCase()}::${author.trim().toLowerCase()}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);

  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
      .slice(0, 8)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    // Fallback for environments where subtle is unavailable (e.g. HTTP dev)
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (Math.imul(31, hash) + raw.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}

// ── Ingestion ─────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} LocalFilePayload
 * @property {string} title
 * @property {string} author
 * @property {'epub'|'pdf'|'txt'|'paste'} fileType
 * @property {string} rawText
 * @property {boolean} [isCustomUpload]
 */

/**
 * @typedef {Object} ExternalJsonPayload
 * @property {string} external_id
 * @property {string} title
 * @property {string} author
 * @property {string} raw_text
 */

/**
 * @typedef {Object} IngestResult
 * @property {boolean} success
 * @property {import('./db/libraryDB.js').BookRecord|null} book
 * @property {string[]} words
 * @property {string|null} error
 * @property {boolean} wasTruncated — true if word limit was applied
 * @property {number} originalWordCount — word count before any truncation
 */

/**
 * Ingest a locally parsed file into a normalised BookRecord.
 * @param {LocalFilePayload} payload
 * @returns {Promise<IngestResult>}
 */
export async function ingestLocalFile(payload) {
  const { title, author, fileType, rawText, isCustomUpload = true } = payload;

  if (!rawText || !rawText.trim()) {
    return { success: false, book: null, words: [], error: 'No text content found.', wasTruncated: false, originalWordCount: 0 };
  }

  const allWords = parseText(rawText);
  const originalWordCount = allWords.length;

  if (originalWordCount === 0) {
    return { success: false, book: null, words: [], error: 'Could not parse any words from the text.', wasTruncated: false, originalWordCount: 0 };
  }

  const isPremium = getIsPremium();
  const isPastedContent = fileType === 'paste';
  let words = allWords;
  let wasTruncated = false;

  // Enforce 10k word cap for free-tier pasted content
  if (!isPremium && isPastedContent && allWords.length > FREE_WORD_LIMIT) {
    words = allWords.slice(0, FREE_WORD_LIMIT);
    wasTruncated = true;
  }

  const bookId = await generateBookId(title, author);

  /** @type {import('./db/libraryDB.js').BookRecord} */
  const book = {
    book_id: bookId,
    title: title || 'Untitled',
    author: author || 'Unknown',
    file_type: fileType,
    total_words: words.length,
    raw_text_array: words,
    is_custom_upload: isCustomUpload,
    source_origin: 'local_upload',
    external_source_id: null,
    catalog_url: null,
    added_at: Date.now(),
    last_read_at: Date.now(),
  };

  return { success: true, book, words, error: null, wasTruncated, originalWordCount };
}

/**
 * Ingest an external JSON payload (Gutenberg API shape) into a normalised BookRecord.
 * @param {ExternalJsonPayload} payload
 * @returns {Promise<IngestResult>}
 */
export async function ingestExternalJson(payload) {
  const { external_id, title, author, raw_text } = payload;

  if (!raw_text || !raw_text.trim()) {
    return { success: false, book: null, words: [], error: 'External payload contains no text.', wasTruncated: false, originalWordCount: 0 };
  }

  const words = parseText(raw_text);

  if (words.length === 0) {
    return { success: false, book: null, words: [], error: 'Could not parse words from external text.', wasTruncated: false, originalWordCount: 0 };
  }

  const bookId = await generateBookId(title, author, external_id);

  /** @type {import('./db/libraryDB.js').BookRecord} */
  const book = {
    book_id: bookId,
    title: title || 'Untitled',
    author: author || 'Unknown',
    file_type: 'json',
    total_words: words.length,
    raw_text_array: words,
    is_custom_upload: false,
    source_origin: 'gutenberg_api',
    external_source_id: external_id || null,
    catalog_url: null,
    added_at: Date.now(),
    last_read_at: Date.now(),
  };

  return { success: true, book, words, error: null, wasTruncated: false, originalWordCount: words.length };
}

/**
 * Fetch and ingest a catalog book from a static URL.
 * The text is fetched client-side; words are NOT stored in the DB record
 * (catalog books can always be re-fetched, so we only persist progress).
 * @param {import('./db/libraryDB.js').BookRecord} catalogEntry — from classics.js
 * @returns {Promise<IngestResult>}
 */
export async function ingestCatalogBook(catalogEntry) {
  if (!catalogEntry.catalog_url) {
    return { success: false, book: null, words: [], error: 'Catalog entry has no URL.', wasTruncated: false, originalWordCount: 0 };
  }

  try {
    const response = await fetch(catalogEntry.catalog_url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const rawText = await response.text();
    const words = parseText(rawText);

    if (words.length === 0) {
      return { success: false, book: null, words: [], error: 'Catalog file appears to be empty.', wasTruncated: false, originalWordCount: 0 };
    }

    // Catalog books: do not store raw_text_array in DB (fetch on demand)
    const book = {
      ...catalogEntry,
      total_words: words.length,
      raw_text_array: null, // never stored — fetched on each open
      last_read_at: Date.now(),
    };

    return { success: true, book, words, error: null, wasTruncated: false, originalWordCount: words.length };
  } catch (err) {
    return { success: false, book: null, words: [], error: `Failed to load catalog book: ${err.message}`, wasTruncated: false, originalWordCount: 0 };
  }
}
