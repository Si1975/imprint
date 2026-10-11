# Imprint: a reader I want to use

**Make it comfortable. Make it reliable. Make it beautiful. Then publish it.**

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

## Priority UX: pause and recover context

- [ ] Make sentence recovery the next UX improvement: pausing RSVP should show the full current sentence, clearly highlighted, with the preceding sentence or nearby context visible above it.
- [ ] Offer an easy resume from the start of the current sentence, so a distraction or missed word does not require stepping backwards word by word.
- [ ] Try this during real novel reading and with testers: check comprehension and recovery, sentence boundaries and chapter edges, while keeping pause/resume simple and comfortable.

This expands the existing short paused context line; it is planned work, not a claim about the current implementation. The goal is comfort and immersion, not a reading-speed promise.

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

## Future experiment: opt-in blink-aware reading

- [ ] Explore an explicitly **OPT-IN, toggleable, EXPERIMENTAL** front-camera feature, off by default. Reading must remain fully usable without it; this is not a release blocker.
- [ ] Provide two independently selectable strategies, with neither assumed better before testing:
  - **Blink Compensation:** hold/pause RSVP progression while the eyes are detected as closed, then continue when they reopen.
  - **Smart Rewind:** on blink completion, replay the words shown during eye closure, accounting for detection latency with a small configurable timing margin.
- [ ] Make closure/confidence thresholds, minimum closure duration and the rewind timing margin adjustable; tune with real-device experiments to avoid false triggers and distracting pauses or repetition. Test each strategy separately and, if both are enabled, avoid rewinding words already held by compensation.
- [ ] Process camera frames entirely on-device, transiently: no recording, saved footage or uploads. Explain and request camera permission only when enabling the feature; stop camera processing when disabled or reading ends, pauses or goes into the background.
- [ ] Explain limitations plainly: battery use, camera permissions, dim lighting, camera angle, glasses, detection latency and device capability can affect reliability. Unsupported devices or denied permission should fall back to ordinary RSVP reading.
- [ ] Gather optional tester feedback on comfort, missed words, false detections, battery impact and preferred strategy. Use that evidence to decide whether either or both modes deserve further work; Smart Rewind is not presumed inferior.

Keep the experiment small and easy to turn off. Pursue it only after dependable everyday reading and sentence recovery; abandon or simplify it if it adds more friction than immersion. No backend, analytics machinery or wider feature creep is needed to learn from voluntary feedback.

## Removed from scope

Gutenberg/Gutendex discovery, bundled classics, CORS proxies, licence keys, premium gates, analytics dashboards, streaks, reading goals, ads, notifications, share cards, cloud services and a speculative SQLite migration.

Notes, dictionaries, theme builders, localization and customizable control layouts have no planned phase. Add something only when it resolves a recurring annoyance and fits into a small evening's work.

Success means I look forward to opening Imprint and it remembers my book and place. A few happy paying readers would be a bonus.
