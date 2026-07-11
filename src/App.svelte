<script>
  import { onMount, onDestroy } from "svelte";
  import { Capacitor } from "@capacitor/core";
  import {
    parseText as parseTextUtil,
    getWordDelay as getWordDelayUtil,
    formatTimeRemaining,
    shouldPauseAtWord,
  } from "./lib/rsvp-utils.js";
  import { parseFile } from "./lib/file-parsers.js";
  import {
    saveSession,
    loadSession,
    clearSession,
    hasSession,
    saveFileProgress,
    loadFileProgress,
  } from "./lib/progress-storage.js";
  import RSVPDisplay from "./lib/components/RSVPDisplay.svelte";
  import Controls from "./lib/components/Controls.svelte";
  import ProgressBar from "./lib/components/ProgressBar.svelte";
  import TextInput from "./lib/components/TextInput.svelte";
  import BottomNav from "./lib/components/BottomNav.svelte";
  import HomeView from "./lib/components/HomeView.svelte";
  import Library from "./lib/components/Library.svelte";
  import Explore from "./lib/components/Explore.svelte";
  import Settings from "./lib/components/Settings.svelte";
  import ActivityDashboard from "./lib/components/ActivityDashboard.svelte";
  import { extractWordFrame } from "./lib/rsvp-utils.js";
  import { libraryStore } from "./stores/libraryStore.js";
  import { isPremium, activateWithKey, premiumState } from "./stores/premiumStore.js";
  import { ingestLocalFile, ingestCatalogBook } from "./lib/ingestor.js";

  // ── Navigation ─────────────────────────────────────────────────────────────
  let activeTab = 'home';
  let showTextInput = false;

  // ── RSVP State ─────────────────────────────────────────────────────────────
  let frameWordCount = 1;
  let text = `Rapid serial visual presentation (RSVP) is a scientific method for studying the timing of vision. In RSVP, a sequence of stimuli is shown to an observer at one location in their visual field. This technique has been adapted for speed reading applications, where words are displayed one at a time at a fixed point, eliminating the need for eye movements and potentially increasing reading speed significantly.`;
  let words = [];
  let currentWordIndex = 0;
  let isPlaying = false;
  let isPaused = false;
  let progress = 0;
  let isLoadingFile = false;
  let loadingMessage = "";
  let showJumpTo = false;
  let jumpToValue = "";
  let currentFileName = "";
  let currentBookId = null;

  // Session tracking for DB
  let sessionStartTime = null;
  let sessionStartIndex = 0;

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
  $: isFocusMode = isPlaying || isPaused || isFinished;
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
      flushSessionToDB();
      return;
    }

    if (shouldPauseAtWord(currentWordIndex, pauseAfterWords)) {
      isPaused = true;
      setTimeout(() => {
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
      flushSessionToDB();
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
    if (words.length === 0) parseText();
    if (words.length === 0) return;
    isPlaying = true;
    isPaused = false;
    sessionStartTime = Date.now();
    sessionStartIndex = currentWordIndex;
    showNextWord();
  }

  function pause() {
    isPlaying = false;
    isPaused = true;
    if (intervalId) { clearTimeout(intervalId); intervalId = null; }
    saveCurrentSession();
    flushSessionToDB();
  }

  function resume() {
    if (isFinished) {
      restart();
    } else if (currentWordIndex < words.length) {
      isPlaying = true;
      isPaused = false;
      sessionStartTime = Date.now();
      sessionStartIndex = currentWordIndex;
      scheduleNextWord();
    }
  }

  function stop() {
    saveCurrentSession();
    flushSessionToDB();
    isPlaying = false;
    isPaused = false;
    wordOpacity = 1;
    if (intervalId) { clearTimeout(intervalId); intervalId = null; }
    if (isFinished) {
      currentWordIndex = 0;
      progress = 0;
    }
  }

  function restart() {
    stop();
    currentWordIndex = 0;
    progress = 0;
    start();
  }

  // ── DB session helpers ─────────────────────────────────────────────────────

  async function flushSessionToDB() {
    if (!currentBookId || !sessionStartTime) return;
    const endTime = Date.now();
    const wordsRead = Math.max(0, currentWordIndex - sessionStartIndex);
    if (wordsRead < 5) return;

    try {
      await libraryStore.recordSession(
        currentBookId, sessionStartTime, endTime, wordsRead,
      );
      await libraryStore.saveProgress(
        currentBookId, currentWordIndex, words.length,
        Math.round((endTime - sessionStartTime) / 1000),
        currentWordIndex >= words.length,
      );
    } catch (e) {
      console.warn("[Imprint] DB flush failed:", e);
    }

    sessionStartTime = null;
    sessionStartIndex = currentWordIndex;
  }

  // ── File / text loading ───────────────────────────────────────────────────

  function handleTextApply(event) {
    text = event.detail.text;
    currentFileName = "Pasted Text";
    currentBookId = null;
    stop();
    parseText();
    showTextInput = false;
  }

  async function handleFileSelect(event) {
    const file = event.detail.file;
    if (!file) return;

    isLoadingFile = true;
    loadingMessage = `Loading ${file.name}...`;

    try {
      const rawText = await parseFile(file);
      const result = await ingestLocalFile({
        title: file.name.replace(/\.[^.]+$/, ""),
        author: "Unknown",
        fileType: file.name.endsWith(".epub")
          ? "epub"
          : file.name.endsWith(".pdf")
            ? "pdf"
            : "txt",
        rawText,
        isCustomUpload: true,
      });

      if (!result.success) throw new Error(result.error || "Failed to parse file");

      if (result.wasTruncated) {
        loadingMessage = `⚠️ Free tier: showing first ${result.words.length.toLocaleString()} of ${result.originalWordCount.toLocaleString()} words. Activate Pro for unlimited.`;
        setTimeout(() => { loadingMessage = ""; }, 4000);
      }

      words = result.words;
      text = rawText;
      currentFileName = file.name;
      currentBookId = result.book.book_id;

      await libraryStore.addBook(result.book);

      const savedProg = await libraryStore.getProgress(result.book.book_id);
      if (savedProg && savedProg.current_word_index > 0) {
        currentWordIndex = Math.min(savedProg.current_word_index, words.length);
        progress = (currentWordIndex / words.length) * 100;
      } else {
        currentWordIndex = 0;
        progress = 0;
      }

      showTextInput = false;
    } catch (error) {
      console.error("Error parsing file:", error);
      loadingMessage = `Error: ${error.message}`;
      setTimeout(() => { loadingMessage = ""; }, 3000);
    } finally {
      isLoadingFile = false;
    }
  }

  // ── Library: open a book ──────────────────────────────────────────────────

  async function openBook(event) {
    const book = event.detail.book;
    isLoadingFile = true;
    loadingMessage = `Loading ${book.title}…`;

    try {
      if (book.source_origin === "local_catalog") {
        const result = await ingestCatalogBook(book);
        if (!result.success) throw new Error(result.error);
        words = result.words;
        text = words.join(" ");
        currentFileName = book.title;
        currentBookId = book.book_id;
        await libraryStore.addBook({
          ...result.book,
          total_words: result.words.length,
          raw_text_array: null,
        });
      } else if (book.raw_text_array && book.raw_text_array.length > 0) {
        words = book.raw_text_array;
        text = words.join(" ");
        currentFileName = book.title;
        currentBookId = book.book_id;
      } else {
        throw new Error("Book has no text content.");
      }

      const savedProg = await libraryStore.getProgress(book.book_id);
      if (savedProg && savedProg.current_word_index > 0) {
        currentWordIndex = Math.min(savedProg.current_word_index, words.length);
        progress = (currentWordIndex / words.length) * 100;
      } else {
        currentWordIndex = 0;
        progress = 0;
      }

      stop();
      await libraryStore.setActiveBook(book.book_id);

      // After loading, switch to home and start reading
      activeTab = 'home';
    } catch (err) {
      console.error("[Imprint] openBook failed:", err);
      loadingMessage = `Error: ${err.message}`;
      setTimeout(() => { loadingMessage = ""; }, 3000);
    } finally {
      isLoadingFile = false;
      loadingMessage = "";
    }
  }

  // ── Session storage ───────────────────────────────────────────────────────

  function saveCurrentSession() {
    if (words.length === 0) return false;
    if (currentFileName && currentFileName !== "Pasted Text" && !currentBookId) {
      saveFileProgress(currentFileName, currentWordIndex, words.length);
    }
    return saveSession({
      text,
      currentWordIndex,
      totalWords: words.length,
      settings: {
        wordsPerMinute, fadeEnabled, fadeDuration,
        pauseOnPunctuation, punctuationPauseMultiplier,
        wordLengthWPMMultiplier, pauseAfterWords, pauseDuration,
        frameWordCount, focusPosition,
      },
    });
  }

  function loadSavedSession() {
    const session = loadSession();
    if (!session) return false;
    text = session.text;
    parseText();
    currentWordIndex = session.currentWordIndex;
    progress = (currentWordIndex / words.length) * 100;
    if (session.settings) {
      wordsPerMinute = session.settings.wordsPerMinute ?? wordsPerMinute;
      fadeEnabled = session.settings.fadeEnabled ?? fadeEnabled;
      fadeDuration = session.settings.fadeDuration ?? fadeDuration;
      pauseOnPunctuation = session.settings.pauseOnPunctuation ?? pauseOnPunctuation;
      punctuationPauseMultiplier = session.settings.punctuationPauseMultiplier ?? punctuationPauseMultiplier;
      wordLengthWPMMultiplier = session.settings.wordLengthWPMMultiplier ?? wordLengthWPMMultiplier;
      pauseAfterWords = session.settings.pauseAfterWords ?? pauseAfterWords;
      pauseDuration = session.settings.pauseDuration ?? pauseDuration;
      frameWordCount = session.settings.frameWordCount ?? frameWordCount;
      focusPosition = session.settings.focusPosition ?? focusPosition;
    }
    return true;
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
    showJumpTo = false;
    jumpToValue = "";
  }

  function handleProgressClick(event) {
    const percentage = event.detail.percentage;
    const targetIndex = Math.floor((percentage / 100) * words.length);
    currentWordIndex = Math.max(0, Math.min(words.length, targetIndex));
    progress = (currentWordIndex / words.length) * 100;
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
    start();
  }

  function handleLoadContent() {
    showTextInput = true;
  }

  function handleShowPro() {
    activeTab = 'settings';
  }

  function handleUpgradePrompt() {
    activeTab = 'settings';
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
        } else if (isPlaying || isPaused) {
          isPlaying = false;
          isPaused = false;
          if (intervalId) { clearTimeout(intervalId); intervalId = null; }
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
        if (currentWordIndex > 1) {
          currentWordIndex = Math.max(0, currentWordIndex - 2);
          progress = (currentWordIndex / words.length) * 100;
        }
        break;
      case "ArrowRight":
        e.preventDefault();
        if (currentWordIndex < words.length) {
          progress = ((currentWordIndex + 1) / words.length) * 100;
          currentWordIndex++;
        }
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

  onMount(async () => {
    parseText();
    window.addEventListener("keydown", handleKeydown);
    if (hasSession()) loadSavedSession();
    await libraryStore.init();
  });

  onDestroy(() => {
    if (intervalId) clearTimeout(intervalId);
    if (fadeTimeoutId) clearTimeout(fadeTimeoutId);
    window.removeEventListener("keydown", handleKeydown);
  });
</script>

<main class:focus-mode={isFocusMode}>
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
          {currentBookId}
          {words}
          {currentWordIndex}
          {progress}
          bind:wordsPerMinute
          {isLoadingFile}
          {loadingMessage}
          on:startreading={handleStartReading}
          on:loadcontent={handleLoadContent}
          on:openbook={openBook}
          on:showpro={handleShowPro}
        />
      {:else if activeTab === 'library'}
        <Library
          {currentBookId}
          {wordsPerMinute}
          on:openbook={openBook}
        />
      {:else if activeTab === 'explore'}
        <Explore
          on:openbook={openBook}
          on:upgradeprompt={handleUpgradePrompt}
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
