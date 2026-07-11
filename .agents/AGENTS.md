# Imprint Project Guidelines

This file provides persistent context for Antigravity agents when working on the Imprint project.

## Architecture & Tech Stack
- **Framework:** Svelte (Vite)
- **Styling:** Tailwind CSS
- **Mobile Integration:** Capacitor (for iOS and Android native packaging)
- **Database:** Local-first architecture using IndexedDB (zero-backend). Avoid suggesting any cloud databases or backend servers.
- **Routing:** Svelte routing/components.
- **Key APIs:** Gutendex API (with proxy fallback) for the Explore tab.

## Key Files and Components
- `src/lib/components/`: Reusable Svelte components (e.g., `Library.svelte`, `Explore.svelte`, `Reader.svelte`).
- `src/lib/gutendexApi.js`: Handles all interactions with the Project Gutenberg catalog.
- `Roadmap.md`: Contains the current status and feature plans. Always refer to this before starting new phases.

## Project Vision
An instant, zero-friction portal to speed-read the entire public domain, focusing on a clean, distraction-free "Zen Mode" with robust mobile-first usability. Ensure changes maintain a $0/month hosting requirement and 100% static client assets.
