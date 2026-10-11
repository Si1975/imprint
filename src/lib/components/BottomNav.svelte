<script>
  import { createEventDispatcher } from 'svelte';

  export let activeTab = 'home';
  export let visible = true;

  const dispatch = createEventDispatcher();

  const tabs = [
    { id: 'home', label: 'Home', icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' },
    { id: 'library', label: 'Library', icon: 'M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z' },
    { id: 'settings', label: 'Settings', icon: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.44.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z' },
  ];

  function selectTab(id) {
    dispatch('tabchange', id);
  }
</script>

{#if visible}
  <nav class="bottom-nav">
    {#each tabs as tab}
      <button
        class="nav-item"
        class:active={activeTab === tab.id}
        on:click={() => selectTab(tab.id)}
        aria-label={tab.label}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d={tab.icon} />
        </svg>
        <span>{tab.label}</span>
      </button>
    {/each}
  </nav>
{/if}

<style>
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-around;
    align-items: center;
    background: #0a0a0a;
    border-top: 1px solid #1a1a1a;
    padding: 0.4rem 0;
    padding-bottom: calc(0.4rem + env(safe-area-inset-bottom, 0px));
    z-index: 200;
    -webkit-backdrop-filter: blur(20px);
    backdrop-filter: blur(20px);
    background: rgba(10, 10, 10, 0.92);
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    background: transparent;
    border: none;
    color: #555;
    cursor: pointer;
    padding: 0.4rem 0.75rem;
    border-radius: 10px;
    transition: all 0.2s ease;
    min-width: 48px;
    min-height: 48px;
    justify-content: center;
    -webkit-tap-highlight-color: transparent;
  }

  .nav-item svg {
    width: 22px;
    height: 22px;
    transition: transform 0.2s ease;
  }

  .nav-item span {
    font-size: 0.65rem;
    font-weight: 500;
    letter-spacing: 0.02em;
  }

  .nav-item.active {
    color: #ff4444;
  }

  .nav-item.active svg {
    transform: scale(1.1);
  }

  .nav-item:hover:not(.active) {
    color: #888;
  }

  /* Subtle active indicator dot */
  .nav-item.active::after {
    content: '';
    position: absolute;
    bottom: calc(0.2rem + env(safe-area-inset-bottom, 0px));
    width: 4px;
    height: 4px;
    background: #ff4444;
    border-radius: 50%;
  }

  @media (min-width: 601px) {
    .bottom-nav {
      max-width: 500px;
      left: 50%;
      transform: translateX(-50%);
      border-radius: 16px 16px 0 0;
      border-left: 1px solid #1a1a1a;
      border-right: 1px solid #1a1a1a;
    }
  }
</style>
