# User Interface Architecture

## Shared page shell

Every page shares a sticky responsive header, primary navigation, a single primary CTA (“Check Your Date”), consistent page container, type scale, gold/green/ivory palette, reusable button styles, footer, and floating enquiry shortcut.

## Page-by-page architecture

| Page | Primary job | Section order | Main action |
|---|---|---|---|
| Home | Explain venue and move visitors toward planning | Hero/location → quick enquiry fields → event/gallery cards → planning benefits → 4-step journey → CTA | Check your date |
| Events | Help users identify a suitable occasion path | Event landing → occasion cards → caveat about service confirmation → CTA | Plan this event |
| Gallery | Show the actual space clearly | Intro → filter controls → category image grid/lightbox → video cards → CTA | Enquire about a date |
| Experience | Make planning steps transparent | Intro → 4-step flow → FAQs → CTA | Start an enquiry |
| Booking | Gather actionable event details | Booking explainer → what happens next → validated form → explicit static-enquiry limitation | Prepare enquiry |
| Contact | Make contact and location easy to understand | Contact intro → location context → contact form → event CTA | Send a message |

## Design tokens
- Background: warm ivory `#f7f2e9` and paper `#fffdf9`.
- Primary ink: deep forest green `#10362e`.
- Accent: muted champagne gold `#c6a15b`; use for highlights/CTAs, not body text on light background at small sizes unless contrast is checked.
- Display typography: Cormorant Garamond; body typography: DM Sans.
- Rounded cards: 14–20px; soft shadow; generous whitespace.
- Motion: brief section reveals and image zoom only; disable non-essential transitions for reduced-motion settings.

## Component inventory
- Brand lockup / crown mark, responsive navigation and mobile disclosure menu.
- Button variants: primary gold, dark, outline.
- Hero with optional local media, editorial display title and visible CTA.
- Quick enquiry fields and form panel.
- Event card, media card, gallery filter, image lightbox and video card.
- Feature tile, numbered journey step, accessible FAQ disclosure, CTA banner, footer links.

## Interaction rules
- Every navigation link points to an actual page in this project.
- Current navigation item uses `aria-current="page"`.
- Gallery filters update `aria-pressed` and hide unselected cards.
- Keyboard lightbox supports Escape and arrow keys, with close/next/previous buttons.
- Form requires name, phone, event type, date and guest range. It prepares a communication message only if a verified channel is configured.
- A date submission must never be described as real-time availability or a confirmed booking without the backend flow.
- Alt text must describe the real image, and should not repeat target keywords mechanically.
