<script>
 import { createEventDispatcher } from 'svelte';
 import { libraryStore } from '../../stores/libraryStore.js';
 export let currentBookId = null;
 const dispatch = createEventDispatcher();
 let query = '';
 let confirmId = null;
 $: books = $libraryStore.books.filter(b => `${b.title} ${b.author}`.toLowerCase().includes(query.toLowerCase()));
</script>
<div class="library">
 <h1>Your books</h1>
 <button on:click={() => dispatch('addcontent')}>Add a book or text</button>
 <input aria-label="Search your books" placeholder="Find a book…" bind:value={query} />
 {#if $libraryStore.error}<p role="alert">{$libraryStore.error}</p>{/if}
 {#each books as book (book.book_id)}
  <article class:active={currentBookId === book.book_id}>
   <button class="book" on:click={() => dispatch('openbook', { book })}>
    <strong>{book.title}</strong><span>{book.author}</span>
    <span>{book._progress?.percentage_completed || 0}% read</span>
   </button>
   {#if confirmId === book.book_id}
    <p>Remove this book from this device?</p>
    <button on:click={() => libraryStore.removeBook(book.book_id)}>Remove</button>
    <button on:click={() => confirmId = null}>Keep</button>
   {:else}<button aria-label={`Remove ${book.title}`} on:click={() => confirmId = book.book_id}>Remove</button>{/if}
  </article>
 {:else}<p>{query ? 'No matching books.' : 'Add your first book to start reading.'}</p>{/each}
</div>
<style>
 .library { max-width: 500px; margin: auto; padding: 24px 20px 100px; color: #ddd; }
 input { width: 100%; box-sizing: border-box; margin: 20px 0; padding: 12px; background: #111; color: white; border: 1px solid #444; border-radius: 8px; }
 article { padding: 12px; margin-bottom: 12px; border: 1px solid #333; border-radius: 10px; }
 article.active { border-color: #ff4444; }
 button { background: #222; color: #eee; border: 1px solid #444; border-radius: 8px; padding: 12px; cursor: pointer; }
 .book { display: flex; flex-direction: column; gap: 8px; text-align: left; width: 100%; margin-bottom: 10px; background: transparent; border: 0; }
</style>
