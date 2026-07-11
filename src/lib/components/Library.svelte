<script>
  import { createEventDispatcher } from 'svelte';
  import { libraryStore } from '../../stores/libraryStore.js';
  import { isPremium } from '../../stores/premiumStore.js';

  export let currentBookId = null;
  export let wordsPerMinute = 300;

  const dispatch = createEventDispatcher();

  let searchQuery = '';
  let deleteConfirmId = null;

  // ── Inline edit state ────────────────────────────────────────────────
  let editingBookId = null;
  let editTitle = '';
  let editAuthor = '';

  function openEdit(e, book) {
    e.stopPropagation();
    editingBookId = book.book_id;
    editTitle = book.title;
    editAuthor = book.author;
    deleteConfirmId = null; // close any pending delete
  }

  function cancelEdit(e) {
    if (e) e.stopPropagation();
    editingBookId = null;
  }

  async function saveEdit(e, book) {
    e.stopPropagation();
    const trimmedTitle = editTitle.trim();
    const trimmedAuthor = editAuthor.trim();
    if (!trimmedTitle) return; // don't save empty title
    await libraryStore.addBook({
      ...book,
      title: trimmedTitle,
      author: trimmedAuthor || 'Unknown',
    });
    editingBookId = null;
  }

  $: ({ books } = $libraryStore);

  $: filteredBooks = searchQuery.trim()
    ? books.filter((b) =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase()))
    : books;

  $: catalogBooks   = filteredBooks.filter((b) => b.source_origin === 'local_catalog');
  $: uploadedBooks  = filteredBooks.filter((b) => b.is_custom_upload);
  $: gutenbergBooks = filteredBooks.filter((b) => b.source_origin === 'gutenberg_api');
  $: recentBooks    = books
    .filter((b) => (b.last_read_at || 0) > 0)
    .sort((a, b) => (b.last_read_at || 0) - (a.last_read_at || 0))
    .slice(0, 6);

  function openBook(book) {
    dispatch('openbook', { book });
  }

  async function deleteBook(e, bookId) {
    e.stopPropagation();
    await libraryStore.removeBook(bookId);
    if (deleteConfirmId === bookId) deleteConfirmId = null;
  }

  function requestDelete(e, bookId) {
    e.stopPropagation();
    deleteConfirmId = bookId;
  }

  function cancelDelete(e) {
    e.stopPropagation();
    deleteConfirmId = null;
  }

  function getProgressPercent(book) {
    return book._progress?.percentage_completed || 0;
  }

  function getTimeClocked(book) {
    const secs = book._progress?.total_time_spent_seconds || 0;
    if (secs < 60) return secs > 0 ? secs + 's' : null;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return mins + ' min';
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? hrs + 'h ' + rem + 'm' : hrs + 'h';
  }

  function getAvgWpm(book) {
    const secs = book._progress?.total_time_spent_seconds || 0;
    const words = book._progress?.current_word_index || 0;
    if (secs < 5 || words < 5) return null;
    return Math.round((words / secs) * 60);
  }

  function getEstTimeRemaining(book) {
    const total = book.total_words || 0;
    const current = book._progress?.current_word_index || 0;
    const remaining = total - current;
    if (remaining <= 0 || wordsPerMinute <= 0) return null;
    const mins = Math.round(remaining / wordsPerMinute);
    if (mins < 1) return '< 1 min left';
    if (mins < 60) return mins + ' min left';
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? hrs + 'h ' + rem + 'm left' : hrs + 'h left';
  }

  function formatLastRead(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return diffDays + 'd ago';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
</script>

<div class="library-view">
  <div class="library-header">
    <h1>Library</h1>
  </div>

  <div class="search-bar">
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
    <input type="text" bind:value={searchQuery} placeholder="Search your library…" />
    {#if searchQuery}
      <button class="clear-btn" on:click={() => (searchQuery = '')} aria-label="Clear search">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
      </button>
    {/if}
  </div>

  {#if !searchQuery && recentBooks.length > 0}
    <section class="lib-section">
      <h3 class="section-label">Continue Reading</h3>
      <div class="recent-list">
        {#each recentBooks as book (book.book_id)}
          {@const pct         = getProgressPercent(book)}
          {@const timeClocked = getTimeClocked(book)}
          {@const avgWpm      = getAvgWpm(book)}
          {@const estLeft     = getEstTimeRemaining(book)}
          {@const lastRead    = formatLastRead(book.last_read_at)}
          <div class="metric-card" class:active={book.book_id === currentBookId}>
            {#if deleteConfirmId === book.book_id}
              <div class="confirm-overlay" role="presentation" on:click|stopPropagation>
                <span class="confirm-msg">Remove from library?</span>
                <div class="confirm-actions">
                  <button class="confirm-yes" on:click={(e) => deleteBook(e, book.book_id)}>Remove</button>
                  <button class="confirm-no"  on:click={cancelDelete}>Cancel</button>
                </div>
              </div>
            {/if}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="metric-card-inner"
              on:click={() => openBook(book)}
              on:keydown={(e) => e.key === 'Enter' && openBook(book)}
              role="button"
              tabindex="0"
            >
              <div class="metric-top">
                <span class="metric-emoji">{book.cover_emoji || '📖'}</span>
                <div class="metric-info">
                  <div class="metric-title">{book.title}</div>
                  <div class="metric-author">{book.author}</div>
                </div>
                <div class="metric-right">
                  {#if lastRead}<span class="metric-date">{lastRead}</span>{/if}
                  <button
                    class="delete-btn"
                    on:click|stopPropagation={(e) => requestDelete(e, book.book_id)}
                    title="Remove from library"
                    aria-label="Remove from library"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  </button>
                </div>
              </div>
              <div class="metric-progress-track">
                <div class="metric-progress-fill" style="width: {pct}%"></div>
              </div>
              <div class="metric-stats">
                <div class="stat-pill progress-pill">
                  <span class="stat-label">Progress</span>
                  <span class="stat-value">{Math.round(pct)}%</span>
                </div>
                {#if timeClocked}
                  <div class="stat-pill">
                    <span class="stat-label">Time read</span>
                    <span class="stat-value">{timeClocked}</span>
                  </div>
                {/if}
                {#if avgWpm}
                  <div class="stat-pill">
                    <span class="stat-label">~Avg WPM</span>
                    <span class="stat-value">{avgWpm}</span>
                  </div>
                {/if}
                {#if estLeft}
                  <div class="stat-pill est-pill">
                    <span class="stat-label">Est. left</span>
                    <span class="stat-value">{estLeft}</span>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  {#if uploadedBooks.length > 0}
    <section class="lib-section">
      <h3 class="section-label">
        My Uploads
        {#if !$isPremium}<span class="badge">Free tier</span>{/if}
      </h3>
      <div class="book-grid">
        {#each uploadedBooks as book (book.book_id)}
          <div
            class="grid-card-wrap"
            class:upload-editing={editingBookId === book.book_id}
          >
            <!-- Card: div instead of button so we can nest action buttons inside -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class="grid-card upload-grid-card"
              class:active={book.book_id === currentBookId}
              on:click={() => editingBookId !== book.book_id && openBook(book)}
              on:keydown={(e) => e.key === 'Enter' && editingBookId !== book.book_id && openBook(book)}
              role="button"
              tabindex="0"
            >
              <div class="grid-emoji">
                {#if book.file_type === 'epub'}📕{:else if book.file_type === 'pdf'}📄{:else}📝{/if}
              </div>
              <div class="grid-info">
                <div class="grid-title">{book.title}</div>
                <div class="grid-author">{book.author}</div>
              </div>
              <!-- Progress chip top-right -->
              {#if getProgressPercent(book) > 0}
                <div class="grid-chip progress">{Math.round(getProgressPercent(book))}%</div>
              {/if}
              <!-- Action buttons — inline right side, inside the card -->
              <div class="upload-actions">
                <button
                  class="upload-action-btn"
                  class:edit-active={editingBookId === book.book_id}
                  on:click|stopPropagation={(e) => editingBookId === book.book_id ? cancelEdit(e) : openEdit(e, book)}
                  title={editingBookId === book.book_id ? 'Cancel' : 'Edit title & author'}
                  aria-label="Edit title and author"
                >
                  {#if editingBookId === book.book_id}
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                  {:else}
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  {/if}
                </button>
                <button
                  class="upload-action-btn upload-action-delete"
                  on:click|stopPropagation={(e) => deleteBook(e, book.book_id)}
                  title="Remove"
                  aria-label="Remove from library"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
              </div>
            </div>

            <!-- Inline edit panel — spans full width when upload-editing -->
            {#if editingBookId === book.book_id}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="edit-panel" on:click|stopPropagation on:keydown|stopPropagation>
                <div class="edit-field">
                  <label class="edit-label" for="edit-title-{book.book_id}">Title</label>
                  <input
                    id="edit-title-{book.book_id}"
                    class="edit-input"
                    type="text"
                    bind:value={editTitle}
                    placeholder="Book title"
                    on:keydown={(e) => e.key === 'Enter' && saveEdit(e, book)}
                  />
                </div>
                <div class="edit-field">
                  <label class="edit-label" for="edit-author-{book.book_id}">Author</label>
                  <input
                    id="edit-author-{book.book_id}"
                    class="edit-input"
                    type="text"
                    bind:value={editAuthor}
                    placeholder="Author name"
                    on:keydown={(e) => e.key === 'Enter' && saveEdit(e, book)}
                  />
                </div>
                <div class="edit-actions">
                  <button class="edit-save" on:click={(e) => saveEdit(e, book)}>Save</button>
                  <button class="edit-cancel" on:click={cancelEdit}>Cancel</button>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </section>
  {/if}

  {#if gutenbergBooks.length > 0}


    <section class="lib-section">
      <h3 class="section-label">Downloaded Classics</h3>
      <div class="book-grid">
        {#each gutenbergBooks as book (book.book_id)}
          <div class="grid-card-wrap">
            {#if deleteConfirmId === book.book_id}
              <div class="grid-confirm" role="presentation" on:click|stopPropagation>
                <p class="grid-confirm-msg">Remove this book?</p>
                <div class="grid-confirm-btns">
                  <button class="confirm-yes-sm" on:click={(e) => deleteBook(e, book.book_id)}>Yes</button>
                  <button class="confirm-no-sm"  on:click={cancelDelete}>No</button>
                </div>
              </div>
            {:else}
              <button
                class="grid-card"
                class:active={book.book_id === currentBookId}
                on:click={() => openBook(book)}
              >
                <div class="grid-emoji">{book.cover_emoji || '📚'}</div>
                <div class="grid-info">
                  <div class="grid-title">{book.title}</div>
                  <div class="grid-author">{book.author}</div>
                </div>
                {#if getProgressPercent(book) > 0}
                  <div class="grid-chip progress">{Math.round(getProgressPercent(book))}%</div>
                {/if}
              </button>
              <button
                class="grid-delete-btn"
                on:click={(e) => requestDelete(e, book.book_id)}
                title="Remove"
                aria-label="Remove from library"
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
              </button>
            {/if}
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <section class="lib-section">
    <h3 class="section-label">
      Preview Classics
      <span class="label-note">First 5,000 words</span>
    </h3>
    <div class="book-grid">
      {#each catalogBooks as book (book.book_id)}
        <div class="grid-card-wrap">
          {#if deleteConfirmId === book.book_id}
            <div class="grid-confirm" role="presentation" on:click|stopPropagation>
              <p class="grid-confirm-msg">Clear progress?</p>
              <div class="grid-confirm-btns">
                <button class="confirm-yes-sm" on:click={(e) => deleteBook(e, book.book_id)}>Clear</button>
                <button class="confirm-no-sm"  on:click={cancelDelete}>Cancel</button>
              </div>
            </div>
          {:else}
            <button
              class="grid-card"
              class:active={book.book_id === currentBookId}
              on:click={() => openBook(book)}
            >
              <div class="grid-emoji">{book.cover_emoji || '📚'}</div>
              <div class="grid-info">
                <div class="grid-title">{book.title}</div>
                <div class="grid-author">{book.author}</div>
                {#if book.year}
                  <div class="grid-year">{book.year < 0 ? Math.abs(book.year) + ' BC' : book.year}</div>
                {/if}
              </div>
              {#if getProgressPercent(book) > 0}
                <div class="grid-chip progress">{Math.round(getProgressPercent(book))}%</div>
              {:else}
                <div class="grid-chip preview">Preview</div>
              {/if}
            </button>
            <button
                class="grid-delete-btn"
                on:click={(e) => requestDelete(e, book.book_id)}
                title="Clear progress"
                aria-label="Clear progress for this book"
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
              </button>
          {/if}
        </div>
      {/each}
    </div>
  </section>

  {#if searchQuery && filteredBooks.length === 0}
    <div class="empty-state">
      <span class="empty-emoji">🔍</span>
      <p>No books matching "{searchQuery}"</p>
    </div>
  {/if}
</div>

<style>
  .library-view {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.5rem 1.25rem;
    padding-top: calc(1.5rem + env(safe-area-inset-top, 0px));
    padding-bottom: calc(5rem + env(safe-area-inset-bottom, 0px));
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    min-height: 100%;
    box-sizing: border-box;
  }

  .library-header h1 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0;
    color: #fff;
  }

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
  .search-bar:focus-within { border-color: #333; }
  .search-bar svg { width: 18px; height: 18px; color: #444; flex-shrink: 0; }
  .search-bar input { flex: 1; background: none; border: none; color: #fff; font-size: 0.95rem; outline: none; }
  .search-bar input::placeholder { color: #444; }

  .clear-btn { background: none; border: none; color: #555; cursor: pointer; padding: 0.2rem; display: flex; transition: color 0.15s; }
  .clear-btn:hover { color: #fff; }
  .clear-btn svg { width: 16px; height: 16px; }

  .lib-section { width: 100%; }

  .section-label {
    margin: 0 0 0.6rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .label-note {
    font-size: 0.62rem;
    color: #3a3a3a;
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0;
    background: #1a1a1a;
    padding: 0.1rem 0.45rem;
    border-radius: 99px;
    border: 1px solid #252525;
  }

  .badge {
    background: #1a1a1a;
    color: #ff4444;
    padding: 0.12rem 0.5rem;
    border-radius: 99px;
    font-size: 0.6rem;
    text-transform: none;
    letter-spacing: 0;
  }

  /* ── Continue Reading metric cards ─────────────────────────────────── */
  .recent-list {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .metric-card {
    position: relative;
    background: #111;
    border: 1px solid #1e1e1e;
    border-radius: 16px;
    overflow: hidden;
    transition: border-color 0.15s, background 0.15s;
  }
  .metric-card:hover { border-color: #2a2a2a; background: #141414; }
  .metric-card.active { border-color: #ff4444; }

  .metric-card-inner {
    padding: 0.9rem 1rem;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    outline: none;
  }
  .metric-card-inner:focus-visible { outline: 2px solid #ff4444; outline-offset: -2px; }

  .metric-top {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    margin-bottom: 0.75rem;
  }

  .metric-emoji { font-size: 1.75rem; line-height: 1; flex-shrink: 0; }

  .metric-info { flex: 1; min-width: 0; }
  .metric-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #ddd;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-bottom: 0.2rem;
  }
  .metric-author { font-size: 0.7rem; color: #555; }

  .metric-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.3rem;
    flex-shrink: 0;
  }
  .metric-date { font-size: 0.62rem; color: #444; font-family: monospace; }

  .metric-progress-track {
    height: 3px;
    background: #1e1e1e;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 0.75rem;
  }
  .metric-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff4444, #ff6666);
    border-radius: 2px;
    transition: width 0.4s ease;
  }

  .metric-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .stat-pill {
    display: flex;
    flex-direction: column;
    background: #181818;
    border: 1px solid #222;
    border-radius: 10px;
    padding: 0.3rem 0.6rem;
    min-width: 64px;
  }
  .stat-label {
    font-size: 0.55rem;
    color: #444;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
    line-height: 1.2;
  }
  .stat-value {
    font-size: 0.78rem;
    font-weight: 700;
    color: #bbb;
    font-family: 'SF Mono', 'Monaco', monospace;
    line-height: 1.4;
  }
  .stat-pill.progress-pill .stat-value { color: #ff4444; }
  .stat-pill.est-pill .stat-value { color: #60a5fa; }

  /* Confirm overlay inside metric card */
  .confirm-overlay {
    position: absolute;
    inset: 0;
    background: rgba(10, 10, 10, 0.93);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    z-index: 10;
    backdrop-filter: blur(4px);
  }
  .confirm-msg { font-size: 0.85rem; color: #ccc; font-weight: 500; margin: 0; }
  .confirm-actions { display: flex; gap: 0.5rem; }
  .confirm-yes {
    background: #ff4444; color: #fff; border: none; border-radius: 8px;
    padding: 0.4rem 0.9rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: background 0.15s;
  }
  .confirm-yes:hover { background: #ff5555; }
  .confirm-no {
    background: #1e1e1e; color: #888; border: 1px solid #2a2a2a; border-radius: 8px;
    padding: 0.4rem 0.9rem; font-size: 0.8rem; font-weight: 500; cursor: pointer; transition: all 0.15s;
  }
  .confirm-no:hover { color: #fff; border-color: #444; }

  /* ── Delete button (shared) ─────────────────────────────────────────── */
  .delete-btn {
    background: transparent; border: none; color: #333; cursor: pointer;
    padding: 0.3rem; border-radius: 8px; display: flex; flex-shrink: 0; transition: all 0.15s;
  }
  .delete-btn:hover { color: #ff4444; background: rgba(255, 68, 68, 0.1); }
  .delete-btn svg { width: 16px; height: 16px; }




  /* Inline edit panel */
  .edit-panel {
    padding: 0.6rem 0.875rem 0.875rem;
    border-top: 1px solid #1e1e1e;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    background: #0d0d0d;
  }

  .edit-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .edit-label {
    font-size: 0.6rem;
    font-weight: 600;
    color: #444;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .edit-input {
    background: #111;
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    color: #ddd;
    font-size: 0.875rem;
    padding: 0.5rem 0.75rem;
    outline: none;
    transition: border-color 0.15s;
    width: 100%;
    box-sizing: border-box;
  }
  .edit-input:focus { border-color: #ff4444; }
  .edit-input::placeholder { color: #3a3a3a; }

  .edit-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.1rem;
  }

  .edit-save {
    background: #ff4444; color: #fff; border: none; border-radius: 8px;
    padding: 0.45rem 1rem; font-size: 0.8rem; font-weight: 600;
    cursor: pointer; transition: background 0.15s; flex: 1;
  }
  .edit-save:hover { background: #ff5555; }

  .edit-cancel {
    background: transparent; color: #555; border: 1px solid #252525; border-radius: 8px;
    padding: 0.45rem 1rem; font-size: 0.8rem; font-weight: 500;
    cursor: pointer; transition: all 0.15s;
  }
  .edit-cancel:hover { color: #aaa; border-color: #3a3a3a; }


  /* ── Book grid ─────────────────────────────────────────────────────── */
  .book-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }

  .grid-card-wrap { position: relative; min-height: 90px; }

  .grid-card {
    position: relative; display: flex; align-items: flex-start; gap: 0.6rem;
    background: #111; border: 1px solid #1e1e1e; border-radius: 14px; padding: 0.875rem;
    cursor: pointer; text-align: left; transition: all 0.15s; width: 100%;
    -webkit-tap-highlight-color: transparent;
  }
  .grid-card:hover { border-color: #333; background: #161616; }
  .grid-card.active { border-color: #ff4444; }

  .grid-emoji { font-size: 1.5rem; flex-shrink: 0; line-height: 1; }
  .grid-info { flex: 1; min-width: 0; }
  .grid-title { font-size: 0.8rem; font-weight: 600; color: #ddd; line-height: 1.3; margin-bottom: 0.15rem; }
  .grid-author { font-size: 0.7rem; color: #555; }
  .grid-year { font-size: 0.65rem; color: #444; margin-top: 0.15rem; font-family: monospace; }

  .grid-chip {
    position: absolute; top: 0.5rem; right: 0.5rem;
    font-size: 0.6rem; font-weight: 700; padding: 0.15rem 0.4rem;
    border-radius: 99px; font-family: monospace;
  }
  .grid-chip.progress { background: rgba(255, 68, 68, 0.15); color: #ff4444; }
  .grid-chip.preview  { background: rgba(74, 222, 128, 0.08); color: #4ade80; }

  .grid-delete-btn {
    position: absolute; bottom: 0.45rem; right: 0.45rem;
    background: #181818; border: 1px solid #2a2a2a; color: #3a3a3a;
    cursor: pointer; padding: 0.25rem; border-radius: 7px; display: flex;
    z-index: 2; transition: all 0.15s; opacity: 0;
  }
  .grid-card-wrap:hover .grid-delete-btn { opacity: 1; }
  .grid-delete-btn:hover { color: #ff4444; border-color: rgba(255,68,68,0.3); background: rgba(255,68,68,0.08); opacity: 1; }
  .grid-delete-btn svg { width: 13px; height: 13px; }

  /* Upload card — div instead of button, same visual style as grid-card */
  .upload-grid-card {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    background: #111;
    border: 1px solid #1e1e1e;
    border-radius: 14px;
    padding: 0.875rem;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s;
    width: 100%;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
    position: relative;
    outline: none;
  }
  .upload-grid-card:hover { border-color: #333; background: #161616; }
  .upload-grid-card.active { border-color: #ff4444; }
  .upload-grid-card:focus-visible { outline: 2px solid #ff4444; outline-offset: -2px; }

  /* Right-side action buttons column inside the upload card */
  .upload-actions {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex-shrink: 0;
    margin-left: auto;
    align-self: center;
  }

  .upload-action-btn {
    background: transparent;
    border: 1px solid #222;
    color: #3a3a3a;
    cursor: pointer;
    padding: 0.3rem;
    border-radius: 7px;
    display: flex;
    transition: all 0.15s;
  }
  .upload-action-btn svg { width: 13px; height: 13px; }
  .upload-action-btn:hover { color: #888; border-color: #333; background: rgba(255,255,255,0.05); }
  .upload-action-btn.edit-active { color: #666; border-color: #333; background: rgba(255,255,255,0.06); }
  .upload-action-btn.upload-action-delete:hover { color: #ff4444; border-color: rgba(255,68,68,0.3); background: rgba(255,68,68,0.08); }

  /* When editing, span the upload card across both columns so the edit panel is full-width */
  .grid-card-wrap.upload-editing {
    grid-column: 1 / -1;
  }
  /* The edit panel inside a spanning wrap sits below the card */
  .grid-card-wrap.upload-editing .edit-panel {
    border-radius: 0 0 14px 14px;
    border-top: 1px solid #1e1e1e;
  }




  .grid-confirm {
    background: #111; border: 1px solid #2a2a2a; border-radius: 14px;
    padding: 0.75rem; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 0.5rem; min-height: 90px; height: 100%;
  }
  .grid-confirm-msg { margin: 0; font-size: 0.75rem; color: #aaa; font-weight: 500; text-align: center; }
  .grid-confirm-btns { display: flex; gap: 0.4rem; }
  .confirm-yes-sm {
    background: #ff4444; color: #fff; border: none; border-radius: 7px;
    padding: 0.3rem 0.75rem; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: background 0.15s;
  }
  .confirm-yes-sm:hover { background: #ff5555; }
  .confirm-no-sm {
    background: #1e1e1e; color: #777; border: 1px solid #2a2a2a; border-radius: 7px;
    padding: 0.3rem 0.75rem; font-size: 0.75rem; font-weight: 500; cursor: pointer; transition: all 0.15s;
  }
  .confirm-no-sm:hover { color: #fff; border-color: #444; }

  /* Empty state */
  .empty-state { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2rem; color: #555; }
  .empty-emoji { font-size: 2rem; }
  .empty-state p { margin: 0; font-size: 0.9rem; }

  @media (max-width: 400px) {
    .book-grid { grid-template-columns: 1fr; }
    .metric-stats { gap: 0.3rem; }
    .stat-pill { min-width: 56px; }
  }
</style>
