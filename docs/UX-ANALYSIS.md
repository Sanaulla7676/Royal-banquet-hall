# UX Analysis — The Royal Party Hall

## Research basis and assumptions
This first release uses the supplied HTML and the repository's existing positioning: The Royal Party Hall in Rajajinagar, Bengaluru. It treats the site as a venue discovery and enquiry funnel. No analytics, customer interviews, operational calendar, pricing sheet, verified capacity, or reservation API was supplied, so the UX decisions below are hypotheses to validate, not research findings.

## Primary users and jobs-to-be-done
- Families planning weddings, receptions, birthdays, engagements and family celebrations: understand the venue, see real examples, ask about a date and guest count.
- Corporate or community organisers: assess whether the location and layout may suit a gathering, then speak to the venue.
- Mobile visitors arriving from Search, Maps, Instagram or WhatsApp: find key photos and start a low-friction enquiry quickly.

## Main UX risks in a one-page marketing site
- A visitor may mistake a date selector for live availability. We state explicitly that submitting an enquiry does not reserve a date.
- Huge, unstructured galleries make it hard to assess venue details. Group photography into venue/entrance, hall/seating, stage/decor and celebration details.
- Repetitive page sections and excessive animation delay useful information. Use restrained reveal, respect reduced-motion settings and prioritise meaningful content.
- Forms that ask for too much too early cause abandonment. Ask for contact, event type, preferred date and guest range first; budget and special requirements are optional.
- Unknown capacity, packages, included services, reviews and contact data can become misleading. Do not invent claims; confirm facts before launch.

## Recommended information architecture
Home → Events → Gallery → The Experience / FAQs → Check Your Date (enquiry) → Contact.
Persistent primary CTA: “Check Your Date”. Each event card deep-links to booking with its event type preselected.

## UX flow
1. Entry from Search, Maps, social media, referral or direct URL.
2. Home: immediate value proposition and location; CTA to check date; supporting venue images.
3. Explore Events or Gallery, optionally filter by image category / open lightbox / play video.
4. Click “Check Your Date”; select occasion, date, guest range and setup.
5. Enter name and phone; optional email, budget and requirements.
6. Review/submit enquiry to configured business channel.
7. Venue team checks the authoritative calendar, follows up and confirms / declines / suggests alternate dates.
8. Only after explicit venue confirmation can a date be treated as booked.

## Content and conversion recommendations
- Show best real wide shot first; avoid stock image as if it were the real venue.
- Use concise captions and image alt text that describe the actual photo, not keyword strings.
- Label gallery filters with plain language and show visible active state.
- Include a short FAQ that distinguishes enquiry from booking confirmation.
- Show verified phone, map, business hours, capacity and service inclusions once confirmed.
- Add event schema / LocalBusiness data only after the facts are verified.
- Track click-to-enquire, form-start, validation errors, form-submit, WhatsApp open and completed booking (server event) without collecting unnecessary personal data.

## Accessibility and responsive behaviour
- Semantic landmarks, ordered headings, visible focus, keyboard-operable menu/gallery, associated labels, accessible status messages and useful alt text.
- Avoid autoplaying audio; provide video controls and poster frames.
- Respect prefers-reduced-motion; maintain contrast and large tap targets.
- Test at 320px, 375px, 768px, 1024px and widescreen, plus keyboard-only and screen reader smoke checks.

## Measurement plan
- Baseline page and gallery views, CTA click-through, booking page visit, form completion and contact-channel opens.
- Segment mobile vs desktop and source channel.
- Do not equate WhatsApp opening with a delivered message or a confirmed booking.
