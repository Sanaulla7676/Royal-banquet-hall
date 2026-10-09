# The Royal Party Hall

Responsive multi-page website for The Royal Party Hall in Rajajinagar, Bengaluru.

## Pages
- `index.html` — homepage, photo preview and fast enquiry entry.
- `events.html` — event-type discovery.
- `gallery.html` — 35 categorized photos, lightbox and 7 video players.
- `booking.html` — event enquiry form.
- `experience.html` — planning journey and FAQs.
- `contact.html` — contact enquiry and location context.

## Shared components and architecture
- `assets/css/site.css` — responsive luxury visual system.
- `assets/js/site.js` — responsive navigation, filters, keyboard lightbox, FAQs, date validation and WhatsApp/email enquiry flow.
- `assets/js/gallery-data.js` — categorized media manifest (source filenames, captions, alt text and video durations).
- `assets/js/render-gallery.js` — homepage/gallery photo and video rendering.
- `assets/js/config.js` — public venue contact settings.
- `assets/images/` and `assets/videos/` — imported originals, used by the gallery.
- `docs/` — UX analysis, UI/system architecture, user flows, media indexes and project history.
- `scripts/import_media.py` — checks and imports the supplied original media ZIP into normalized website paths and regenerates the CSV indexes.
- `scripts/check-site.mjs` — internal-link, manifest and (in strict mode) media validation.

## Media import
The `Import banquet hall media` workflow runs when the change reaches `main`. It downloads the source archive, verifies every manifest mapping, writes the 35 photos and 7 videos plus five homepage image aliases, regenerates the CSV indexes, runs the strict checks, and commits the media files to `main`. The 35 photos and 7 videos are the complete set currently present in the supplied archive; additional files are needed to reach a 85–90+ photo gallery.

The archive contains public-facing venue/event media, and the workflow source URL is therefore public. Do not use this mechanism for private or sensitive media.

## Configure / verify before launch
The WhatsApp contact number is retained from the HTML already in the repository. Verify it with the venue owner before launch. Update `assets/js/config.js` for verified WhatsApp/email/location details. Never store API credentials in browser JavaScript. Verify address, opening hours, safe capacity, pricing, policies and service inclusions before publishing claims.

## Booking limitation
This is a functioning **enquiry frontend**, not a real-time booking backend. It prepares a WhatsApp or email message; it does not query a live calendar, store booking records on a server, send automatic staff notifications, provide an authenticated dashboard or take payments. Venue staff must check the authoritative schedule and explicitly confirm the booking. Add a server-side booking API, database, conflict prevention and staff workflow before promising instant availability or online booking confirmation. Target architecture: `docs/SYSTEM-ARCHITECTURE.md`.

## Local preview and checks
Run `python -m http.server 8000` from the project root and open `http://localhost:8000`.

- `npm run check` verifies the pages and manifest before media import.
- `REQUIRE_MEDIA=1 npm run check` verifies every image/video and alias after media import.
