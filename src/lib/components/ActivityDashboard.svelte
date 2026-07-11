<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { libraryStore } from '../../stores/libraryStore.js';

  const dispatch = createEventDispatcher();

  let stats = {
    totalMinutesRead: 0,
    booksCompleted: 0,
    currentStreak: 0,
    weekHistory: [0, 0, 0, 0, 0, 0, 0],
  };
  let loading = true;

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function getDayLabel(offsetFromToday) {
    const d = new Date();
    d.setDate(d.getDate() - (6 - offsetFromToday));
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }

  $: maxMinutes = Math.max(...stats.weekHistory, 1);

  function formatTotalTime(minutes) {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  onMount(async () => {
    try {
      stats = await libraryStore.getAggregateStats();
    } catch (e) {
      console.error('Stats load failed:', e);
    } finally {
      loading = false;
    }
  });
</script>

<div class="activity-panel">
  <div class="activity-header">
    <h3>Reading Stats</h3>
    <button class="close-btn" on:click={() => dispatch('close')} title="Close">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
      </svg>
    </button>
  </div>

  {#if loading}
    <div class="loading-state">
      <div class="spin-ring"></div>
      <span>Loading stats…</span>
    </div>
  {:else}
    <!-- KPI cards -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon">⏱️</div>
        <div class="kpi-value">{formatTotalTime(stats.totalMinutesRead)}</div>
        <div class="kpi-label">Total read</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">✅</div>
        <div class="kpi-value">{stats.booksCompleted}</div>
        <div class="kpi-label">Books finished</div>
      </div>
      <div class="kpi-card streak">
        <div class="kpi-icon">🔥</div>
        <div class="kpi-value">{stats.currentStreak}</div>
        <div class="kpi-label">Day streak</div>
      </div>
    </div>

    <!-- 7-day bar chart -->
    <div class="chart-section">
      <h4 class="section-label">Last 7 Days (minutes)</h4>
      <div class="bar-chart">
        {#each stats.weekHistory as minutes, i}
          <div class="bar-col">
            <div class="bar-track">
              <div
                class="bar-fill"
                style="height: {(minutes / maxMinutes) * 100}%"
                class:zero={minutes === 0}
              >
                {#if minutes > 0}
                  <span class="bar-tip">{minutes}m</span>
                {/if}
              </div>
            </div>
            <div class="bar-label">{getDayLabel(i)}</div>
          </div>
        {/each}
      </div>
    </div>

    {#if stats.currentStreak === 0 && stats.totalMinutesRead === 0}
      <div class="empty-state">
        <div class="empty-emoji">📖</div>
        <p>Start reading to build your streak!</p>
        <button class="start-reading-btn" on:click={() => dispatch('close')}>
          Go Read
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .activity-panel {
    background: #0a0a0a;
    border: 1px solid #222;
    border-radius: 20px;
    padding: 1.5rem;
    width: 440px;
    max-height: 85vh;
    overflow-y: auto;
  }

  .activity-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #1a1a1a;
  }

  h3 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 600;
    color: #fff;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: #444;
    cursor: pointer;
    padding: 0.4rem;
    border-radius: 8px;
    transition: all 0.15s;
    display: flex;
  }
  .close-btn:hover { color: #fff; background: #1a1a1a; }
  .close-btn svg { width: 22px; height: 22px; }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem;
    color: #555;
  }

  .spin-ring {
    width: 28px;
    height: 28px;
    border: 2px solid #222;
    border-top-color: #ff4444;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* KPI grid */
  .kpi-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .kpi-card {
    background: #111;
    border: 1px solid #1e1e1e;
    border-radius: 14px;
    padding: 1rem 0.75rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    text-align: center;
    transition: border-color 0.15s;
  }
  .kpi-card:hover { border-color: #2a2a2a; }
  .kpi-card.streak { border-color: rgba(255, 160, 0, 0.2); }

  .kpi-icon { font-size: 1.25rem; line-height: 1; }
  .kpi-value { font-size: 1.6rem; font-weight: 700; color: #fff; font-family: monospace; line-height: 1; }
  .kpi-label { font-size: 0.7rem; color: #555; margin-top: 0.15rem; }

  /* Chart */
  .chart-section { margin-bottom: 1rem; }

  .section-label {
    margin: 0 0 0.75rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .bar-chart {
    display: flex;
    align-items: flex-end;
    gap: 0.4rem;
    height: 100px;
    padding: 0 0.25rem;
  }

  .bar-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    gap: 0.3rem;
  }

  .bar-track {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: flex-end;
    background: #111;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
  }

  .bar-fill {
    width: 100%;
    background: linear-gradient(to top, #ff4444, #ff6666);
    border-radius: 4px 4px 0 0;
    transition: height 0.4s ease;
    min-height: 3px;
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }

  .bar-fill.zero {
    background: #1a1a1a;
    min-height: 3px;
    height: 3px !important;
  }

  .bar-tip {
    position: absolute;
    top: -1.2rem;
    font-size: 0.55rem;
    color: #ff4444;
    font-family: monospace;
    white-space: nowrap;
  }

  .bar-label {
    font-size: 0.6rem;
    color: #555;
    text-align: center;
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1.5rem;
    text-align: center;
  }

  .empty-emoji { font-size: 2.5rem; }

  .empty-state p {
    margin: 0;
    color: #555;
    font-size: 0.9rem;
  }

  .start-reading-btn {
    background: #ff4444;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 0.5rem 1.25rem;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }
  .start-reading-btn:hover { background: #ff6060; }

  @media (max-width: 600px) {
    .activity-panel {
      width: 100%;
      max-width: none;
      border-radius: 16px;
      padding: 1.25rem;
    }
    .kpi-grid { grid-template-columns: 1fr 1fr; }
    .kpi-card:last-child { grid-column: span 2; }
  }
</style>
