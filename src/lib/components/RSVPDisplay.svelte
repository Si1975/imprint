<script>
  import { getActualORPIndex } from "../rsvp-utils.js";

  export let word = "";
  export let wordGroup = [];
  export let highlightIndex = 0;
  export let opacity = 1;
  export let fadeDuration = 150;
  export let fadeEnabled = true;
  export let multiWordEnabled = false;
  export let isFinished = false;
  export let focusPosition = 40;

  $: useMultiMode = multiWordEnabled && wordGroup.length > 0;

  // Get the current word (either from single mode or the highlighted word in group)
  $: currentWord = useMultiMode ? wordGroup[highlightIndex] || "" : word;

  // Always calculate ORP for the current word
  $: orpIdx = currentWord ? getActualORPIndex(currentWord) : -1;
  $: wordPrefix = currentWord ? currentWord.slice(0, orpIdx) : "";
  $: focusChar = currentWord ? currentWord[orpIdx] || "" : "";
  $: wordSuffix = currentWord ? currentWord.slice(orpIdx + 1) : "";

  // Words before and after the highlighted word (for multi-word mode)
  $: wordsBefore = useMultiMode ? wordGroup.slice(0, highlightIndex) : [];
  $: wordsAfter = useMultiMode ? wordGroup.slice(highlightIndex + 1) : [];

  // FIX: Detect Hebrew, Arabic, and other RTL scripts
  $: isRtl = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(currentWord);

  // Fireworks celebration
  let showFireworks = false;
  let previousFinished = false;
  let fireworksTimeout;

  $: {
    if (isFinished && !previousFinished) {
      showFireworks = true;
      if (fireworksTimeout) clearTimeout(fireworksTimeout);
      fireworksTimeout = setTimeout(() => {
        showFireworks = false;
      }, 2500);
      previousFinished = true;
    } else if (!isFinished && previousFinished) {
      previousFinished = false;
      showFireworks = false;
      if (fireworksTimeout) clearTimeout(fireworksTimeout);
    }
  }
</script>

<div class="rsvp-display">
  {#if showFireworks}
    <div class="fireworks-container">
      {#each Array(12) as _, i}
        <div
          class="firework"
          style="--delay: {i * 0.15}s; --x: {Math.random() *
            100}%; --hue: {Math.random() * 360}"
        >
          {#each Array(8) as _, j}
            <div class="particle" style="--angle: {j * 45}deg"></div>
          {/each}
        </div>
      {/each}
    </div>
  {/if}

  <div
    class="word-container"
    class:multi-mode={useMultiMode}
    style="
      opacity: {opacity}; 
      transition: opacity {fadeEnabled ? fadeDuration : 0}ms ease-in-out;
    "
  >
    <div class="focus-marker" style="left: {focusPosition}%">
      <div class="marker-line top"></div>
      <div class="marker-line bottom"></div>
    </div>

    {#if currentWord}
      <!-- ORP letter positioned by focusPosition -->
      <span class="orp" style="left: {focusPosition}%">{focusChar}</span>

      <!-- Content before ORP: prefix of current word + words before -->
      <span
        class="before-orp"
        style="left: {focusPosition}%; direction: {isRtl ? 'rtl' : 'ltr'}"
      >
        {#if isRtl}
          {wordSuffix}{#if useMultiMode && wordsAfter.length > 0}
            &nbsp;<span class="context-words">{wordsAfter.join(" ")}</span>
          {/if}
        {:else}
          {#if useMultiMode && wordsBefore.length > 0}
            <span class="context-words">{wordsBefore.join(" ")}</span>&nbsp;
          {/if}{wordPrefix}
        {/if}
      </span>

      <!-- Content after ORP: suffix of current word + words after -->
      <span
        class="after-orp"
        style="left: calc({focusPosition}% + 0.5ch); direction: {isRtl
          ? 'rtl'
          : 'ltr'}"
      >
        {#if isRtl}
          {#if useMultiMode && wordsBefore.length > 0}
            <span class="context-words">{wordsBefore.join(" ")}</span>&nbsp;
          {/if}{wordPrefix}
        {:else}
          {wordSuffix}{#if useMultiMode && wordsAfter.length > 0}
            &nbsp;<span class="context-words">{wordsAfter.join(" ")}</span>
          {/if}
        {/if}
      </span>
    {:else if isFinished}
      <div class="finished-state">
        <svg viewBox="0 0 24 24" fill="currentColor" class="check-icon">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
        <span class="finished-text">Finished</span>
      </div>
    {:else}
      <span class="placeholder">Ready</span>
    {/if}
  </div>
</div>

<style>
  .rsvp-display {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    overflow: hidden;
  }

  .focus-marker {
    position: absolute;
    transform: translateX(-50%);
    width: 5px;
    pointer-events: none;
    z-index: 10;
    /* Stretch from the top to bottom of the word-container */
    top: -30px;
    bottom: -30px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .marker-line {
    width: 100%;
    height: 20px;
    flex-shrink: 0;
  }

  .marker-line.top {
    background: linear-gradient(to bottom, #ff4444, transparent);
  }

  .marker-line.bottom {
    background: linear-gradient(to top, #ff4444, transparent);
  }

  .word-container {
    position: relative;
    font-family: "SF Mono", "Monaco", "Inconsolata", "Roboto Mono",
      "Source Code Pro", "Menlo", "Consolas", monospace;
    font-size: clamp(3rem, 8vw, 6rem);
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    text-rendering: geometricPrecision;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    /* Container needs width for absolute children to position against */
    width: 100%;
    height: 1.2em;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .word-container.multi-mode {
    font-size: clamp(1.2rem, 4vw, 3rem);
  }

  .context-words {
    color: #666;
    font-weight: 400;
  }

  .orp {
    position: absolute;
    /* Left is set inline now */
    transform: translateX(-50%);
    color: #ff4444;
    font-weight: 700;
    text-shadow: 0 0 30px rgba(255, 68, 68, 0.6);
    z-index: 2;
  }

  .before-orp {
    position: absolute;
    /* Left is set inline now */
    transform: translateX(calc(-100% - 0.5ch));
    color: #fff;
    /* direction: ltr; -- REMOVED to support dynamic RTL/LTR via inline style */
    text-align: right; /* Keeps text growing towards the center */
  }

  .after-orp {
    position: absolute;
    /* Left is set inline now */
    color: #fff;
    text-align: left;
  }

  .placeholder {
    color: #333;
    font-size: 2rem;
    font-weight: 300;
    font-family: system-ui, sans-serif;
    font-family: system-ui, sans-serif;
    line-height: 1;
  }

  .finished-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    color: #4caf50; /* Green for success */
  }

  .check-icon {
    width: 64px;
    height: 64px;
  }

  .finished-text {
    font-size: 2rem;
    font-weight: 300;
    font-family: system-ui, sans-serif;
  }

  .fireworks-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 5;
  }

  .firework {
    position: absolute;
    left: var(--x);
    bottom: 0;
    width: 10px;
    height: 10px;
    animation: launch 0.6s ease-out forwards;
    animation-delay: var(--delay);
  }

  @keyframes launch {
    0% {
      transform: translateY(0);
      opacity: 1;
    }
    100% {
      transform: translateY(-60vh);
      opacity: 0;
    }
  }

  .particle {
    position: absolute;
    width: 8px;
    height: 8px;
    background: hsl(var(--hue), 100%, 60%);
    border-radius: 50%;
    box-shadow: 0 0 12px 2px hsl(var(--hue), 100%, 60%);
    animation: explode 1.2s ease-out forwards;
    animation-delay: calc(var(--delay) + 0.6s);
    transform: rotate(var(--angle)) translateX(0);
    opacity: 0;
  }

  @keyframes explode {
    0% {
      transform: rotate(var(--angle)) translateX(0);
      opacity: 1;
    }
    100% {
      transform: rotate(var(--angle)) translateX(150px);
      opacity: 0;
    }
  }

  @media (max-width: 600px) {
    .rsvp-display {
      min-height: 200px;
    }

    .marker-line {
      height: 14px;
    }

    .word-container.multi-mode {
      font-size: clamp(0.9rem, 3.5vw, 2rem);
    }
  }

  @media (max-width: 400px) {
    .word-container.multi-mode {
      font-size: clamp(0.75rem, 3vw, 1.5rem);
    }
  }
</style>
