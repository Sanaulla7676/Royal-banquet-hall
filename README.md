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

## Booking limitation
This is a static enquiry frontend, not a complete reservation backend. The form prepares a WhatsApp/email draft after a contact channel is configured. It does not query a live calendar, persist bookings on a server, notify staff automatically, provide an authenticated admin dashboard or take payments. Venue staff must check their authoritative calendar and explicitly confirm every booking. The target production design is described in `docs/SYSTEM-ARCHITECTURE.md`.

## Quality checks
Run `npm run check` to verify page links and manifest media paths. This does not replace production hosting, responsive, accessibility or backend testing.
