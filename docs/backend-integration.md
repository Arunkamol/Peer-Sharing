# Peer Sharing backend integration

Prepared for the source import on 2026-11-01. Supabase provisioning and application migration remain pending.

## Selected destinations

| Component | Destination | Status |
| --- | --- | --- |
| Source | `Arunkamol/Peer-Sharing` | Initial source import from deployed Sites version 6 |
| Hosting and API | Existing Peer Sharing Site | Public and responsive |
| Database | New Supabase project named `Peer Sharing` | Pending cost approval |
| Organization | `Find My 3D` | Selected by the owner |
| Region | Singapore (`ap-southeast-1`) | Proposed for the Thailand audience |
| Cost | USD 10/month | Quoted 2026-10-31; not yet approved |
| Sign-in | Existing Sites authentication | Preserve during migration |
| Files | Existing private R2 bucket | Preserve ownership and entitlement checks |

MakerScapes resources are separate and are not migration targets.

## Current behavior

The live app stores records in ten D1 tables: `profiles`, `listings`, `requests`, `marks`, `orders`, `events`, `files`, `reviews`, `conversations`, and `chat_messages`.

Sample listings are embedded in `lib/catalog.ts`. User-created listings and conversations are isolated per account. `lib/chat-server.ts` generates simulated tutor replies. Payments, refunds, payouts, and completion shortcuts are demo behavior. Changing database credentials alone will not make these workflows real.

## Implementation scope

1. Provision the dedicated project, inspect its schema, and apply versioned migrations.
2. Connect the Sites server to Supabase over HTTPS. Store credentials only as runtime secrets. Preserve Sites-issued identity; never accept an acting account ID from the browser.
3. Separate private profiles from public tutor fields. Share intentionally published listings, retaining existing pilot records as private drafts until the owner publishes them.
4. Add provider IDs and bookable sessions. Reserve capacity atomically across all learners, with idempotent booking requests and validated cancellation transitions.
5. Make conversations accessible only to the learner and actual provider. Store the real sender, notify the other participant, and remove simulated tutor responses from real threads.
6. Allow reviews only for the learner's legitimately completed booking. Remove simulated completion shortcuts from real bookings.
7. Preserve private PDF access. Keep payment collection disabled until a payment provider and verified webhooks are integrated. Unpaid reservations must not claim payment or escrow success.
8. Replace sample-only actions with real data and useful empty states; clearly separate any retained demo content.

## Access boundaries

| Data | Read access | Write access |
| --- | --- | --- |
| Private profile | Owner | Owner |
| Public tutor profile | Visitors, published fields only | Owner |
| Listing | Visitors when published; owner for drafts | Owner; separately authorized moderators |
| Session | Visitors for published listings | Provider |
| Booking | Learner and provider | Validated transitions only |
| Conversation and message | Participants | Participant using their own identity |
| Notification and saved item | Owner | Authorized server logic or owner |
| Review | Visitors for published listings | Eligible learner, once per completed booking |
| File | Uploader or entitled learner | Uploader |

Enable row-level security on exposed tables and grant only required access. Keep privileged keys out of client code. Server authorization must precede privileged database calls; constraints and transactions enforce capacity and uniqueness.

## Migration and verification

Keep D1 intact during migration and available for rollback. Do not turn fictional accounts, simulated chats, sample reviews, or demo payments into real records. Classify user-created data before migration, preserve ownership, and verify record counts and file references.

Before cutover, verify:

- Two distinct users can publish, discover, book, and exchange real messages.
- A third account cannot access their private conversation, booking, or profile.
- Anonymous writes and identity spoofing fail.
- Concurrent booking requests cannot oversell; retries do not duplicate bookings.
- Cancellation releases capacity and informs participants.
- Review eligibility and private download entitlements hold.
- Notification read state is private to its recipient.
- No simulated payment is shown as real money collected.
- Supabase advisors, TypeScript checks, production build, and available end-to-end checks pass.
- Sites publication reaches a successful native deployment result.

## Source and publishing

This repository contains application source and migrations, not private uploads, database exports, credentials, or build output. GitHub and Sites source repositories do not automatically mirror each other. Future changes must be synchronized explicitly and published using the supported Sites workflow. Uploading this source snapshot does not itself change the live app or connect Supabase.
