# User Experience Flows

## Main site navigation

```mermaid
flowchart TD
  A[Search / Social / Direct visit] --> B[Home page]
  B --> C{Visitor goal}
  C --> D[Explore events]
  C --> E[Browse gallery]
  C --> F[Understand process / FAQs]
  D --> G[Check your date]
  E --> G
  F --> G
  B --> G
  G --> H[Enter event type, date, guest range]
  H --> I[Enter contact details + optional notes]
  I --> J{Contact channel configured?}
  J -->|Yes| K[Prepare WhatsApp / email message]
  J -->|No| L[Show setup notice; do not pretend message sent]
  K --> M[Venue reviews enquiry]
  M --> N[Check authoritative calendar]
  N --> O{Date available?}
  O -->|Yes| P[Discuss price, terms and next steps]
  O -->|No| Q[Offer alternative dates]
  P --> R[Explicit confirmation by venue]
```

## Booking interaction state model

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Validated: required fields complete
  Validated --> EnquiryPrepared: channel configured
  Validated --> NeedsConfiguration: no contact channel
  NeedsConfiguration --> Validated: verified channel configured
  EnquiryPrepared --> SubmittedToChannel: user sends message
  SubmittedToChannel --> UnderReview: venue receives/reviews
  UnderReview --> AvailableDiscussion: schedule appears open
  UnderReview --> AlternativeSuggested: conflict/unavailable
  AvailableDiscussion --> Confirmed: venue confirms terms
  AlternativeSuggested --> Draft: visitor chooses another date
  Confirmed --> [*]
```

## Booking page fields
Required: customer name, phone, event type, preferred event date and expected guest range. Optional: email, budget range, preferred reply channel and notes. Date must not be in the past in the user's local timezone. Server-side revalidation remains mandatory when a booking API is introduced.

## Critical copy distinction
- **Check your date**: starts an enquiry, does not check a live calendar in the current static build.
- **Enquiry prepared**: a draft is ready for a configured communication channel.
- **Enquiry sent**: only after the user sends it through the selected channel or a server confirms receipt.
- **Booking confirmed**: only after the venue has verified availability and explicitly accepted the booking.
