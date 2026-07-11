<script>
  import { createEventDispatcher } from 'svelte';
  import { libraryStore } from '../../stores/libraryStore.js';
  import { isPremium } from '../../stores/premiumStore.js';

  export let currentFileName = '';
  export let currentBookId = null;
  export let words = [];
  export let currentWordIndex = 0;
  export let progress = 0;
  export let wordsPerMinute = 300;
  export let isLoadingFile = false;
  export let loadingMessage = '';

  const dispatch = createEventDispatcher();

  $: ({ books } = $libraryStore);
  $: recentBooks = books
    .filter((b) => (b.last_read_at || 0) > 0)
    .sort((a, b) => (b.last_read_at || 0) - (a.last_read_at || 0))
    .slice(0, 3);

  function getProgressPercent(book) {
    return book._progress?.percentage_completed || 0;
  }

  function formatLastRead(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
</script>

<div class="home-view">
  <!-- Header -->
  <div class="home-header">
    <h1>imprint</h1>
  </div>

  <!-- Current book info -->
  <div class="current-book">
    {#if currentFileName && words.length > 0}
      <p class="book-label">Now reading</p>
      <h2 class="book-title">{currentFileName}</h2>
      <div class="progress-info">
        <div class="progress-track">
          <div class="progress-fill" style="width: {progress}%"></div>
        </div>
        <span class="progress-text">{currentWordIndex.toLocaleString()} / {words.length.toLocaleString()} words · {Math.round(progress)}%</span>
      </div>
    {:else}
      <p class="book-label">Welcome</p>
      <h2 class="book-title">Ready to speed read</h2>
      <p class="book-subtitle">Load a book from your library or paste some text</p>
    {/if}
  </div>

  <!-- WPM slider -->
  <div class="wpm-section">
    <div class="wpm-header">
      <span class="wpm-value">{wordsPerMinute}</span>
      <span class="wpm-unit">WPM</span>
    </div>
    <input
      type="range"
      min="50"
      max="1000"
      step="25"
      bind:value={wordsPerMinute}
      on:input={() => dispatch('wpmchange', wordsPerMinute)}
      class="slider"
    />
  </div>

  <!-- Main CTA -->
  <div class="main-actions">
    {#if words.length > 0}
      <button class="action-btn primary" on:click={() => dispatch('startreading')}>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        {currentWordIndex > 0 ? 'Continue Reading' : 'Start Reading'}
      </button>
    {/if}
    <button class="action-btn secondary" on:click={() => dispatch('loadcontent')}>
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11 8 15.01z"/></svg>
      Load Content
    </button>
  </div>

  <!-- Recently Read -->
  {#if recentBooks.length > 0}
    <div class="recent-section">
      <h3 class="section-label">Continue reading</h3>
      <div class="recent-list">
        {#each recentBooks as book (book.book_id)}
          <button class="recent-card" class:active={book.book_id === currentBookId} on:click={() => dispatch('openbook', { book })}>
            <span class="recent-emoji">{book.cover_emoji || '📖'}</span>
            <div class="recent-info">
              <span class="recent-title">{book.title}</span>
              <span class="recent-meta">{book.author}</span>
            </div>
            <div class="recent-right">
              {#if getProgressPercent(book) > 0}
                <span class="recent-pct">{Math.round(getProgressPercent(book))}%</span>
              {/if}
              <span class="recent-date">{formatLastRead(book.last_read_at)}</span>
            </div>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Loading indicator -->
  {#if isLoadingFile}
    <div class="loading-toast">
      <div class="loading-spinner"></div>
      <span>{loadingMessage || 'Loading…'}</span>
    </div>
  {/if}

  {#if !$isPremium}
    <button class="pro-banner" on:click={() => dispatch('showpro')}>
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
      <span>Activate Pro — Unlimited books + stats</span>
      <svg viewBox="0 0 24 24" fill="currentColor" class="chevron"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
    </button>
  {/if}
</div>

<style>
  .home-view {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 1.5rem 1.25rem;
    padding-top: calc(1.5rem + env(safe-area-inset-top, 0px));
    padding-bottom: calc(5rem + env(safe-area-inset-bottom, 0px));
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
    min-height: 100%;
    box-sizing: border-box;
  }

  .home-header h1 {
    font-size: 2rem;
    font-weight: 300;
    margin: 0;
    color: #fff;
    letter-spacing: -0.5px;
    text-align: center;
  }

  /* Current book */
  .current-book {
    width: 100%;
    text-align: center;
  }

  .book-label {
    margin: 0;
    font-size: 0.75rem;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
  }

  .book-title {
    margin: 0.25rem 0 0;
    font-size: 1.4rem;
    font-weight: 600;
    color: #fff;
    line-height: 1.3;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .book-subtitle {
    margin: 0.5rem 0 0;
    color: #555;
    font-size: 0.9rem;
  }

  .progress-info {
    margin-top: 0.75rem;
    width: 100%;
  }

  .progress-track {
    height: 4px;
    background: #1a1a1a;
    border-radius: 2px;
    overflow: hidden;
    width: 100%;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff4444, #ff6666);
    border-radius: 2px;
    transition: width 0.3s;
  }

  .progress-text {
    display: block;
    margin-top: 0.4rem;
    font-size: 0.8rem;
    color: #555;
    font-family: monospace;
  }

  /* WPM */
  .wpm-section {
    width: 100%;
    background: #111;
    border: 1px solid #1e1e1e;
    border-radius: 14px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .wpm-header {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.4rem;
  }

  .wpm-value {
    font-size: 2.5rem;
    font-weight: 700;
    color: #ff4444;
    font-family: 'SF Mono', 'Monaco', monospace;
    line-height: 1;
  }

  .wpm-unit {
    font-size: 0.85rem;
    color: #555;
    font-weight: 500;
  }

  .slider {
    width: 100%;
    height: 6px;
    background: #222;
    border-radius: 3px;
    appearance: none;
    cursor: pointer;
    outline: none;
  }

  .slider::-webkit-slider-thumb {
    appearance: none;
    width: 22px;
    height: 22px;
    background: #ff4444;
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.1s;
    box-shadow: 0 2px 8px rgba(255, 68, 68, 0.3);
  }

  .slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  /* Actions */
  .main-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
  }

  .action-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
    border-radius: 14px;
    font-size: 1.05rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    -webkit-tap-highlight-color: transparent;
  }

  .action-btn svg {
    width: 20px;
    height: 20px;
  }

  .action-btn.primary {
    background: #ff4444;
    color: #fff;
  }

  .action-btn.primary:hover {
    background: #ff5555;
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(255, 68, 68, 0.25);
  }

  .action-btn.secondary {
    background: #111;
    color: #ccc;
    border: 1px solid #2a2a2a;
  }

  .action-btn.secondary:hover {
    background: #1a1a1a;
    border-color: #333;
    color: #fff;
  }

  /* Recent */
  .recent-section {
    width: 100%;
  }

  .section-label {
    margin: 0 0 0.6rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .recent-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .recent-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: #111;
    border: 1px solid #1e1e1e;
    border-radius: 12px;
    padding: 0.75rem 0.875rem;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;
    width: 100%;
    -webkit-tap-highlight-color: transparent;
  }

  .recent-card:hover { border-color: #333; background: #161616; }
  .recent-card.active { border-color: #ff4444; }

  .recent-emoji { font-size: 1.5rem; line-height: 1; flex-shrink: 0; }

  .recent-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
  .recent-title { font-size: 0.875rem; font-weight: 500; color: #ddd; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .recent-meta { font-size: 0.7rem; color: #555; margin-top: 0.1rem; }

  .recent-right { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; gap: 0.15rem; }
  .recent-pct { font-size: 0.75rem; color: #ff4444; font-family: monospace; font-weight: 600; }
  .recent-date { font-size: 0.65rem; color: #444; font-family: monospace; }

  /* Loading toast */
  .loading-toast {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: #111;
    border: 1px solid #222;
    border-radius: 12px;
    padding: 0.75rem 1.25rem;
    color: #aaa;
    font-size: 0.875rem;
    width: 100%;
  }

  .loading-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid #333;
    border-top-color: #ff4444;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* Pro banner */
  .pro-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.875rem 1rem;
    background: rgba(255, 68, 68, 0.04);
    border: 1px solid rgba(255, 68, 68, 0.15);
    border-radius: 12px;
    color: #ff4444;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all 0.2s;
    -webkit-tap-highlight-color: transparent;
  }

  .pro-banner:hover {
    background: rgba(255, 68, 68, 0.08);
    border-color: rgba(255, 68, 68, 0.25);
  }

  .pro-banner svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .pro-banner span { flex: 1; text-align: left; }
  .pro-banner .chevron { width: 16px; height: 16px; opacity: 0.5; }
</style>
