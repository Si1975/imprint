<script>
  import { onMount, onDestroy } from "svelte";
  import { Capacitor } from "@capacitor/core";
  import {
    parseText as parseTextUtil,
    getWordDelay as getWordDelayUtil,
    formatTimeRemaining,
    shouldPauseAtWord,
  } from "./lib/rsvp-utils.js";
  import { parseDocument } from "./lib/file-parsers.js";
  import { loadSession, clearSession } from "./lib/progress-storage.js";
  import RSVPDisplay from "./lib/components/RSVPDisplay.svelte";
  import Controls from "./lib/components/Controls.svelte";
  import ProgressBar from "./lib/components/ProgressBar.svelte";
  import TextInput from "./lib/components/TextInput.svelte";
  import BottomNav from "./lib/components/BottomNav.svelte";
  import HomeView from "./lib/components/HomeView.svelte";
  import Library from "./lib/components/Library.svelte";
  import Settings from "./lib/components/Settings.svelte";
  import { extractWordFrame } from "./lib/rsvp-utils.js";
  import { libraryStore } from "./stores/libraryStore.js";
  import { ingestLocalFile } from "./lib/ingestor.js";

  // ── Navigation ─────────────────────────────────────────────────────────────
  let activeTab = 'home';
  let showTextInput = false;

  // ── RSVP State ─────────────────────────────────────────────────────────────
  let frameWordCount = 1;
  let text = "";
  let words = [];
  let currentWordIndex = 0;
  let isPlaying = false;
  let isPaused = false;
  let readerOpen = false;
  let progress = 0;
  let isLoadingFile = false;
  let loadingMessage = "";
  let showJumpTo = false;
  let jumpToValue = "";
  let currentFileName = "";
  let currentBookId = null;

  // Session tracking for DB
  let chapters = [];
  let checkpointTimer;
  let periodicTimeout;
  let lastPeriodicIndex = -1;
  let saveQueue = Promise.resolve();
  let ready = false;
  let saveError = '';
  $: currentChapter = chapters.filter(c => c.wordIndex <= currentWordIndex).at(-1);
  $: if (ready) persistSettings({ wordsPerMinute, fadeEnabled, fadeDuration, pauseOnPunctuation, punctuationPauseMultiplier, wordLengthWPMMultiplier, pauseAfterWords, pauseDuration, frameWordCount, focusPosition });
  function persistSettings(settings) {
    try { localStorage.setItem('imprint-settings', JSON.stringify(settings)); } catch { saveError = 'Could not save settings on this device.'; }
  }

  // Settings
  let wordsPerMinute = 300;
  let fadeEnabled = true;
  let fadeDuration = 150;
  let pauseAfterWords = 0;
  let pauseDuration = 500;
  let pauseOnPunctuation = true;
  let punctuationPauseMultiplier = 2;
  let wordLengthWPMMultiplier = 5;
  let focusPosition = 40;

  // Animation
  let wordOpacity = 1;
  let intervalId = null;
  let fadeTimeoutId = null;

  // ── Derived state ──────────────────────────────────────────────────────────
  $: currentWord =
    words[currentWordIndex - 1] || (words.length > 0 ? words[0] : "");
  $: wordFrame = extractWordFrame(
    words,
    Math.max(0, currentWordIndex - 1),
    frameWordCount,
  );
  $: timeRemaining = formatTimeRemaining(
    words.length - currentWordIndex,
    wordsPerMinute,
  );
  $: isFocusMode = readerOpen;
  $: isFinished =
    !isPlaying &&
    !isPaused &&
    currentWordIndex >= words.length &&
    words.length > 0;
  const isAndroid = Capacitor.getPlatform() === "android";

  // ── Core RSVP engine ────────────────────────────────────────────────────────

  function parseText() {
    words = parseTextUtil(text);
    currentWordIndex = 0;
    progress = 0;
  }

  function getWordDelay(word) {
    return getWordDelayUtil(
      word,
      wordsPerMinute,
      pauseOnPunctuation,
      punctuationPauseMultiplier,
      wordLengthWPMMultiplier,
    );
  }

  function showNextWord() {
    if (currentWordIndex >= words.length) {
      isPlaying = false;
      isPaused = false;
      if (intervalId) { clearTimeout(intervalId); intervalId = null; }
      saveCurrentSession();

      return;
    }

    if (shouldPauseAtWord(currentWordIndex, pauseAfterWords) && lastPeriodicIndex !== currentWordIndex) {
      lastPeriodicIndex = currentWordIndex;
      isPaused = true;
      periodicTimeout = setTimeout(() => {
        if (isPlaying) { isPaused = false; scheduleNextWord(); }
      }, pauseDuration);
      return;
    }

    if (fadeEnabled) {
      wordOpacity = 0;
      fadeTimeoutId = setTimeout(() => { wordOpacity = 1; }, 10);
    }

    progress = ((currentWordIndex + 1) / words.length) * 100;
    currentWordIndex++;

    if (currentWordIndex >= words.length) {
      isPlaying = false;
      isPaused = false;
      if (intervalId) { clearTimeout(intervalId); intervalId = null; }
      saveCurrentSession();

      return;
    }

    scheduleNextWord();
  }

  function scheduleNextWord() {
    if (!isPlaying || currentWordIndex >= words.length) return;
    const word = words[currentWordIndex - 1] || "";
    intervalId = setTimeout(showNextWord, getWordDelay(word));
  }

  function start() {
    readerOpen = true;
    if (words.length === 0) parseText();
    if (words.length === 0) return;
    isPlaying = true;
    isPaused = false;

    showNextWord();
  }

  function pause() {
    isPlaying = false;
    isPaused = true;
    if (intervalId) { clearTimeout(intervalId); intervalId = null; }
    clearTimeout(periodicTimeout);
    saveCurrentSession();

  }

  function resume() {
    if (isFinished) {
      restart();
    } else if (currentWordIndex < words.length) {
      isPlaying = true;
      isPaused = false;

      scheduleNextWord();
    }
  }

  function stop() {
    readerOpen = false;
    saveCurrentSession();

    isPlaying = false;
    isPaused = false;
    clearTimeout(periodicTimeout);
    wordOpacity = 1;
    if (intervalId) { clearTimeout(intervalId); intervalId = null; }

  }

  function restart() {
    stop();
    currentWordIndex = 0;
    progress = 0;
    lastPeriodicIndex = -1;
    start();
  }

  // Saves are serialized and capture book identity before asynchronous work.
  function saveCurrentSession() {
    if (!currentBookId || !words.length) return saveQueue;
    const id = currentBookId, index = currentWordIndex, total = words.length;
    saveQueue = saveQueue.catch(() => {}).then(() => libraryStore.saveProgress(id, index, total));
    saveQueue.then(() => { saveError = ''; }, () => { saveError = 'Could not save your place. Keep the app open and try again.'; });
    return saveQueue;
  }

  async function switchBook(book, begin = false) {
    stop();
    await saveCurrentSession();
    await libraryStore.addBook({ ...book, last_read_at: Date.now() });
    await libraryStore.setActiveBook(book.book_id);
    const saved = await libraryStore.getProgress(book.book_id);
    currentBookId = book.book_id;
    currentFileName = book.title;
    words = book.raw_text_array;
    text = words.join(' ');
    chapters = book.chapters || [];
    currentWordIndex = Math.max(0, Math.min(saved?.current_word_index || 0, words.length));
    progress = currentWordIndex / words.length * 100;
    lastPeriodicIndex = -1;
    showTextInput = false;
    activeTab = 'home';
    if (begin && currentWordIndex < words.length) start();
  }

  async function handleTextApply(event) {
    isLoadingFile = true;
    try {
      const rawText = event.detail.text;
      const title = rawText.trim().split(/\s+/).slice(0, 6).join(' ') || 'Pasted text';
      await switchBook(await ingestLocalFile({ title, fileType: 'paste', rawText }), true);
    } catch (error) { loadingMessage = error.message; }
    finally { isLoadingFile = false; }
  }

  async function handleFileSelect(event) {
    const file = event.detail.file;
    if (!file) return;
    isLoadingFile = true;
    loadingMessage = `Opening ${file.name}…`;
    try {
      const parsed = await parseDocument(file);
      const book = await ingestLocalFile({ title: parsed.title || file.name.replace(/\.[^.]+$/, ''), author: parsed.author || 'Unknown', fileType: file.name.split('.').at(-1).toLowerCase(), rawText: parsed.text, chapters: parsed.chapters });
      await switchBook(book, true);
      loadingMessage = '';
    } catch (error) { loadingMessage = error.message; }
    finally { isLoadingFile = false; }
  }

  async function openBook(event) {
    isLoadingFile = true;
    try { await switchBook(event.detail.book, true); }
    catch (error) { saveError = error.message; }
    finally { isLoadingFile = false; }
  }

  function selectChapter(event) {
    if (isPlaying) pause();
    currentWordIndex = Number(event.target.value);
    progress = currentWordIndex / words.length * 100;
    lastPeriodicIndex = -1;
    saveCurrentSession();
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function jumpToWord(value) {
    if (!value || words.length === 0) return;
    let targetIndex;
    const trimmed = value.trim();
    if (trimmed.endsWith("%")) {
      const percent = parseFloat(trimmed.slice(0, -1));
      if (!isNaN(percent)) {
        targetIndex = Math.floor((Math.max(0, Math.min(100, percent)) / 100) * words.length);
      }
    } else {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num)) {
        targetIndex = Math.max(0, Math.min(words.length, num));
      }
    }
    if (targetIndex !== undefined) {
      currentWordIndex = targetIndex;
      progress = (currentWordIndex / words.length) * 100;
    }
    saveCurrentSession();
    showJumpTo = false;
    jumpToValue = "";
  }

  function handleProgressClick(event) {
    const percentage = event.detail.percentage;
    const targetIndex = Math.floor((percentage / 100) * words.length);
    currentWordIndex = Math.max(0, Math.min(words.length, targetIndex));
    progress = (currentWordIndex / words.length) * 100;
    saveCurrentSession();
  }

  function skip(amount) {
    if (words.length === 0) return;
    currentWordIndex = Math.max(0, Math.min(words.length, currentWordIndex + amount));
    progress = (currentWordIndex / words.length) * 100;
    saveCurrentSession();
  }

  // ── Tab handlers ──────────────────────────────────────────────────────────

  function handleTabChange(e) {
    activeTab = e.detail;
    showTextInput = false;
  }

  function handleStartReading() {
    if (currentWordIndex >= words.length) restart(); else start();
  }

  function handleLoadContent() {
    showTextInput = true;
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  function handleKeydown(e) {
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;

    switch (e.code) {
      case "Space":
        e.preventDefault();
        if (isPlaying) pause();
        else if (isPaused) resume();
        else if (isFocusMode || words.length > 0) start();
        break;
      case "Escape":
        if (showJumpTo) {
          showJumpTo = false;
          jumpToValue = "";
        } else if (showTextInput) {
          showTextInput = false;
        } else if (isFocusMode) {
          stop();
        }
        break;
      case "KeyG":
        if (!isPlaying && !showTextInput && isFocusMode) {
          e.preventDefault();
          showJumpTo = !showJumpTo;
        }
        break;
      case "KeyS":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          saveCurrentSession();
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        wordsPerMinute = Math.min(1000, wordsPerMinute + 25);
        break;
      case "ArrowDown":
        e.preventDefault();
        wordsPerMinute = Math.max(50, wordsPerMinute - 25);
        break;
      case "ArrowLeft":
        e.preventDefault();
        skip(-1);
        break;
      case "ArrowRight":
        e.preventDefault();
        skip(1);
        break;

    }
  }

  function handleDisplayClick() {
    if (isAndroid && isFocusMode) {
      if (isPlaying) pause();
      else if (isPaused) resume();
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  function background() { if (document.hidden) { if (isPlaying) pause(); else saveCurrentSession(); } }
  onMount(() => {
    let disposed = false;
    window.addEventListener('keydown', handleKeydown);
    document.addEventListener('visibilitychange', background);
    window.addEventListener('pagehide', saveCurrentSession);
    (async () => {
      try {
        const settings = JSON.parse(localStorage.getItem('imprint-settings') || 'null') || loadSession()?.settings;
        if (settings) {
          wordsPerMinute = settings.wordsPerMinute ?? 300;
          fadeEnabled = settings.fadeEnabled ?? true;
          fadeDuration = settings.fadeDuration ?? 150;
          pauseOnPunctuation = settings.pauseOnPunctuation ?? true;
          punctuationPauseMultiplier = settings.punctuationPauseMultiplier ?? 2;
          wordLengthWPMMultiplier = settings.wordLengthWPMMultiplier ?? 5;
          pauseAfterWords = settings.pauseAfterWords ?? 0;
          pauseDuration = settings.pauseDuration ?? 500;
          frameWordCount = settings.frameWordCount ?? 1;
          focusPosition = settings.focusPosition ?? 40;
        }
        await libraryStore.init();
        const id = localStorage.getItem('rsvp-active-book-id');
        const book = id ? await libraryStore.getBook(id) : null;
        if (disposed) return;
        if (book?.raw_text_array?.length) await switchBook(book);
        else {
          const legacy = loadSession();
          if (legacy?.text) {
            const recovered = await ingestLocalFile({ title: 'Recovered reading', rawText: legacy.text });
            await switchBook(recovered);
            currentWordIndex = Math.min(legacy.currentWordIndex || 0, words.length);
            progress = currentWordIndex / words.length * 100;
            await saveCurrentSession();
            clearSession();
          }
        }
        if (disposed) return;
        ready = true;
        checkpointTimer = setInterval(() => { if (isPlaying) saveCurrentSession(); }, 2000);
      } catch (error) { saveError = error.message; }
    })();
    return () => { disposed = true; };
  });
  onDestroy(() => {
    clearTimeout(intervalId); clearTimeout(fadeTimeoutId); clearTimeout(periodicTimeout);
    clearInterval(checkpointTimer);
    saveCurrentSession();
    window.removeEventListener('keydown', handleKeydown);
    document.removeEventListener('visibilitychange', background);
    window.removeEventListener('pagehide', saveCurrentSession);
  });
</script>

<main class:focus-mode={isFocusMode}>
  {#if saveError}<p class="save-error" role="alert">{saveError}</p>{/if}
  <!-- ══ FOCUS MODE (Reader) ═══════════════════════════════════════════════ -->
  {#if isFocusMode}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="display-area"
      on:click={handleDisplayClick}
      class:android-touch={isAndroid}
    >
      <RSVPDisplay
        word={currentWord}
        wordGroup={wordFrame.subset}
        highlightIndex={wordFrame.centerOffset}
        opacity={wordOpacity}
        {fadeDuration}
        {fadeEnabled}
        multiWordEnabled={frameWordCount > 1}
        {isFinished}
        {focusPosition}
      />
    </div>

    {#if chapters.length > 0}
      <select class="chapter-picker" aria-label="Choose chapter" value={currentChapter?.wordIndex ?? 0} on:change={selectChapter}>
        {#each chapters as chapter}<option value={chapter.wordIndex}>{chapter.title}</option>{/each}
      </select>
    {/if}
    {#if isPaused}<p class="reading-context">{words.slice(Math.max(0, currentWordIndex - 6), currentWordIndex + 6).join(' ')}</p>{/if}
    <!-- Bottom Bar -->
    <div class="bottom-bar">
      {#if isAndroid}
        <div class="android-wpm-wrapper">
          <div class="wpm-time-row">
            <span class="wpm-display-red">{wordsPerMinute} WPM</span>
            <span class="time-remaining">{timeRemaining}</span>
          </div>
          <input
            type="range"
            min="50"
            max="1000"
            step="25"
            bind:value={wordsPerMinute}
            class="slider"
          />
        </div>
      {/if}

      <div class="controls-area">
        <Controls
          {isPlaying}
          {isPaused}
          canPlay={words.length > 0}
          minimal={true}
          on:play={start}
          on:pause={pause}
          on:resume={resume}
          on:stop={stop}
          on:restart={restart}
          on:skip={(e) => skip(e.detail)}
          {isFinished}
        />
      </div>

      <ProgressBar
        {progress}
        currentWord={currentWordIndex}
        totalWords={words.length}
        {timeRemaining}
        minimal={true}
        clickable={!isPlaying}
        on:seek={handleProgressClick}
      />

      {#if !isAndroid}
        <div class="shortcuts desktop-only">
          <kbd>Space</kbd> Play
          <kbd>Esc</kbd> Exit
          <kbd>↑↓</kbd> Speed
          <kbd>←→</kbd> Skip
          <kbd>G</kbd> Jump
        </div>
      {/if}
    </div>
  {:else}
    <!-- ══ APP VIEWS ═══════════════════════════════════════════════════════ -->
    <div class="view-container">
      {#if showTextInput}
        <div class="panel-overlay">
          <TextInput
            {text}
            isLoading={isLoadingFile}
            {loadingMessage}
            on:apply={handleTextApply}
            on:fileselect={handleFileSelect}
            on:close={() => (showTextInput = false)}
          />
        </div>
      {:else if activeTab === 'home'}
        <HomeView
          {currentFileName}
          {words}
          {currentWordIndex}
          {progress}
          bind:wordsPerMinute
          {isLoadingFile}
          {loadingMessage}
          on:startreading={handleStartReading}
          on:loadcontent={handleLoadContent}
          on:openbook={openBook}
        />
      {:else if activeTab === 'library'}
        <Library
          {currentBookId}
          on:openbook={openBook}
          on:addcontent={handleLoadContent}
        />
      {:else if activeTab === 'settings'}
        <Settings
          bind:wordsPerMinute
          bind:fadeEnabled
          bind:fadeDuration
          bind:pauseOnPunctuation
          bind:punctuationPauseMultiplier
          bind:wordLengthWPMMultiplier
          bind:pauseAfterWords
          bind:pauseDuration
          bind:frameWordCount
          bind:focusPosition
        />
      {/if}
    </div>

    <!-- Bottom Navigation -->
    <BottomNav
      {activeTab}
      visible={!showTextInput}
      on:tabchange={handleTabChange}
    />
  {/if}

  <!-- Jump To overlay (works in focus mode) -->
  {#if showJumpTo && isFocusMode}
    <div
      class="panel-overlay"
      on:click|self={() => (showJumpTo = false)}
      role="presentation"
    >
      <div class="jump-to-panel">
        <h3>Jump to position</h3>
        <p class="jump-hint">
          Enter word number (e.g., 150) or percentage (e.g., 50%)
        </p>
        <form on:submit|preventDefault={() => jumpToWord(jumpToValue)}>
          <!-- svelte-ignore a11y_autofocus -->
          <input
            type="text"
            bind:value={jumpToValue}
            placeholder="Word # or %"
            autofocus
          />
          <div class="jump-actions">
            <button type="button" class="secondary" on:click={() => (showJumpTo = false)}>Cancel</button>
            <button type="submit" class="primary">Go</button>
          </div>
        </form>
        <div class="quick-jumps">
          <button on:click={() => jumpToWord("0")}>Start</button>
          <button on:click={() => jumpToWord("25%")}>25%</button>
          <button on:click={() => jumpToWord("50%")}>50%</button>
          <button on:click={() => jumpToWord("75%")}>75%</button>
        </div>
      </div>
    </div>
  {/if}
</main>

<style>
  .chapter-picker { position: absolute; top: 20px; left: 5%; width: 90%; background: #111; color: #ddd; border: 1px solid #444; padding: 12px; border-radius: 8px; z-index: 5; }
  .reading-context { position: absolute; top: 65%; left: 10%; width: 80%; text-align: center; color: #aaa; }
  .save-error { position: fixed; top: 0; left: 0; right: 0; padding: 12px; background: #542020; color: white; z-index: 500; }

  :global(body) {
    background-color: #000 !important;
    margin: 0;
    padding: 0;
    overflow: hidden;
    position: fixed;
    width: 100%;
    height: 100%;
  }

  main {
    height: 100%;
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background-color: #000;
    color: #fff;
    font-family: "Segoe UI", system-ui, sans-serif;
    box-sizing: border-box;
    transition: padding 0.3s ease;
    overflow: hidden;
  }

  main.focus-mode {
    padding: 1rem;
    padding-top: calc(1rem + env(safe-area-inset-top, 0px));
  }

  /* ── View container ─────────────────────────────────────────────────────── */

  .view-container {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* ── Panel overlay (TextInput, JumpTo) ──────────────────────────────────── */

  .panel-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 300;
    padding: 2rem;
    padding-top: calc(2rem + env(safe-area-inset-top, 0px));
    padding-bottom: calc(2rem + env(safe-area-inset-bottom, 0px));
  }

  /* ── Focus mode: Reader ─────────────────────────────────────────────────── */

  .display-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    overflow: hidden;
  }

  .bottom-bar {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.5rem;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .controls-area {
    display: flex;
    justify-content: center;
  }

  .shortcuts {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    color: #444;
    font-size: 0.8rem;
  }

  kbd {
    background: #1a1a1a;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    font-family: monospace;
    color: #666;
    margin-right: 0.25rem;
  }

  .desktop-only {
    display: flex;
  }

  /* ── Android WPM bar ────────────────────────────────────────────────────── */

  .android-wpm-wrapper {
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0 1rem;
  }

  .wpm-time-row {
    display: flex;
    justify-content: space-between;
    width: 100%;
    align-items: center;
  }

  .wpm-display-red {
    color: #ff4444;
    font-family: monospace;
    font-size: 0.85rem;
  }

  .time-remaining {
    color: #888;
    font-family: monospace;
    font-size: 0.85rem;
  }

  .slider {
    width: 100%;
    height: 6px;
    background: #333;
    border-radius: 3px;
    appearance: none;
    cursor: pointer;
    outline: none;
  }

  .slider::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    background: #ff4444;
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.1s;
  }

  .slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }

  /* ── Jump to panel ──────────────────────────────────────────────────────── */

  .jump-to-panel {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 320px;
    width: 100%;
  }

  .jump-to-panel h3 {
    margin: 0 0 0.5rem 0;
    color: #fff;
    font-size: 1.1rem;
  }

  .jump-hint {
    color: #666;
    font-size: 0.85rem;
    margin: 0 0 1rem 0;
  }

  .jump-to-panel input {
    width: 100%;
    padding: 0.75rem;
    background: #111;
    border: 1px solid #333;
    border-radius: 6px;
    color: #fff;
    font-size: 1rem;
    margin-bottom: 1rem;
    box-sizing: border-box;
  }

  .jump-to-panel input:focus {
    outline: none;
    border-color: #ff4444;
  }

  .jump-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .jump-actions button {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    font-weight: 500;
    border: none;
    transition: all 0.2s;
  }

  .jump-actions button.primary { background: #ff4444; color: #fff; }
  .jump-actions button.primary:hover { background: #ff6666; }
  .jump-actions button.secondary { background: #333; color: #fff; }
  .jump-actions button.secondary:hover { background: #444; }

  .quick-jumps {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .quick-jumps button {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #333;
    background: #111;
    color: #888;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.15s;
  }

  .quick-jumps button:hover { border-color: #555; color: #fff; }

  /* ── Mobile ─────────────────────────────────────────────────────────────── */

  @media (max-width: 600px) {
    main.focus-mode {
      padding: 0.5rem;
      padding-top: calc(0.5rem + env(safe-area-inset-top, 0px));
    }
    .panel-overlay { padding: 1rem; }
    .desktop-only { display: none; }
  }
</style>
