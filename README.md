# Peer Sharing

A Thai-first pilot of the university peer learning marketplace described in the supplied Peer Sharing specification. English interface controls are available from the language switch. The design uses a Chulalongkorn-inspired pink palette, without university marks or claims of endorsement.

## Project connections

- Live site: https://peer-sharing-campus.contact410431.chatgpt.site
- GitHub source: https://github.com/Arunkamol/Peer-Sharing
- Initial source import: deployed Sites version 6, source commit `66dd48b4e0f54155418069e25e4e2b830083fc02`, with documentation and ignore-file updates. The generated TypeScript cache is excluded.
- Current backend: Cloudflare D1, private R2 storage, and Sites authentication.
- Planned backend: a dedicated **Peer Sharing** Supabase project under **Find My 3D**, in Singapore. Creation is pending approval of the **USD 10/month** quote obtained on 2026-10-31; no Supabase credentials are configured yet.

See [the backend integration plan](docs/backend-integration.md). GitHub pushes do not automatically deploy this Site. Sites remains the production publishing path until a separate deployment integration is configured.

## Implemented pilot flows

- Home with tutoring/notes mode switching, keyword and course-code search, subject filters, and popular-course sorting.
- Responsive phone/tablet layout: a complete navigation drawer, bottom navigation, single-column phone cards, swipeable weekly slots, a persistent tutor action, and accessible Chat/Booking tabs that retain the draft and selection. Mobile dialogs respect the visible viewport, keyboard, and safe areas.
- Dedicated tutor profiles with pricing, course details, Monday–Sunday availability, selectable Bangkok-time sessions, and sample/own reviews.
- Persistent preview chat threads, clearly labeled simulated tutor replies, a booking summary and confirmation dialog, read/unread notifications, and booking-to-chat navigation.
- Course and skill discovery; class/resource filters; saved listings; subject interests.
- Demo class bookings, group pricing, capacity checks, cancellations, check-in, order notes, gated reviews, and disputes.
- Requests, follows, offers linked to published listings, and fulfillment.
- Provider listings and a review queue; server-side validation and originality acknowledgement.
- Private PDF uploads, two-page watermarked previews, purchase-gated downloads with buyer-reference watermarks.
- Teaching-hour progress, certificate requests, sample certificate PDFs with verification QR codes, and verification pages.
- Profile editing, in-app activity notifications, pilot moderation, and audit events.
- Durable D1 records, private R2 files, server-side record ownership checks, origin checks, and idempotent booking writes.

## Pilot boundaries

All payments and earnings are simulated. No payment, escrow, payout, refund, bank, or card service is connected. Starter listings, tutors, review counts, and prices are fictional sample content. Starter PDF downloads are clearly marked sample documents, not full study materials.

The site preserves its configured audience and uses platform authentication for personal records and writes. University email verification, SSO, real faculty/professor authorization, and email delivery require institutional and provider configuration before launch. Records and conversations are isolated per signed-in pilot account; this is not yet a shared university marketplace. Chat replies are explicitly simulated and messages are not delivered to real tutors. Default profile avatars use initials; no real tutor photos are supplied. Pilot moderation only affects the account's own records.

Certificates are conspicuously marked samples and confer no university or faculty endorsement. Proposed criteria and production certificate authorization require confirmation with the faculty. The pilot supports the review workflow and teaching-hour threshold; full production policy enforcement and independently verified student attendance remain launch work.

Automatic background reminders, cancellation deadlines, scheduled releases, and real-time external delivery are not connected. Dates use Asia/Bangkok. The app includes academic-integrity guidance and manual review/dispute flows.

## Validation

TypeScript compilation and the production Worker build pass. An isolated SQLite/R2 test harness exercised profile persistence, idempotent saves/bookings, capacity and price validation, review gating, disputes, listing moderation, sample certificate PDF/QR generation, private PDF upload/preview/download, cancellation refunds, account isolation, and origin checks. The tutor/chat update also checks per-session capacity, Bangkok availability, persisted conversations, message retry idempotency, unread-state transitions, cross-account chat denial, invalid/past slots, booking status messages, and gated reviews. The required managed browser capability is unavailable, so interactive browser and WebMCP execution validation were unavailable.

## Development

Use the existing package manager and Sites project identity. Generate schema migrations with the provided Drizzle command; deploy with the Sites workflow. Never replace an already applied migration. Source is backed by the Site's Git repository.

Use Node.js 22.13 or newer and the pnpm version pinned in `package.json`. After installing dependencies from the committed lockfile, use `pnpm dev`, `pnpm exec tsc --noEmit --incremental false`, and `pnpm build`. Local preview uses local Cloudflare storage, not the production database. Configure production secrets through the hosting environment; never commit them.
