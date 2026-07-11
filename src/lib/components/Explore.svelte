<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { isPremium } from '../../stores/premiumStore.js';
  import { searchBooks, getPopularBooks, browseByTopic, fetchBookText, TOPICS } from '../gutendexApi.js';
  import { ingestExternalJson } from '../ingestor.js';
  import { libraryStore } from '../../stores/libraryStore.js';

  const dispatch = createEventDispatcher();

  // ── Gutendex free-tier gating ──────────────────────────────────────────────
  // Free users can search and browse, but have limited downloads.
  // Change this constant to adjust the free tier limit.
  const FREE_GUTENDEX_DOWNLOADS = 3;
  const DOWNLOADS_KEY = 'rsvp-gutendex-downloads';

  function getFreeDownloadCount() {
    try { return parseInt(localStorage.getItem(DOWNLOADS_KEY) || '0', 10); } catch { return 0; }
  }
  function incrementFreeDownloads() {
    localStorage.setItem(DOWNLOADS_KEY, String(getFreeDownloadCount() + 1));
  }

  $: canDownload = $isPremium || getFreeDownloadCount() < FREE_GUTENDEX_DOWNLOADS;
  $: freeDownloadsRemaining = Math.max(0, FREE_GUTENDEX_DOWNLOADS - getFreeDownloadCount());

  // ── State ──────────────────────────────────────────────────────────────────
  let query = '';
  let results = [];
  let totalCount = 0;
  let loading = false;
  let loadingBookId = null; // which book is currently being downloaded
  let error = '';
  let activeTopic = '__popular__';
  let hasSearched = false;
  let searchTimer;

  // ── Search & Browse ────────────────────────────────────────────────────────

  function debounceSearch() {
    clearTimeout(searchTimer);
    if (!query.trim()) {
      results = [];
      hasSearched = false;
      loadTopic(activeTopic);
      return;
    }
    searchTimer = setTimeout(async () => {
      await doSearch();
    }, 400);
  }

  async function doSearch() {
    if (!query.trim()) return;
    loading = true;
    error = '';
    hasSearched = true;
    try {
      const data = await searchBooks(query);
      results = data.results;
      totalCount = data.count;
    } catch (err) {
      error = err.message || 'Search failed';
      results = [];
    } finally {
      loading = false;
    }
  }

  async function loadTopic(topic) {
    activeTopic = topic;
    loading = true;
    error = '';
    hasSearched = false;
    query = '';
    try {
      const data = topic === '__popular__'
        ? await getPopularBooks()
        : await browseByTopic(topic);
      results = data.results;
      totalCount = data.count;
    } catch (err) {
      error = err.message || 'Failed to load';
      results = [];
    } finally {
      loading = false;
    }
  }

  async function downloadAndRead(book) {
    if (!canDownload) {
      dispatch('upgradeprompt');
      return;
    }

    loadingBookId = book.gutenbergId;
    error = '';

    try {
      // Fetch the full text
      const rawText = await fetchBookText(book);

      // Ingest into our format
      const result = await ingestExternalJson({
        external_id: `gutenberg_${book.gutenbergId}`,
        title: book.title,
        author: book.author,
        raw_text: rawText,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to ingest book');
      }

      // Add emoji based on first subject
      const firstSubject = (book.subjects[0] || '').toLowerCase();
      let emoji = '📚';
      if (firstSubject.includes('fiction')) emoji = '📖';
      else if (firstSubject.includes('horror') || firstSubject.includes('gothic')) emoji = '💀';
      else if (firstSubject.includes('adventure')) emoji = '🗺️';
      else if (firstSubject.includes('romance') || firstSubject.includes('love')) emoji = '💕';
      else if (firstSubject.includes('science')) emoji = '🔬';
      else if (firstSubject.includes('history')) emoji = '📜';
      else if (firstSubject.includes('philosophy')) emoji = '💭';
      else if (firstSubject.includes('war') || firstSubject.includes('military')) emoji = '⚔️';
      else if (firstSubject.includes('children')) emoji = '🧸';
      else if (firstSubject.includes('poetry')) emoji = '🖋️';

      // Persist to library
      await libraryStore.addBook({
        ...result.book,
        cover_emoji: emoji,
        source_origin: 'gutenberg_api',
      });

      // Track free downloads
      if (!$isPremium) {
        incrementFreeDownloads();
        canDownload = getFreeDownloadCount() < FREE_GUTENDEX_DOWNLOADS;
        freeDownloadsRemaining = Math.max(0, FREE_GUTENDEX_DOWNLOADS - getFreeDownloadCount());
      }

      // Open the book
      dispatch('openbook', { book: result.book });
    } catch (err) {
      error = err.message || 'Download failed';
    } finally {
      loadingBookId = null;
    }
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  onMount(() => {
    loadTopic('__popular__');
  });
</script>

<div class="explore-view">
  <div class="explore-header">
    <h1>Explore</h1>
    <span class="catalog-count">{totalCount.toLocaleString()} books</span>
  </div>

  <!-- Search -->
  <div class="search-bar">
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
    <input
      type="text"
      bind:value={query}
      on:input={debounceSearch}
      placeholder="Search 70,000+ public domain books…"
    />
    {#if query}
      <button class="clear-btn" on:click={() => { query = ''; loadTopic(activeTopic); }} aria-label="Clear search">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
    {/if}
  </div>

  <!-- Topic chips -->
  {#if !hasSearched}
    <div class="topic-chips">
      {#each TOPICS as topic}
        <button
          class="chip"
          class:active={activeTopic === topic.value}
          on:click={() => loadTopic(topic.value)}
        >
          {topic.label}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Free tier notice -->
  {#if !$isPremium}
    <div class="free-notice">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
      <span>
        {#if freeDownloadsRemaining > 0}
          {freeDownloadsRemaining} free download{freeDownloadsRemaining === 1 ? '' : 's'} remaining
        {:else}
          Free downloads used — <button class="inline-link" on:click={() => dispatch('upgradeprompt')}>activate Pro</button>
        {/if}
      </span>
    </div>
  {/if}

  <!-- Error -->
  {#if error}
    <div class="error-toast">
      <span>⚠️ {error}</span>
      <button on:click={() => (error = '')}>✕</button>
    </div>
  {/if}

  <!-- Results -->
  {#if loading && results.length === 0}
    <div class="skeleton-grid">
      {#each Array(6) as _, i}
        <div class="skeleton-card" style="animation-delay: {i * 0.08}s">
          <div class="sk-cover"></div>
          <div class="sk-lines">
            <div class="sk-line wide"></div>
            <div class="sk-line narrow"></div>
          </div>
        </div>
      {/each}
    </div>
  {:else if results.length > 0}
    <div class="results-grid">
      {#each results as book (book.gutenbergId)}
        <button
          class="result-card"
          on:click={() => downloadAndRead(book)}
          disabled={loadingBookId === book.gutenbergId}
        >
          <div class="result-cover">
            {#if book.coverUrl}
              <img src={book.coverUrl} alt={book.title} loading="lazy" />
            {:else}
              <div class="cover-placeholder">📚</div>
            {/if}
            {#if loadingBookId === book.gutenbergId}
              <div class="cover-loading">
                <div class="dl-spinner"></div>
              </div>
            {/if}
          </div>
          <div class="result-info">
            <div class="result-title">{book.title}</div>
            <div class="result-author">{book.author}</div>
            <div class="result-downloads">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
              {book.downloadCount.toLocaleString()}
            </div>
          </div>
        </button>
      {/each}
    </div>
  {:else if hasSearched && !loading}
    <div class="empty-state">
      <span class="empty-emoji">🔍</span>
      <p>No results for "{query}"</p>
      <p class="empty-hint">Try a different title, author, or topic</p>
    </div>
  {/if}
</div>

<style>
  .explore-view {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem 1.25rem;
    padding-top: calc(1.5rem + env(safe-area-inset-top, 0px));
    padding-bottom: calc(5rem + env(safe-area-inset-bottom, 0px));
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    min-height: 100%;
    box-sizing: border-box;
  }

  .explore-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .explore-header h1 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0;
    color: #fff;
  }

  .catalog-count {
    font-size: 0.8rem;
    color: #555;
    font-family: monospace;
  }

  /* Search */
  .search-bar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: #111;
    border: 1px solid #1e1e1e;
    border-radius: 12px;
    padding: 0.75rem 1rem;
    transition: border-color 0.15s;
  }

  .search-bar:focus-within { border-color: #ff4444; }

  .search-bar svg { width: 18px; height: 18px; color: #444; flex-shrink: 0; }

  .search-bar input {
    flex: 1;
    background: none;
    border: none;
    color: #fff;
    font-size: 0.95rem;
    outline: none;
  }

  .search-bar input::placeholder { color: #444; }

  .clear-btn {
    background: none;
    border: none;
    color: #555;
    cursor: pointer;
    padding: 0.2rem;
    display: flex;
    transition: color 0.15s;
  }
  .clear-btn:hover { color: #fff; }
  .clear-btn svg { width: 16px; height: 16px; }

  /* Topic chips */
  .topic-chips {
    display: flex;
    gap: 0.4rem;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 0.15rem;
  }

  .topic-chips::-webkit-scrollbar { display: none; }

  .chip {
    flex: 0 0 auto;
    padding: 0.45rem 0.85rem;
    background: #111;
    border: 1px solid #1e1e1e;
    border-radius: 99px;
    color: #888;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }

  .chip:hover { border-color: #333; color: #ccc; }
  .chip.active { background: #ff4444; border-color: #ff4444; color: #fff; }

  /* Free notice */
  .free-notice {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.875rem;
    background: rgba(255, 68, 68, 0.04);
    border: 1px solid rgba(255, 68, 68, 0.12);
    border-radius: 10px;
    color: #888;
    font-size: 0.8rem;
  }

  .free-notice svg { width: 16px; height: 16px; color: #ff4444; flex-shrink: 0; }

  .inline-link {
    background: none;
    border: none;
    color: #ff4444;
    cursor: pointer;
    font-size: inherit;
    font-weight: 600;
    padding: 0;
    text-decoration: underline;
  }

  /* Error */
  .error-toast {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 68, 68, 0.08);
    border: 1px solid rgba(255, 68, 68, 0.2);
    border-radius: 10px;
    padding: 0.6rem 0.875rem;
    color: #ff6666;
    font-size: 0.82rem;
  }

  .error-toast button {
    background: none;
    border: none;
    color: #ff6666;
    cursor: pointer;
    font-size: 1rem;
  }

  /* Results grid */
  .results-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
  }

  .result-card {
    display: flex;
    flex-direction: column;
    background: #111;
    border: 1px solid #1e1e1e;
    border-radius: 14px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
    -webkit-tap-highlight-color: transparent;
  }

  .result-card:hover { border-color: #333; background: #161616; }
  .result-card:disabled { opacity: 0.7; cursor: wait; }

  .result-cover {
    position: relative;
    width: 100%;
    aspect-ratio: 3 / 4;
    background: #0a0a0a;
    overflow: hidden;
  }

  .result-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cover-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    background: linear-gradient(135deg, #1a1a1a, #111);
  }

  .cover-loading {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dl-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid #333;
    border-top-color: #ff4444;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .result-info {
    padding: 0.6rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .result-title {
    font-size: 0.78rem;
    font-weight: 600;
    color: #ddd;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .result-author {
    font-size: 0.68rem;
    color: #555;
  }

  .result-downloads {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.6rem;
    color: #444;
    font-family: monospace;
    margin-top: 0.15rem;
  }

  .result-downloads svg { width: 10px; height: 10px; }

  /* Skeletons */
  .skeleton-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
  }

  .skeleton-card {
    background: #111;
    border: 1px solid #1e1e1e;
    border-radius: 14px;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 0.8; }
  }

  .sk-cover {
    width: 100%;
    aspect-ratio: 3 / 4;
    background: #1a1a1a;
    border-radius: 8px;
  }

  .sk-lines { display: flex; flex-direction: column; gap: 0.35rem; }
  .sk-line { height: 8px; background: #1a1a1a; border-radius: 4px; }
  .sk-line.wide { width: 80%; }
  .sk-line.narrow { width: 55%; }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    padding: 2rem;
    text-align: center;
  }

  .empty-emoji { font-size: 2rem; }
  .empty-state p { margin: 0; color: #555; font-size: 0.9rem; }
  .empty-hint { font-size: 0.8rem !important; color: #444 !important; }

  @media (max-width: 400px) {
    .results-grid { grid-template-columns: 1fr; }
    .skeleton-grid { grid-template-columns: 1fr; }
  }
</style>
