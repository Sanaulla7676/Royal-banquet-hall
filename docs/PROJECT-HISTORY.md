# Project History

## 2026-10-09 — Multi-page website and media integration

- Inspected `main`: it contained one HTML file and referenced media paths that were not present in the repository; no booking backend or calendar API was present.
- Added a six-page visitor journey: Home, Events, Gallery, Booking Enquiry, Experience/FAQ and Contact.
- Added shared responsive luxury styling, keyboard-aware gallery lightbox, category filters, video cards, FAQ interaction, date validation and enquiry message preparation.
- Added accurately described records for all 35 photos and 7 videos in the supplied archive, split into 8 venue/entrance, 4 hall/seating, 16 stage/décor and 7 celebration-detail records.
- Added importer script and GitHub Actions workflow to download the public-facing media archive, map originals to normalized image/video paths, create the homepage aliases and commit binary media to `main` after merge.
- Added automated checking for page links, manifest shape and strict media-file existence, plus UX/UI/system architecture and user-flow documentation.
- Kept the existing main branch unchanged until the feature PR is merged.

## Booking scope

The website can prepare an enquiry for the venue's existing WhatsApp contact. It does not check a live availability database, prevent conflicting bookings, persist enquiries, send server-side notifications or confirm a booking. Those features require a trusted backend and an authoritative venue calendar.

## Current media limit

The supplied archive contains 35 photos and 7 videos. It does not contain the requested 85–90+ photos. The site and manifest are ready for additional photo entries when more images are supplied.
