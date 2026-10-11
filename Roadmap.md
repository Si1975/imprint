# Imprint: a reader I want to use

Open a book. Read comfortably. Come back to the same place.

Imprint is a small personal RSVP reader and a hobby first. An optional one-time paid store release comes only after it is enjoyable and dependable for everyday use. There is no growth target or release deadline.

## The core

- A personal library of imported EPUB, text-based PDF, TXT and Markdown files.
- Save pasted text as a book, without word limits.
- Comfortable dark RSVP reading, adjustable speed, punctuation pauses and existing display controls.
- Book identity, automatic reading checkpoints, safe book switching and saved settings.
- EPUB section/chapter selection and a short context line while paused.
- Everything stays on the device. No accounts or content service.

## Current implementation

The basics above are implemented in the source. A passing build and automated checks are useful evidence, but do not mean mobile release readiness. EPUB navigation currently maps TOC labels to spine sections; multiple TOC anchors within one section are not separate navigation targets. Old imported EPUBs must be reimported to gain chapter metadata. Browser data can still be cleared or evicted.

## Next: use it myself

- [ ] Read several chapters of a real novel on Android, then keep using it for a week.
- [ ] Check resume after backgrounding, reopening and switching between two books.
- [ ] Check a very short session, a completed book, chapter jumps, deletion and a failed import.
- [ ] Try several real EPUBs, including nested TOCs and chapters sharing a spine file; improve chapter mapping only where it affects actual books.
- [ ] Verify PDF extraction and bundled worker offline. Scanned PDFs requiring OCR are out of scope.
- [ ] Verify airplane-mode cold start and app updates on the packaged Android app and web preview.
- [ ] Test touch targets, font sizes and long words on the actual phone.
- [ ] Fix annoyances encountered during reading before adding features.

## Optional: share or sell it

- [ ] Start with the already-packaged Android app; consider iOS only after the reader is proven and if the extra maintenance is worthwhile.
- [ ] Make a small private tester build and respond to repeated reading problems.
- [ ] Prepare honest store screenshots, a short description, privacy information and support contact.
- [ ] Decide whether to charge once for the whole app. Choose a price near release; avoid subscriptions, ads, artificial reading limits and a second Pro edition.
- [ ] Check current store requirements and test the packaged release before submission.
- [ ] Consider simple export/import backup only if device migration becomes a real need.

## Removed from scope

Gutenberg/Gutendex discovery, bundled classics, CORS proxies, licence keys, premium gates, analytics dashboards, streaks, reading goals, ads, notifications, share cards, cloud services and a speculative SQLite migration.

Notes, dictionaries, theme builders, localization and customizable control layouts have no planned phase. Add something only when it resolves a recurring annoyance and fits into a small evening's work.

Success means I look forward to opening Imprint and it remembers my book and place. A few happy paying readers would be a bonus.
