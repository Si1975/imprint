<script>
  import { createEventDispatcher } from 'svelte';
  import { isPremium, activateWithKey, deactivatePremium } from '../../stores/premiumStore.js';

  export let wordsPerMinute = 300;
  export let fadeEnabled = true;
  export let fadeDuration = 150;
  export let pauseOnPunctuation = true;
  export let punctuationPauseMultiplier = 2;
  export let pauseAfterWords = 0;
  export let pauseDuration = 500;
  export let frameWordCount = 1;
  export let wordLengthWPMMultiplier = 5;
  export let focusPosition = 40;

  let focusOffset = 0;
  $: focusOffset = 50 - focusPosition;

  function handleOffsetChange() {
    focusPosition = 50 - focusOffset;
  }

  const dispatch = createEventDispatcher();

  // Quick WPM presets
  const wpmPresets = [200, 300, 400, 500];

  // License activation
  let licenseKeyInput = '';
  let licenseError = '';
  let licenseSuccess = false;

  function handleActivateLicense() {
    licenseError = '';
    licenseSuccess = false;
    const result = activateWithKey(licenseKeyInput);
    if (result.success) {
      licenseSuccess = true;
      licenseKeyInput = '';
      setTimeout(() => { licenseSuccess = false; }, 3000);
    } else {
      licenseError = result.error;
    }
  }
</script>

<div class="settings-view">
  <div class="settings-header">
    <h1>Settings</h1>
  </div>

  <!-- Speed Section -->
  <section class="settings-section">
    <div class="section-header">
      <svg viewBox="0 0 24 24" fill="currentColor" class="section-icon">
        <path d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44zm-9.79 6.84a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z" />
      </svg>
      <span>Speed</span>
    </div>

    <div class="wpm-control">
      <div class="wpm-display">
        <span class="wpm-value">{wordsPerMinute}</span>
        <span class="wpm-label">words/min</span>
      </div>
      <input type="range" min="50" max="1000" step="25" bind:value={wordsPerMinute} class="slider" />
      <div class="wpm-presets">
        {#each wpmPresets as preset}
          <button class="preset-btn" class:active={wordsPerMinute === preset} on:click={() => (wordsPerMinute = preset)}>
            {preset}
          </button>
        {/each}
      </div>
    </div>

    <div class="control-row">
      <div class="control-header">
        <span>Lower WPM for longer words</span>
        <span class="control-value">{wordLengthWPMMultiplier}%</span>
      </div>
      <input type="range" min="0" max="50" step="1" bind:value={wordLengthWPMMultiplier} class="slider" />
      <p class="hint-text">How many percentage points each letter increases pause duration</p>
    </div>
  </section>

  <!-- Display Section -->
  <section class="settings-section">
    <div class="section-header">
      <svg viewBox="0 0 24 24" fill="currentColor" class="section-icon">
        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
      </svg>
      <span>Display</span>
    </div>

    <div class="control-row">
      <div class="control-header">
        <span>Words shown simultaneously</span>
        <span class="control-value">{frameWordCount}</span>
      </div>
      <input type="range" min="1" max="7" step="2" bind:value={frameWordCount} class="slider" />
      <p class="hint-text">Odd numbers (1, 3, 5, 7) center the highlight best</p>
    </div>

    <div class="control-row">
      <div class="control-header">
        <span>Focus Shift Left</span>
        <span class="control-value">{focusOffset}</span>
      </div>
      <input type="range" min="0" max="30" step="1" bind:value={focusOffset} on:input={handleOffsetChange} class="slider" />
      <p class="hint-text">Shift focus point to the left to fit longer words</p>
    </div>
  </section>

  <!-- Effects Section -->
  <section class="settings-section">
    <div class="section-header">
      <svg viewBox="0 0 24 24" fill="currentColor" class="section-icon">
        <path d="M7.5 5.6L10 7 8.6 4.5 10 2 7.5 3.4 5 2l1.4 2.5L5 7zm12 9.8L17 14l1.4 2.5L17 19l2.5-1.4L22 19l-1.4-2.5L22 14zM22 2l-2.5 1.4L17 2l1.4 2.5L17 7l2.5-1.4L22 7l-1.4-2.5zm-7.63 5.29a.996.996 0 0 0-1.41 0L1.29 18.96a.996.996 0 0 0 0 1.41l2.34 2.34c.39.39 1.02.39 1.41 0L16.7 11.05a.996.996 0 0 0 0-1.41l-2.33-2.35zm-1.03 5.49l-2.12-2.12 2.44-2.44 2.12 2.12-2.44 2.44z" />
      </svg>
      <span>Effects</span>
    </div>

    <div class="toggle-row">
      <span class="toggle-label">Word fade</span>
      <button class="toggle" class:active={fadeEnabled} on:click={() => (fadeEnabled = !fadeEnabled)} role="switch" aria-checked={fadeEnabled} aria-label="Toggle word fade effect">
        <span class="toggle-thumb"></span>
      </button>
    </div>

    {#if fadeEnabled}
      <div class="sub-control">
        <div class="control-header">
          <span>Duration</span>
          <span class="control-value">{fadeDuration}ms</span>
        </div>
        <input type="range" min="50" max="300" step="25" bind:value={fadeDuration} class="slider slider-sm" />
      </div>
    {/if}
  </section>

  <!-- Pauses Section -->
  <section class="settings-section">
    <div class="section-header">
      <svg viewBox="0 0 24 24" fill="currentColor" class="section-icon">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
      </svg>
      <span>Pauses</span>
    </div>

    <div class="toggle-row">
      <span class="toggle-label">Pause on punctuation</span>
      <button class="toggle" class:active={pauseOnPunctuation} on:click={() => (pauseOnPunctuation = !pauseOnPunctuation)} role="switch" aria-checked={pauseOnPunctuation} aria-label="Toggle pause on punctuation">
        <span class="toggle-thumb"></span>
      </button>
    </div>

    {#if pauseOnPunctuation}
      <div class="sub-control">
        <div class="control-header">
          <span>Pause multiplier</span>
          <span class="control-value">{punctuationPauseMultiplier}x</span>
        </div>
        <input type="range" min="1" max="4" step="0.5" bind:value={punctuationPauseMultiplier} class="slider slider-sm" />
      </div>
    {/if}

    <div class="control-row">
      <div class="control-header">
        <span>Pause every N words</span>
        <span class="control-value">{pauseAfterWords === 0 ? 'Off' : pauseAfterWords}</span>
      </div>
      <input type="range" min="0" max="50" step="5" bind:value={pauseAfterWords} class="slider" />
    </div>

    {#if pauseAfterWords > 0}
      <div class="sub-control">
        <div class="control-header">
          <span>Pause duration</span>
          <span class="control-value">{pauseDuration}ms</span>
        </div>
        <input type="range" min="100" max="2000" step="100" bind:value={pauseDuration} class="slider slider-sm" />
      </div>
    {/if}
  </section>

  <!-- Pro License Section -->
  <section class="settings-section pro-section">
    <div class="section-header">
      <svg viewBox="0 0 24 24" fill="currentColor" class="section-icon pro-icon">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
      </svg>
      <span>Imprint Pro</span>
    </div>

    {#if $isPremium}
      <div class="pro-active">
        <div class="pro-check">✓</div>
        <p>Pro is active. Enjoy unlimited access!</p>
        <button class="deactivate-link" on:click={deactivatePremium}>Deactivate</button>
      </div>
    {:else}
      <div class="pro-card">
        <div class="pro-features">
          <div class="feature-item">✅ Unlimited uploads</div>
          <div class="feature-item">✅ Full Gutenberg catalog</div>
          <div class="feature-item">✅ Reading stats & streaks</div>
          <div class="feature-item">✅ Advanced typography</div>
        </div>

        <form on:submit|preventDefault={handleActivateLicense} class="license-form">
          <input
            type="text"
            bind:value={licenseKeyInput}
            placeholder="IMPRINT-PRO"
            class="license-input"
            class:error={!!licenseError}
            class:success={licenseSuccess}
          />
          {#if licenseError}
            <p class="form-error">{licenseError}</p>
          {/if}
          {#if licenseSuccess}
            <p class="form-success">✓ License activated!</p>
          {/if}
          <button type="submit" class="activate-btn">Activate License</button>
        </form>

        <p class="license-hint">Demo key: <code>IMPRINT-PRO</code></p>
      </div>
    {/if}
  </section>

  <!-- App info -->
  <div class="app-info">
    <span>imprint v1.0.1</span>
    <span>·</span>
    <span>Zero-backend architecture</span>
  </div>
</div>

<style>
  .settings-view {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1.5rem 1.25rem;
    padding-top: calc(1.5rem + env(safe-area-inset-top, 0px));
    padding-bottom: calc(5rem + env(safe-area-inset-bottom, 0px));
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
    min-height: 100%;
    box-sizing: border-box;
  }

  .settings-header h1 {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
    color: #fff;
  }

  /* Sections */
  .settings-section {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #1a1a1a;
  }

  .settings-section:last-of-type { border-bottom: none; }

  .section-header {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    color: #666;
    font-size: 0.82rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.75rem;
  }

  .section-icon { width: 18px; height: 18px; opacity: 0.7; }
  .pro-icon { color: #ff4444 !important; opacity: 1 !important; }

  /* WPM Control */
  .wpm-control {
    background: #111;
    border: 1px solid #1e1e1e;
    border-radius: 16px;
    padding: 1.25rem;
  }

  .wpm-display { text-align: center; margin-bottom: 1rem; }
  .wpm-value { font-size: 3.5rem; font-weight: 700; color: #fff; font-family: 'SF Mono', 'Monaco', monospace; letter-spacing: -0.02em; }
  .wpm-label { display: block; color: #555; font-size: 0.9rem; margin-top: -0.25rem; }

  .wpm-presets {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .preset-btn {
    flex: 1;
    background: #1a1a1a;
    border: 1px solid #252525;
    color: #888;
    padding: 0.6rem;
    border-radius: 10px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .preset-btn:hover { background: #222; color: #fff; border-color: #333; }
  .preset-btn.active { background: #ff4444; border-color: #ff4444; color: #fff; }

  /* Toggle switches */
  .toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
  }

  .toggle-label { color: #ccc; font-size: 1rem; }

  .toggle {
    position: relative;
    width: 52px;
    height: 30px;
    background: #222;
    border: none;
    border-radius: 15px;
    cursor: pointer;
    transition: background 0.2s;
    padding: 0;
    flex-shrink: 0;
  }

  .toggle.active { background: #ff4444; }

  .toggle-thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 24px;
    height: 24px;
    background: #666;
    border-radius: 50%;
    transition: all 0.2s;
  }

  .toggle.active .toggle-thumb { left: 25px; background: #fff; }

  /* Control rows */
  .control-row { padding: 0.75rem 0; }

  .control-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.6rem;
  }

  .control-header span:first-child { color: #ccc; font-size: 1rem; }

  .control-value {
    color: #ff4444;
    font-size: 0.95rem;
    font-weight: 600;
    font-family: 'SF Mono', 'Monaco', monospace;
  }

  .sub-control {
    padding: 0.6rem 0 0.6rem 1rem;
    margin-left: 0.5rem;
    border-left: 2px solid #1a1a1a;
  }

  .sub-control .control-header span:first-child { color: #888; font-size: 0.95rem; }

  /* Sliders */
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
    transition: transform 0.1s, box-shadow 0.1s;
    box-shadow: 0 2px 8px rgba(255, 68, 68, 0.3);
  }

  .slider::-webkit-slider-thumb:hover { transform: scale(1.1); }

  .slider::-moz-range-thumb {
    width: 22px;
    height: 22px;
    background: #ff4444;
    border-radius: 50%;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 8px rgba(255, 68, 68, 0.3);
  }

  .slider-sm::-webkit-slider-thumb { width: 18px; height: 18px; }
  .slider-sm::-moz-range-thumb { width: 18px; height: 18px; }

  .hint-text {
    margin: 0.4rem 0 0;
    color: #555;
    font-size: 0.78rem;
    line-height: 1.3;
  }

  /* Pro section */
  .pro-section { border-bottom: none; }

  .pro-card {
    background: #111;
    border: 1px solid #1e1e1e;
    border-radius: 16px;
    padding: 1.25rem;
  }

  .pro-features {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem;
    margin-bottom: 1rem;
  }

  .feature-item {
    background: #0a0a0a;
    border: 1px solid #1a1a1a;
    border-radius: 8px;
    padding: 0.5rem 0.6rem;
    font-size: 0.78rem;
    color: #ccc;
  }

  .license-form {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .license-input {
    width: 100%;
    padding: 0.8rem 0.875rem;
    background: #0a0a0a;
    border: 1px solid #333;
    border-radius: 10px;
    color: #fff;
    font-size: 0.95rem;
    font-family: monospace;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }

  .license-input:focus { outline: none; border-color: #ff4444; }
  .license-input.error { border-color: #ff4444; }
  .license-input.success { border-color: #22c55e; }

  .form-error { margin: 0; color: #ff4444; font-size: 0.78rem; }
  .form-success { margin: 0; color: #22c55e; font-size: 0.78rem; }

  .activate-btn {
    width: 100%;
    padding: 0.8rem;
    background: #ff4444;
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    margin-top: 0.25rem;
  }

  .activate-btn:hover { background: #ff6060; }

  .license-hint {
    margin: 0.6rem 0 0;
    color: #444;
    font-size: 0.75rem;
    text-align: center;
  }

  .license-hint code {
    color: #888;
    background: #1a1a1a;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    font-family: monospace;
  }

  .pro-active {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.5rem;
    background: #111;
    border: 1px solid rgba(34, 197, 94, 0.15);
    border-radius: 16px;
    text-align: center;
  }

  .pro-check { font-size: 2rem; color: #22c55e; }
  .pro-active p { margin: 0; color: #888; font-size: 0.9rem; }

  .deactivate-link {
    background: none;
    border: none;
    color: #555;
    font-size: 0.78rem;
    cursor: pointer;
    text-decoration: underline;
  }

  /* App info */
  .app-info {
    display: flex;
    justify-content: center;
    gap: 0.4rem;
    color: #333;
    font-size: 0.7rem;
    padding-top: 0.5rem;
    font-family: monospace;
  }

  @media (max-width: 600px) {
    .wpm-value { font-size: 3rem; }

    .slider::-webkit-slider-thumb { width: 26px; height: 26px; }

    .toggle { width: 56px; height: 32px; }
    .toggle-thumb { width: 26px; height: 26px; }
    .toggle.active .toggle-thumb { left: 26px; }

    .pro-features { grid-template-columns: 1fr; }
  }
</style>
