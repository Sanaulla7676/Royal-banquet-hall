# The Royal Party Hall

Responsive multi-page venue website for Rajajinagar, Bengaluru.

## Pages
- Home: `index.html`
- Events: `events.html`
- Photo/video gallery: `gallery.html`
- Booking enquiry: `booking.html`
- Experience and FAQs: `experience.html`
- Contact: `contact.html`

## Architecture
- `assets/css/site.css`: shared responsive luxury design system.
- `assets/js/site.js`: responsive navigation, category filters, keyboard-operated lightbox, FAQ and enquiry form logic.
- `assets/js/config.js`: verified public contact data.
- `assets/js/gallery-data.js`: media manifest.
- `assets/images/`: supplied banquet photographs.
- `assets/videos/`: supplied venue videos.
- `docs/`: UX analysis, user flow and system/UI architecture, media indexes and project history.
- `scripts/check-site.mjs`: local link and asset checks.

## Local preview
Run `python -m http.server 8000` at the project root and open `http://localhost:8000`.

## Configure before launch
Edit `assets/js/config.js` with the venue's verified WhatsApp number and/or email. Never place API keys or admin secrets in browser JavaScript. Verify phone, map, hours, capacity, pricing, inclusions and policies before publishing claims.

## Media status
The gallery manifest is set up for 35 photos and 7 videos, but original binary files are not yet committed to this branch. Upload files matching `assets/js/gallery-data.js` before expecting images/video thumbnails to load. The source repository originally contained no media directories.

## Booking limitation
This is a static enquiry frontend, not a complete reservation backend. The form prepares a WhatsApp/email draft after a contact channel is configured. It does not query a live calendar, persist bookings on a server, notify staff automatically, provide an authenticated admin dashboard or take payments. Venue staff must check their authoritative calendar and explicitly confirm every booking. The target production design is described in `docs/SYSTEM-ARCHITECTURE.md`.

## Quality checks
Run `npm run check` to verify page links and manifest media paths. This does not replace production hosting, responsive, accessibility or backend testing.

## Local media build
The downloadable ZIP distributed with this pull request contains the 35 photos and 7 videos extracted from the user-provided archive, normalized to `assets/images/photo-01.jpeg`…`photo-35.jpeg` and `assets/videos/venue-video-1.mp4`…`venue-video-7.mp4`. Those binaries have not been committed to GitHub; add them before merging/deploying if the remote gallery should display the complete supplied collection.
