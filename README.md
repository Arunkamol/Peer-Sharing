# Peer Sharing

Thai-first peer learning marketplace with a responsive Chulalongkorn-inspired pink interface. This is an independent community site, not an official university service.

- Live site: https://peer-sharing-campus.contact410431.chatgpt.site
- GitHub: https://github.com/Arunkamol/Peer-Sharing
- Supabase: project `kaljfnkanscjtdmakkzq` (**Peer Sharing**), organization **Find My 3D**, Singapore.

## Live features

- Account profiles, shared published tutoring/resource listings, saved items, and request board.
- Private conversations between the actual learner and tutor, with account-specific notifications and polling for new messages.
- Unpaid reservations, transactional capacity checks across learners, duplicate-request protection, cancellation, learner check-in, and tutor-confirmed completion after the class ends.
- Reviews limited to a learner's completed booking.
- Provider studio with listing visibility controls and incoming bookings.
- Private original PDF uploads and two-page watermarked previews; free digital resources can be reserved and downloaded with account entitlement checks.
- Mobile navigation, single-column phone cards, swipeable calendars, and Chat/Booking tabs.

## Backend and publishing

Supabase stores the live community data. Sites retains platform sign-in and hosts the server. The server signs short-lived requests to the `peer-api` Edge Function; its private signing key is a Sites runtime secret. The function verifies signatures before using Supabase's server credentials. Private R2 objects remain in the existing Site bucket.

The Supabase RPC is executable only by `service_role`; client roles have no schema, table, or function access. All operations authorize the server-verified actor and participants. See [backend details](docs/backend-integration.md).

GitHub stores source and migrations. Pushes do not automatically deploy or mirror Sites. Publish using the supported Sites workflow and synchronize source changes explicitly.

## Current boundaries

Payments, escrow, refunds, and payouts are **not connected**. Reservations never claim money was collected. Paid digital downloads remain disabled; free resources can be downloaded after reservation. University email/SSO, institutional certification, and staff moderation interfaces require separate configuration. Reports are recorded for the owner to review in Supabase; there is no automatic moderation or email delivery.

The former account-isolated pilot database is retained unchanged in D1. Its fictional tutors, simulated conversations, payments, and sample reviews were not migrated or published as real activity. Users start their live community profile and intentionally publish new listings.

## Validation

`supabase/tests/marketplace.sql` checks shared discovery, private profile fields, participant authorization, message and booking retry protection, global capacity, review eligibility, booking completion, and file access gates inside a rolled-back transaction. `scripts/verify-supabase.mjs` checks the deployed Edge Function's signature authentication and its live database connection; it accepts a private signing JWK only through hidden stdin and never prints it. TypeScript and production Worker builds are required before publishing.

Supabase security advisors report informational `rls_enabled_no_policy` notices for the private tables. This is intentional default-deny protection; all client grants are revoked and only the signed server API has access. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Development

Use Node.js 22.13+ and the pnpm version pinned in `package.json`. Install with the committed lockfile, then use `pnpm dev`, `pnpm exec tsc --noEmit --incremental false`, and `pnpm build`. Existing D1 migrations are retained; Supabase migrations are under `supabase/migrations`. Never change an applied migration.

Runtime keys are `PEER_BACKEND_URL` and secret `PEER_BACKEND_SIGNING_KEY`. Never commit credentials or database exports. See the backend document for key rotation. Without the live runtime configuration, local development retains the previous isolated pilot path; it must not be used to judge production live-data behavior.

## Google login

The login page offers Google sign-in only. Google availability follows the
owner-configured OAuth provider in Supabase. See
[the activation guide](docs/google-login.md) for exact origins, callback URLs and
testing steps. Existing ChatGPT records retain their original account IDs.
