# User Experience Flows

## Main visitor journey
```mermaid
flowchart TD
  A[Search / social / direct visit] --> B[Home]
  B --> C{Visitor goal}
  C --> D[Explore events]
  C --> E[Browse photo/video gallery]
  C --> F[Read process and FAQs]
  D --> G[Check your date]
  E --> G
  F --> G
  B --> G
  G --> H[Event type + preferred date + guest range]
  H --> I[Contact details + optional requirements]
  I --> J{Verified contact channel configured?}
  J -->|Yes| K[Prepare WhatsApp/email draft]
  J -->|No| L[Explain contact setup is incomplete]
  K --> M[Visitor sends message]
  M --> N[Venue team checks authoritative calendar]
  N --> O{Date available?}
  O -->|Yes| P[Discuss price and terms]
  O -->|No| Q[Suggest alternative dates]
  P --> R[Venue explicitly confirms booking]
```

## Enquiry state model
```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Validated: required fields complete
  Validated --> MessagePrepared: contact channel configured
  Validated --> NeedsConfiguration: no contact channel
  NeedsConfiguration --> Validated: verified contact configured
  MessagePrepared --> EnquirySent: visitor sends message
  EnquirySent --> UnderReview: venue reviews request
  UnderReview --> Discussion: date appears open
  UnderReview --> Alternatives: date conflict
  Discussion --> Confirmed: venue confirms terms
  Alternatives --> Draft: visitor chooses another date
  Confirmed --> [*]
```

## Terminology
- “Check your date” starts an enquiry; the static build does not query a live calendar.
- “Message prepared” does not mean the message was delivered.
- “Booking confirmed” is only after the venue checks its calendar and explicitly accepts.

Required booking fields are name, phone, event type, date and guest range. Email, budget and notes are optional. Client-side validation is not a substitute for server-side validation when a booking API is introduced.
