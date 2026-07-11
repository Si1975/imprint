/**
 * classics.js — Public Domain catalog metadata
 *
 * Each entry has:
 *   - Full BookRecord schema (minus raw_text_array — texts are lazy-fetched)
 *   - catalog_url pointing to /catalog/<slug>.txt in the public directory
 *
 * Texts are NOT bundled here. They are full-length static files served from
 * the public directory and fetched on demand via ingestCatalogBook().
 */

/** @type {import('../db/libraryDB.js').BookRecord[]} */
export const classics = [
  {
    book_id: 'catalog_frankenstein',
    title: 'Frankenstein; or, The Modern Prometheus',
    author: 'Mary Wollstonecraft Shelley',
    file_type: 'catalog',
    total_words: 0, // updated after first fetch
    raw_text_array: null,
    is_custom_upload: false,
    source_origin: 'local_catalog',
    external_source_id: 'gutenberg_84',
    catalog_url: '/catalog/frankenstein.txt',
    added_at: 0,
    last_read_at: 0,
    description: 'The classic Gothic novel about creation, ambition, and what it means to be human.',
    year: 1818,
    cover_emoji: '🧟',
  },
  {
    book_id: 'catalog_pride-and-prejudice',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    file_type: 'catalog',
    total_words: 0,
    raw_text_array: null,
    is_custom_upload: false,
    source_origin: 'local_catalog',
    external_source_id: 'gutenberg_1342',
    catalog_url: '/catalog/pride-and-prejudice.txt',
    added_at: 0,
    last_read_at: 0,
    description: 'Austen\'s sparkling comedy of manners, romance, and social class in Regency England.',
    year: 1813,
    cover_emoji: '💌',
  },
  {
    book_id: 'catalog_moby-dick',
    title: 'Moby-Dick; or, The Whale',
    author: 'Herman Melville',
    file_type: 'catalog',
    total_words: 0,
    raw_text_array: null,
    is_custom_upload: false,
    source_origin: 'local_catalog',
    external_source_id: 'gutenberg_2701',
    catalog_url: '/catalog/moby-dick.txt',
    added_at: 0,
    last_read_at: 0,
    description: 'The epic sea voyage in pursuit of the white whale — one of the great American novels.',
    year: 1851,
    cover_emoji: '🐋',
  },
  {
    book_id: 'catalog_art-of-war',
    title: 'The Art of War',
    author: 'Sun Tzu',
    file_type: 'catalog',
    total_words: 0,
    raw_text_array: null,
    is_custom_upload: false,
    source_origin: 'local_catalog',
    external_source_id: 'gutenberg_132',
    catalog_url: '/catalog/art-of-war.txt',
    added_at: 0,
    last_read_at: 0,
    description: 'The ancient Chinese military treatise on strategy, tactics, and the art of conflict.',
    year: -500,
    cover_emoji: '⚔️',
  },
  {
    book_id: 'catalog_alice-in-wonderland',
    title: "Alice's Adventures in Wonderland",
    author: 'Lewis Carroll',
    file_type: 'catalog',
    total_words: 0,
    raw_text_array: null,
    is_custom_upload: false,
    source_origin: 'local_catalog',
    external_source_id: 'gutenberg_11',
    catalog_url: '/catalog/alice-in-wonderland.txt',
    added_at: 0,
    last_read_at: 0,
    description: 'Alice follows a white rabbit down a rabbit hole into a fantastical world of nonsense.',
    year: 1865,
    cover_emoji: '🐇',
  },
];
