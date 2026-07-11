/**
 * Progress storage utilities for persisting reading sessions
 */

const STORAGE_KEY = 'rsvp-reading-session';
const FILE_HISTORY_KEY = 'rsvp-file-history';

/**
 * Save the current reading session to localStorage
 * @param {Object} session - The session data to save
 * @param {string} session.text - The full text being read
 * @param {number} session.currentWordIndex - Current position in the text
 * @param {number} session.totalWords - Total word count
 * @param {Object} session.settings - Reader settings
 * @returns {boolean} Whether the save was successful
 */
export function saveSession(session) {
  try {
    const data = {
      text: session.text,
      currentWordIndex: session.currentWordIndex,
      totalWords: session.totalWords,
      settings: session.settings,
      savedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save session:', error);
    return false;
  }
}

/**
 * Load a saved reading session from localStorage
 * @returns {Object|null} The saved session data or null if none exists
 */
export function loadSession() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load session:', error);
    return null;
  }
}

/**
 * Check if a saved session exists
 * @returns {boolean} Whether a saved session exists
 */
export function hasSession() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Clear the saved session from localStorage
 * @returns {boolean} Whether the clear was successful
 */
export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear session:', error);
    return false;
  }
}

/**
 * Get a summary of the saved session without loading full text
 * @returns {Object|null} Summary with wordIndex, totalWords, savedAt, or null
 */
export function getSessionSummary() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    return {
      currentWordIndex: parsed.currentWordIndex,
      totalWords: parsed.totalWords,
      savedAt: parsed.savedAt,
      hasText: !!parsed.text
    };
  } catch {
    return null;
  }
}

/**
 * Save progress for a specific file
 * @param {string} filename - Name of the file
 * @param {number} currentWordIndex - Current reading position
 * @param {number} totalWords - Total number of words
 * @returns {boolean} Success status
 */
export function saveFileProgress(filename, currentWordIndex, totalWords) {
  if (!filename || typeof filename !== 'string') return false;

  try {
    const historyJSON = localStorage.getItem(FILE_HISTORY_KEY);
    const history = historyJSON ? JSON.parse(historyJSON) : {};

    history[filename] = {
      currentWordIndex,
      totalWords,
      lastRead: Date.now()
    };

    // Optional: Prune if too large (e.g. keep last 50 files)
    // For now simple storage is fine

    localStorage.setItem(FILE_HISTORY_KEY, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('Failed to save file progress:', error);
    return false;
  }
}

/**
 * Load progress for a specific file
 * @param {string} filename - Name of the file
 * @returns {Object|null} Progress object { currentWordIndex, totalWords, lastRead } or null
 */
export function loadFileProgress(filename) {
  if (!filename) return null;

  try {
    const historyJSON = localStorage.getItem(FILE_HISTORY_KEY);
    if (!historyJSON) return null;

    const history = JSON.parse(historyJSON);
    return history[filename] || null;
  } catch (error) {
    console.error('Failed to load file progress:', error);
    return null;
  }
}

/**
 * Calculate word index from a percentage
 * @param {number} percentage - Percentage (0-100)
 * @param {number} totalWords - Total word count
 * @returns {number} The word index
 */
export function percentageToWordIndex(percentage, totalWords) {
  if (!totalWords || totalWords <= 0) return 0;
  const clamped = Math.max(0, Math.min(100, percentage));
  return Math.floor((clamped / 100) * totalWords);
}

/**
 * Calculate percentage from word index
 * @param {number} wordIndex - Current word index
 * @param {number} totalWords - Total word count
 * @returns {number} The percentage (0-100)
 */
export function wordIndexToPercentage(wordIndex, totalWords) {
  if (!totalWords || totalWords <= 0) return 0;
  return Math.round((wordIndex / totalWords) * 100);
}
