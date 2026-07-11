/**
 * gutendexApi.js — Client-side wrapper for the Gutendex API (Project Gutenberg)
 *
 * Gutendex provides a free, open JSON API for searching and fetching metadata
 * from Project Gutenberg's catalog of 70,000+ public domain books.
 *
 * API docs: https://gutendex.com
 *
 * NOTE: Both Gutendex and Gutenberg text endpoints lack CORS headers.
 * In development, requests are proxied through Vite (see vite.config.js).
 * In production, we fall back to a public CORS proxy (corsproxy.io).
 * ⚠️  Before submitting to app stores, replace corsproxy.io with your own
 *     proxy — see Roadmap.md for details.
 */

// ── URL helpers ────────────────────────────────────────────────────────────────

const IS_DEV = import.meta.env.DEV;

/**
 * Build the base URL for Gutendex API requests.
 * Dev: uses Vite proxy at /api/gutendex
 * Prod: uses corsproxy.io to bypass CORS
 */
function gutendexUrl(path) {
  if (IS_DEV) return `/api/gutendex${path}`;
  return `https://corsproxy.io/?${encodeURIComponent(`https://gutendex.com${path}`)}`;
}

/**
 * Build a proxied URL for fetching Gutenberg text files.
 * Dev: rewrites gutenberg.org URLs through Vite proxy at /api/gutenberg
 * Prod: uses corsproxy.io
 */
function proxyTextUrl(originalUrl) {
  if (!originalUrl) return null;
  if (IS_DEV) {
    // Rewrite https://www.gutenberg.org/... → /api/gutenberg/...
    try {
      const url = new URL(originalUrl);
      if (url.hostname.endsWith('gutenberg.org')) {
        return `/api/gutenberg${url.pathname}`;
      }
    } catch { /* fall through to CORS proxy */ }
  }
  return `https://corsproxy.io/?${encodeURIComponent(originalUrl)}`;
}

// ── In-memory cache ────────────────────────────────────────────────────────────

const _cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  _cache.set(key, { data, timestamp: Date.now() });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Extract a clean author name from Gutendex's person object.
 * Gutendex returns "Austen, Jane" — we flip to "Jane Austen".
 */
function formatAuthor(persons) {
  if (!persons || persons.length === 0) return 'Unknown';
  const author = persons[0];
  const name = author.name || '';
  // Handle "Last, First" format
  if (name.includes(',')) {
    const parts = name.split(',').map((s) => s.trim());
    return parts.reverse().join(' ');
  }
  return name;
}

/**
 * Get the best cover image URL from a Gutendex book result.
 * Falls back to null if no image available.
 */
function getCoverUrl(formats) {
  return (
    formats['image/jpeg'] ||
    formats['image/png'] ||
    formats['image/webp'] ||
    null
  );
}

/**
 * Build the direct /cache/epub/ text URL from a Gutenberg book ID.
 *
 * The Gutendex API returns /ebooks/NNN.txt.utf-8 as the text URL, but that
 * path issues a 302 redirect to an absolute http:// URL, which breaks our
 * Vite proxy chain. The /cache/epub/ path is the stable canonical URL and
 * works reliably without any redirects.
 */
function getDirectTextUrl(id) {
  if (!id) return null;
  return `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`;
}

/**
 * Normalise a Gutendex API result into our app's shape.
 */
function normaliseResult(item) {
  return {
    gutenbergId: item.id,
    title: item.title || 'Untitled',
    author: formatAuthor(item.authors),
    subjects: item.subjects || [],
    bookshelves: item.bookshelves || [],
    languages: item.languages || [],
    downloadCount: item.download_count || 0,
    coverUrl: getCoverUrl(item.formats || {}),
    // Use the direct /cache/epub/ URL to avoid the /ebooks/ redirect chain
    textUrl: getDirectTextUrl(item.id),
    formats: item.formats || {},
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Search books by query string.
 * @param {string} query — search term
 * @param {number} [page=1] — page number (32 results per page)
 * @returns {Promise<{results: Object[], count: number, next: string|null, previous: string|null}>}
 */
export async function searchBooks(query, page = 1) {
  if (!query || !query.trim()) return { results: [], count: 0, next: null, previous: null };

  const cacheKey = `search:${query}:${page}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    search: query.trim(),
    page: String(page),
    languages: 'en',
    mime_type: 'text/plain',
  });

  const response = await fetch(gutendexUrl(`/books/?${params}`));
  if (!response.ok) throw new Error(`Gutendex API error: ${response.status}`);

  const data = await response.json();
  const result = {
    results: (data.results || []).map(normaliseResult),
    count: data.count || 0,
    next: data.next || null,
    previous: data.previous || null,
  };

  setCache(cacheKey, result);
  return result;
}

/**
 * Get popular/trending books (sorted by download count).
 * @param {number} [page=1]
 * @returns {Promise<{results: Object[], count: number, next: string|null}>}
 */
export async function getPopularBooks(page = 1) {
  const cacheKey = `popular:${page}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    page: String(page),
    languages: 'en',
    mime_type: 'text/plain',
    sort: 'popular',
  });

  const response = await fetch(gutendexUrl(`/books/?${params}`));
  if (!response.ok) throw new Error(`Gutendex API error: ${response.status}`);

  const data = await response.json();
  const result = {
    results: (data.results || []).map(normaliseResult),
    count: data.count || 0,
    next: data.next || null,
  };

  setCache(cacheKey, result);
  return result;
}

/**
 * Browse books by topic/subject.
 * @param {string} topic — e.g., "Fiction", "Science", "Philosophy"
 * @param {number} [page=1]
 * @returns {Promise<{results: Object[], count: number, next: string|null}>}
 */
export async function browseByTopic(topic, page = 1) {
  const cacheKey = `topic:${topic}:${page}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    topic: topic.trim(),
    page: String(page),
    languages: 'en',
    mime_type: 'text/plain',
  });

  const response = await fetch(gutendexUrl(`/books/?${params}`));
  if (!response.ok) throw new Error(`Gutendex API error: ${response.status}`);

  const data = await response.json();
  const result = {
    results: (data.results || []).map(normaliseResult),
    count: data.count || 0,
    next: data.next || null,
  };

  setCache(cacheKey, result);
  return result;
}

/**
 * Fetch the full plain-text content of a book.
 * @param {Object} book — normalised result from searchBooks/getPopularBooks
 * @returns {Promise<string>} — raw text content
 */
export async function fetchBookText(book) {
  const textUrl = book.textUrl;
  if (!textUrl) {
    throw new Error('No plain-text version available for this book.');
  }

  const proxiedUrl = proxyTextUrl(textUrl);
  const response = await fetch(proxiedUrl);
  if (!response.ok) throw new Error(`Failed to fetch book text: HTTP ${response.status}`);
  return response.text();
}

/**
 * Pre-defined topic categories for quick browsing.
 */
export const TOPICS = [
  { label: '🔥 Popular', value: '__popular__' },
  { label: '📖 Fiction', value: 'Fiction' },
  { label: '🔬 Science', value: 'Science' },
  { label: '💭 Philosophy', value: 'Philosophy' },
  { label: '📜 History', value: 'History' },
  { label: '🎭 Drama', value: 'Drama' },
  { label: '🌍 Adventure', value: 'Adventure' },
  { label: '💀 Horror', value: 'Horror' },
];
