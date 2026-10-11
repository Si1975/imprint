# Imprint

A small, local-first RSVP reader for your own books. Import EPUB, text-based PDF, TXT or Markdown, or save pasted text; read in a dark focus view and resume your place automatically.

The personal library, chapter selector and reading controls have no demo licences, ads, accounts or content-search service. EPUB chapter selection currently follows spine sections, using TOC labels where available. Older imported books need reimporting for chapter metadata. Scanned PDFs are not supported.

## Mission

**Make it comfortable. Make it reliable. Make it beautiful. Then publish it.**

Imprint began with its creator's love of Spritz-style RSVP: a comfortable, immersive way to read on a screen. Faster reading can come naturally with practice, but speed records are neither the goal nor a promise.

The reader should fade away, leaving the book: resume effortlessly, preserve the content and reading position, and keep navigation to a minimum. Every change should make reading calmer, more enjoyable or more dependable. Keep the scope tight; fix real reading annoyances before adding features.

This is a passion project first. A modest side income from an optional one-time purchase would be a welcome bonus, once the reader is ready to share.

## Commercial philosophy

**Make good software. Sell it once. Let people enjoy it.**

If Imprint is sold, a fair one-off purchase should buy a complete, usable reader: no subscriptions, accounts or dependency on a developer-run backend. Sensible bug fixes and compatibility maintenance belong to looking after that product, without a lifetime promise of new features or support for every future device or OS. A substantial future version could be a separate purchase, with no requirement to buy it to keep using the existing version on supported devices. Internal working title, naturally: “Imprint 2: Eclectic Boogaloo”.

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
