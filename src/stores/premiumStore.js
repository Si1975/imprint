/**
 * premiumStore.js — Global freemium state machine
 *
 * Tracks whether the user has activated a Pro license.
 * The isPremium flag is persisted to localStorage so it survives page reloads.
 *
 * Phase 1: validated against a hardcoded dev key (case-insensitive, trimmed).
 * Phase 2: replace validateKey() with a real license server call.
 */

import { writable, derived, get } from 'svelte/store';

const STORAGE_KEY = 'rsvp-premium';

/** Valid license keys (case-insensitive, whitespace-trimmed) */
const VALID_KEYS = new Set(['imprint-pro', 'imprint-lifetime']);

// ── Internal writable ────────────────────────────────────────────────────────

function loadInitialState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { isPremium: false, activatedAt: null, keyUsed: null };
    return JSON.parse(stored);
  } catch {
    return { isPremium: false, activatedAt: null, keyUsed: null };
  }
}

const _store = writable(loadInitialState());

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

// ── Public store ─────────────────────────────────────────────────────────────

/** Readable derived store — true when user has an active Pro license */
export const isPremium = derived(_store, ($s) => $s.isPremium);

/** Full state store (isPremium, activatedAt, keyUsed) */
export const premiumState = { subscribe: _store.subscribe };

// ── Actions ──────────────────────────────────────────────────────────────────

/**
 * Attempt to activate Pro using a license key.
 * Validation is case-insensitive and trims surrounding whitespace.
 * @param {string} rawKey
 * @returns {{ success: boolean, error?: string }}
 */
export function activateWithKey(rawKey) {
  const normalized = String(rawKey).trim().toLowerCase();

  if (!normalized) {
    return { success: false, error: 'Please enter a license key.' };
  }

  if (!VALID_KEYS.has(normalized)) {
    return { success: false, error: 'Invalid license key. Please check and try again.' };
  }

  const newState = {
    isPremium: true,
    activatedAt: Date.now(),
    keyUsed: normalized,
  };

  _store.set(newState);
  persist(newState);
  return { success: true };
}

/**
 * Deactivate Pro (for testing / account management).
 */
export function deactivatePremium() {
  const newState = { isPremium: false, activatedAt: null, keyUsed: null };
  _store.set(newState);
  persist(newState);
}

/**
 * Synchronous getter for use outside reactive contexts (e.g. ingestor.js).
 * @returns {boolean}
 */
export function getIsPremium() {
  return get(isPremium);
}
