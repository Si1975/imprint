<script>
  import { createEventDispatcher } from "svelte";

  export let isPlaying = false;
  export let isPaused = false;
  export let canPlay = true;
  export let minimal = false;
  export let isFinished = false;

  const dispatch = createEventDispatcher();
</script>

<div class="controls" class:minimal>
  <!-- Left skip group: -5, -1 -->
  <div class="control-group left">
    <button
      class="control-btn skip"
      on:click={() => dispatch("skip", -5)}
      title="Back 5 words"
    >
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M11 19l-7-7 7-7v14zm8 0l-7-7 7-7v14z" />
      </svg>
      <span class="desktop-only-text">-5</span>
    </button>

    <button
      class="control-btn skip micro"
      on:click={() => dispatch("skip", -1)}
      title="Back 1 word"
    >
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
      </svg>
      <span class="desktop-only-text">-1</span>
    </button>
  </div>

  <!-- Centre: play/pause/stop/restart -->
  <div class="control-group center">
    {#if !isPlaying && !isPaused}
      <button
        class="control-btn {minimal && isFinished ? 'restart' : 'play'}"
        on:click={() => dispatch(minimal && isFinished ? "restart" : "play")}
        disabled={!canPlay || (!minimal && isFinished)}
        title={minimal && isFinished ? "Restart" : "Play (Space)"}
      >
        {#if minimal}
          {#if isFinished}
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
              />
            </svg>
          {:else}
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          {/if}
        {:else}
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span>Play</span>
        {/if}
      </button>
    {:else if isPlaying}
      <button
        class="control-btn pause"
        on:click={() => dispatch("pause")}
        title="Pause (Space)"
      >
        {#if minimal}
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
          <span>Pause</span>
        {/if}
      </button>
    {:else}
      <button
        class="control-btn play"
        on:click={() => dispatch("resume")}
        title="Resume (Space)"
      >
        {#if minimal}
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span>Resume</span>
        {/if}
      </button>
    {/if}

    {#if isPlaying || isPaused || (minimal && isFinished)}
      <button
        class="control-btn stop"
        on:click={() => dispatch("stop")}
        title="Stop (Esc)"
      >
        {#if minimal}
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h12v12H6z" />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h12v12H6z" />
          </svg>
          <span>Stop</span>
        {/if}
      </button>
    {/if}

    {#if !minimal}
      <button
        class="control-btn restart"
        on:click={() => dispatch("restart")}
        disabled={!canPlay}
        title="Restart"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
          />
        </svg>
        <span>Restart</span>
      </button>
    {/if}
  </div>

  <!-- Right skip group: +1, +5 -->
  <div class="control-group right">
    <button
      class="control-btn skip micro"
      on:click={() => dispatch("skip", 1)}
      title="Forward 1 word"
    >
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
      </svg>
      <span class="desktop-only-text">+1</span>
    </button>

    <button
      class="control-btn skip"
      on:click={() => dispatch("skip", 5)}
      title="Forward 5 words"
    >
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 19l7-7-7-7v14zm8 0l7-7-7-7v14z" />
      </svg>
      <span class="desktop-only-text">+5</span>
    </button>
  </div>
</div>

<style>
  .controls {
    display: flex;
    justify-content: center;
    gap: 2rem;
    align-items: center;
  }

  .control-group {
    display: flex;
    gap: 0.5rem;
  }

  .controls.minimal {
    gap: 1.25rem;
  }

  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
    color: #fff;
  }

  .controls.minimal .control-btn {
    padding: 0.5rem;
    border-radius: 50%;
    width: 40px;
    height: 40px;
  }

  .controls.minimal .control-btn.skip {
    width: 34px;
    height: 34px;
    padding: 0.3rem;
  }

  /* Micro skip (±1) is slightly smaller than the ±5 in minimal mode */
  .controls.minimal .control-btn.skip.micro {
    width: 30px;
    height: 30px;
    padding: 0.25rem;
  }

  .controls.minimal .control-btn.skip svg {
    width: 14px;
    height: 14px;
  }

  .controls.minimal .control-btn.skip.micro svg {
    width: 13px;
    height: 13px;
  }

  .control-btn svg {
    width: 20px;
    height: 20px;
  }

  .controls.minimal .control-btn svg {
    width: 18px;
    height: 18px;
  }

  .control-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .control-btn.play {
    background: #ff4444;
  }

  .control-btn.play:hover:not(:disabled) {
    background: #ff6666;
  }

  .control-btn.pause {
    background: #ffaa00;
    color: #000;
  }

  .control-btn.pause:hover {
    background: #ffcc44;
  }

  .control-btn.stop,
  .control-btn.restart,
  .control-btn.skip {
    background: #333;
  }

  .control-btn.stop:hover:not(:disabled),
  .control-btn.restart:hover:not(:disabled),
  .control-btn.skip:hover:not(:disabled) {
    background: #444;
  }

  .desktop-only-text {
    display: none;
  }

  .controls.minimal .desktop-only-text {
    display: none;
  }

  @media (min-width: 601px) {
    .desktop-only-text {
      display: inline;
    }
  }

  @media (max-width: 600px) {
    .controls {
      gap: 0.5rem;
    }

    .control-btn {
      padding: 0.875rem 1rem;
      min-height: 48px;
    }

    .control-btn span {
      display: none;
    }

    .controls.minimal .control-btn {
      width: 44px;
      height: 44px;
    }

    .controls.minimal .control-btn.skip.micro {
      width: 36px;
      height: 36px;
    }
  }
</style>
