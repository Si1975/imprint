# Imprint

A small, local-first RSVP reader for your own books. Import EPUB, text-based PDF, TXT or Markdown, or save pasted text; read in a dark focus view and resume your place automatically.

The personal library, chapter selector and reading controls have no demo licences, ads, accounts or content-search service. EPUB chapter selection currently follows spine sections, using TOC labels where available. Older imported books need reimporting for chapter metadata. Scanned PDFs are not supported.

## Development

```sh
npm install
npm run dev
npm run test:run
npm run build
```

## Android

```sh
npm run build
npx cap sync android
npx cap open android
```

The Android project is present; iOS is a future decision. Native sync and real-device testing are still required before a release. For the web preview, Docker serves the built static assets without API proxies.

Books and progress are stored in IndexedDB; settings and the active book ID use localStorage. Playback checkpoints every two seconds and pauses/saves when the document becomes hidden. Abrupt termination can lose the latest uncommitted checkpoint. Browser data removal or eviction removes the library; there is no cloud backup. Existing downloaded books with saved text are retained even though discovery is removed.

See [Roadmap.md](Roadmap.md) for the deliberately small scope and hands-on acceptance checks.
