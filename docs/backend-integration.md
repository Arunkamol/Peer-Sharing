# Backend integration

Supabase project: `kaljfnkanscjtdmakkzq` (Peer Sharing), owned by Find My 3D, region Singapore. Created 2026-11-01 after approval of the approximately USD 10/month additional project compute cost. Billing is hourly compute usage on the organization's existing Pro invoice; quota overages and add-ons are separate.

## Architecture

The browser uses same-origin Sites API routes. Sites supplies the authenticated user ID. The server validates mutations, signs a request with ECDSA P-256/SHA-256, and calls the Supabase `peer-api` Edge Function. The signature covers the timestamp and full request body; requests more than 60 seconds old, altered bodies, and unsigned calls are rejected. The Edge Function calls the constrained `public.peer_gateway` database function using its injected service credentials. No service credentials or private signing keys are sent to browsers.

The `peer` schema is private. Tables have RLS enabled and no public/client grants. `peer_gateway` is SECURITY INVOKER with an empty search path, executable only by service_role. Every operation checks the trusted actor against the record owner or conversation participants. Booking uses transaction-scoped request locks plus listing row locks before capacity checks. Messages and bookings have unique request IDs. Completion is tutor-only after the scheduled end; eligible learners can then review.

| Data | Visibility |
| --- | --- |
| Profile email and private settings | Account owner |
| Published listing, tutor display name/faculty, review | Public community |
| Hidden listing | Owner and relevant booking/conversation participants |
| Booking | Learner and provider |
| Conversation/message | Learner and provider |
| Notification and saved item | Recipient/owner |
| Original PDF | Private R2; uploader or entitled learner through server checks |
| PDF preview | First two watermarked pages of an intentionally published listing |

## Runtime configuration

Sites runtime contains `PEER_BACKEND_URL` and secret `PEER_BACKEND_SIGNING_KEY`. The latter is a private P-256 JWK. The matching public JWK is tracked in `supabase/functions/peer-api/public-key.json`. The private key is never committed. Supabase supplies its own database service credentials inside the Edge Function.

Rotate by generating a new key pair securely, updating the Edge Function's public verification key and the Sites secret, and deploying the matching versions together. A mismatch fails closed. Avoid unrelated project keys. The Supabase function has platform JWT checking disabled because it authenticates the server's body signature itself; the database RPC is not callable with an anonymous/publishable key.

## Migration boundaries

Existing D1 pilot data was retained, with no destructive migration. Fictional listings and simulated activity were not imported. Live users create their profile and intentionally publish new listings. Original PDF storage stays in R2 and its live metadata is saved in Supabase. Supabase holds the live profiles, listings, requests, marks, bookings, conversations, messages, notifications, reviews, and file metadata.

The site does not collect payments, hold escrow, or issue refunds. Class and physical-item reservations explicitly show unpaid status. Paid digital downloads are blocked. University verification, credentials, automated moderation, and outbound email are not configured. Report/dispute records can be reviewed by the project owner in Supabase; no separate staff console is enabled.

## Verification and deployment

Run the transactional SQL checks in `supabase/tests/marketplace.sql`, the signed Edge Function connection checks, TypeScript checks, and the production build. Test records must be rolled back or removed. The security advisor's private-table no-policy notices are intentional default-deny rules; [details](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Sites remains the hosting/deployment path. GitHub is the source repository; automatic GitHub-to-Sites deployment is not configured. Keep both source snapshots aligned explicitly. Rollback can use the prior Sites version, with D1 pilot records still intact; do not delete live Supabase data during rollback.

## Google login extension

Google login uses Supabase Auth with server-verified users and HttpOnly session
cookies. It preserves the Sites-managed ChatGPT flow. See
[Google activation and identity behavior](google-login.md); provider activation
and a real Google consent round trip are still pending.
