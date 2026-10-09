# The Royal Party Hall website

A responsive, multi-page static site for The Royal Party Hall, Rajajinagar, Bengaluru.

## Pages
- `index.html` — home and first-step enquiry journey
- `events.html` — event types and relevant booking links
- `gallery.html` — photo filters, lightbox and video area
- `experience.html` — planning steps and FAQs
- `booking.html` — validated enquiry form
- `contact.html` — contact information and enquiry

## Design/architecture
- `assets/css/site.css` — shared luxury visual system and responsive layouts
- `assets/js/site.js` — mobile navigation, gallery filtering/lightbox, FAQ, input handling
- `assets/js/config.js` — public venue contact settings
- `assets/js/gallery-data.js` — central manifest for gallery media
- `docs/UX-ANALYSIS.md` — audience, risks, design rationale and measurement plan
- `docs/USER-FLOWS.md` — user journey and booking state diagrams
- `docs/SYSTEM-ARCHITECTURE.md` — current static architecture and production booking target
- `docs/PROJECT-HISTORY.md` — change log

## Media files expected
Add the genuine assets under:
- `assets/images/hero-venue.jpg`
- `assets/images/venue-entrance.jpg`
- `assets/images/hall-interior.jpg`
- `assets/images/stage-celebration.jpg`
- `assets/images/cake-display.jpg`
- `assets/videos/venue-tour.mp4`

These are expected filenames for the sample page; missing images are hidden gracefully. Commit and register the rest of the provided photos/videos, using descriptive filenames and real matching alt text. **The current repository only contains one HTML file and no image/video assets**, so this commit does not claim to contain the 85–90+ photo library. The actual ZIP/media files must be uploaded to the repository to show every image.

## Configure before launch
Edit `assets/js/config.js` and enter the venue's verified WhatsApp number and/or email. These are public contact details, not secrets. Confirm address, contact information, service inclusions, capacity and booking policy before publishing. Do not put backend or API secrets here.

## Run locally
With Python installed, open a terminal in this folder and run:

`python -m http.server 8000`

Then open `http://localhost:8000`.

## Deploy
Set the deployment root to the repository root. Since this is a static site, it can deploy to GitHub Pages, Vercel static hosting or another static host. All pages and assets must be included in the deployment; do not publish only the root HTML file.

## Booking limitation (important)
This current release is an **enquiry frontend**, not a complete reservation backend. It has no live venue calendar, server-side booking API, database, admin dashboard, automated notifications or payment integration. The form prepares a WhatsApp/email message after verified business contact is configured. Availability must be checked by staff and a booking explicitly confirmed. The production target and data/security model are documented in `docs/SYSTEM-ARCHITECTURE.md`.

## Quality checks
`npm run check` checks internal links and relative file references. It does not replace cross-browser, accessibility, hosting or backend integration tests.
