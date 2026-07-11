# Product Roadmap & Success Matrix: Imprint
**Project Vision:** An instant, zero-friction portal to speed-read the entire public domain, focusing on a clean, distraction-free "Zen Mode" with robust mobile-first usability.

---

## Phase 1: The Core Web App & Local-First Foundation
*Focus: Engineering stability, user experience, and low-maintenance architecture.*

### What to Expect (Deliverables)
- [x] **Fully Overhauled Svelte Core:** A responsive web application optimized specifically for mobile viewports (retaining custom font-scaling and Focus Shift Left math).
- [x] **Zero-Backend Architecture:** No server costs, no cloud databases, and no forced user logins. All user data, uploads, and reading progress reside entirely on the local device via **IndexedDB**.
- [x] **The Ingestion Pipeline:** Clean support for custom text copy-pasting (up to 10,000 words on the free tier) and single-file local uploads (EPUB/PDF/TXT/MD).
- [x] **The Precision Navigation Deck:** Refined reading controls layout (`[-5] [-1] | [▶/⏸] [■] | [+1] [+5]`) featuring adaptive punctuation micro-pauses and word-index jumping.
- [x] **The Premium State Gate:** A simulated local license key switch (`IMPRINT-PRO`) in settings that unlocks advanced typography, multi-book shelf layouts, and the reading analytics dashboard.
- [x] **Lazy-Loaded Classics Catalog:** A curated collection of 5 complete public domain books hosted as static public assets and fetched asynchronously to prevent heavy initial bundle loads.
- [ ] **Custom Themes:** Themes with some presets and the ability to customize fonts, colors, and backgrounds.
- [ ] **Contextual Pause:** Pause in reading mode to display the previous and next few words so that if words were missed it's easy to catch up.
- [ ] **Save Pasted Text:** Ability to save pasted text into the library with a title/author (optional).
- [ ] **Customizable Controls:** Customizable control set for reading mode so users can have preferred controls.
- [x] **Keyboard Shortcut Support:** Full keyboard support for navigation and controls when using the app on desktop browsers.
- [ ] **Global Reading Goals:** Users can set daily or weekly reading goals (in time or word count) to build reading habits, tracked globally across all books in their library.
- [ ] **Multi-Language Support:** Basic UI localization for popular languages and improved handling of non-English text flow in the speed reader.
- [x] **Name and Branding:** App name officially decided as **Imprint** (Tagline: *"Don't read it, imprint it."*). Logo and visual assets to be created.

### What Success Looks Like in Phase 1
- [x] **Performance:** The app loads instantly, compiles into 100% static client assets, and costs **$0/month** to host (Vercel/Netlify).
- [x] **UX Immersion:** A user can land on the site and begin reading a classic story or their own text within two clicks without hitting a tracking block.
- [x] **Persistence Proof:** Closing the browser mid-book and returning days later places the reader at the exact word token where they left off, every time.
- [x] **Asynchronous Database Foundation:** The storage layers are cleanly decoupled using async Promises, proving ready to interface with mobile storage wrappers in Phase 2.
- [x] **The Infinite Library Integration:** Hooking the unified ingestion channel into the **Gutendex API** (Project Gutenberg) to offer live, client-side searching and streaming of over 70,000 classics.
- [x] **Personal Library:** Users can import their own books (EPUB, PDF, TXT, MD) and read them in the app and download from the Infinite Library to build their personal collection of classics. Users can then organize, browse, search, and read their personal collection of classics.
- [x] **Progress Tracking:** Users can track their reading progress and stats, including words read per minute, pages read, and time spent reading, as well as book tracking, and personal notes. 

---

## ⚠️ Pre-Release: Replace CORS Proxy Before App Store Submission

> **Action required before pushing to iOS/Android app stores or any production hosting (other than Docker with nginx).**

The Explore tab's Gutendex API integration currently uses **corsproxy.io** as a fallback CORS proxy in production builds. This is fine for development and web previews, but introduces a third-party dependency with potential rate limits and reliability concerns.

**Before release, choose one of these options:**
1. **Deploy a Cloudflare Worker** (~5 min setup, free tier) as your own lightweight CORS proxy — most reliable.
2. **Use the Docker/nginx setup** which already includes proxy rules in `docker/nginx.conf` — works if you self-host.
3. **Deploy a small DigitalOcean Function** alongside your existing DO App Platform config.

The relevant code is in [`src/lib/gutendexApi.js`](src/lib/gutendexApi.js) — search for `corsproxy.io` to find the two places that need updating. Replace the `proxyTextUrl()` and `gutendexUrl()` functions' production branches with your own proxy endpoint.

---

## Phase 2: The Infinite Library & Mobile App Store Launch
*Focus: Content scaling, distribution, native packaging, and monetization conversion.*

### What to Expect (Deliverables)
*   **Native App Packaging:** Compiling the production-ready code into high-performance native iOS and Android packages via **Capacitor**.
*   **The Mobile SQLite Engine:** Dropping a native SQLite storage wrapper into the existing asynchronous `sqliteAdapter.js` slot to provide unbreakable library storage.
*   **Storefront Monetization:** Wiring the internal premium state store to native mobile billing systems (**StoreKit / Google Play Billing**) using a unified service like **RevenueCat**.
*   **Soft Ad Integration:** Placing a 5-second skippable ad interstitial only when starting a new text file or selecting a new library book on the free tier.
*   **Adsense Ads:** Add Adsense ads to the web app preview, consider for mobile release as well.
*   **App Store Assets:** Create assets for the app store including screenshots, promo video, and app description.
*   **Shareable Progress Cards:** Generate branded images of reading milestones (e.g., "I read X in Y hours") to share on social media, driving organic growth.
*   **Local Push Notifications:** Remind users to hit their daily reading goals (handled entirely on-device without a server).

### Optional Future Features
*   **Offline Dictionary:** Integrate with an offline dictionary to allow users to look up word definitions while reading.
*   **Notes and Highlights:** Allow users to take notes and highlight text while reading.
*   **Multiple Reading Languages:** Allow users to read books in multiple languages.


### What Success Looks Like in Phase 2
*   **The Viral Marketing Loop:** Launching short-form videos ("Beowulf in 4 minutes") showcasing the flashing reader interface, driving continuous organic traffic straight to the app storefronts.
*   **Subscription-Fatigue Alternative:** Positioning the app successfully as a consumer-friendly **"Pay Once, Own Forever" Lifetime License ($4.99–$9.99)** to capture users tired of monthly reading app costs.
*   **Zero Running Costs:** Maintaining a highly scalable business model where processing and storage occur entirely client-side, translating all premium app purchases directly into pure side income.